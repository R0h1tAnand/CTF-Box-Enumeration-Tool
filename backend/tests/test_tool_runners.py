"""Unit tests for tool runners."""
import pytest
import os
import tempfile
import subprocess
from unittest.mock import patch, MagicMock, mock_open
from tools.base_runner import BaseToolRunner
from tools.nmap_runner import NmapRunner
from tools.scan_manager import ScanManager
from models.scan_history import ScanHistory

class MockToolRunner(BaseToolRunner):
    """Mock tool runner for testing base functionality."""
    
    def get_tool_name(self):
        return "mock_tool"
    
    def build_command(self):
        return ["echo", "Mock tool output"]
    
    def parse_output(self, output):
        return {"mock_result": output.strip()}
    
    def estimate_progress(self, output):
        if "Mock tool output" in output:
            return 100
        return 0

@pytest.mark.unit
class TestBaseToolRunner:
    """Test cases for BaseToolRunner."""
    
    def test_runner_initialization(self, temp_scan_dir):
        """Test tool runner initialization."""
        runner = MockToolRunner(
            scan_id=1,
            target="192.168.1.1",
            options={"test": "value"},
            results_dir=temp_scan_dir
        )
        
        assert runner.scan_id == 1
        assert runner.target == "192.168.1.1"
        assert runner.options == {"test": "value"}
        assert runner.results_dir == temp_scan_dir
        assert runner.is_running is False
        assert runner.status == "pending"
        assert runner.progress == 0
        assert runner.output_file is not None
        assert temp_scan_dir in runner.output_file
    
    def test_get_status(self, temp_scan_dir):
        """Test getting runner status."""
        runner = MockToolRunner(
            scan_id=1,
            target="192.168.1.1",
            options={},
            results_dir=temp_scan_dir
        )
        
        status = runner.get_status()
        
        assert status["tool"] == "mock_tool"
        assert status["status"] == "pending"
        assert status["progress"] == 0
        assert status["start_time"] is None
        assert status["end_time"] is None
        assert status["duration"] is None
        assert status["output_file"] == runner.output_file
        assert status["error_message"] is None
    
    @patch('subprocess.Popen')
    @patch('threading.Thread')
    def test_start_success(self, mock_thread, mock_popen, temp_scan_dir):
        """Test successful tool start."""
        # Mock process
        mock_process = MagicMock()
        mock_process.stdout.readline.side_effect = ["Mock tool output\n", ""]
        mock_process.poll.return_value = None  # Still running initially
        mock_process.communicate.return_value = ("", "")
        mock_popen.return_value = mock_process
        
        # Mock thread to prevent actual threading
        mock_thread_instance = MagicMock()
        mock_thread.return_value = mock_thread_instance
        
        runner = MockToolRunner(
            scan_id=1,
            target="192.168.1.1",
            options={},
            results_dir=temp_scan_dir
        )
        
        with patch('builtins.open', mock_open()) as mock_file:
            success = runner.start()
            
            assert success is True
            assert runner.is_running is True
            assert runner.status == "running"
            assert runner.start_time is not None
            
            # Verify subprocess was called correctly
            mock_popen.assert_called_once()
            args = mock_popen.call_args[0][0]
            assert args == ["echo", "Mock tool output"]
            
            # Verify thread was started
            mock_thread_instance.start.assert_called_once()
    
    def test_start_failure(self, temp_scan_dir):
        """Test tool start failure."""
        runner = MockToolRunner(
            scan_id=1,
            target="192.168.1.1",
            options={},
            results_dir=temp_scan_dir
        )
        
        # Override build_command to raise exception
        def failing_build_command():
            raise RuntimeError("Command build failed")
        
        runner.build_command = failing_build_command
        
        success = runner.start()
        
        assert success is False
        assert runner.is_running is False
        assert runner.status == "failed"
        assert runner.error_message == "Command build failed"
    
    @patch('subprocess.Popen')
    def test_stop(self, mock_popen, temp_scan_dir):
        """Test stopping a running tool."""
        # Mock process
        mock_process = MagicMock()
        mock_process.poll.return_value = None  # Still running
        mock_popen.return_value = mock_process
        
        runner = MockToolRunner(
            scan_id=1,
            target="192.168.1.1",
            options={},
            results_dir=temp_scan_dir
        )
        
        # Start the runner
        runner.process = mock_process
        runner.is_running = True
        runner.status = "running"
        
        success = runner.stop()
        
        assert success is True
        assert runner.is_running is False
        assert runner.status == "stopped"
        assert runner.end_time is not None
        
        # Verify process was terminated
        mock_process.terminate.assert_called_once()
    
    def test_stop_not_running(self, temp_scan_dir):
        """Test stopping a tool that's not running."""
        runner = MockToolRunner(
            scan_id=1,
            target="192.168.1.1",
            options={},
            results_dir=temp_scan_dir
        )
        
        success = runner.stop()
        
        assert success is False
        assert runner.is_running is False
    
    def test_get_results(self, temp_scan_dir):
        """Test getting tool results."""
        runner = MockToolRunner(
            scan_id=1,
            target="192.168.1.1",
            options={},
            results_dir=temp_scan_dir
        )
        
        # Create mock output file
        test_output = "Mock tool output"
        with open(runner.output_file, 'w') as f:
            f.write(test_output)
        
        results = runner.get_results()
        
        assert results["tool"] == "mock_tool"
        assert results["parsed_results"]["mock_result"] == test_output
    
    def test_get_results_no_file(self, temp_scan_dir):
        """Test getting results when output file doesn't exist."""
        runner = MockToolRunner(
            scan_id=1,
            target="192.168.1.1",
            options={},
            results_dir=temp_scan_dir
        )
        
        results = runner.get_results()
        
        assert results["tool"] == "mock_tool"
        assert "parsed_results" not in results

@pytest.mark.unit
class TestNmapRunner:
    """Test cases for NmapRunner."""
    
    def test_get_tool_name(self, temp_scan_dir):
        """Test tool name."""
        runner = NmapRunner(
            scan_id=1,
            target="192.168.1.1",
            options={},
            results_dir=temp_scan_dir
        )
        
        assert runner.get_tool_name() == "nmap"
    
    @patch('shutil.which')
    def test_build_command_basic(self, mock_which, temp_scan_dir):
        """Test building basic Nmap command."""
        mock_which.return_value = "/usr/bin/nmap"
        
        runner = NmapRunner(
            scan_id=1,
            target="192.168.1.1",
            options={"scan_type": "basic"},
            results_dir=temp_scan_dir
        )
        
        command = runner.build_command()
        
        assert command[0] == "nmap"
        assert "-sV" in command
        assert "-sC" in command
        assert "-oN" in command
        assert "192.168.1.1" in command
    
    @patch('shutil.which')
    def test_build_command_quick(self, mock_which, temp_scan_dir):
        """Test building quick Nmap command."""
        mock_which.return_value = "/usr/bin/nmap"
        
        runner = NmapRunner(
            scan_id=1,
            target="192.168.1.1",
            options={"scan_type": "quick"},
            results_dir=temp_scan_dir
        )
        
        command = runner.build_command()
        
        assert "-T4" in command
        assert "-F" in command
    
    @patch('shutil.which')
    def test_build_command_comprehensive(self, mock_which, temp_scan_dir):
        """Test building comprehensive Nmap command."""
        mock_which.return_value = "/usr/bin/nmap"
        
        runner = NmapRunner(
            scan_id=1,
            target="192.168.1.1",
            options={"scan_type": "comprehensive"},
            results_dir=temp_scan_dir
        )
        
        command = runner.build_command()
        
        assert "-sS" in command
        assert "-sV" in command
        assert "-sC" in command
        assert "-A" in command
        assert "-T4" in command
    
    @patch('shutil.which')
    def test_build_command_with_ports(self, mock_which, temp_scan_dir):
        """Test building Nmap command with specific ports."""
        mock_which.return_value = "/usr/bin/nmap"
        
        runner = NmapRunner(
            scan_id=1,
            target="192.168.1.1",
            options={"scan_type": "basic", "ports": "80,443,8080"},
            results_dir=temp_scan_dir
        )
        
        command = runner.build_command()
        
        assert "-p" in command
        port_index = command.index("-p")
        assert command[port_index + 1] == "80,443,8080"
    
    @patch('shutil.which')
    def test_build_command_custom(self, mock_which, temp_scan_dir):
        """Test building custom Nmap command."""
        mock_which.return_value = "/usr/bin/nmap"
        
        runner = NmapRunner(
            scan_id=1,
            target="192.168.1.1",
            options={"scan_type": "custom", "custom_flags": "-sU --top-ports 100"},
            results_dir=temp_scan_dir
        )
        
        command = runner.build_command()
        
        assert "-sU" in command
        assert "--top-ports" in command
        assert "100" in command
    
    @patch('shutil.which')
    def test_build_command_nmap_not_installed(self, mock_which, temp_scan_dir):
        """Test building command when Nmap is not installed."""
        mock_which.return_value = None
        
        runner = NmapRunner(
            scan_id=1,
            target="192.168.1.1",
            options={},
            results_dir=temp_scan_dir
        )
        
        with pytest.raises(RuntimeError, match="Nmap is not installed"):
            runner.build_command()
    
    def test_parse_output(self, temp_scan_dir):
        """Test parsing Nmap output."""
        runner = NmapRunner(
            scan_id=1,
            target="192.168.1.1",
            options={},
            results_dir=temp_scan_dir
        )
        
        sample_output = """
        Nmap scan report for 192.168.1.1
        Host is up (0.001s latency).
        
        PORT     STATE SERVICE VERSION
        22/tcp   open  ssh     OpenSSH 7.4
        80/tcp   open  http    Apache httpd 2.4.6
        443/tcp  open  https   Apache httpd 2.4.6
        
        Nmap done: 1 IP address (1 host up) scanned in 2.34 seconds
        """
        
        results = runner.parse_output(sample_output)
        
        assert results["target"] == "192.168.1.1"
        assert results["host_info"]["name"] == "192.168.1.1"
        assert results["host_info"]["status"] == "up (0.001s latency)."
        assert len(results["open_ports"]) == 3
        assert 22 in results["open_ports"]
        assert 80 in results["open_ports"]
        assert 443 in results["open_ports"]
        assert len(results["services"]) == 3
        
        # Check service details
        ssh_service = next(s for s in results["services"] if s["port"] == 22)
        assert ssh_service["protocol"] == "tcp"
        assert "ssh" in ssh_service["service"]
    
    def test_estimate_progress(self, temp_scan_dir):
        """Test progress estimation from Nmap output."""
        runner = NmapRunner(
            scan_id=1,
            target="192.168.1.1",
            options={},
            results_dir=temp_scan_dir
        )
        
        # Test completion
        assert runner.estimate_progress("Nmap done: 1 IP address") == 100
        
        # Test progress indicators
        assert runner.estimate_progress("Completed SYN (50%)") == 50
        assert runner.estimate_progress("Completed Service (75%)") == 75
        
        # Test scanning phase
        assert runner.estimate_progress("Scanning 192.168.1.1") == 30
        
        # Test host discovery
        assert runner.estimate_progress("Nmap scan report for 192.168.1.1") == 10
        
        # Test default
        assert runner.estimate_progress("Starting Nmap") == 5

@pytest.mark.unit
class TestScanManager:
    """Test cases for ScanManager."""
    
    def test_scan_manager_initialization(self, temp_scan_dir):
        """Test scan manager initialization."""
        mock_socketio = MagicMock()
        
        manager = ScanManager(
            socketio=mock_socketio,
            scan_results_dir=temp_scan_dir
        )
        
        assert manager.socketio == mock_socketio
        assert manager.scan_results_dir == temp_scan_dir
        assert manager.active_scans == {}
        assert os.path.exists(temp_scan_dir)
    
    @patch('tools.scan_manager.ScanHistory')
    @patch('tools.scan_manager.db')
    def test_start_scan_success(self, mock_db, mock_scan_history, temp_scan_dir, sample_user):
        """Test successful scan start."""
        mock_socketio = MagicMock()
        manager = ScanManager(
            socketio=mock_socketio,
            scan_results_dir=temp_scan_dir
        )
        
        # Mock database operations
        mock_scan_record = MagicMock()
        mock_scan_record.id = 1
        mock_scan_history.return_value = mock_scan_record
        
        # Mock tool runner creation
        with patch.object(manager, '_create_runner') as mock_create_runner:
            mock_runner = MagicMock()
            mock_runner.start.return_value = True
            mock_create_runner.return_value = mock_runner
            
            tools_config = [
                {"tool_name": "nmap", "options": {"scan_type": "basic"}}
            ]
            
            scan_id = manager.start_scan(
                user_id=sample_user.id,
                target="192.168.1.1",
                tools_config=tools_config
            )
            
            assert scan_id == 1
            assert 1 in manager.active_scans
            assert manager.active_scans[1]["target"] == "192.168.1.1"
            assert manager.active_scans[1]["user_id"] == sample_user.id
            assert "nmap" in manager.active_scans[1]["tools"]
            
            # Verify database operations
            mock_db.session.add.assert_called_once()
            mock_db.session.commit.assert_called_once()
            
            # Verify runner was started
            mock_runner.start.assert_called_once()
    
    @patch('tools.scan_manager.ScanHistory')
    @patch('tools.scan_manager.db')
    def test_start_scan_no_tools(self, mock_db, mock_scan_history, temp_scan_dir, sample_user):
        """Test scan start with no valid tools."""
        mock_socketio = MagicMock()
        manager = ScanManager(
            socketio=mock_socketio,
            scan_results_dir=temp_scan_dir
        )
        
        # Mock database operations
        mock_scan_record = MagicMock()
        mock_scan_record.id = 1
        mock_scan_history.return_value = mock_scan_record
        
        # Mock tool runner creation to return None (unsupported tool)
        with patch.object(manager, '_create_runner') as mock_create_runner:
            mock_create_runner.return_value = None
            
            tools_config = [
                {"tool_name": "unsupported_tool", "options": {}}
            ]
            
            scan_id = manager.start_scan(
                user_id=sample_user.id,
                target="192.168.1.1",
                tools_config=tools_config
            )
            
            assert scan_id is None
            assert 1 not in manager.active_scans
            
            # Verify scan was marked as failed
            mock_scan_record.update_status.assert_called_once_with(
                "failed", "No tools were started successfully"
            )
    
    def test_stop_scan(self, temp_scan_dir):
        """Test stopping a running scan."""
        mock_socketio = MagicMock()
        manager = ScanManager(
            socketio=mock_socketio,
            scan_results_dir=temp_scan_dir
        )
        
        # Set up active scan
        mock_runner = MagicMock()
        mock_runner.is_running = True
        
        manager.active_scans[1] = {
            "user_id": 1,
            "target": "192.168.1.1",
            "tools": {"nmap": mock_runner},
            "status": "running"
        }
        
        with patch('tools.scan_manager.ScanHistory') as mock_scan_history:
            mock_scan_record = MagicMock()
            mock_scan_history.query.get.return_value = mock_scan_record
            
            success = manager.stop_scan(1)
            
            assert success is True
            assert manager.active_scans[1]["status"] == "stopped"
            
            # Verify runner was stopped
            mock_runner.stop.assert_called_once()
            
            # Verify database was updated
            mock_scan_record.update_status.assert_called_once_with("stopped")
    
    def test_stop_scan_not_active(self, temp_scan_dir):
        """Test stopping a scan that's not active."""
        mock_socketio = MagicMock()
        manager = ScanManager(
            socketio=mock_socketio,
            scan_results_dir=temp_scan_dir
        )
        
        success = manager.stop_scan(999)  # Non-existent scan
        
        assert success is False
    
    def test_get_scan_status_active(self, temp_scan_dir):
        """Test getting status of active scan."""
        mock_socketio = MagicMock()
        manager = ScanManager(
            socketio=mock_socketio,
            scan_results_dir=temp_scan_dir
        )
        
        # Set up active scan
        mock_runner = MagicMock()
        mock_runner.get_status.return_value = {
            "tool": "nmap",
            "status": "running",
            "progress": 50
        }
        
        from datetime import datetime
        start_time = datetime.now()
        
        manager.active_scans[1] = {
            "user_id": 1,
            "target": "192.168.1.1",
            "tools": {"nmap": mock_runner},
            "start_time": start_time,
            "status": "running"
        }
        
        status = manager.get_scan_status(1)
        
        assert status["scan_id"] == 1
        assert status["status"] == "running"
        assert status["target"] == "192.168.1.1"
        assert status["overall_progress"] == 50
        assert "nmap" in status["tools"]
    
    def test_get_scan_status_from_database(self, temp_scan_dir):
        """Test getting status from database for inactive scan."""
        mock_socketio = MagicMock()
        manager = ScanManager(
            socketio=mock_socketio,
            scan_results_dir=temp_scan_dir
        )
        
        with patch('tools.scan_manager.ScanHistory') as mock_scan_history:
            mock_scan_record = MagicMock()
            mock_scan_record.status = "completed"
            mock_scan_record.target_ip = "192.168.1.1"
            mock_scan_record.started_at = MagicMock()
            mock_scan_record.started_at.isoformat.return_value = "2024-01-01T12:00:00"
            mock_scan_record.completed_at = MagicMock()
            mock_scan_record.completed_at.isoformat.return_value = "2024-01-01T12:05:00"
            mock_scan_record.error_message = None
            
            mock_scan_history.query.get.return_value = mock_scan_record
            
            status = manager.get_scan_status(1)
            
            assert status["scan_id"] == 1
            assert status["status"] == "completed"
            assert status["target"] == "192.168.1.1"
            assert status["overall_progress"] == 100
    
    def test_create_runner_nmap(self, temp_scan_dir):
        """Test creating Nmap runner."""
        mock_socketio = MagicMock()
        manager = ScanManager(
            socketio=mock_socketio,
            scan_results_dir=temp_scan_dir
        )
        
        runner = manager._create_runner(
            tool_name="nmap",
            scan_id=1,
            target="192.168.1.1",
            options={"scan_type": "basic"},
            results_dir=temp_scan_dir
        )
        
        assert isinstance(runner, NmapRunner)
        assert runner.scan_id == 1
        assert runner.target == "192.168.1.1"
    
    def test_create_runner_unsupported(self, temp_scan_dir):
        """Test creating runner for unsupported tool."""
        mock_socketio = MagicMock()
        manager = ScanManager(
            socketio=mock_socketio,
            scan_results_dir=temp_scan_dir
        )
        
        runner = manager._create_runner(
            tool_name="unsupported_tool",
            scan_id=1,
            target="192.168.1.1",
            options={},
            results_dir=temp_scan_dir
        )
        
        assert runner is None