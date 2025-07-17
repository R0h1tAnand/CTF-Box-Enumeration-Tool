#!/usr/bin/env python3
"""
Simple test script for authentication API endpoints.
This script tests the JWT-based authentication system.
"""

import requests
import json
import time

# Base URL for the API
BASE_URL = "http://localhost:5000/api/auth"

def test_registration():
    """Test user registration endpoint."""
    print("Testing user registration...")
    
    # Test data with unique username
    test_user = {
        "username": f"testuser_{int(time.time())}",
        "email": f"test_{int(time.time())}@example.com",
        "password": "TestPassword123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/register", json=test_user)
        print(f"Registration Status Code: {response.status_code}")
        
        if response.status_code == 201:
            print("✅ Registration successful")
            response_data = response.json()
            print(f"User created: {response_data.get('user', {}).get('username')}")
            return test_user['username'], test_user['password']
        else:
            print("❌ Registration failed")
            print(f"Response: {response.json()}")
            return None, None
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection error - make sure Flask server is running")
        return None, None
    except Exception as e:
        print(f"❌ Registration error: {e}")
        return None, None

def test_login(username, password):
    """Test user login endpoint."""
    print(f"\nTesting user login with {username}...")
    
    # Login data
    login_data = {
        "username": username,
        "password": password
    }
    
    try:
        response = requests.post(f"{BASE_URL}/login", json=login_data)
        print(f"Login Status Code: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            print("✅ Login successful")
            print(f"Access token received: {response_data.get('access_token')[:20]}...")
            return response_data.get('access_token'), response_data.get('refresh_token')
        else:
            print("❌ Login failed")
            print(f"Response: {response.json()}")
            return None, None
            
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None, None

def test_profile(access_token):
    """Test profile endpoint with JWT token."""
    print("\nTesting profile endpoint...")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/profile", headers=headers)
        print(f"Profile Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Profile access successful")
            response_data = response.json()
            user_data = response_data.get('user', {})
            print(f"User profile: {user_data.get('username')} ({user_data.get('email')})")
            return True
        else:
            print("❌ Profile access failed")
            print(f"Response: {response.json()}")
            return False
            
    except Exception as e:
        print(f"❌ Profile error: {e}")
        return False

def main():
    """Run authentication tests."""
    print("🚀 Starting Simple Authentication API Tests")
    print("=" * 50)
    
    # Test registration
    username, password = test_registration()
    if not username:
        print("\n❌ Registration test failed - stopping tests")
        return
    
    # Test login
    access_token, refresh_token = test_login(username, password)
    if not access_token:
        print("\n❌ Login test failed - stopping tests")
        return
    
    # Test profile access
    if test_profile(access_token):
        print("\n✅ All authentication tests passed!")
    else:
        print("\n❌ Profile test failed")
    
    print("\n" + "=" * 50)
    print("🎉 Authentication API tests completed!")

if __name__ == "__main__":
    main()