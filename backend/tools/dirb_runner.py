"""Dirb tool runner implementation."""
import re
import os
import shutil
from typing import Dict, Any, List
from .base_runner import BaseToolRunner

class DirbRunner(BaseToolRunner):
    """Runner for Dirb web content scanner."""
    
    def get_tool_name(self) -> str:
        """Return the name of the tool."""
        return "dirb"
    
    def build_command(self) -> List[str]:
        """Build the command to run Dirb."""
        # Check if dirb is installed
        if not shutil.which("dirb"):
            raise RuntimeError("Dirb is not installed or not in PATH")
        
        # Start with base command
        command = ["dirb"]
        
        # Add target URL
        command.append(self.target)
        
        # Add wordlist
        wordlist = self.options.get("wordlist", "/usr/share/dirb/wordlists/common.txt")
        command.append(wordlist)
        
        # Add output file
        command.extend(["-o", self.output_file])
        
        # Add extensions if specified
        if "extensions" in self.options:
            command.extend(["-X", self.options["extensions"]])
        
        # Add custom user agent if specified
        if "user_agent" in self.options:
            command.extend(["-a", self.options["user_agent"]])
        
        # Add custom cookies if specified
        if "cookies" in self.options:
            command.extend(["-c", self.options["cookies"]])
        
        # Add custom headers if specified
        if "headers" in self.options:
            command.extend(["-H", self.options["headers"]])
        
        # Add speed delay if specified
        if "delay" in self.options:
            command.extend(["-z", str(self.options["delay"])])
        
        # Add custom flags if provided
        custom_flags = self.options.get("custom_flags", "")
        if custom_flags:
            command.extend(custom_flags.split())
        
        return command
    
    def parse_output(self, output: str) -> Dict[str, Any]:
        """Parse Dirb output into a structured format."""
        results = {
            "target": self.target,
            "wordlist": self.options.get("wordlist", "default"),
            "directories": [],
            "files": []
        }
        
        # Parse dirb output
        # Example: + http://example.com/admin/ (CODE:200|SIZE:1234)
        dir_pattern = re.compile(r"\+ (https?://[^\s]+/)\s+\(CODE:(\d+)\|SIZE:(\d+)\)")
        file_pattern = re.compile(r"\+ (https?://[^\s]+[^/])\s+\(CODE:(\d+)\|SIZE:(\d+)\)")
        
        # Find directories
        for match in dir_pattern.finditer(output):
            url, status, size = match.groups()
            results["directories"].append({
                "url": url,
                "status": int(status),
                "size": int(size)
            })
        
        # Find files
        for match in file_pattern.finditer(output):
            url, status, size = match.groups()
            # Skip if it's already in directories
            if not any(d["url"] == url for d in results["directories"]):
                results["files"].append({
                    "url": url,
                    "status": int(status),
                    "size": int(size)
                })
        
        return results
    
    def estimate_progress(self, output: str) -> int:
        """Estimate the progress percentage from Dirb output."""
        # Look for completion indicators
        if "FINISHED" in output:
            return 100
        
        # Look for progress indicators
        # Dirb doesn't provide explicit progress, so we need to estimate
        
        # Count the number of tested entries
        tested_match = re.search(r"TESTED: (\d+)", output)
        if tested_match:
            tested = int(tested_match.group(1))
            # Estimate progress based on number of tested entries
            # This is a rough estimate as we don't know the total
            if tested > 5000:
                return 95
            elif tested > 2000:
                return 80
            elif tested > 1000:
                return 60
            elif tested > 500:
                return 40
            elif tested > 100:
                return 20
            elif tested > 0:
                return 10
        
        # If we've found some directories/files, we're making progress
        findings = len(re.findall(r"\+ (https?://[^\s]+)", output))
        if findings > 0:
            # More findings suggest more progress
            return min(90, 5 + findings * 2)
        
        # If we've started but no clear progress indicators
        if "START_TIME" in output:
            return 5
        
        # Default progress
        return 0