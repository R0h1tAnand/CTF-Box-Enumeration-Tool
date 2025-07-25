"""
Security headers middleware for Flask.
"""
from flask import Flask, Response, current_app
import os

class SecurityHeaders:
    """Security headers middleware for Flask."""
    
    @staticmethod
    def init_app(app: Flask) -> None:
        """
        Initialize security headers for a Flask application.
        
        Args:
            app: Flask application instance
        """
        @app.after_request
        def add_security_headers(response: Response) -> Response:
            """
            Add security headers to all responses.
            
            Args:
                response: Flask response object
                
            Returns:
                Response with security headers
            """
            # Get environment configuration
            is_production = app.config.get('ENV') == 'production'
            ssl_enabled = not app.config.get('SSL_DISABLE', True)
            
            # Content Security Policy - stricter for production
            if is_production:
                csp_policy = (
                    "default-src 'self'; "
                    "script-src 'self'; "
                    "style-src 'self' 'unsafe-inline'; "
                    "img-src 'self' data: https:; "
                    "font-src 'self'; "
                    "connect-src 'self' wss:; "
                    "frame-ancestors 'none'; "
                    "form-action 'self'; "
                    "base-uri 'self'; "
                    "object-src 'none'; "
                    "upgrade-insecure-requests"
                )
            else:
                csp_policy = (
                    "default-src 'self'; "
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                    "style-src 'self' 'unsafe-inline'; "
                    "img-src 'self' data:; "
                    "font-src 'self'; "
                    "connect-src 'self' ws: wss:; "
                    "frame-ancestors 'none'; "
                    "form-action 'self'"
                )
            
            response.headers['Content-Security-Policy'] = csp_policy
            
            # Prevent browsers from MIME-sniffing
            response.headers['X-Content-Type-Options'] = 'nosniff'
            
            # Prevent clickjacking
            response.headers['X-Frame-Options'] = 'DENY'
            
            # Enable browser XSS protection
            response.headers['X-XSS-Protection'] = '1; mode=block'
            
            # Strict Transport Security (HSTS) - only in production with HTTPS
            if is_production and ssl_enabled:
                response.headers['Strict-Transport-Security'] = (
                    'max-age=31536000; includeSubDomains; preload'
                )
            
            # Referrer Policy
            response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
            
            # Feature Policy / Permissions Policy
            response.headers['Permissions-Policy'] = (
                "camera=(), "
                "microphone=(), "
                "geolocation=(), "
                "payment=(), "
                "usb=(), "
                "magnetometer=(), "
                "gyroscope=(), "
                "accelerometer=()"
            )
            
            # Cross-Origin Embedder Policy
            if is_production:
                response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
                response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
                response.headers['Cross-Origin-Resource-Policy'] = 'same-origin'
            
            # Cache Control for sensitive endpoints
            if '/api/' in response.headers.get('Location', '') or '/api/' in str(response.get_data()):
                response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
                response.headers['Pragma'] = 'no-cache'
                response.headers['Expires'] = '0'
            
            # Remove server information
            response.headers.pop('Server', None)
            
            return response