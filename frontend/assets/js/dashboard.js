// Student Dashboard JavaScript
let currentUser = null;

// Check authentication
function checkAuth() {
    const userData = sessionStorage.getItem('classflow_user');
    if (!userData) {
        window.location.href = 'login.html';
        return null;
    }
    
    const user = JSON.parse(userData);
    if (user.userType !== 'student') {
        alert('Access denied. This is a student-only area.');
        window.location.href = 'login.html';
        return null;
    }
    
    return user;
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    currentUser = checkAuth();
    if (currentUser) {
        const displayName = currentUser.displayName || currentUser.name || currentUser.rollNumber;
        document.getElementById('studentName').textContent = displayName;
        document.getElementById('userAvatar').textContent = displayName.charAt(0).toUpperCase();
        loadStudentStats();
        loadRecentActivity();
    }
});

// Load student statistics (with animation)
async function loadStudentStats() {
    try {
        // First show loading state
        animateNumber(document.getElementById('attendancePercentage'), 0, '%');
        animateNumber(document.getElementById('totalClasses'), 0, '');
        animateNumber(document.getElementById('presentDays'), 0, '');
        animateNumber(document.getElementById('streakDays'), 0, '');
        
        // Try to fetch real data from backend
        const response = await fetch(`/api/student-stats/${currentUser.rollNumber}`);
        
        if (response.ok) {
            const stats = await response.json();
            animateNumber(document.getElementById('attendancePercentage'), stats.attendancePercentage, '%');
            animateNumber(document.getElementById('totalClasses'), stats.totalClasses, '');
            animateNumber(document.getElementById('presentDays'), stats.presentDays, '');
            animateNumber(document.getElementById('streakDays'), stats.streakDays, '');
        } else {
            // Fallback to demo data if backend not available
            setTimeout(() => {
                animateNumber(document.getElementById('attendancePercentage'), 78, '%');
                animateNumber(document.getElementById('totalClasses'), 32, '');
                animateNumber(document.getElementById('presentDays'), 25, '');
                animateNumber(document.getElementById('streakDays'), 7, '');
            }, 500);
        }
    } catch (error) {
        console.log('Backend not available, using demo data');
        // Use demo data if backend is not available
        setTimeout(() => {
            animateNumber(document.getElementById('attendancePercentage'), 78, '%');
            animateNumber(document.getElementById('totalClasses'), 32, '');
            animateNumber(document.getElementById('presentDays'), 25, '');
            animateNumber(document.getElementById('streakDays'), 7, '');
        }, 500);
    }
}

// Animate numbers with smooth counting effect
function animateNumber(element, targetValue, suffix = '') {
    const startValue = 0;
    const duration = 1500;
    const startTime = performance.now();
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Use easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutCubic);
        
        element.textContent = currentValue + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

// Load recent activity
function loadRecentActivity() {
    const activityList = document.getElementById('activityList');
    const activities = [
        {
            icon: '🎉',
            text: `Welcome to ClassFlow, ${currentUser.name || currentUser.rollNumber}!`,
            time: 'Just now'
        },
        {
            icon: '📱',
            text: 'QR Scanner ready for attendance marking',
            time: '1 minute ago'
        },
        {
            icon: '📊',
            text: 'Attendance stats loaded successfully',
            time: '2 minutes ago'
        }
    ];
    
    activityList.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <span class="activity-icon">${activity.icon}</span>
            <div class="activity-content">
                <p>${activity.text}</p>
                <small>${activity.time}</small>
            </div>
        </div>
    `).join('');
}

// Navigation functions
function openAttendanceScanner() {
    window.location.href = 'scanner.html';
}

function viewMyAttendance() {
    // For now, show modal with attendance summary
    showAttendanceModal();
}

function viewProfile() {
    alert('Profile page coming soon! This is a demo feature.');
}

function viewAssignments() {
    alert('Assignments page coming soon! This is a demo feature.');
}

// Show attendance modal (temporary until separate page is created)
function showAttendanceModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #1e293b, #334155);
            padding: 32px;
            border-radius: 16px;
            max-width: 500px;
            width: 90%;
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.1);
        ">
            <h3 style="margin-bottom: 20px; color: #f1f5f9;">My Attendance Summary</h3>
            <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div><strong>Present Days:</strong><br><span style="color: #a7f3d0;">25</span></div>
                    <div><strong>Total Classes:</strong><br><span style="color: #93c5fd;">32</span></div>
                    <div><strong>Attendance %:</strong><br><span style="color: #fbbf24;">78%</span></div>
                    <div><strong>This Month:</strong><br><span style="color: #fca5a5;">15/18</span></div>
                </div>
            </div>
            <p style="color: #94a3b8; margin-bottom: 20px; text-align: center;">
                Full attendance tracking page coming soon!
            </p>
            <button onclick="this.parentElement.parentElement.remove()" style="
                width: 100%;
                padding: 12px;
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
            ">Close</button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to sign out?')) {
        sessionStorage.removeItem('classflow_user');
        window.location.href = 'login.html';
    }
}

// Add some interactive feedback
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('dashboard-card')) {
        // Add click effect
        e.target.style.transform = 'translateY(-2px) scale(0.98)';
        setTimeout(() => {
            e.target.style.transform = '';
        }, 150);
    }
});

console.log('Student Dashboard loaded successfully!');