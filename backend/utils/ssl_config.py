"""
SSL/HTTPS configuration utilities.
"""
import os
import ssl
from flask import Flask
import logging

logger = logging.getLogger(__name__)

class SSLConfig:
    """SSL/HTTPS configuration manager."""
    
    @staticmethod
    def configure_ssl(app: Flask) -> dict:
        """
        Configure SSL settings for the Flask application.
        
        Args:
            app: Flask application instance
            
        Returns:
            SSL context configuration for use with socketio.run()
        """
        ssl_context = None
        
        # Check if SSL is disabled
        if app.config.get('SSL_DISABLE', True):
            logger.info("SSL is disabled in configuration")
            return None
        
        cert_path = app.config.get('SSL_CERT_PATH')
        key_path = app.config.get('SSL_KEY_PATH')
        
        if not cert_path or not key_path:
            logger.warning("SSL certificate or key path not configured")
            return None
        
        if not os.path.exists(cert_path):
            logger.error(f"SSL certificate file not found: {cert_path}")
            return None
        
        if not os.path.exists(key_path):
            logger.error(f"SSL key file not found: {key_path}")
            return None
        
        try:
            # Create SSL context
            ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            ssl_context.load_cert_chain(cert_path, key_path)
            
            # Configure SSL settings for security
            ssl_context.set_ciphers('ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS')
            ssl_context.options |= ssl.OP_NO_SSLv2
            ssl_context.options |= ssl.OP_NO_SSLv3
            ssl_context.options |= ssl.OP_NO_TLSv1
            ssl_context.options |= ssl.OP_NO_TLSv1_1
            ssl_context.options |= ssl.OP_SINGLE_DH_USE
            ssl_context.options |= ssl.OP_SINGLE_ECDH_USE
            
            # Enable OCSP stapling if supported
            try:
                ssl_context.options |= ssl.OP_ENABLE_MIDDLEBOX_COMPAT
            except AttributeError:
                pass  # Not available in older Python versions
            
            logger.info(f"SSL configured with certificate: {cert_path}")
            return ssl_context
            
        except Exception as e:
            logger.error(f"Failed to configure SSL: {str(e)}")
            return None
    
    @staticmethod
    def generate_self_signed_cert(cert_path: str, key_path: str, hostname: str = 'localhost') -> bool:
        """
        Generate a self-signed certificate for development/testing.
        
        Args:
            cert_path: Path where certificate will be saved
            key_path: Path where private key will be saved
            hostname: Hostname for the certificate
            
        Returns:
            True if certificate was generated successfully, False otherwise
        """
        try:
            from cryptography import x509
            from cryptography.x509.oid import NameOID
            from cryptography.hazmat.primitives import hashes, serialization
            from cryptography.hazmat.primitives.asymmetric import rsa
            from datetime import datetime, timedelta
            import ipaddress
            
            # Generate private key
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
            )
            
            # Create certificate
            subject = issuer = x509.Name([
                x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
                x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "CA"),
                x509.NameAttribute(NameOID.LOCALITY_NAME, "San Francisco"),
                x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Cybersecurity Toolkit"),
                x509.NameAttribute(NameOID.COMMON_NAME, hostname),
            ])
            
            # Build certificate
            cert = x509.CertificateBuilder().subject_name(
                subject
            ).issuer_name(
                issuer
            ).public_key(
                private_key.public_key()
            ).serial_number(
                x509.random_serial_number()
            ).not_valid_before(
                datetime.utcnow()
            ).not_valid_after(
                datetime.utcnow() + timedelta(days=365)
            ).add_extension(
                x509.SubjectAlternativeName([
                    x509.DNSName(hostname),
                    x509.DNSName("localhost"),
                    x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
                ]),
                critical=False,
            ).sign(private_key, hashes.SHA256())
            
            # Ensure directories exist
            os.makedirs(os.path.dirname(cert_path), exist_ok=True)
            os.makedirs(os.path.dirname(key_path), exist_ok=True)
            
            # Write certificate
            with open(cert_path, "wb") as f:
                f.write(cert.public_bytes(serialization.Encoding.PEM))
            
            # Write private key
            with open(key_path, "wb") as f:
                f.write(private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                ))
            
            # Set appropriate permissions
            os.chmod(key_path, 0o600)
            os.chmod(cert_path, 0o644)
            
            logger.info(f"Self-signed certificate generated: {cert_path}")
            return True
            
        except ImportError:
            logger.error("cryptography library not installed. Cannot generate self-signed certificate.")
            return False
        except Exception as e:
            logger.error(f"Failed to generate self-signed certificate: {str(e)}")
            return False
    
    @staticmethod
    def validate_certificate(cert_path: str, key_path: str) -> bool:
        """
        Validate SSL certificate and key files.
        
        Args:
            cert_path: Path to certificate file
            key_path: Path to private key file
            
        Returns:
            True if certificate and key are valid, False otherwise
        """
        try:
            # Check if files exist
            if not os.path.exists(cert_path):
                logger.error(f"Certificate file not found: {cert_path}")
                return False
            
            if not os.path.exists(key_path):
                logger.error(f"Key file not found: {key_path}")
                return False
            
            # Try to load certificate and key
            ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            ssl_context.load_cert_chain(cert_path, key_path)
            
            logger.info("SSL certificate and key validation successful")
            return True
            
        except Exception as e:
            logger.error(f"SSL certificate validation failed: {str(e)}")
            return False