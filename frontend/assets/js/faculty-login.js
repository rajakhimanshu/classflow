// Faculty Login JavaScript
const loginForm = document.getElementById('facultyLoginForm');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const loginBtn = document.getElementById('loginBtn');

// Demo faculty credentials
const validFaculty = {
    'FAC001': { 
        password: 'faculty123', 
        name: 'Dr. Rajesh Sharma', 
        department: 'Computer Science & Engineering',
        designation: 'Professor',
        subjects: ['Data Structures', 'Algorithms', 'Database Systems'],
        classes: ['CSE-A', 'CSE-B']
    },
    'FAC002': { 
        password: 'faculty123', 
        name: 'Prof. Priya Singh', 
        department: 'Physics',
        designation: 'Associate Professor',
        subjects: ['Physics Lab', 'Quantum Physics', 'Thermodynamics'],
        classes: ['PHY-A', 'PHY-B']
    },
    'FAC003': { 
        password: 'faculty123', 
        name: 'Dr. Amit Patel', 
        department: 'Mathematics',
        designation: 'Assistant Professor',
        subjects: ['Calculus', 'Linear Algebra', 'Statistics'],
        classes: ['MATH-A', 'MATH-B']
    }
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
    
    const facultyId = document.getElementById('facultyId').value.trim().toUpperCase();
    const password = document.getElementById('password').value;
    
    if (!facultyId || !password) {
        showMessage('error', 'Please fill in all fields');
        return;
    }
    
    // Validate faculty ID format
    if (!/^FAC\d{3}$/.test(facultyId)) {
        showMessage('error', 'Faculty ID format: FAC001, FAC002, etc.');
        return;
    }
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
    
    // Simulate login delay
    setTimeout(() => {
        if (validFaculty[facultyId] && validFaculty[facultyId].password === password) {
            // Store session data
            sessionStorage.setItem('classflow_user', JSON.stringify({
                userType: 'faculty',
                facultyId: facultyId,
                name: validFaculty[facultyId].name,
                department: validFaculty[facultyId].department,
                designation: validFaculty[facultyId].designation,
                subjects: validFaculty[facultyId].subjects,
                classes: validFaculty[facultyId].classes,
                loginTime: new Date().toISOString(),
                displayName: validFaculty[facultyId].name
            }));
            
            showMessage('success', `Welcome ${validFaculty[facultyId].name}! Redirecting...`);
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } else {
            showMessage('error', 'Invalid faculty ID or password. Use demo credentials: FAC001 / faculty123');
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
        if (user.userType === 'faculty') {
            showMessage('success', 'Already logged in. Redirecting...');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        }
    }
    
    // Auto-fill demo credentials on double click
    document.getElementById('facultyId').addEventListener('dblclick', function() {
        this.value = 'FAC001';
        document.getElementById('password').value = 'faculty123';
        showMessage('success', 'Demo credentials filled!');
    });
});