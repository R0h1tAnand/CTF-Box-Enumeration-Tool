#!/usr/bin/env python3
"""
Minimal JWT test to isolate the issue.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from flask_jwt_extended import create_access_token, decode_token
from models.user import User

def test_jwt_creation_and_validation():
    """Test JWT token creation and validation within the Flask app context."""
    print("🔍 Testing JWT Creation and Validation")
    print("=" * 50)
    
    app = create_app()
    
    with app.app_context():
        # Find an existing user
        user = User.query.first()
        if not user:
            print("❌ No users found in database")
            return
        
        print(f"Testing with user: {user.username} (ID: {user.id})")
        
        # Create access token
        try:
            access_token = create_access_token(identity=str(user.id))
            print(f"✅ Access token created: {access_token[:50]}...")
        except Exception as e:
            print(f"❌ Token creation failed: {e}")
            return
        
        # Try to decode the token
        try:
            decoded_token = decode_token(access_token)
            print(f"✅ Token decoded successfully: {decoded_token}")
        except Exception as e:
            print(f"❌ Token decoding failed: {e}")
            return
        
        # Test with Flask test client
        with app.test_client() as client:
            # Test profile endpoint
            headers = {'Authorization': f'Bearer {access_token}'}
            response = client.get('/api/auth/profile', headers=headers)
            
            print(f"Profile endpoint status: {response.status_code}")
            print(f"Profile endpoint response: {response.get_json()}")
            
            if response.status_code == 200:
                print("✅ Profile endpoint test successful")
            else:
                print("❌ Profile endpoint test failed")

if __name__ == "__main__":
    test_jwt_creation_and_validation()