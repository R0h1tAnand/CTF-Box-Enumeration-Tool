"""Scan manager for orchestrating security tool runners."""
import os
import json
import logging
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
from flask_socketio import SocketIO
from flask import current_app
from models.scan_history import ScanHistory
from database import db
from .nmap_runner import NmapRunner
from .gobuster_runner import GobusterRunner
from .dirb_runner import DirbRunner

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ScanManager:
    """Manager for orchestrating security tool scans."""
    
    def __init__(self, socketio: SocketIO, scan_results_dir: str = "scan_results"):
        """
        Initialize the scan manager.
        
        Args:
            socketio: SocketIO instance for real-time updates
            scan_results_dir: Directory to store scan results
        """
        self.socketio = socketio
        self.scan_results_dir = scan_results_dir
        self.active_scans: Dict[int, Dict[str, Any]] = {}
        
        # Create scan results directory if it doesn't exist
        os.makedirs(scan_results_dir, exist_ok=True)
        
        # Get the emit_scan_progress function from app config if available
        self.emit_scan_progress = None
        try:
            if current_app and 'EMIT_SCAN_PROGRESS' in current_app.config:
                self.emit_scan_progress = current_app.config['EMIT_SCAN_PROGRESS']
        except RuntimeError:
            # Not in application context
            pass
    
    def start_scan(self, user_id: int, target: str, tools_config: List[Dict[str, Any]]) -> Optional[int]:
        """
        Start a new scan with the specified tools.
        
        Args:
            user_id: ID of the user starting the scan
            target: Target IP or hostname
            tools_config: List of tool configurations
                Each tool config should have:
                - tool_name: Name of the tool (nmap, gobuster, dirb)
                - options: Tool-specific options
        
        Returns:
            int: Scan ID if successful, None if failed
        """
        try:
            # Create scan directory
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            scan_dir = os.path.join(self.scan_results_dir, f"scan_{user_id}_{timestamp}")
            os.makedirs(scan_dir, exist_ok=True)
            
            # Create scan record in database
            scan_record = ScanHistory(
                user_id=user_id,
                target_ip=target,
                tools_used=[config["tool_name"] for config in tools_config],
                status="running",
                scan_config=tools_config,
                results_path=scan_dir
            )
            db.session.add(scan_record)
            db.session.commit()
            
            scan_id = scan_record.id
            
            # Initialize active scan entry
            self.active_scans[scan_id] = {
                "user_id": user_id,
                "target": target,
                "tools": {},
                "start_time": datetime.now(),
                "scan_dir": scan_dir,
                "status": "running"
            }
            
            # Start each tool
            for config in tools_config:
                tool_name = config["tool_name"].lower()
                options = config.get("options", {})
                
                # Create appropriate runner
                runner = self._create_runner(
                    tool_name=tool_name,
                    scan_id=scan_id,
                    target=target,
                    options=options,
                    results_dir=scan_dir
                )
                
                if runner:
                    # Store runner in active scans
                    self.active_scans[scan_id]["tools"][tool_name] = runner
                    
                    # Start the runner
                    success = runner.start()
                    if not success:
                        logger.error(f"Failed to start {tool_name} for scan {scan_id}")
                else:
                    logger.error(f"Unsupported tool: {tool_name}")
            
            # If no tools were started successfully, mark scan as failed
            if not self.active_scans[scan_id]["tools"]:
                scan_record.update_status("failed", "No tools were started successfully")
                del self.active_scans[scan_id]
                return None
            
            return scan_id
        
        except Exception as e:
            logger.error(f"Failed to start scan: {e}")
            return None
    
    def stop_scan(self, scan_id: int) -> bool:
        """
        Stop a running scan.
        
        Args:
            scan_id: ID of the scan to stop
        
        Returns:
            bool: True if the scan was stopped, False otherwise
        """
        if scan_id not in self.active_scans:
            return False
        
        try:
            # Stop each tool
            for tool_name, runner in self.active_scans[scan_id]["tools"].items():
                if runner.is_running:
                    runner.stop()
            
            # Update scan record
            scan_record = ScanHistory.query.get(scan_id)
            if scan_record:
                scan_record.update_status("stopped")
            
            # Update active scan status
            self.active_scans[scan_id]["status"] = "stopped"
            
            # Clean up active scan after a delay
            # In a real implementation, you might want to use a background task
            # to clean up after some time
            
            return True
        
        except Exception as e:
            logger.error(f"Failed to stop scan {scan_id}: {e}")
            return False
    
    def get_scan_status(self, scan_id: int) -> Optional[Dict[str, Any]]:
        """
        Get the status of a scan.
        
        Args:
            scan_id: ID of the scan
        
        Returns:
            dict: Scan status information
        """
        # Check if scan is active
        if scan_id in self.active_scans:
            active_scan = self.active_scans[scan_id]
            
            # Collect status from each tool
            tools_status = {}
            overall_progress = 0
            running_tools = 0
            
            for tool_name, runner in active_scan["tools"].items():
                tool_status = runner.get_status()
                tools_status[tool_name] = tool_status
                
                # Count running tools and accumulate progress
                if tool_status["status"] == "running":
                    overall_progress += tool_status["progress"]
                    running_tools += 1
            
            # Calculate overall progress
            if running_tools > 0:
                overall_progress /= running_tools
            elif tools_status:
                # If no tools are running but we have tools, check if all completed
                if all(status["status"] == "completed" for status in tools_status.values()):
                    overall_progress = 100
                    
                    # Update scan record if all tools are done
                    scan_record = ScanHistory.query.get(scan_id)
                    if scan_record and scan_record.status == "running":
                        scan_record.update_status("completed")
                        
                        # Clean up active scan
                        self.active_scans[scan_id]["status"] = "completed"
            
            return {
                "scan_id": scan_id,
                "status": active_scan["status"],
                "target": active_scan["target"],
                "start_time": active_scan["start_time"].isoformat(),
                "overall_progress": round(overall_progress),
                "tools": tools_status
            }
        
        # If not active, get from database
        scan_record = ScanHistory.query.get(scan_id)
        if scan_record:
            return {
                "scan_id": scan_id,
                "status": scan_record.status,
                "target": scan_record.target_ip,
                "start_time": scan_record.started_at.isoformat() if scan_record.started_at else None,
                "completed_at": scan_record.completed_at.isoformat() if scan_record.completed_at else None,
                "overall_progress": 100 if scan_record.status in ["completed", "failed", "stopped"] else 0,
                "error_message": scan_record.error_message
            }
        
        return None
    
    def get_scan_results(self, scan_id: int) -> Optional[Dict[str, Any]]:
        """
        Get the results of a scan.
        
        Args:
            scan_id: ID of the scan
        
        Returns:
            dict: Scan results
        """
        # Get scan record
        scan_record = ScanHistory.query.get(scan_id)
        if not scan_record:
            return None
        
        # Check if scan is active
        if scan_id in self.active_scans:
            active_scan = self.active_scans[scan_id]
            
            # Collect results from each tool
            tools_results = {}
            for tool_name, runner in active_scan["tools"].items():
                tools_results[tool_name] = runner.get_results()
            
            return {
                "scan_id": scan_id,
                "status": active_scan["status"],
                "target": active_scan["target"],
                "start_time": active_scan["start_time"].isoformat(),
                "tools": tools_results
            }
        
        # If not active, try to load results from files
        try:
            results = {
                "scan_id": scan_id,
                "status": scan_record.status,
                "target": scan_record.target_ip,
                "start_time": scan_record.started_at.isoformat() if scan_record.started_at else None,
                "completed_at": scan_record.completed_at.isoformat() if scan_record.completed_at else None,
                "tools": {}
            }
            
            # Check if results path exists
            if scan_record.results_path and os.path.isdir(scan_record.results_path):
                # Load results for each tool
                for tool_name in scan_record.tools_used:
                    # Find result file for this tool
                    tool_files = [f for f in os.listdir(scan_record.results_path) 
                                if f.startswith(f"{tool_name}_{scan_id}")]
                    
                    if tool_files:
                        # Use the most recent file
                        tool_file = sorted(tool_files)[-1]
                        file_path = os.path.join(scan_record.results_path, tool_file)
                        
                        with open(file_path, 'r') as f:
                            output = f.read()
                        
                        # Create a temporary runner to parse the output
                        temp_runner = self._create_runner(
                            tool_name=tool_name,
                            scan_id=scan_id,
                            target=scan_record.target_ip,
                            options=scan_record.scan_config.get(tool_name, {}),
                            results_dir=scan_record.results_path
                        )
                        
                        if temp_runner:
                            parsed_results = temp_runner.parse_output(output)
                            results["tools"][tool_name] = {
                                "output_file": file_path,
                                "parsed_results": parsed_results
                            }
            
            return results
        
        except Exception as e:
            logger.error(f"Failed to get scan results for {scan_id}: {e}")
            return {
                "scan_id": scan_id,
                "status": scan_record.status,
                "target": scan_record.target_ip,
                "error": str(e)
            }
    
    def _create_runner(self, tool_name: str, scan_id: int, target: str, 
                      options: Dict[str, Any], results_dir: str) -> Optional[Any]:
        """
        Create a tool runner based on the tool name.
        
        Args:
            tool_name: Name of the tool
            scan_id: ID of the scan
            target: Target IP or hostname
            options: Tool-specific options
            results_dir: Directory to store results
        
        Returns:
            BaseToolRunner: Tool runner instance
        """
        # Create progress callback
        def progress_callback(scan_id, tool, progress, status):
            # Use the emit_scan_progress function if available, otherwise use socketio directly
            if self.emit_scan_progress:
                self.emit_scan_progress(scan_id, tool, progress, status)
            else:
                # Fallback to direct socketio emit
                self.socketio.emit('scan_progress', {
                    'scan_id': scan_id,
                    'tool': tool,
                    'progress': progress,
                    'status': status,
                    'timestamp': datetime.now().isoformat()
                }, room=f"scan_{scan_id}")
        
        # Create appropriate runner
        if tool_name == "nmap":
            return NmapRunner(scan_id, target, options, results_dir, progress_callback)
        elif tool_name == "gobuster":
            return GobusterRunner(scan_id, target, options, results_dir, progress_callback)
        elif tool_name == "dirb":
            return DirbRunner(scan_id, target, options, results_dir, progress_callback)
        else:
            return None