#!/usr/bin/env python3
"""
Debug JWT token issues.
"""

import requests
import json
import jwt as pyjwt
import time

# Base URL for the API
BASE_URL = "http://localhost:5000/api/auth"

def debug_jwt_token():
    """Debug JWT token creation and validation."""
    print("🔍 Debugging JWT Token Issues")
    print("=" * 50)
    
    # Test data with unique username
    test_user = {
        "username": f"debuguser_{int(time.time())}",
        "email": f"debug_{int(time.time())}@example.com",
        "password": "TestPassword123"
    }
    
    # Register user
    print("1. Registering user...")
    try:
        response = requests.post(f"{BASE_URL}/register", json=test_user)
        if response.status_code != 201:
            print(f"❌ Registration failed: {response.json()}")
            return
        print("✅ Registration successful")
    except Exception as e:
        print(f"❌ Registration error: {e}")
        return
    
    # Login user
    print("\n2. Logging in user...")
    login_data = {
        "username": test_user["username"],
        "password": test_user["password"]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/login", json=login_data)
        if response.status_code != 200:
            print(f"❌ Login failed: {response.json()}")
            return
        
        response_data = response.json()
        access_token = response_data.get('access_token')
        print("✅ Login successful")
        print(f"Access token: {access_token}")
        
        # Decode token to see its contents (without verification for debugging)
        try:
            decoded = pyjwt.decode(access_token, options={"verify_signature": False})
            print(f"Token payload: {json.dumps(decoded, indent=2)}")
        except Exception as e:
            print(f"Token decode error: {e}")
        
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    # Test profile access with detailed headers
    print("\n3. Testing profile access...")
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/profile", headers=headers)
        print(f"Profile response status: {response.status_code}")
        print(f"Profile response headers: {dict(response.headers)}")
        print(f"Profile response body: {response.text}")
        
        if response.status_code == 200:
            print("✅ Profile access successful")
        else:
            print("❌ Profile access failed")
            
    except Exception as e:
        print(f"❌ Profile error: {e}")

if __name__ == "__main__":
    debug_jwt_token()