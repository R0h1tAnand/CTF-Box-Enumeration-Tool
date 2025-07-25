"""
Rate limiting middleware for Flask to prevent brute force attacks.
"""
import time
from typing import Dict, Tuple, Callable, Any
from flask import request, jsonify, current_app
from functools import wraps

class RateLimiter:
    """Rate limiting implementation for Flask routes."""
    
    # Store request counts per IP address
    # Format: {ip_address: [(timestamp1, count1), (timestamp2, count2), ...]}
    request_history: Dict[str, list] = {}
    
    @staticmethod
    def get_client_ip() -> str:
        """
        Get the client's IP address from the request.
        
        Returns:
            Client IP address
        """
        # Check for X-Forwarded-For header (for proxies)
        if request.headers.get('X-Forwarded-For'):
            ip = request.headers.get('X-Forwarded-For').split(',')[0].strip()
        else:
            ip = request.remote_addr or '0.0.0.0'
        
        return ip
    
    @staticmethod
    def clean_old_requests(ip: str, window_seconds: int) -> None:
        """
        Remove requests older than the time window.
        
        Args:
            ip: Client IP address
            window_seconds: Time window in seconds
        """
        if ip not in RateLimiter.request_history:
            return
        
        current_time = time.time()
        RateLimiter.request_history[ip] = [
            (timestamp, count) for timestamp, count in RateLimiter.request_history[ip]
            if current_time - timestamp < window_seconds
        ]
        
        # Remove empty entries
        if not RateLimiter.request_history[ip]:
            del RateLimiter.request_history[ip]
    
    @staticmethod
    def add_request(ip: str) -> None:
        """
        Add a request to the history for an IP address.
        
        Args:
            ip: Client IP address
        """
        current_time = time.time()
        
        if ip not in RateLimiter.request_history:
            RateLimiter.request_history[ip] = [(current_time, 1)]
        else:
            RateLimiter.request_history[ip].append((current_time, 1))
    
    @staticmethod
    def get_request_count(ip: str, window_seconds: int) -> int:
        """
        Get the number of requests from an IP within the time window.
        
        Args:
            ip: Client IP address
            window_seconds: Time window in seconds
            
        Returns:
            Number of requests
        """
        if ip not in RateLimiter.request_history:
            return 0
        
        current_time = time.time()
        count = sum(
            count for timestamp, count in RateLimiter.request_history[ip]
            if current_time - timestamp < window_seconds
        )
        
        return count
    
    @staticmethod
    def limit(
        requests_per_window: int, 
        window_seconds: int, 
        by_endpoint: bool = False
    ) -> Callable:
        """
        Rate limiting decorator for Flask routes.
        
        Args:
            requests_per_window: Maximum number of requests allowed in the time window
            window_seconds: Time window in seconds
            by_endpoint: Whether to limit by endpoint or globally per IP
            
        Returns:
            Decorated function
        """
        def decorator(f: Callable) -> Callable:
            @wraps(f)
            def wrapped(*args: Any, **kwargs: Any) -> Any:
                # Get client IP
                ip = RateLimiter.get_client_ip()
                
                # Add endpoint to IP if limiting by endpoint
                if by_endpoint:
                    ip = f"{ip}:{request.endpoint}"
                
                # Clean old requests
                RateLimiter.clean_old_requests(ip, window_seconds)
                
                # Check if limit exceeded
                request_count = RateLimiter.get_request_count(ip, window_seconds)
                
                if request_count >= requests_per_window:
                    # Calculate time until reset
                    if ip in RateLimiter.request_history and RateLimiter.request_history[ip]:
                        oldest_timestamp = min(timestamp for timestamp, _ in RateLimiter.request_history[ip])
                        reset_time = oldest_timestamp + window_seconds - time.time()
                    else:
                        reset_time = window_seconds
                    
                    # Return rate limit exceeded response
                    response = jsonify({
                        'error': True,
                        'message': 'Rate limit exceeded. Please try again later.',
                        'code': 'RATE_LIMIT_EXCEEDED',
                        'reset_in': max(0, int(reset_time))
                    })
                    response.status_code = 429
                    return response
                
                # Add request to history
                RateLimiter.add_request(ip)
                
                # Execute the original function
                return f(*args, **kwargs)
            
            return wrapped
        
        return decorator