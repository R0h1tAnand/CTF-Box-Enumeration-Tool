// DOM Elements
const form = document.getElementById('scan-form');
const ipInput = document.getElementById('ip_address');
const wordlistInput = document.getElementById('wordlist');
const targetIpSpan = document.getElementById('target-ip');
const nmapStatusDiv = document.getElementById('nmap-status');
const dirbStatusDiv = document.getElementById('dirb-status');
const gobusterStatusDiv = document.getElementById('gobuster-status');
const errorLogDiv = document.getElementById('error-log');
const nmapResultSpan = document.getElementById('nmap-result');
const dirbResultSpan = document.getElementById('dirb-result');
const gobusterResultSpan = document.getElementById('gobuster-result');
const scanButton = document.getElementById('scan-button');
const refreshButton = document.getElementById('refresh-results');
const exportButton = document.getElementById('export-results');
const statusCards = document.querySelectorAll('.status-card');
const resultHeaders = document.querySelectorAll('.result-header');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('i');

let intervalId = null;

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Update icon
    if (theme === 'dark') {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    themeToggle.addEventListener('click', toggleTheme);
    
    form.addEventListener('submit', handleFormSubmit);
    refreshButton.addEventListener('click', handleRefresh);
    exportButton.addEventListener('click', handleExport);
    resultHeaders.forEach(header => {
        header.addEventListener('click', () => toggleResultContent(header));
    });
});

// IP Address Validation
ipInput.addEventListener('input', validateIpAddress);

// Wordlist Path Validation
if (wordlistInput) {
    wordlistInput.addEventListener('input', validateWordlistPath);
}

function validateWordlistPath(event) {
    const input = event.target;
    const value = input.value.trim();
    
    if (value && !value.endsWith('.txt')) {
        input.setCustomValidity('Wordlist must be a .txt file');
    } else {
        input.setCustomValidity('');
    }
}

function validateIpAddress(event) {
    const input = event.target;
    const value = input.value;
    const ipPattern = /^(\d{1,3}\.){0,3}\d{1,3}$/;
    
    if (value && !ipPattern.test(value)) {
        input.setCustomValidity('Please enter a valid IP address');
    } else {
        input.setCustomValidity('');
    }
}

// Tool descriptions
const toolDescriptions = {
    nmap: {
        title: "Nmap Network Scanner",
        description: "A powerful network scanning tool that helps identify:\n" +
            "• Open ports and services\n" +
            "• Operating system detection\n" +
            "• Service version information\n" +
            "• Network mapping and host discovery\n" +
            "• Security vulnerabilities"
    },
    dirb: {
        title: "Dirb Web Content Scanner",
        description: "A web content scanner that discovers:\n" +
            "• Hidden directories and files\n" +
            "• Web server vulnerabilities\n" +
            "• Backup files and old versions\n" +
            "• Configuration files\n" +
            "• Admin interfaces"
    },
    gobuster: {
        title: "Gobuster Directory Scanner",
        description: "A versatile scanning tool that performs:\n" +
            "• Directory/file enumeration\n" +
            "• DNS subdomain scanning\n" +
            "• Virtual host discovery\n" +
            "• Fuzzing parameters\n" +
            "• Custom wordlist scanning"
    }
};

// Progress Bar Animation
function updateProgress(toolName, progress) {
    const progressBar = document.getElementById(`${toolName}-progress`);
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
}

// Status Card Animation
function updateStatusCard(toolName, status) {
    const card = document.querySelector(`[data-tool="${toolName}"]`);
    if (card) {
        card.className = `status-card ${status}`;
        updateProgress(toolName, status === 'completed' ? 100 : status === 'running' ? 50 : 0);
    }
}

// Main Functions
async function handleFormSubmit(event) {
    event.preventDefault();
    const ip = ipInput.value;
    const wordlist = wordlistInput.value.trim();
    if (!ip) return;

    // Show loading state
    scanButton.disabled = true;
    const spinner = scanButton.querySelector('.loading-spinner');
    spinner.style.display = 'inline-block';

    // Clear previous status and stop polling if any
    if (intervalId) clearInterval(intervalId);
    resetUI();
    targetIpSpan.textContent = ip;

    try {
        const response = await fetch('/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ip_address: ip,
                wordlist: wordlist || undefined // Only send if not empty
            })
        });
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Scan started successfully', 'success');
            // Start polling for status updates
            intervalId = setInterval(fetchStatus, 2000);
            fetchStatus(); // Initial fetch
        } else {
            showNotification(`Error starting scan: ${result.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        showNotification(`Network error: ${error}`, 'error');
    } finally {
        // Reset button state
        scanButton.disabled = false;
        spinner.style.display = 'none';
    }
}

function resetUI() {
    ['nmap', 'dirb', 'gobuster'].forEach(tool => {
        updateStatusElement(document.getElementById(`${tool}-status`), tool, { status: 'idle' });
        updateStatusCard(tool, 'idle');
        document.querySelector(`[data-tool="${tool}"] .status-badge`).textContent = 'Idle';
    });
    
    nmapResultSpan.innerHTML = 'N/A';
    dirbResultSpan.innerHTML = 'N/A';
    gobusterResultSpan.innerHTML = 'N/A';
    errorLogDiv.textContent = '';
    targetIpSpan.textContent = 'N/A';
}

async function fetchStatus() {
    try {
        const response = await fetch('/status');
        const status = await response.json();

        // Update status elements and cards
        ['nmap', 'dirb', 'gobuster'].forEach(tool => {
            const statusElement = document.getElementById(`${tool}-status`);
            const resultSpan = document.getElementById(`${tool}-result`);
            
            // Update tool status
            if (statusElement && status[tool]) {
                updateStatusElement(statusElement, tool, status[tool]);
            }
            
            // Update result link if available
            if (resultSpan && status[tool]) {
                updateResultLink(resultSpan, status[tool]);
            }
            
            // If the result content is visible, update it
            const content = document.querySelector(`[data-tool="${tool}"] .result-content`);
            if (content && content.classList.contains('active')) {
                fetchToolResults(tool);
            }
        });

        if (targetIpSpan) targetIpSpan.textContent = status.target_ip || 'N/A';
        
        if (status.error) {
            showNotification(status.error, 'error');
        }

        // Stop polling if all scans are finished
        const finished = ['completed', 'failed'];
        if (finished.includes(status.nmap.status) &&
            finished.includes(status.dirb.status) &&
            finished.includes(status.gobuster.status)) {
            clearInterval(intervalId);
            intervalId = null;
            showNotification('All scans completed!', 'success');
        }
    } catch (error) {
        console.error("Error fetching status:", error);
        showNotification(`Error fetching status: ${error}`, 'error');
    }
}

function updateStatusElement(element, toolName, toolStatus) {
    if (!element) return;
    element.className = `status ${toolStatus.status}`;
    let text = `${toolName}: ${toolStatus.status}`;
    if (toolStatus.error) {
        text += ` (Error: ${toolStatus.error})`;
    }
    element.textContent = text;
    
    // Update the status badge
    updateStatusBadge(toolName, toolStatus.status);
    
    // Update the status card
    updateStatusCard(toolName, toolStatus.status);
}

function updateStatusBadge(toolName, status) {
    const badge = document.querySelector(`[data-tool="${toolName}"] .status-badge`);
    if (badge) {
        badge.className = `status-badge ${status}`;
        badge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }
}

function updateResultLink(element, toolStatus) {
    if (!element) return;
    if (toolStatus.status === 'completed' || toolStatus.status === 'failed') {
        element.innerHTML = `
            <a href="#" class="result-link" data-file="${toolStatus.output_file}">
                ${toolStatus.output_file} (${toolStatus.status})
            </a>`;
    } else {
        element.textContent = 'N/A';
    }
}

async function handleRefresh() {
    const button = document.getElementById('refresh-results');
    button.disabled = true;
    
    try {
        await fetchStatus();
        showNotification('Results refreshed', 'info');
    } catch (error) {
        showNotification('Failed to refresh results', 'error');
    } finally {
        button.disabled = false;
    }
}

function handleExport() {
    // Implement export functionality
    showNotification('Export feature coming soon!', 'info');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'info': return 'fa-info-circle';
        default: return 'fa-info-circle';
    }
}

// Initialize tooltips
document.querySelectorAll('[data-tooltip]').forEach(element => {
    element.addEventListener('mouseenter', showTooltip);
    element.addEventListener('mouseleave', hideTooltip);
});

// Result Display Functions
function toggleResultContent(header) {
    // Close all other open dropdowns
    resultHeaders.forEach(h => {
        if (h !== header && h.classList.contains('active')) {
            h.classList.remove('active');
            h.nextElementSibling.classList.remove('active');
        }
    });

    // Toggle the clicked dropdown
    const content = header.nextElementSibling;
    header.classList.toggle('active');
    content.classList.toggle('active');
    
    if (content.classList.contains('active')) {
        const tool = header.closest('.result-item').dataset.tool;
        fetchToolResults(tool);
    }
}

async function fetchToolResults(tool) {
    const outputElement = document.getElementById(`${tool}-output`);
    if (!outputElement) return;

    outputElement.classList.add('loading');
    outputElement.textContent = 'Loading results...';
    
    try {
        const response = await fetch(`/results/${tool}`);
        const data = await response.json();
        
        if (response.ok) {
            outputElement.textContent = data.content || 'No results available yet';
        } else {
            outputElement.textContent = `Error: ${data.error}`;
        }
    } catch (error) {
        outputElement.textContent = `Error fetching results: ${error}`;
    } finally {
        outputElement.classList.remove('loading');
    }
}

async function exportResults(tool) {
    try {
        const response = await fetch(`/export/${tool}`);
        
        if (response.ok) {
            // Create a blob from the response and trigger download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${tool}_results.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            
            showNotification(`${tool.toUpperCase()} results exported successfully`, 'success');
        } else {
            const error = await response.json();
            showNotification(`Export failed: ${error.error}`, 'error');
        }
    } catch (error) {
        showNotification(`Export failed: ${error}`, 'error');
    }
} 