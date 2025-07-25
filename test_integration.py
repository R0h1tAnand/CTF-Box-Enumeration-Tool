#!/usr/bin/env python3
"""
Integration test runner for the cybersecurity toolkit platform.
Runs comprehensive system-wide tests to verify all components work together.
"""

import os
import sys
import subprocess
import time
import threading
import signal
from pathlib import Path

class IntegrationTestRunner:
    def __init__(self):
        self.backend_process = None
        self.frontend_process = None
        self.test_results = {}
        
    def start_backend(self):
        """Start the Flask backend server for testing."""
        print("Starting backend server...")
        os.chdir('backend')
        
        # Set test environment
        env = os.environ.copy()
        env['FLASK_ENV'] = 'testing'
        env['TESTING'] = 'true'
        
        self.backend_process = subprocess.Popen(
            [sys.executable, 'app.py'],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for server to start
        time.sleep(3)
        os.chdir('..')
        
    def start_frontend(self):
        """Start the React frontend development server for testing."""
        print("Starting frontend server...")
        os.chdir('frontend')
        
        self.frontend_process = subprocess.Popen(
            ['npm', 'run', 'dev'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for server to start
        time.sleep(5)
        os.chdir('..')
        
    def stop_servers(self):
        """Stop both backend and frontend servers."""
        if self.backend_process:
            self.backend_process.terminate()
            self.backend_process.wait()
            
        if self.frontend_process:
            self.frontend_process.terminate()
            self.frontend_process.wait()
            
    def run_backend_tests(self):
        """Run backend integration tests."""
        print("\n" + "="*50)
        print("RUNNING BACKEND INTEGRATION TESTS")
        print("="*50)
        
        os.chdir('backend')
        
        try:
            # Run system integration tests
            result = subprocess.run(
                [sys.executable, '-m', 'pytest', 'tests/test_system_integration.py', '-v'],
                capture_output=True,
                text=True,
                timeout=300
            )
            
            self.test_results['backend_integration'] = {
                'success': result.returncode == 0,
                'output': result.stdout,
                'errors': result.stderr
            }
            
            print("Backend Integration Tests Output:")
            print(result.stdout)
            if result.stderr:
                print("Errors:")
                print(result.stderr)
                
        except subprocess.TimeoutExpired:
            self.test_results['backend_integration'] = {
                'success': False,
                'output': '',
                'errors': 'Tests timed out after 5 minutes'
            }
            print("Backend tests timed out!")
            
        finally:
            os.chdir('..')
            
    def run_frontend_tests(self):
        """Run frontend integration tests."""
        print("\n" + "="*50)
        print("RUNNING FRONTEND INTEGRATION TESTS")
        print("="*50)
        
        os.chdir('frontend')
        
        try:
            # Run integration tests
            result = subprocess.run(
                ['npm', 'run', 'test', '--', 'src/tests/integration/', '--run'],
                capture_output=True,
                text=True,
                timeout=300
            )
            
            self.test_results['frontend_integration'] = {
                'success': result.returncode == 0,
                'output': result.stdout,
                'errors': result.stderr
            }
            
            print("Frontend Integration Tests Output:")
            print(result.stdout)
            if result.stderr:
                print("Errors:")
                print(result.stderr)
                
        except subprocess.TimeoutExpired:
            self.test_results['frontend_integration'] = {
                'success': False,
                'output': '',
                'errors': 'Tests timed out after 5 minutes'
            }
            print("Frontend tests timed out!")
            
        finally:
            os.chdir('..')
            
    def run_e2e_tests(self):
        """Run end-to-end tests with both servers running."""
        print("\n" + "="*50)
        print("RUNNING END-TO-END TESTS")
        print("="*50)
        
        os.chdir('backend')
        
        try:
            # Run E2E workflow tests
            result = subprocess.run(
                [sys.executable, '-m', 'pytest', 'tests/test_e2e_workflows.py', '-v'],
                capture_output=True,
                text=True,
                timeout=600
            )
            
            self.test_results['e2e_tests'] = {
                'success': result.returncode == 0,
                'output': result.stdout,
                'errors': result.stderr
            }
            
            print("E2E Tests Output:")
            print(result.stdout)
            if result.stderr:
                print("Errors:")
                print(result.stderr)
                
        except subprocess.TimeoutExpired:
            self.test_results['e2e_tests'] = {
                'success': False,
                'output': '',
                'errors': 'Tests timed out after 10 minutes'
            }
            print("E2E tests timed out!")
            
        finally:
            os.chdir('..')
            
    def test_theme_switching(self):
        """Test theme switching functionality across the application."""
        print("\n" + "="*50)
        print("TESTING THEME SWITCHING")
        print("="*50)
        
        os.chdir('backend')
        
        try:
            # Run theme-specific tests
            result = subprocess.run([
                sys.executable, '-m', 'pytest', 
                'tests/test_system_integration.py::TestSystemIntegration::test_theme_switching_integration',
                '-v'
            ], capture_output=True, text=True, timeout=120)
            
            self.test_results['theme_switching'] = {
                'success': result.returncode == 0,
                'output': result.stdout,
                'errors': result.stderr
            }
            
            print("Theme Switching Test Output:")
            print(result.stdout)
            if result.stderr:
                print("Errors:")
                print(result.stderr)
                
        except subprocess.TimeoutExpired:
            self.test_results['theme_switching'] = {
                'success': False,
                'output': '',
                'errors': 'Theme switching tests timed out'
            }
            print("Theme switching tests timed out!")
            
        finally:
            os.chdir('..')
            
    def test_concurrent_operations(self):
        """Test concurrent user scenarios and scan operations."""
        print("\n" + "="*50)
        print("TESTING CONCURRENT OPERATIONS")
        print("="*50)
        
        os.chdir('backend')
        
        try:
            # Run concurrent operation tests
            result = subprocess.run([
                sys.executable, '-m', 'pytest', 
                'tests/test_system_integration.py::TestSystemIntegration::test_concurrent_user_scenarios',
                '-v'
            ], capture_output=True, text=True, timeout=180)
            
            self.test_results['concurrent_operations'] = {
                'success': result.returncode == 0,
                'output': result.stdout,
                'errors': result.stderr
            }
            
            print("Concurrent Operations Test Output:")
            print(result.stdout)
            if result.stderr:
                print("Errors:")
                print(result.stderr)
                
        except subprocess.TimeoutExpired:
            self.test_results['concurrent_operations'] = {
                'success': False,
                'output': '',
                'errors': 'Concurrent operations tests timed out'
            }
            print("Concurrent operations tests timed out!")
            
        finally:
            os.chdir('..')
            
    def generate_report(self):
        """Generate a comprehensive test report."""
        print("\n" + "="*60)
        print("INTEGRATION TEST REPORT")
        print("="*60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result['success'])
        
        print(f"Total Test Suites: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        print("\nDetailed Results:")
        print("-" * 40)
        
        for test_name, result in self.test_results.items():
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            print(f"{test_name}: {status}")
            
            if not result['success'] and result['errors']:
                print(f"  Error: {result['errors'][:200]}...")
                
        # Save detailed report to file
        with open('integration_test_report.txt', 'w') as f:
            f.write("INTEGRATION TEST REPORT\n")
            f.write("="*60 + "\n\n")
            
            for test_name, result in self.test_results.items():
                f.write(f"{test_name.upper()}\n")
                f.write("-" * 40 + "\n")
                f.write(f"Success: {result['success']}\n")
                f.write(f"Output:\n{result['output']}\n")
                if result['errors']:
                    f.write(f"Errors:\n{result['errors']}\n")
                f.write("\n" + "="*60 + "\n\n")
                
        print(f"\nDetailed report saved to: integration_test_report.txt")
        
        return passed_tests == total_tests
        
    def run_all_tests(self):
        """Run all integration tests."""
        print("Starting comprehensive integration tests...")
        
        try:
            # Start servers
            self.start_backend()
            
            # Run backend tests
            self.run_backend_tests()
            
            # Run frontend tests (without server for unit-style integration tests)
            self.run_frontend_tests()
            
            # Run theme switching tests
            self.test_theme_switching()
            
            # Run concurrent operation tests
            self.test_concurrent_operations()
            
            # Run E2E tests with servers running
            self.run_e2e_tests()
            
        except KeyboardInterrupt:
            print("\nTests interrupted by user")
            
        finally:
            # Stop servers
            self.stop_servers()
            
        # Generate report
        success = self.generate_report()
        
        return success

def signal_handler(signum, frame):
    """Handle interrupt signals gracefully."""
    print("\nReceived interrupt signal. Cleaning up...")
    sys.exit(1)

def main():
    """Main entry point."""
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print("Cybersecurity Toolkit Platform - Integration Test Runner")
    print("="*60)
    
    # Check if we're in the right directory
    if not (Path('backend').exists() and Path('frontend').exists()):
        print("Error: Please run this script from the project root directory")
        sys.exit(1)
        
    # Check dependencies
    print("Checking dependencies...")
    
    # Check Python dependencies
    try:
        subprocess.run([sys.executable, '-c', 'import pytest'], check=True, capture_output=True)
    except subprocess.CalledProcessError:
        print("Error: pytest not found. Please install backend dependencies.")
        sys.exit(1)
        
    # Check Node.js dependencies
    if not Path('frontend/node_modules').exists():
        print("Error: Frontend dependencies not installed. Please run 'npm install' in frontend directory.")
        sys.exit(1)
        
    # Run tests
    runner = IntegrationTestRunner()
    success = runner.run_all_tests()
    
    if success:
        print("\n🎉 All integration tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Some integration tests failed. Check the report for details.")
        sys.exit(1)

if __name__ == '__main__':
    main()