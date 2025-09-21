// Enhanced QR Scanner with Session Management and Backend Integration - COMPLETE FIXED VERSION
let html5QrCode;
let isScanning = false;
let availableCameras = [];
let currentCameraIndex = 0;
let scanCount = 0;
let lastScanTime = 0;
let currentUser = null;

// DOM elements
const startBtn = document.getElementById('startScanner');
const stopBtn = document.getElementById('stopScanner');
const switchBtn = document.getElementById('switchCamera');
const scanAgainBtn = document.getElementById('scanAgain');
const scannerSection = document.getElementById('scannerSection');
const resultSection = document.getElementById('resultSection');
const resultCard = document.getElementById('resultCard');
const cameraStatus = document.getElementById('cameraStatus');
const userDisplayName = document.getElementById('userDisplayName');
const quickTest = document.getElementById('quickTest');

// Authentication check
function checkAuth() {
    const userData = sessionStorage.getItem('classflow_user');
    if (!userData) {
        alert('Please login first to use the scanner.');
        window.location.href = '../login.html';
        return null;
    }
    
    const user = JSON.parse(userData);
    if (user.userType !== 'student') {
        alert('Access denied. This is a student-only scanner.');
        window.location.href = '../login.html';
        return null;
    }
    
    return user;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('ClassFlow Scanner loaded');
    
    // Check authentication first
    currentUser = checkAuth();
    if (!currentUser) return;
    
    // Display user info
    if (userDisplayName) {
        userDisplayName.textContent = currentUser.displayName || currentUser.name || currentUser.rollNumber;
    }
    
    // Hide quick test in production
    if (quickTest && window.location.protocol === 'https:' && !window.location.hostname.includes('localhost')) {
        quickTest.style.display = 'none';
    }
    
    // Add event listeners
    if (startBtn) startBtn.addEventListener('click', startScanner);
    if (stopBtn) stopBtn.addEventListener('click', stopScanner);
    if (switchBtn) switchBtn.addEventListener('click', switchCamera);
    if (scanAgainBtn) scanAgainBtn.addEventListener('click', resetScanner);
    
    // Check camera support and get camera list
    checkCameraSupport();
    getCameraList();
    
    // Test backend connectivity
    setTimeout(() => {
        window.testConnection();
    }, 2000);
});

function checkCameraSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        updateCameraStatus('error', 'Camera not supported on this device/browser');
        if (startBtn) startBtn.disabled = true;
        return false;
    }
    if (!window.location.protocol.startsWith('https') && window.location.hostname !== 'localhost') {
        updateCameraStatus('error', 'HTTPS required for camera access. Please use https://localhost:3001');
        if (startBtn) startBtn.disabled = true;
        return false;
    }
    return true;
}

async function getCameraList() {
    try {
        // Request permission first
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        
        // Get available cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        availableCameras = devices.filter(device => device.kind === 'videoinput');
        
        console.log(`Found ${availableCameras.length} camera(s)`);
        
        if (availableCameras.length > 1 && switchBtn) {
            switchBtn.style.display = 'inline-block';
        }
        
        if (availableCameras.length === 0) {
            updateCameraStatus('error', 'No cameras found on this device');
            if (startBtn) startBtn.disabled = true;
        } else {
            updateCameraStatus('success', `${availableCameras.length} camera(s) available - Ready to scan`);
        }
        
    } catch (error) {
        console.error('Camera permission error:', error);
        if (error.name === 'NotAllowedError') {
            updateCameraStatus('error', 'Camera permission denied. Please allow camera access and reload.');
        } else {
            updateCameraStatus('error', 'Camera permission needed - Click "Start Camera" to allow access');
        }
    }
}

function updateCameraStatus(type, message) {
    if (!cameraStatus) return;
    cameraStatus.className = `camera-status ${type}`;
    cameraStatus.innerHTML = `<p>${message}</p>`;
}

async function startScanner() {
    if (isScanning) return;
    
    try {
        updateCameraStatus('scanning', 'Starting camera...');
        if (startBtn) startBtn.disabled = true;
        
        // Check if Html5Qrcode is available
        if (typeof Html5Qrcode === 'undefined') {
            throw new Error('Html5Qrcode library not loaded. Please check if the script is included.');
        }
        
        html5QrCode = new Html5Qrcode("qr-reader");
        
        const config = {
            fps: 30,
            qrbox: function(viewfinderWidth, viewfinderHeight) {
                let minEdgePercentage = 0.7;
                let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                let qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
                return {
                    width: qrboxSize,
                    height: qrboxSize
                };
            },
            aspectRatio: 1.0,
            disableFlip: false,
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            },
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true
        };
        
        let cameraConfig;
        if (availableCameras.length > 0) {
            cameraConfig = availableCameras[currentCameraIndex].deviceId;
        } else {
            cameraConfig = { facingMode: "environment" };
        }
        
        await html5QrCode.start(
            cameraConfig,
            config,
            onScanSuccess,
            onScanError
        );
        
        isScanning = true;
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'inline-block';
        
        if (availableCameras.length > 1 && switchBtn) {
            switchBtn.style.display = 'inline-block';
        }
        
        updateCameraStatus('scanning', `Camera active - Point at QR code (${currentUser?.name || currentUser?.rollNumber || 'Student'})`);
        
    } catch (error) {
        console.error('Scanner start error:', error);
        handleScannerError(error);
    }
}

function handleScannerError(error) {
    let errorMessage = error.message || 'Unknown error';
    let suggestions = [];
    
    if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied';
        suggestions = ['Allow camera access in browser settings', 'Reload page after granting permission'];
    } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found';
        suggestions = ['Check if camera is available and not used by another app'];
    } else if (error.name === 'SecurityError') {
        errorMessage = 'Secure context required';
        suggestions = ['Access via HTTPS (https://localhost:3001)'];
    } else if (errorMessage.includes('Html5Qrcode library not loaded')) {
        errorMessage = 'QR Scanner library not loaded';
        suggestions = ['Please refresh the page', 'Check internet connection'];
    }
    
    updateCameraStatus('error', `${errorMessage}. Try: ${suggestions.join(', ')}`);
    if (startBtn) startBtn.disabled = false;
}

async function switchCamera() {
    if (!isScanning) return;
    
    try {
        await stopScanner();
        currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
        await startScanner();
        updateCameraStatus('success', `Switched to camera ${currentCameraIndex + 1}/${availableCameras.length}`);
    } catch (error) {
        console.error('Switch camera error:', error);
        updateCameraStatus('error', 'Failed to switch camera');
    }
}

async function stopScanner() {
    if (!isScanning || !html5QrCode) return;
    
    try {
        await html5QrCode.stop();
        isScanning = false;
        if (startBtn) startBtn.style.display = 'inline-block';
        if (stopBtn) stopBtn.style.display = 'none';
        if (switchBtn) switchBtn.style.display = 'none';
        if (startBtn) startBtn.disabled = false;
        updateCameraStatus('success', 'Camera stopped - Ready to start again');
    } catch (error) {
        console.error('Stop scanner error:', error);
    }
}

function onScanSuccess(decodedText) {
    const now = Date.now();
    if (now - lastScanTime < 2000) return; // Prevent duplicate scans
    lastScanTime = now;
    scanCount++;
    
    console.log('QR Scanned:', decodedText);
    updateCameraStatus('success', `QR Detected! (Scan #${scanCount})`);
    
    try {
        const qrData = JSON.parse(decodedText);
        if (qrData.type !== 'CLASSFLOW_ATTENDANCE') {
            throw new Error('Invalid QR code for ClassFlow');
        }
        showClassDetails(qrData);
    } catch (error) {
        showResult('error', 'Invalid QR Code', `
            <div style="text-align: center; padding: 24px;">
                <div class="error-icon">⚠️</div>
                <p style="color: #fca5a5; margin-bottom: 16px;">This QR code is not for ClassFlow attendance.</p>
                <p style="color: #94a3b8; font-size: 14px;">Error: ${error.message}</p>
            </div>
        `);
    }
}

function showClassDetails(qrData) {
    window.currentAttendanceQRData = qrData;
    
    showResult('info', 'Class QR Code Detected', `
        <div style="text-align: center; padding: 24px;">
            <h2 style="color: #93c5fd; margin-bottom: 24px; font-size: 1.375rem;">Class Information</h2>
            
            <div class="class-details">
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Class:</strong>
                        <span>${escapeHtml(qrData.class)}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Room:</strong>
                        <span>${escapeHtml(qrData.room)}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Faculty:</strong>
                        <span>${escapeHtml(qrData.faculty)}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Subject:</strong>
                        <span>${escapeHtml(qrData.subject)}</span>
                    </div>
                </div>
            </div>
            
            <div class="roll-input-section">
                <label for="rollNumber">Your Roll Number:</label>
                <input type="tel" 
                       id="rollNumber" 
                       value="${escapeHtml(currentUser?.rollNumber || '')}" 
                       placeholder="e.g., 2023001" 
                       pattern="[0-9]{7}" 
                       inputmode="numeric"
                       maxlength="7"
                       readonly>
            </div>
            
            <button onclick="markAttendance()" class="submit-btn" id="markBtn">
                Mark Attendance
            </button>
        </div>
    `);
    
    // Auto-focus and setup input
    setTimeout(() => {
        const input = document.getElementById('rollNumber');
        if (input) {
            // Make input editable in case user wants to change it
            input.addEventListener('dblclick', function() {
                this.readOnly = false;
                this.select();
            });
            
            input.addEventListener('input', function(e) {
                this.value = this.value.replace(/[^0-9]/g, '');
            });
        }
    }, 200);
}

// Helper function to escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text || '').replace(/[&<>"']/g, (m) => map[m]);
}

async function markAttendance() {
    const rollNumberInput = document.getElementById('rollNumber');
    const markBtn = document.getElementById('markBtn');
    const rollNumber = rollNumberInput ? rollNumberInput.value.trim() : '';
    const qrData = window.currentAttendanceQRData;
    
    if (!rollNumber) {
        alert('Please enter your roll number');
        if (rollNumberInput) rollNumberInput.focus();
        return;
    }
    
    if (!/^\d{7}$/.test(rollNumber)) {
        alert('Roll number should be exactly 7 digits (e.g., 2023001)');
        if (rollNumberInput) {
            rollNumberInput.focus();
            rollNumberInput.select();
        }
        return;
    }
    
    try {
        // Disable button and show loading
        if (markBtn) {
            markBtn.disabled = true;
            markBtn.textContent = 'Marking...';
        }
        
        showResult('info', 'Processing Attendance...', `
            <div style="text-align: center; padding: 32px;">
                <div class="loading-spinner"></div>
                <p style="color: #cbd5e1; margin-top: 16px;">Please wait while we record your attendance...</p>
                <p style="color: #94a3b8; margin-top: 8px; font-size: 14px;">Student: ${escapeHtml(currentUser?.name || rollNumber)}</p>
            </div>
        `);
        
        const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Student ${currentUser?.rollNumber || rollNumber}`
            },
            body: JSON.stringify({
                studentRoll: rollNumber,
                qrData: qrData,
                userSession: {
                    rollNumber: currentUser?.rollNumber || rollNumber,
                    name: currentUser?.name || 'Student',
                    loginTime: currentUser?.loginTime || new Date().toISOString()
                }
            })
        });
        
        let result;
        try {
            result = await response.json();
        } catch (parseError) {
            throw new Error('Invalid server response format');
        }
        
        // Handle successful responses (200 status)
        if (response.ok && result.success) {
            // Check if this was previously marked attendance
            if (result.data.previouslyMarked) {
                showResult('success', 'Already Marked Today!', `
                    <div style="text-align: center; padding: 24px;">
                        <div class="success-checkmark">✅</div>
                        <h2 style="color: #a7f3d0; margin-bottom: 20px; font-size: 1.5rem;">Welcome back, ${escapeHtml(result.data.student)}!</h2>
                        
                        <div style="background: rgba(245, 158, 11, 0.1); padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid rgba(245, 158, 11, 0.2);">
                            <h3 style="color: #fbbf24; margin-bottom: 16px;">Attendance Status</h3>
                            <p style="color: #fed7aa; margin-bottom: 12px;">You have already marked attendance for this class today.</p>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <strong>Roll Number:</strong>
                                    <span>${escapeHtml(result.data.rollNumber)}</span>
                                </div>
                                <div class="detail-item">
                                    <strong>Original Time:</strong>
                                    <span>${escapeHtml(result.data.originalTime || result.data.time)}</span>
                                </div>
                                <div class="detail-item">
                                    <strong>Date:</strong>
                                    <span>${escapeHtml(result.data.date)}</span>
                                </div>
                                <div class="detail-item">
                                    <strong>Status:</strong>
                                    <span style="color: ${result.data.status === 'late' ? '#fbbf24' : '#a7f3d0'}">${result.data.status?.toUpperCase() || 'PRESENT'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div style="color: #fed7aa; font-size: 1rem; font-weight: 500; margin-top: 16px;">
                            No need to scan again today!
                        </div>
                        
                        <button onclick="goToDashboard()" style="
                            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-size: 14px;
                            cursor: pointer;
                            margin-top: 20px;
                            font-weight: 600;
                        ">
                            Back to Dashboard
                        </button>
                    </div>
                `);
            } else {
                // New attendance marked successfully
                showResult('success', 'Attendance Marked Successfully!', `
                    <div style="text-align: center; padding: 24px;">
                        <div class="success-checkmark">✅</div>
                        <h2 style="color: #a7f3d0; margin-bottom: 20px; font-size: 1.5rem;">Welcome, ${escapeHtml(result.data.student)}!</h2>
                        
                        ${result.data.status === 'late' ? `
                            <div style="background: rgba(245, 158, 11, 0.1); padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid rgba(245, 158, 11, 0.2);">
                                <p style="color: #fbbf24; font-weight: 600; margin-bottom: 8px;">⏰ Marked as LATE</p>
                                <p style="color: #fed7aa; font-size: 14px;">Please try to arrive on time for future classes.</p>
                            </div>
                        ` : ''}
                        
                        <div style="background: rgba(16, 185, 129, 0.1); padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid rgba(16, 185, 129, 0.2);">
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <strong>Roll Number:</strong>
                                    <span>${escapeHtml(result.data.rollNumber)}</span>
                                </div>
                                <div class="detail-item">
                                    <strong>Time:</strong>
                                    <span>${escapeHtml(result.data.time)}</span>
                                </div>
                                <div class="detail-item">
                                    <strong>Date:</strong>
                                    <span>${escapeHtml(result.data.date)}</span>
                                </div>
                                <div class="detail-item">
                                    <strong>Status:</strong>
                                    <span style="color: ${result.data.status === 'late' ? '#fbbf24' : '#a7f3d0'};">
                                        ${result.data.status?.toUpperCase() || 'PRESENT'}
                                    </span>
                                </div>
                                <div class="detail-item">
                                    <strong>Class:</strong>
                                    <span>${escapeHtml(qrData.class)}</span>
                                </div>
                                <div class="detail-item">
                                    <strong>Room:</strong>
                                    <span>${escapeHtml(qrData.room)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div style="color: #a7f3d0; font-size: 1.125rem; font-weight: 600; margin-top: 20px;">
                            Attendance recorded successfully!
                        </div>
                        
                        <button onclick="goToDashboard()" style="
                            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-size: 14px;
                            cursor: pointer;
                            margin-top: 20px;
                            font-weight: 600;
                        ">
                            Back to Dashboard
                        </button>
                    </div>
                `);
            }
        } else {
            // Handle error responses
            let errorMessage = result?.message || 'Unknown error occurred';
            let errorDetails = [];
            
            // Specific error handling based on status codes
            if (response.status === 404) {
                errorMessage = 'Student not found in database';
                errorDetails = [
                    'Roll number may not be registered',
                    'Contact administration to register',
                    'Double-check your roll number format'
                ];
            } else if (response.status === 400) {
                errorDetails = [
                    'Invalid roll number format (must be 7 digits)',
                    'Invalid QR code data',
                    'Missing required information'
                ];
            } else if (response.status === 500) {
                errorMessage = 'Server error occurred';
                errorDetails = [
                    'Database connection issue',
                    'Server maintenance in progress',
                    'Try again in a few minutes'
                ];
            } else if (!response.ok) {
                errorMessage = `Server error (${response.status})`;
                errorDetails = [
                    'Network connectivity issue',
                    'Server temporarily unavailable',
                    'Check your internet connection'
                ];
            }
            
            // Default error reasons if none specified
            if (errorDetails.length === 0) {
                errorDetails = [
                    'Invalid data format',
                    'QR code may be expired',
                    'Network connection issue'
                ];
            }
            
            showResult('error', 'Attendance Failed', `
                <div style="text-align: center; padding: 24px;">
                    <div class="error-icon">❌</div>
                    <p style="font-size: 1.125rem; margin-bottom: 16px; color: #fca5a5;">${escapeHtml(errorMessage)}</p>
                    <div style="background: rgba(245, 158, 11, 0.1); padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid rgba(245, 158, 11, 0.2);">
                        <strong style="color: #fbbf24;">Possible reasons:</strong>
                        <ul style="text-align: left; margin-top: 8px; color: #e5e7eb; font-size: 14px; padding-left: 20px;">
                            ${errorDetails.map(reason => `<li style="margin-bottom: 4px;">• ${escapeHtml(reason)}</li>`).join('')}
                        </ul>
                    </div>
                    <button onclick="resetScanner()" style="
                        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 14px;
                        cursor: pointer;
                        margin-top: 16px;
                        font-weight: 600;
                    ">
                        Try Again
                    </button>
                </div>
            `);
        }
        
    } catch (error) {
        console.error('Attendance marking error:', error);
        
        // Determine error type for better user feedback
        let errorTitle = 'Connection Error';
        let errorIcon = '🔌';
        let errorMessage = 'Unable to connect to server.';
        let technicalDetails = error.message;
        
        if (error.message.includes('fetch')) {
            errorMessage = 'Network connection failed.';
            technicalDetails = 'Please check your internet connection';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Request timed out.';
            technicalDetails = 'Server is taking too long to respond';
        } else if (error.message.includes('Invalid server response format')) {
            errorMessage = 'Server response error.';
            technicalDetails = 'Server returned invalid data format';
        }
        
        showResult('error', errorTitle, `
            <div style="text-align: center; padding: 24px;">
                <div class="error-icon">${errorIcon}</div>
                <p style="color: #fca5a5; margin-bottom: 16px;">${errorMessage}</p>
                <div style="background: rgba(239, 68, 68, 0.1); padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid rgba(239, 68, 68, 0.2);">
                    <strong style="color: #fca5a5;">Technical Details:</strong><br>
                    <span style="color: #e5e7eb; font-size: 14px;">${escapeHtml(technicalDetails)}</span>
                </div>
                <div style="background: rgba(59, 130, 246, 0.1); padding: 12px; border-radius: 6px; margin: 12px 0; border: 1px solid rgba(59, 130, 246, 0.2);">
                    <p style="color: #93c5fd; font-size: 13px; margin: 0;">
                        <strong>Troubleshooting:</strong><br>
                        • Check if you're connected to the internet<br>
                        • Make sure the server is running<br>
                        • Try refreshing the page<br>
                        • Contact technical support if issue persists
                    </p>
                </div>
                <button onclick="resetScanner()" style="
                    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 14px;
                    cursor: pointer;
                    margin-top: 16px;
                    font-weight: 600;
                ">
                    Try Again
                </button>
            </div>
        `);
    }
}

function onScanError(errorMessage) {
    // Only log significant errors to avoid spam
    if (errorMessage && !errorMessage.includes('NotFoundException') && !errorMessage.includes('No MultiFormat Readers')) {
        console.log('Scan error:', errorMessage);
    }
}

function showResult(type, title, message) {
    if (!resultCard) return;
    
    resultCard.innerHTML = `
        ${title ? `<h3>${escapeHtml(title)}</h3>` : ''}
        <div>${message}</div>
    `;
    
    resultCard.className = `result-card ${type}`;
    
    if (scannerSection) scannerSection.style.display = 'none';
    if (resultSection) resultSection.style.display = 'block';
}

function resetScanner() {
    if (resultSection) resultSection.style.display = 'none';
    if (scannerSection) scannerSection.style.display = 'block';
    updateCameraStatus('success', 'Ready to scan - Hold QR code steady in camera view');
    scanCount = 0;
}

function goToDashboard() {
    window.location.href = 'dashboard.html';
}

// Development test function
function simulateQRScan() {
    const testQRData = {
        type: 'CLASSFLOW_ATTENDANCE',
        class: 'CS-A Morning',
        room: '101',
        faculty: 'Dr. Sharma',
        subject: 'Data Structures',
        timestamp: new Date().toISOString()
    };
    
    updateCameraStatus('success', 'Simulated QR scan successful!');
    showClassDetails(testQRData);
}

// Debug functions for console
window.testQR = simulateQRScan;
window.testConnection = async function() {
    try {
        const response = await fetch('/api/status');
        if (response.ok) {
            const result = await response.json();
            console.log('Backend status:', result);
        } else {
            console.log('Backend returned error:', response.status, response.statusText);
        }
    } catch (error) {
        console.log('Backend not available:', error.message);
    }
};

console.log('ClassFlow Scanner ready!');
console.log('Debug commands: testQR(), testConnection()');
console.log('Current user:', currentUser);