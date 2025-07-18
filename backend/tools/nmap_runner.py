"""Nmap tool runner implementation."""
import re
import os
import shutil
from typing import Dict, Any, List
from .base_runner import BaseToolRunner

class NmapRunner(BaseToolRunner):
    """Runner for Nmap security scanning tool."""
    
    def get_tool_name(self) -> str:
        """Return the name of the tool."""
        return "nmap"
    
    def build_command(self) -> List[str]:
        """Build the command to run Nmap."""
        # Check if nmap is installed
        if not shutil.which("nmap"):
            raise RuntimeError("Nmap is not installed or not in PATH")
        
        # Start with base command
        command = ["nmap"]
        
        # Add options from configuration
        scan_type = self.options.get("scan_type", "basic")
        
        if scan_type == "basic":
            command.extend(["-sV", "-sC"])  # Version detection and default scripts
        elif scan_type == "quick":
            command.extend(["-T4", "-F"])  # Fast scan of most common ports
        elif scan_type == "comprehensive":
            command.extend(["-sS", "-sV", "-sC", "-A", "-T4"])  # Comprehensive scan
        elif scan_type == "stealth":
            command.extend(["-sS", "-T2"])  # Stealth SYN scan
        elif scan_type == "udp":
            command.extend(["-sU", "--top-ports", "100"])  # UDP scan of top ports
        elif scan_type == "custom":
            # Add custom flags if provided
            custom_flags = self.options.get("custom_flags", "")
            if custom_flags:
                command.extend(custom_flags.split())
        
        # Add ports if specified
        ports = self.options.get("ports")
        if ports:
            command.extend(["-p", ports])
        
        # Add output format
        command.extend(["-oN", self.output_file])
        
        # Add target
        command.append(self.target)
        
        return command
    
    def parse_output(self, output: str) -> Dict[str, Any]:
        """Parse Nmap output into a structured format."""
        results = {
            "target": self.target,
            "scan_type": self.options.get("scan_type", "basic"),
            "open_ports": [],
            "host_info": {},
            "services": []
        }
        
        # Extract host information
        host_match = re.search(r"Nmap scan report for ([^\n]+)", output)
        if host_match:
            results["host_info"]["name"] = host_match.group(1).strip()
        
        # Extract host status
        status_match = re.search(r"Host is ([^\n]+)", output)
        if status_match:
            results["host_info"]["status"] = status_match.group(1).strip()
        
        # Extract open ports and services
        port_pattern = re.compile(r"(\d+)\/(\w+)\s+(\w+)\s+([^\n]+)")
        for match in port_pattern.finditer(output):
            port, protocol, state, service_info = match.groups()
            
            if state.lower() == "open":
                port_info = {
                    "port": int(port),
                    "protocol": protocol,
                    "service": service_info.strip()
                }
                results["open_ports"].append(int(port))
                results["services"].append(port_info)
        
        return results
    
    def estimate_progress(self, output: str) -> int:
        """Estimate the progress percentage from Nmap output."""
        # Look for completion indicators
        if "Nmap done" in output:
            return 100
        
        # Look for progress indicators
        progress_matches = re.findall(r"Completed (\w+) \((\d+)%\)", output)
        if progress_matches:
            # Get the latest progress percentage
            latest_match = progress_matches[-1]
            return int(latest_match[1])
        
        # Look for scanning status
        if "Scanning" in output:
            return 30  # Arbitrary progress for scanning phase
        
        # If we found host information, we're at least 10% done
        if "Nmap scan report for" in output:
            return 10
        
        # Default progress
        return 5