"""Simple integration tests to debug setup issues."""
import pytest
import json

def test_app_exists(app):
    """Test that the app fixture works."""
    assert app is not None
    assert app.config['TESTING'] is True

def test_client_works(client):
    """Test that the client fixture works."""
    assert client is not None

def test_routes_registered(app):
    """Test that routes are registered."""
    with app.app_context():
        # Get all registered routes
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append(rule.rule)
        
        print("Registered routes:", routes)
        
        # Check if auth routes are registered
        auth_routes = [route for route in routes if '/api/auth' in route]
        print("Auth routes:", auth_routes)

def test_basic_request(client):
    """Test a basic request to see what happens."""
    response = client.get('/')
    print(f"Response status: {response.status_code}")
    print(f"Response data: {response.data}")

def test_auth_register_route(client):
    """Test if the auth register route exists."""
    response = client.post('/api/auth/register')
    print(f"Register route status: {response.status_code}")
    print(f"Register route data: {response.data}")
    
    # Should not be 404 (route exists) but might be 400 (bad request)
    assert response.status_code != 404