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
const startButton = document.getElementById('start-button');
const stopButton = document.getElementById('stop-button');
const refreshButton = document.getElementById('refresh-results');
const exportButton = document.getElementById('export-results');
const statusCards = document.querySelectorAll('.status-card');
const resultHeaders = document.querySelectorAll('.result-header');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('i');

// Tool selection elements
const toolCheckboxes = document.querySelectorAll('input[name="selected_tools"]');

let intervalId = null;

// Session Management
let isScanning = false;
let sessionData = {
    targetIp: null,
    wordlist: null,
    toolStatuses: {},
    results: {},
    lastUpdate: null,
    selectedTools: [] // Add selected tools to session data
};

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    if (theme === 'dark') {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    loadSessionData();
    restoreToolSelection();
    updateUIForSelectedTools();
    
    themeToggle.addEventListener('click', toggleTheme);
    form.addEventListener('submit', handleFormSubmit);
    if (stopButton) {
        stopButton.addEventListener('click', handleStopScan);
        stopButton.style.display = 'none'; // Hide initially
    }
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
function updateStatusCard(toolName, status, progress) {
    const card = document.querySelector(`[data-tool="${toolName}"]`);
    if (card) {
        card.className = `status-card ${status}`;
        updateProgress(toolName, progress);
    }
}

// Load session data on page load
function loadSessionData() {
    // Clear any existing session data
    localStorage.removeItem('scanSessionData');
    sessionData = {
        targetIp: null,
        wordlist: null,
        toolStatuses: {},
        results: {},
        lastUpdate: null,
        selectedTools: []
    };
    
    // Reset the UI
    resetUI();
    
    // Uncheck all tool checkboxes
    toolCheckboxes.forEach(cb => {
        cb.checked = true; // Set to true since they're checked by default
    });
    
    // Clear form inputs
    if (ipInput) ipInput.value = '';
    if (wordlistInput) wordlistInput.value = '';
    
    // Reset target IP display
    if (targetIpSpan) targetIpSpan.textContent = 'N/A';
    
    // Clear all result displays
    ['nmap', 'dirb', 'gobuster'].forEach(tool => {
        const resultSpan = document.getElementById(`${tool}-result`);
        if (resultSpan) resultSpan.innerHTML = 'N/A';
        
        const outputElement = document.getElementById(`${tool}-output`);
        if (outputElement) outputElement.textContent = 'No results available';
        
        updateStatusElement(
            document.getElementById(`${tool}-status`),
            tool,
            { status: 'idle', progress: 0 }
        );
        updateStatusCard(tool, 'idle', 0);
    });
    
    // Reset buttons
    resetButtonStates();
    
    // Clear error log
    if (errorLogDiv) errorLogDiv.textContent = '';
}

// Save session data
function saveSessionData() {
    sessionData.lastUpdate = new Date().toISOString();
    localStorage.setItem('scanSessionData', JSON.stringify(sessionData));
}

// Restore UI from session data
function restoreUIFromSession() {
    if (sessionData.targetIp) {
        ipInput.value = sessionData.targetIp;
        targetIpSpan.textContent = sessionData.targetIp;
    }
    
    if (sessionData.wordlist) {
        wordlistInput.value = sessionData.wordlist;
    }
    
    // Restore tool statuses
    Object.entries(sessionData.toolStatuses).forEach(([tool, status]) => {
        updateStatusElement(document.getElementById(`${tool}-status`), tool, status);
        updateStatusCard(tool, status.status, status.progress || 0);
    });
    
    // Restore results
    Object.entries(sessionData.results).forEach(([tool, result]) => {
        const resultSpan = document.getElementById(`${tool}-result`);
        if (resultSpan && result) {
            updateResultLink(resultSpan, result);
        }
    });
    
    // If a scan was in progress, resume polling
    if (isActiveSession()) {
        isScanning = true;
        intervalId = setInterval(fetchStatus, 2000);
    }
}

// Check if there's an active scanning session
function isActiveSession() {
    if (!sessionData.lastUpdate) return false;
    
    const lastUpdate = new Date(sessionData.lastUpdate);
    const now = new Date();
    const timeDiff = now - lastUpdate;
    const hasRunningTools = Object.values(sessionData.toolStatuses).some(
        status => status.status === 'running'
    );
    
    // Consider session active if last update was within 5 minutes and has running tools
    return timeDiff < 5 * 60 * 1000 && hasRunningTools;
}

// Update session data with current tool status
function updateSessionStatus(toolName, status) {
    sessionData.toolStatuses[toolName] = status;
    if (status.output_file) {
        sessionData.results[toolName] = status;
    }
    saveSessionData();
}

// Handle page refresh/unload
window.addEventListener('beforeunload', (event) => {
    // Check if there's any session data or active scan
    if (Object.keys(sessionData).length > 0 || isScanning) {
        // Cancel the event
        event.preventDefault();
        // Chrome requires returnValue to be set
        event.returnValue = 'You have scan data that will be lost. Are you sure you want to leave?';
        return event.returnValue;
    }
});

// Add event listener for when the page is actually being unloaded
window.addEventListener('unload', () => {
    // Clear all session data
    localStorage.removeItem('scanSessionData');
    localStorage.removeItem('theme');
    sessionData = {
        targetIp: null,
        wordlist: null,
        toolStatuses: {},
        results: {},
        lastUpdate: null,
        selectedTools: []
    };
});

// Main Functions
async function handleFormSubmit(event) {
    event.preventDefault();
    const ip = ipInput.value;
    const wordlist = wordlistInput.value.trim();
    if (!ip) return;

    // Get selected tools
    const selectedTools = Array.from(toolCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    if (selectedTools.length === 0) {
        showNotification('Please select at least one tool to run', 'error');
        return;
    }

    // Update session data
    sessionData.targetIp = ip;
    sessionData.wordlist = wordlist;
    sessionData.selectedTools = selectedTools;
    isScanning = true;
    saveSessionData();

    // Update button states
    startButton.disabled = true;
    stopButton.style.display = 'inline-flex';
    stopButton.disabled = false;

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
                wordlist: wordlist || undefined,
                selected_tools: selectedTools
            })
        });
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Scan started successfully', 'success');
            intervalId = setInterval(fetchStatus, 2000);
            fetchStatus();
        } else {
            showNotification(`Error starting scan: ${result.error || 'Unknown error'}`, 'error');
            resetButtonStates();
        }
    } catch (error) {
        showNotification(`Network error: ${error}`, 'error');
        resetButtonStates();
    }
}

async function handleStopScan() {
    try {
        stopButton.disabled = true;
        const response = await fetch('/stop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            showNotification('Scans stopped successfully', 'info');
            isScanning = false;
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
            resetButtonStates();
            
            // Update status for all selected tools
            (sessionData.selectedTools || []).forEach(tool => {
                updateStatusElement(
                    document.getElementById(`${tool}-status`),
                    tool,
                    { status: 'stopped', progress: 0 }
                );
                updateStatusCard(tool, 'stopped', 0);
            });
        } else {
            const error = await response.json();
            showNotification(`Failed to stop scans: ${error.error}`, 'error');
            stopButton.disabled = false;
        }
    } catch (error) {
        showNotification(`Error stopping scans: ${error}`, 'error');
        stopButton.disabled = false;
    }
}

function resetButtonStates() {
    startButton.disabled = false;
    stopButton.style.display = 'none';
    stopButton.disabled = false;
}

function resetUI() {
    // Clear session data
    sessionData = {
        targetIp: null,
        wordlist: null,
        toolStatuses: {},
        results: {},
        lastUpdate: null,
        selectedTools: []
    };
    localStorage.removeItem('scanSessionData');
    isScanning = false;
    
    // Reset buttons
    resetButtonStates();
    
    // Reset all tool statuses
    ['nmap', 'dirb', 'gobuster'].forEach(tool => {
        updateStatusElement(
            document.getElementById(`${tool}-status`),
            tool,
            { status: 'idle', progress: 0 }
        );
        updateStatusCard(tool, 'idle', 0);
        
        const resultSpan = document.getElementById(`${tool}-result`);
        if (resultSpan) resultSpan.innerHTML = 'N/A';
        
        const outputElement = document.getElementById(`${tool}-output`);
        if (outputElement) outputElement.textContent = 'No results available';
        
        const statusBadge = document.querySelector(`[data-tool="${tool}"] .status-badge`);
        if (statusBadge) statusBadge.textContent = 'Idle';
    });
    
    // Clear error log
    if (errorLogDiv) errorLogDiv.textContent = '';
    
    // Reset target IP display
    if (targetIpSpan) targetIpSpan.textContent = 'N/A';
    
    // Stop any ongoing polling
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

async function fetchStatus() {
    try {
        const response = await fetch('/status');
        const status = await response.json();

        // Update session data with new status
        ['nmap', 'dirb', 'gobuster'].forEach(tool => {
            if (status[tool]) {
                updateSessionStatus(tool, status[tool]);
            }
        });

        // Update status elements and cards for selected tools only
        (sessionData.selectedTools || []).forEach(tool => {
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

        // Check if all selected scans are complete
        if (isAllScansComplete(status)) {
            isScanning = false;
            clearInterval(intervalId);
            intervalId = null;
            showNotification('All selected scans completed!', 'success');
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
    } else if (toolStatus.status === 'running') {
        text += ` (${toolStatus.progress || 0}%)`;
    }
    element.textContent = text;
    
    // Update the status badge
    updateStatusBadge(toolName, toolStatus.status);
    
    // Update the status card with progress
    updateStatusCard(toolName, toolStatus.status, toolStatus.progress || 0);
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

// Initialize notifications container
let notificationsContainer;

function initNotifications() {
    if (!document.querySelector('.notifications-container')) {
        notificationsContainer = document.createElement('div');
        notificationsContainer.className = 'notifications-container';
        document.body.appendChild(notificationsContainer);
    }
}

function showNotification(message, type = 'info') {
    initNotifications();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Create unique ID for the notification
    const notificationId = 'notification-' + Date.now();
    notification.id = notificationId;
    
    // Add content with close button
    notification.innerHTML = `
        <i class="fas ${getNotificationIcon(type)}"></i>
        <span>${message}</span>
        <button class="close-btn" onclick="removeNotification('${notificationId}')">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to container
    notificationsContainer.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto remove after delay
    const timeout = setTimeout(() => {
        removeNotification(notificationId);
    }, 5000);
    
    // Store timeout ID in the notification element
    notification.dataset.timeoutId = timeout;
}

function removeNotification(notificationId) {
    const notification = document.getElementById(notificationId);
    if (!notification) return;
    
    // Clear the auto-remove timeout
    clearTimeout(Number(notification.dataset.timeoutId));
    
    // Add fade-out class for animation
    notification.classList.add('fade-out');
    notification.classList.remove('show');
    
    // Remove element after animation
    setTimeout(() => {
        notification.remove();
        
        // Remove container if empty
        if (notificationsContainer && !notificationsContainer.hasChildNodes()) {
            notificationsContainer.remove();
            notificationsContainer = null;
        }
    }, 300);
}

// Update the getNotificationIcon function
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'info': return 'fa-info-circle';
        default: return 'fa-info-circle';
    }
}

// Add this to window object so it can be called from HTML
window.removeNotification = removeNotification;

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

// Save selected tools state
function saveToolSelection() {
    const selectedTools = Array.from(toolCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    sessionData.selectedTools = selectedTools;
    saveSessionData();
}

// Restore tool selection from session
function restoreToolSelection() {
    if (sessionData.selectedTools && sessionData.selectedTools.length > 0) {
        toolCheckboxes.forEach(cb => {
            cb.checked = sessionData.selectedTools.includes(cb.value);
        });
    }
}

// Update UI based on tool selection
function updateUIForSelectedTools() {
    const selectedTools = Array.from(toolCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    // Update visibility of status cards and result items
    ['nmap', 'dirb', 'gobuster'].forEach(tool => {
        const statusCard = document.querySelector(`[data-tool="${tool}"]`);
        const resultItem = document.querySelector(`.result-item[data-tool="${tool}"]`);
        
        if (statusCard) {
            statusCard.style.display = selectedTools.includes(tool) ? 'block' : 'none';
        }
        if (resultItem) {
            resultItem.style.display = selectedTools.includes(tool) ? 'block' : 'none';
        }
    });
}

// Add event listeners for tool selection
toolCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        saveToolSelection();
        updateUIForSelectedTools();
    });
});

// Update status check to consider progress
function isAllScansComplete(status) {
    const selectedTools = sessionData.selectedTools || [];
    const finished = ['completed', 'failed'];
    
    return selectedTools.every(tool => 
        status[tool] && 
        (finished.includes(status[tool].status) || 
        (status[tool].status === 'completed' && status[tool].progress === 100))
    );
}

let scanInProgress = false;
let controller = null;

document.getElementById('scan-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (scanInProgress) {
        return;
    }

    const startButton = document.getElementById('start-button');
    const stopButton = document.getElementById('stop-button');
    const refreshButton = document.getElementById('refresh-button');
    const exportButton = document.getElementById('export-button');
    
    startButton.disabled = true;
    stopButton.style.display = 'inline-flex';
    refreshButton.disabled = true;
    exportButton.disabled = true;
    
    scanInProgress = true;
    controller = new AbortController();
    
    try {
        const formData = new FormData(this);
        const response = await fetch('/scan', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        updateResults(data);
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Scan was cancelled');
            updateStatus('Scan cancelled');
        } else {
            console.error('Error:', error);
            updateStatus('Error occurred during scan');
        }
    } finally {
        scanInProgress = false;
        controller = null;
        startButton.disabled = false;
        stopButton.style.display = 'none';
        refreshButton.disabled = false;
        exportButton.disabled = false;
    }
});

document.getElementById('stop-button').addEventListener('click', function() {
    if (controller) {
        controller.abort();
        updateStatus('Cancelling scan...');
    }
});

// Add a function to show custom confirmation dialog
function showConfirmationDialog(message) {
    return new Promise((resolve) => {
        const dialogOverlay = document.createElement('div');
        dialogOverlay.className = 'dialog-overlay';
        
        const dialogBox = document.createElement('div');
        dialogBox.className = 'dialog-box';
        
        const messageText = document.createElement('p');
        messageText.textContent = message;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'dialog-buttons';
        
        const confirmButton = document.createElement('button');
        confirmButton.className = 'btn btn-danger';
        confirmButton.textContent = 'Yes, Clear Data';
        
        const cancelButton = document.createElement('button');
        cancelButton.className = 'btn btn-secondary';
        cancelButton.textContent = 'Cancel';
        
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);
        
        dialogBox.appendChild(messageText);
        dialogBox.appendChild(buttonContainer);
        dialogOverlay.appendChild(dialogBox);
        document.body.appendChild(dialogOverlay);
        
        confirmButton.addEventListener('click', () => {
            document.body.removeChild(dialogOverlay);
            resolve(true);
        });
        
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(dialogOverlay);
            resolve(false);
        });
    });
} 