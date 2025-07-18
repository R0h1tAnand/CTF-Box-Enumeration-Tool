"""Gobuster tool runner implementation."""
import re
import os
import shutil
from typing import Dict, Any, List
from .base_runner import BaseToolRunner

class GobusterRunner(BaseToolRunner):
    """Runner for Gobuster directory and DNS enumeration tool."""
    
    def get_tool_name(self) -> str:
        """Return the name of the tool."""
        return "gobuster"
    
    def build_command(self) -> List[str]:
        """Build the command to run Gobuster."""
        # Check if gobuster is installed
        if not shutil.which("gobuster"):
            raise RuntimeError("Gobuster is not installed or not in PATH")
        
        # Start with base command
        command = ["gobuster"]
        
        # Add mode (dir, dns, vhost, etc.)
        mode = self.options.get("mode", "dir")
        command.append(mode)
        
        # Add URL/target
        command.extend(["-u", self.target])
        
        # Add wordlist
        wordlist = self.options.get("wordlist", "/usr/share/wordlists/dirb/common.txt")
        command.extend(["-w", wordlist])
        
        # Add threads
        threads = self.options.get("threads", "10")
        command.extend(["-t", str(threads)])
        
        # Add extensions if in dir mode
        if mode == "dir" and "extensions" in self.options:
            command.extend(["-x", self.options["extensions"]])
        
        # Add status codes to display
        if "status_codes" in self.options:
            command.extend(["-s", self.options["status_codes"]])
        else:
            command.extend(["-s", "200,204,301,302,307,401,403"])
        
        # Add output format
        command.extend(["-o", self.output_file])
        
        # Add verbose flag if requested
        if self.options.get("verbose", False):
            command.append("-v")
        
        # Add custom flags if provided
        custom_flags = self.options.get("custom_flags", "")
        if custom_flags:
            command.extend(custom_flags.split())
        
        return command
    
    def parse_output(self, output: str) -> Dict[str, Any]:
        """Parse Gobuster output into a structured format."""
        results = {
            "target": self.target,
            "mode": self.options.get("mode", "dir"),
            "wordlist": self.options.get("wordlist", "default"),
            "findings": []
        }
        
        # Different parsing based on mode
        mode = self.options.get("mode", "dir")
        
        if mode == "dir":
            # Parse directory mode output
            # Example: /admin (Status: 301) [Size: 162]
            pattern = re.compile(r"([^\s]+)\s+\(Status:\s+(\d+)\)\s+\[Size:\s+(\d+)\]")
            for match in pattern.finditer(output):
                path, status, size = match.groups()
                results["findings"].append({
                    "path": path,
                    "status": int(status),
                    "size": int(size)
                })
        
        elif mode == "dns":
            # Parse DNS mode output
            # Example: Found: api.example.com
            pattern = re.compile(r"Found:\s+([^\s]+)")
            for match in pattern.finditer(output):
                subdomain = match.group(1)
                results["findings"].append({
                    "subdomain": subdomain
                })
        
        elif mode == "vhost":
            # Parse vhost mode output
            # Example: Found: admin.example.com (Status: 200) [Size: 1234]
            pattern = re.compile(r"Found:\s+([^\s]+)\s+\(Status:\s+(\d+)\)\s+\[Size:\s+(\d+)\]")
            for match in pattern.finditer(output):
                vhost, status, size = match.groups()
                results["findings"].append({
                    "vhost": vhost,
                    "status": int(status),
                    "size": int(size)
                })
        
        return results
    
    def estimate_progress(self, output: str) -> int:
        """Estimate the progress percentage from Gobuster output."""
        # Look for completion indicators
        if "Finished" in output:
            return 100
        
        # Look for progress indicators
        progress_match = re.search(r"Progress: (\d+) / (\d+)", output)
        if progress_match:
            current, total = map(int, progress_match.groups())
            if total > 0:
                return min(99, int((current / total) * 100))
        
        # Count findings as progress indicator
        findings_count = len(re.findall(r"(Found:|Status:)", output))
        if findings_count > 0:
            # Assume more findings means more progress, cap at 90%
            return min(90, 10 + findings_count)
        
        # If we've started but no clear progress indicators
        if "Starting gobuster" in output:
            return 5
        
        # Default progress
        return 0