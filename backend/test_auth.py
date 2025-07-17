#!/usr/bin/env python3
"""
Test script for authentication API endpoints.
This script tests the JWT-based authentication system.
"""

import requests
import json
import sys
import time

# Base URL for the API
BASE_URL = "http://localhost:5000/api/auth"

def test_registration():
    """Test user registration endpoint."""
    print("Testing user registration...")
    
    # Test data with unique username
    import time
    test_user = {
        "username": f"testuser_{int(time.time())}",
        "email": f"test_{int(time.time())}@example.com",
        "password": "TestPassword123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/register", json=test_user)
        print(f"Registration Status Code: {response.status_code}")
        print(f"Registration Response: {response.json()}")
        
        if response.status_code == 201:
            print("✅ Registration successful")
            return test_user['username'], test_user['password']
        else:
            print("❌ Registration failed")
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
        response_data = response.json()
        print(f"Login Response: {response_data}")
        
        if response.status_code == 200 and 'access_token' in response_data:
            print("✅ Login successful")
            return response_data['access_token'], response_data['refresh_token']
        else:
            print("❌ Login failed")
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
        print(f"Profile Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ Profile access successful")
            return True
        else:
            print("❌ Profile access failed")
            return False
            
    except Exception as e:
        print(f"❌ Profile error: {e}")
        return False

def test_refresh_token(refresh_token):
    """Test token refresh endpoint."""
    print("\nTesting token refresh...")
    
    headers = {
        "Authorization": f"Bearer {refresh_token}"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/refresh", headers=headers)
        print(f"Refresh Status Code: {response.status_code}")
        response_data = response.json()
        print(f"Refresh Response: {response_data}")
        
        if response.status_code == 200 and 'access_token' in response_data:
            print("✅ Token refresh successful")
            return response_data['access_token']
        else:
            print("❌ Token refresh failed")
            return None
            
    except Exception as e:
        print(f"❌ Refresh error: {e}")
        return None

def test_logout(access_token):
    """Test logout endpoint."""
    print("\nTesting logout...")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/logout", headers=headers)
        print(f"Logout Status Code: {response.status_code}")
        print(f"Logout Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ Logout successful")
            return True
        else:
            print("❌ Logout failed")
            return False
            
    except Exception as e:
        print(f"❌ Logout error: {e}")
        return False

def test_invalid_credentials():
    """Test login with invalid credentials."""
    print("\nTesting invalid credentials...")
    
    invalid_data = {
        "username": "nonexistent",
        "password": "wrongpassword"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/login", json=invalid_data)
        print(f"Invalid Login Status Code: {response.status_code}")
        print(f"Invalid Login Response: {response.json()}")
        
        if response.status_code == 401:
            print("✅ Invalid credentials properly rejected")
            return True
        else:
            print("❌ Invalid credentials test failed")
            return False
            
    except Exception as e:
        print(f"❌ Invalid credentials test error: {e}")
        return False

def main():
    """Run all authentication tests."""
    print("🚀 Starting Authentication API Tests")
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
    if not test_profile(access_token):
        print("\n❌ Profile test failed")
    
    # Test token refresh
    new_access_token = test_refresh_token(refresh_token)
    if new_access_token:
        access_token = new_access_token
    
    # Test invalid credentials
    test_invalid_credentials()
    
    # Test logout
    test_logout(access_token)
    
    print("\n" + "=" * 50)
    print("🎉 Authentication API tests completed!")

if __name__ == "__main__":
    main()