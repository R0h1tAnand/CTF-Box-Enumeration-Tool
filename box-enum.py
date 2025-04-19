import subprocess
import threading
import os
from flask import Flask, render_template, request, jsonify, send_file
import json

app = Flask(__name__)

# --- Configuration ---
# Ensure these paths are correct for your system
OUTPUT_DIR = "scan_results"
NMAP_OUTPUT_FILE = os.path.join(OUTPUT_DIR, "nmap_results.txt")
DIRB_OUTPUT_FILE = os.path.join(OUTPUT_DIR, "dirb_results.txt")
GOBUSTER_OUTPUT_FILE = os.path.join(OUTPUT_DIR, "gobuster_results.txt")
# Default wordlist path
DEFAULT_WORDLIST = "/usr/share/wordlists/dirb/small.txt"

# --- Scan Status (simple in-memory storage) ---
scan_status = {
    "target_ip": None,
    "nmap": {"status": "idle", "output_file": NMAP_OUTPUT_FILE, "progress": 0},
    "dirb": {"status": "idle", "output_file": DIRB_OUTPUT_FILE, "progress": 0},
    "gobuster": {
        "status": "idle", 
        "output_file": GOBUSTER_OUTPUT_FILE,
        "wordlist": DEFAULT_WORDLIST,
        "progress": 0
    },
    "error": None
}

# Store active processes
active_processes = {
    "nmap": None,
    "dirb": None,
    "gobuster": None
}

def kill_process(process):
    """Safely kill a process and its children."""
    if process:
        try:
            import psutil
            parent = psutil.Process(process.pid)
            children = parent.children(recursive=True)
            for child in children:
                child.kill()
            parent.kill()
        except:
            # Fallback to basic process termination
            process.kill()

def stop_all_scans():
    """Stop all running scans."""
    for tool, process in active_processes.items():
        if process:
            kill_process(process)
            scan_status[tool]["status"] = "stopped"
            scan_status[tool]["progress"] = 0
            active_processes[tool] = None
    
    scan_status["error"] = "Scans stopped by user"

# --- Tool Functions ---
def run_nmap_scan(ip):
    """Run Nmap scan on target IP."""
    try:
        scan_status["nmap"]["status"] = "running"
        scan_status["nmap"]["progress"] = 0
        
        # Run Nmap with progress tracking
        process = subprocess.Popen(
            f"nmap -sC -sV -oN {NMAP_OUTPUT_FILE} {ip}",
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # Store process reference
        active_processes["nmap"] = process
        
        # Monitor the output to track progress
        while True:
            if process.poll() is not None:
                break
                
            output = process.stdout.readline()
            if output == '':
                continue
                
            # Update progress based on Nmap output
            if "Scanning" in output:
                scan_status["nmap"]["progress"] = 30
            elif "PORT" in output:
                scan_status["nmap"]["progress"] = 50
            elif "Service detection performed" in output:
                scan_status["nmap"]["progress"] = 80
        
        # Wait for process to complete
        process.wait()
        
        if process.returncode == 0:
            scan_status["nmap"]["status"] = "completed"
            scan_status["nmap"]["progress"] = 100
        else:
            scan_status["nmap"]["status"] = "failed"
            scan_status["nmap"]["error"] = process.stderr.read()
            scan_status["error"] = f"Nmap scan failed: {scan_status['nmap']['error']}"
            
    except Exception as e:
        scan_status["nmap"]["status"] = "failed"
        scan_status["nmap"]["error"] = str(e)
        scan_status["error"] = f"Nmap scan failed: {str(e)}"
    finally:
        active_processes["nmap"] = None
        if scan_status["nmap"]["status"] not in ["completed", "stopped"]:
            scan_status["nmap"]["progress"] = 0

def run_dirb_scan(ip):
    """Run Dirb scan on target IP."""
    try:
        scan_status["dirb"]["status"] = "running"
        scan_status["dirb"]["progress"] = 0
        
        # Run Dirb with progress tracking
        process = subprocess.Popen(
            f"dirb http://{ip} -o {DIRB_OUTPUT_FILE}",
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # Store process reference
        active_processes["dirb"] = process
        
        # Monitor the output to track progress
        while True:
            if process.poll() is not None:
                break
                
            output = process.stdout.readline()
            if output == '':
                continue
                
            # Update progress based on Dirb output
            if "START_TIME" in output:
                scan_status["dirb"]["progress"] = 10
            elif "GENERATED WORDS" in output:
                scan_status["dirb"]["progress"] = 30
            elif "FOUND" in output:
                # Increment progress for each found item
                current_progress = scan_status["dirb"]["progress"]
                scan_status["dirb"]["progress"] = min(90, current_progress + 5)
        
        # Wait for process to complete
        process.wait()

        if process.returncode == 0:
            scan_status["dirb"]["status"] = "completed"
            scan_status["dirb"]["progress"] = 100
        else:
            scan_status["dirb"]["status"] = "failed"
            scan_status["dirb"]["error"] = process.stderr.read()
            scan_status["error"] = f"Dirb scan failed: {scan_status['dirb']['error']}"
            
    except Exception as e:
        scan_status["dirb"]["status"] = "failed"
        scan_status["dirb"]["error"] = str(e)
        scan_status["error"] = f"Dirb scan failed: {str(e)}"
    finally:
        active_processes["dirb"] = None
        if scan_status["dirb"]["status"] not in ["completed", "stopped"]:
            scan_status["dirb"]["progress"] = 0

def run_gobuster_scan(ip, wordlist=None):
    """Run Gobuster scan on target IP."""
    try:
        scan_status["gobuster"]["status"] = "running"
        scan_status["gobuster"]["progress"] = 0
        wordlist_path = wordlist if wordlist else DEFAULT_WORDLIST
        scan_status["gobuster"]["wordlist"] = wordlist_path
        
        # Run Gobuster with progress tracking
        process = subprocess.Popen(
            f"gobuster dir -u http://{ip} -w {wordlist_path} -o {GOBUSTER_OUTPUT_FILE}",
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # Store process reference
        active_processes["gobuster"] = process
        
        # Monitor the output to track progress
        while True:
            if process.poll() is not None:
                break
                
            output = process.stdout.readline()
            if output == '':
                continue
                
            # Update progress based on Gobuster output
            if "Starting gobuster" in output:
                scan_status["gobuster"]["progress"] = 10
            elif "Progress:" in output:
                try:
                    # Extract progress percentage from Gobuster output
                    progress = int(output.split("[")[1].split("%")[0])
                    scan_status["gobuster"]["progress"] = progress
                except:
                    pass
        
        # Wait for process to complete
        process.wait()
        
        if process.returncode == 0:
            scan_status["gobuster"]["status"] = "completed"
            scan_status["gobuster"]["progress"] = 100
        else:
            scan_status["gobuster"]["status"] = "failed"
            scan_status["gobuster"]["error"] = process.stderr.read()
            scan_status["error"] = f"Gobuster scan failed: {scan_status['gobuster']['error']}"
            
    except Exception as e:
        scan_status["gobuster"]["status"] = "failed"
        scan_status["gobuster"]["error"] = str(e)
        scan_status["error"] = f"Gobuster scan failed: {str(e)}"
    finally:
        active_processes["gobuster"] = None
        if scan_status["gobuster"]["status"] not in ["completed", "stopped"]:
            scan_status["gobuster"]["progress"] = 0

# --- Flask Routes ---
@app.route('/')
def index():
    """Serves the main dashboard page."""
    return render_template('index.html')

@app.route('/scan', methods=['POST'])
def start_scan():
    """Start the scanning process."""
    try:
        data = request.get_json()
        ip_address = data.get('ip_address')
        wordlist = data.get('wordlist')
        selected_tools = data.get('selected_tools', [])

        if not ip_address:
            return jsonify({"error": "IP address is required"}), 400

        if not selected_tools:
            return jsonify({"error": "At least one tool must be selected"}), 400

        # Reset status for selected tools
        scan_status["target_ip"] = ip_address
        scan_status["error"] = None
        
        for tool in ["nmap", "dirb", "gobuster"]:
            if tool in selected_tools:
                scan_status[tool]["status"] = "idle"
                scan_status[tool]["error"] = None
            else:
                scan_status[tool]["status"] = "idle"

        # Create output directory if it doesn't exist
        try:
            os.makedirs(OUTPUT_DIR, exist_ok=True)
        except Exception as e:
            return jsonify({"error": f"Failed to create output directory: {str(e)}"}), 500

        # Start selected scans in separate threads
        try:
            if "nmap" in selected_tools:
                threading.Thread(target=run_nmap_scan, args=(ip_address,), daemon=True).start()
            
            if "dirb" in selected_tools:
                threading.Thread(target=run_dirb_scan, args=(ip_address,), daemon=True).start()
            
            if "gobuster" in selected_tools:
                threading.Thread(target=run_gobuster_scan, args=(ip_address, wordlist), daemon=True).start()

            return jsonify({"message": "Scan started successfully"}), 200

        except Exception as e:
            return jsonify({"error": f"Failed to start scans: {str(e)}"}), 500

    except Exception as e:
        return jsonify({"error": f"Invalid request: {str(e)}"}), 400

@app.route('/status')
def get_status():
    """Get the current status of all scans."""
    return jsonify(scan_status)

@app.route('/results/<tool>')
def get_results(tool):
    """Get the results for a specific tool."""
    if tool not in scan_status:
        return jsonify({"error": "Invalid tool specified"}), 400

    output_file = scan_status[tool]["output_file"]
    try:
        if os.path.exists(output_file):
            with open(output_file, 'r') as f:
                content = f.read()
            return jsonify({"content": content}), 200
        else:
            return jsonify({"content": "No results available yet"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/export/<tool>')
def export_results(tool):
    """Export results for a specific tool."""
    if tool not in scan_status:
        return jsonify({"error": "Invalid tool specified"}), 400

    output_file = scan_status[tool]["output_file"]
    try:
        if os.path.exists(output_file):
            return send_file(
                output_file,
                as_attachment=True,
                download_name=f"{tool}_results.txt"
            )
        else:
            return jsonify({"error": "No results available"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/stop', methods=['POST'])
def stop_scan():
    """Stop all running scans."""
    try:
        stop_all_scans()
        return jsonify({"message": "All scans stopped"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Main Execution ---
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
