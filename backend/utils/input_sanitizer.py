"""
Input sanitization utilities for preventing XSS and other injection attacks.
"""
import re
import html
import urllib.parse
from typing import Any, Dict, List, Union, Optional

class InputSanitizer:
    """Utility class for sanitizing user input to prevent XSS and injection attacks."""
    
    @staticmethod
    def sanitize_string(value: str) -> str:
        """
        Sanitize a string by escaping HTML special characters.
        
        Args:
            value: The string to sanitize
            
        Returns:
            Sanitized string
        """
        if not isinstance(value, str):
            return str(value)
        
        # Escape HTML special characters
        return html.escape(value)
    
    @staticmethod
    def sanitize_html(value: str) -> str:
        """
        Sanitize HTML content by removing potentially dangerous tags and attributes.
        
        Args:
            value: The HTML string to sanitize
            
        Returns:
            Sanitized HTML string
        """
        if not isinstance(value, str):
            return str(value)
        
        # Remove script tags and their content
        value = re.sub(r'<script[\s\S]*?</script>', '', value)
        
        # Remove on* event attributes
        value = re.sub(r' on\w+="[^"]*"', '', value)
        value = re.sub(r" on\w+='[^']*'", '', value)
        value = re.sub(r' on\w+=\w+', '', value)
        
        # Remove javascript: URLs
        value = re.sub(r'javascript:', 'blocked:', value, flags=re.IGNORECASE)
        
        # Remove data: URLs
        value = re.sub(r'data:', 'blocked:', value, flags=re.IGNORECASE)
        
        return value
    
    @staticmethod
    def sanitize_url(value: str) -> str:
        """
        Sanitize a URL by encoding special characters and removing javascript: protocol.
        
        Args:
            value: The URL to sanitize
            
        Returns:
            Sanitized URL
        """
        if not isinstance(value, str):
            return str(value)
        
        # Check for javascript: protocol
        if re.search(r'^javascript:', value, re.IGNORECASE):
            return '#'
        
        # Check for data: protocol
        if re.search(r'^data:', value, re.IGNORECASE):
            return '#'
        
        # For safe URLs, don't encode them
        if re.match(r'^https?://[a-zA-Z0-9.-]+', value):
            return value
        
        # URL encode for other cases
        return urllib.parse.quote(value, safe=':/?=&%#')
    
    @staticmethod
    def sanitize_sql(value: str) -> str:
        """
        Sanitize a string for SQL injection prevention.
        Note: This is a basic sanitization. Always use parameterized queries.
        
        Args:
            value: The string to sanitize
            
        Returns:
            Sanitized string
        """
        if not isinstance(value, str):
            return str(value)
        
        # Replace single quotes with two single quotes (SQL escape)
        return value.replace("'", "''")
    
    @staticmethod
    def sanitize_command(value: str) -> str:
        """
        Sanitize a string for command injection prevention.
        
        Args:
            value: The string to sanitize
            
        Returns:
            Sanitized string
        """
        if not isinstance(value, str):
            return str(value)
        
        # Remove shell special characters
        return re.sub(r'[;&|`$(){}\\]', '', value)
    
    @staticmethod
    def sanitize_ip_address(value: str) -> str:
        """
        Sanitize and validate an IP address.
        
        Args:
            value: The IP address to sanitize
            
        Returns:
            Sanitized IP address or empty string if invalid
        """
        if not isinstance(value, str):
            return ""
        
        # Check for valid IPv4
        ipv4_pattern = r'^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])$'
        if re.match(ipv4_pattern, value):
            return value
        
        # Check for valid IPv6
        ipv6_pattern = r'^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$'
        if re.match(ipv6_pattern, value):
            return value
        
        # Not a valid IP address
        return ""
    
    @staticmethod
    def sanitize_hostname(value: str) -> str:
        """
        Sanitize and validate a hostname.
        
        Args:
            value: The hostname to sanitize
            
        Returns:
            Sanitized hostname or empty string if invalid
        """
        if not isinstance(value, str):
            return ""
        
        # Check for valid hostname
        hostname_pattern = r'^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$'
        if re.match(hostname_pattern, value):
            return value
        
        # Not a valid hostname
        return ""
    
    @staticmethod
    def sanitize_dict(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Recursively sanitize all string values in a dictionary.
        
        Args:
            data: The dictionary to sanitize
            
        Returns:
            Sanitized dictionary
        """
        if not isinstance(data, dict):
            return {}
        
        sanitized = {}
        for key, value in data.items():
            if isinstance(value, str):
                sanitized[key] = InputSanitizer.sanitize_string(value)
            elif isinstance(value, dict):
                sanitized[key] = InputSanitizer.sanitize_dict(value)
            elif isinstance(value, list):
                sanitized[key] = InputSanitizer.sanitize_list(value)
            else:
                sanitized[key] = value
        
        return sanitized
    
    @staticmethod
    def sanitize_list(data: List[Any]) -> List[Any]:
        """
        Recursively sanitize all string values in a list.
        
        Args:
            data: The list to sanitize
            
        Returns:
            Sanitized list
        """
        if not isinstance(data, list):
            return []
        
        sanitized = []
        for item in data:
            if isinstance(item, str):
                sanitized.append(InputSanitizer.sanitize_string(item))
            elif isinstance(item, dict):
                sanitized.append(InputSanitizer.sanitize_dict(item))
            elif isinstance(item, list):
                sanitized.append(InputSanitizer.sanitize_list(item))
            else:
                sanitized.append(item)
        
        return sanitized
    
    @staticmethod
    def validate_target(target: str) -> bool:
        """
        Validate a scan target (IP address or hostname).
        
        Args:
            target: The target to validate
            
        Returns:
            True if valid, False otherwise
        """
        if not target:
            return False
        
        # Check if it looks like an IP address first (contains only digits and dots)
        if re.match(r'^[\d.]+$', target):
            # Check if it's a valid IPv4 address
            ipv4_pattern = r'^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])$'
            return bool(re.match(ipv4_pattern, target))
        
        # Check if it's a valid IPv6 address
        if ':' in target:
            ipv6_pattern = r'^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$'
            return bool(re.match(ipv6_pattern, target))
        
        # Check if it's a valid hostname
        hostname_pattern = r'^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$'
        return bool(re.match(hostname_pattern, target))