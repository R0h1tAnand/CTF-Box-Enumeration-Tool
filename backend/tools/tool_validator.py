"""Utility for validating tool availability."""
import shutil
import logging
from typing import Dict, List, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ToolValidator:
    """Validator for checking if security tools are installed and available."""
    
    @staticmethod
    def check_tool_availability(tool_name: str) -> Tuple[bool, str]:
        """
        Check if a tool is installed and available in the system PATH.
        
        Args:
            tool_name: Name of the tool to check
        
        Returns:
            Tuple[bool, str]: (is_available, message)
        """
        if shutil.which(tool_name):
            return True, f"{tool_name} is available"
        else:
            return False, f"{tool_name} is not installed or not in PATH"
    
    @staticmethod
    def check_all_tools() -> Dict[str, Dict[str, bool]]:
        """
        Check availability of all supported security tools.
        
        Returns:
            Dict[str, Dict[str, bool]]: Tool availability status
        """
        tools = ["nmap", "gobuster", "dirb"]
        result = {}
        
        for tool in tools:
            is_available, message = ToolValidator.check_tool_availability(tool)
            result[tool] = {
                "available": is_available,
                "message": message
            }
        
        return result
    
    @staticmethod
    def get_available_tools() -> List[str]:
        """
        Get a list of available security tools.
        
        Returns:
            List[str]: Names of available tools
        """
        tools = ["nmap", "gobuster", "dirb"]
        available_tools = []
        
        for tool in tools:
            if shutil.which(tool):
                available_tools.append(tool)
        
        return available_tools