"""Base class for all tool runners."""
import os
import subprocess
import threading
import time
import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BaseToolRunner(ABC):
    """Abstract base class for all security tool runners."""
    
    def __init__(self, scan_id: int, target: str, options: Dict[str, Any], 
                 results_dir: str, progress_callback=None):
        """
        Initialize the tool runner.
        
        Args:
            scan_id: The ID of the scan in the database
            target: The target IP or hostname
            options: Tool-specific options
            results_dir: Directory to store results
            progress_callback: Function to call with progress updates
        """
        self.scan_id = scan_id
        self.target = target
        self.options = options or {}
        self.results_dir = results_dir
        self.progress_callback = progress_callback
        self.process = None
        self.is_running = False
        self.start_time = None
        self.end_time = None
        self.output_file = None
        self.error_message = None
        self.progress = 0
        self.status = "pending"
        
        # Create results directory if it doesn't exist
        os.makedirs(results_dir, exist_ok=True)
        
        # Set up output file path
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.output_file = os.path.join(
            self.results_dir, 
            f"{self.get_tool_name()}_{scan_id}_{timestamp}.txt"
        )
    
    @abstractmethod
    def get_tool_name(self) -> str:
        """Return the name of the tool."""
        pass
    
    @abstractmethod
    def build_command(self) -> List[str]:
        """Build the command to run the tool."""
        pass
    
    @abstractmethod
    def parse_output(self, output: str) -> Dict[str, Any]:
        """Parse the tool output into a structured format."""
        pass
    
    @abstractmethod
    def estimate_progress(self, output: str) -> int:
        """Estimate the progress percentage from the tool output."""
        pass
    
    def start(self) -> bool:
        """
        Start the tool process.
        
        Returns:
            bool: True if the process started successfully, False otherwise
        """
        if self.is_running:
            return False
        
        try:
            command = self.build_command()
            logger.info(f"Starting {self.get_tool_name()} with command: {' '.join(command)}")
            
            # Open output file
            output_file_handle = open(self.output_file, 'w')
            
            # Start the process
            self.process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            self.is_running = True
            self.status = "running"
            self.start_time = datetime.now()
            
            # Start monitoring thread
            threading.Thread(
                target=self._monitor_process,
                args=(output_file_handle,),
                daemon=True
            ).start()
            
            return True
        
        except Exception as e:
            self.error_message = str(e)
            self.status = "failed"
            logger.error(f"Failed to start {self.get_tool_name()}: {e}")
            return False
    
    def stop(self) -> bool:
        """
        Stop the running process.
        
        Returns:
            bool: True if the process was stopped, False otherwise
        """
        if not self.is_running or self.process is None:
            return False
        
        try:
            self.process.terminate()
            # Give it some time to terminate gracefully
            time.sleep(2)
            # If still running, kill it
            if self.process.poll() is None:
                self.process.kill()
            
            self.is_running = False
            self.status = "stopped"
            self.end_time = datetime.now()
            return True
        
        except Exception as e:
            self.error_message = str(e)
            logger.error(f"Failed to stop {self.get_tool_name()}: {e}")
            return False
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get the current status of the tool.
        
        Returns:
            dict: Status information
        """
        duration = None
        if self.start_time:
            end = self.end_time or datetime.now()
            duration = (end - self.start_time).total_seconds()
        
        return {
            "tool": self.get_tool_name(),
            "status": self.status,
            "progress": self.progress,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration": duration,
            "output_file": self.output_file,
            "error_message": self.error_message
        }
    
    def get_results(self) -> Dict[str, Any]:
        """
        Get the results of the tool run.
        
        Returns:
            dict: Results information
        """
        results = self.get_status()
        
        # Add parsed results if available
        if self.output_file and os.path.exists(self.output_file):
            try:
                with open(self.output_file, 'r') as f:
                    output = f.read()
                results["parsed_results"] = self.parse_output(output)
            except Exception as e:
                logger.error(f"Failed to parse results: {e}")
                results["parsed_results"] = {"error": str(e)}
        
        return results
    
    def _monitor_process(self, output_file_handle):
        """
        Monitor the running process and update progress.
        
        Args:
            output_file_handle: File handle for writing output
        """
        accumulated_output = ""
        last_progress_update = 0
        last_output_update = ""
        output_buffer = []
        buffer_size = 20  # Keep last 20 lines for output updates
        
        try:
            while self.is_running and self.process and self.process.poll() is None:
                # Read output line by line
                line = self.process.stdout.readline()
                if not line:
                    break
                
                # Write to output file
                output_file_handle.write(line)
                output_file_handle.flush()
                
                # Accumulate output for progress estimation
                accumulated_output += line
                
                # Add to output buffer (keep last N lines)
                output_buffer.append(line)
                if len(output_buffer) > buffer_size:
                    output_buffer.pop(0)
                
                # Update progress
                new_progress = self.estimate_progress(accumulated_output)
                progress_changed = abs(new_progress - last_progress_update) >= 1
                self.progress = new_progress
                
                # Get current output buffer as string
                current_output = ''.join(output_buffer)
                
                # Call progress callback if provided and if progress changed or output changed
                if self.progress_callback and (progress_changed or current_output != last_output_update):
                    self.progress_callback(
                        self.scan_id, 
                        self.get_tool_name(), 
                        self.progress, 
                        "running", 
                        current_output
                    )
                    last_progress_update = self.progress
                    last_output_update = current_output
                
                # Small sleep to prevent high CPU usage
                time.sleep(0.1)
            
            # Process completed
            if self.process and self.process.poll() is not None:
                # Read any remaining output
                remaining_output, _ = self.process.communicate()
                if remaining_output:
                    output_file_handle.write(remaining_output)
                    accumulated_output += remaining_output
                    
                    # Add to output buffer
                    remaining_lines = remaining_output.splitlines(True)
                    output_buffer.extend(remaining_lines[-buffer_size:])
                    if len(output_buffer) > buffer_size:
                        output_buffer = output_buffer[-buffer_size:]
                
                # Update status based on return code
                return_code = self.process.returncode
                if return_code == 0:
                    self.status = "completed"
                else:
                    self.status = "failed"
                    self.error_message = f"Process exited with code {return_code}"
                
                self.is_running = False
                self.end_time = datetime.now()
                self.progress = 100 if self.status == "completed" else self.progress
                
                # Final progress callback with complete output
                if self.progress_callback:
                    final_output = ''.join(output_buffer)
                    self.progress_callback(
                        self.scan_id, 
                        self.get_tool_name(), 
                        self.progress, 
                        self.status, 
                        final_output
                    )
        
        except Exception as e:
            self.status = "failed"
            self.error_message = str(e)
            self.is_running = False
            self.end_time = datetime.now()
            logger.error(f"Error monitoring {self.get_tool_name()}: {e}")
            
            # Error progress callback
            if self.progress_callback:
                error_output = f"Error: {str(e)}\n" + ''.join(output_buffer)
                self.progress_callback(
                    self.scan_id, 
                    self.get_tool_name(), 
                    self.progress, 
                    "failed", 
                    error_output
                )
        
        finally:
            # Close output file
            if output_file_handle:
                output_file_handle.close()