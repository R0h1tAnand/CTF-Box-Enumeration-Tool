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
    "nmap": {"status": "idle", "output_file": NMAP_OUTPUT_FILE},
    "dirb": {"status": "idle", "output_file": DIRB_OUTPUT_FILE},
    "gobuster": {
        "status": "idle", 
        "output_file": GOBUSTER_OUTPUT_FILE,
        "wordlist": DEFAULT_WORDLIST
    },
    "error": None
}

# --- Tool Execution Functions ---
def run_command(command, tool_name, status_dict):
    """Runs a shell command and updates the status dictionary."""
    status_dict[tool_name]["status"] = "running"
    try:
        print(f"Starting {tool_name}...")
        # Use shell=True carefully, ensure command components are controlled
        process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate()

        if process.returncode == 0:
            status_dict[tool_name]["status"] = "completed"
            print(f"{tool_name} completed successfully.")
            # Basic: Just indicate completion. Real app should parse/store results.
        else:
            status_dict[tool_name]["status"] = "failed"
            status_dict[tool_name]["error"] = stderr.strip()
            print(f"{tool_name} failed: {stderr.strip()}")

    except FileNotFoundError:
        status_dict[tool_name]["status"] = "failed"
        status_dict[tool_name]["error"] = f"{tool_name} command not found. Is it installed and in PATH?"
        print(status_dict[tool_name]["error"])
    except Exception as e:
        status_dict[tool_name]["status"] = "failed"
        status_dict[tool_name]["error"] = str(e)
        print(f"An error occurred running {tool_name}: {e}")

def run_nmap(ip):
    """Runs Nmap scan."""
    command = f"nmap -sC -sV -oN {NMAP_OUTPUT_FILE} {ip}"
    run_command(command, "nmap", scan_status)

def run_dirb(ip):
    """Runs Dirb scan."""
    target_url = f"http://{ip}/"
    command = f"dirb {target_url} -o {DIRB_OUTPUT_FILE}"
    run_command(command, "dirb", scan_status)

def run_gobuster(ip, wordlist=None):
    """Runs Gobuster scan."""
    target_url = f"http://{ip}/"
    wordlist_path = wordlist or DEFAULT_WORDLIST
    
    if not os.path.exists(wordlist_path):
         scan_status["gobuster"]["status"] = "failed"
         scan_status["gobuster"]["error"] = f"Gobuster wordlist not found: {wordlist_path}"
         print(scan_status["gobuster"]["error"])
         return
         
    scan_status["gobuster"]["wordlist"] = wordlist_path
    command = f"gobuster dir -u {target_url} -w {wordlist_path} -o {GOBUSTER_OUTPUT_FILE}"
    run_command(command, "gobuster", scan_status)

# --- Flask Routes ---
@app.route('/')
def index():
    """Serves the main dashboard page."""
    return render_template('index.html')

@app.route('/scan', methods=['POST'])
def start_scan():
    """Starts the enumeration scans in separate threads."""
    global scan_status
    data = request.json
    ip = data.get('ip_address')
    wordlist = data.get('wordlist')

    if not ip:
        return jsonify({"error": "IP address is required"}), 400

    # Reset status for a new scan
    scan_status = {
        "target_ip": ip,
        "nmap": {"status": "idle", "output_file": NMAP_OUTPUT_FILE, "error": None},
        "dirb": {"status": "idle", "output_file": DIRB_OUTPUT_FILE, "error": None},
        "gobuster": {
            "status": "idle", 
            "output_file": GOBUSTER_OUTPUT_FILE, 
            "error": None,
            "wordlist": wordlist or DEFAULT_WORDLIST
        },
        "error": None
    }

    # Create output directory if it doesn't exist
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Delete previous output files
    for file_path in [NMAP_OUTPUT_FILE, DIRB_OUTPUT_FILE, GOBUSTER_OUTPUT_FILE]:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"Removed previous output file: {file_path}")
        except OSError as e:
            print(f"Error removing file {file_path}: {e}")

    try:
        # Create and start threads for each scan
        nmap_thread = threading.Thread(target=run_nmap, args=(ip,))
        dirb_thread = threading.Thread(target=run_dirb, args=(ip,))
        gobuster_thread = threading.Thread(target=run_gobuster, args=(ip, wordlist))

        nmap_thread.start()
        dirb_thread.start()
        gobuster_thread.start()

        return jsonify({"message": f"Scan started for {ip}"}), 202 # Accepted
    except Exception as e:
        scan_status["error"] = f"Failed to start threads: {e}"
        return jsonify({"error": scan_status["error"]}), 500

@app.route('/status')
def get_status():
    """Returns the current status of the scans."""
    return jsonify(scan_status)

@app.route('/results/<tool>')
def get_tool_results(tool):
    """Returns the contents of a tool's output file."""
    file_paths = {
        'nmap': NMAP_OUTPUT_FILE,
        'dirb': DIRB_OUTPUT_FILE,
        'gobuster': GOBUSTER_OUTPUT_FILE
    }
    
    if tool not in file_paths:
        return jsonify({'error': 'Invalid tool specified'}), 400
        
    file_path = file_paths[tool]
    
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                content = f.read()
            return jsonify({'content': content})
        else:
            return jsonify({'content': 'No results available yet'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/export/<tool>')
def export_results(tool):
    """Exports the results of a specific tool."""
    file_paths = {
        'nmap': NMAP_OUTPUT_FILE,
        'dirb': DIRB_OUTPUT_FILE,
        'gobuster': GOBUSTER_OUTPUT_FILE
    }
    
    if tool not in file_paths:
        return jsonify({'error': 'Invalid tool specified'}), 400
        
    file_path = file_paths[tool]
    
    if not os.path.exists(file_path):
        return jsonify({'error': 'No results available for export'}), 404
        
    try:
        return send_file(
            file_path,
            mimetype='text/plain',
            as_attachment=True,
            download_name=f"{tool}_results.txt"
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- Main Execution ---
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
