// Student Login JavaScript
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const loginBtn = document.getElementById('loginBtn');

// Demo student credentials
const validStudents = {
    '2023001': { password: 'student123', name: 'Rahul Sharma', class: 'CSE-A' },
    '2023002': { password: 'student123', name: 'Priya Singh', class: 'CSE-A' },
    '2023003': { password: 'student123', name: 'Amit Kumar', class: 'CSE-B' },
    '2023004': { password: 'student123', name: 'Sneha Patel', class: 'CSE-B' },
    '2023005': { password: 'student123', name: 'Vikash Gupta', class: 'CSE-A' }
};

function showMessage(type, message) {
    const messageEl = type === 'error' ? errorMessage : successMessage;
    const otherEl = type === 'error' ? successMessage : errorMessage;
    
    otherEl.style.display = 'none';
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const rollNumber = document.getElementById('rollNumber').value.trim();
    const password = document.getElementById('password').value;
    
    if (!rollNumber || !password) {
        showMessage('error', 'Please fill in all fields');
        return;
    }
    
    // Validate roll number format (7 digits)
    if (!/^\d{7}$/.test(rollNumber)) {
        showMessage('error', 'Roll number must be exactly 7 digits');
        return;
    }
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
    
    // Simulate login delay
    setTimeout(() => {
        if (validStudents[rollNumber] && validStudents[rollNumber].password === password) {
            // Store session data
            sessionStorage.setItem('classflow_user', JSON.stringify({
                userType: 'student',
                rollNumber: rollNumber,
                name: validStudents[rollNumber].name,
                class: validStudents[rollNumber].class,
                loginTime: new Date().toISOString(),
                displayName: validStudents[rollNumber].name
            }));
            
            showMessage('success', `Welcome ${validStudents[rollNumber].name}! Redirecting...`);
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } else {
            showMessage('error', 'Invalid roll number or password. Use demo credentials: 2023001 / student123');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';
        }
    }, 1000);
});

// Check if already logged in
document.addEventListener('DOMContentLoaded', function() {
    const userData = sessionStorage.getItem('classflow_user');
    if (userData) {
        const user = JSON.parse(userData);
        if (user.userType === 'student') {
            showMessage('success', 'Already logged in. Redirecting...');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        }
    }
    
    // Auto-fill demo credentials on double click
    document.getElementById('rollNumber').addEventListener('dblclick', function() {
        this.value = '2023001';
        document.getElementById('password').value = 'student123';
        showMessage('success', 'Demo credentials filled!');
    });
});