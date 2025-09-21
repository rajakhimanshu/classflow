// Fixed Faculty Dashboard JavaScript with Memory Management and Chart Removal
class FacultyDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.currentUser = null;
        this.currentEditingClassId = null;
        this.intervals = []; // Track intervals for cleanup
        this.eventListeners = []; // Track event listeners for cleanup
        this.data = {
            classes: [],
            students: [],
            attendance: [],
            analytics: {},
            recentActivity: []
        };
        
        this.init();
    }

    init() {
        if (!this.checkAuth()) return;
        this.loadInitialData();
        this.setupEventListeners();
        // REMOVED: this.initializeCharts() - Charts causing memory leak
        this.startRealTimeUpdates();
        this.setupNavigation();
        this.loadTodayClasses();
        this.loadRecentActivity();
        this.loadAttendanceData();
        this.setupQRGenerator();
    }

    // Setup QR Generator iframe
    setupQRGenerator() {
        const qrSection = document.getElementById('qr-generator-section');
        if (qrSection) {
            // Create iframe for QR generator
            const iframe = qrSection.querySelector('iframe');
            if (!iframe) {
                const newIframe = document.createElement('iframe');
                newIframe.src = '../qr-generator.html'; // FIXED PATH
                newIframe.style.cssText = `
                    width: 100%;
                    height: 800px;
                    border: none;
                    border-radius: 12px;
                `;
                newIframe.title = 'QR Code Generator';
                
                const container = document.createElement('div');
                container.className = 'qr-generator-container';
                container.appendChild(newIframe);
                qrSection.appendChild(container);
            }
        }
    }

    // Enhanced authentication check
    checkAuth() {
        try {
            const userData = sessionStorage.getItem('classflow_user');
            if (!userData) {
                this.redirectToLogin('Please login first to access the faculty dashboard.');
                return false;
            }
            
            const user = JSON.parse(userData);
            if (user.userType !== 'faculty') {
                this.redirectToLogin('Access denied. This is a faculty-only area.');
                return false;
            }
            
            this.currentUser = user;
            this.updateUserInfo();
            return true;
        } catch (error) {
            console.error('Authentication error:', error);
            this.redirectToLogin('Authentication error. Please login again.');
            return false;
        }
    }

    redirectToLogin(message) {
        alert(message);
        window.location.href = '../login.html'; // FIXED PATH
    }

    updateUserInfo() {
        if (!this.currentUser) return;

        const elements = {
            userName: document.querySelector('.user-name'),
            userRole: document.querySelector('.user-role'),
            userInitials: document.getElementById('userInitials')
        };
        
        const name = this.currentUser.name || this.currentUser.facultyId || 'Faculty';
        const designation = this.currentUser.designation || 'Faculty';
        
        if (elements.userName) elements.userName.textContent = name;
        if (elements.userRole) elements.userRole.textContent = designation;
        if (elements.userInitials) {
            const initials = name.split(' ')
                .map(n => n[0] || '')
                .join('')
                .substring(0, 2)
                .toUpperCase();
            elements.userInitials.textContent = initials || 'FA';
        }
    }

    // Enhanced data loading
    async loadInitialData() {
        try {
            const response = await fetch('/api/students');
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && Array.isArray(result.students)) {
                    this.data.students = result.students;
                    console.log(`Loaded ${this.data.students.length} students from backend`);
                } else {
                    this.createDemoStudents();
                }
            } else {
                this.createDemoStudents();
            }
            
            await this.loadTodayAttendance();
        } catch (error) {
            console.log('Backend not available, using demo data:', error.message);
            this.createDemoStudents();
        }
        
        this.createClassData();
        this.createRecentActivity();
    }

    createDemoStudents() {
        this.data.students = [
            { rollNumber: '2023001', name: 'Rahul Sharma', class: 'CSE-A' },
            { rollNumber: '2023002', name: 'Priya Singh', class: 'CSE-A' },
            { rollNumber: '2023003', name: 'Amit Kumar', class: 'CSE-A' },
            { rollNumber: '2023004', name: 'Sneha Patel', class: 'CSE-A' },
            { rollNumber: '2023005', name: 'Rohit Gupta', class: 'CSE-A' },
            { rollNumber: '2023006', name: 'Anjali Verma', class: 'CSE-A' },
            { rollNumber: '2023007', name: 'Vikash Singh', class: 'CSE-A' },
            { rollNumber: '2023008', name: 'Pooja Jain', class: 'CSE-A' },
            { rollNumber: '2023009', name: 'Arjun Reddy', class: 'CSE-A' },
            { rollNumber: '2023010', name: 'Kavya Nair', class: 'CSE-A' }
        ];
    }

    async loadTodayAttendance() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`/api/attendance/${today}`);
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && Array.isArray(result.attendance)) {
                    this.data.attendance = result.attendance.map((record, index) => ({
                        id: record.id || (index + 1),
                        studentId: record.rollNumber,
                        name: record.name,
                        class: record.class,
                        checkIn: record.time,
                        status: 'present',
                        qrData: record.qrData
                    }));
                    return;
                }
            }
            this.createDemoAttendance();
        } catch (error) {
            this.createDemoAttendance();
        }
    }

    createDemoAttendance() {
        if (!Array.isArray(this.data.students) || this.data.students.length === 0) {
            this.createDemoStudents();
        }
        
        const presentStudents = this.data.students.slice(0, 6);
        this.data.attendance = presentStudents.map((student, index) => ({
            id: index + 1,
            studentId: student.rollNumber,
            name: student.name,
            class: student.class,
            checkIn: this.generateRealisticTime(index),
            status: index < 5 ? 'present' : 'late'
        }));
    }

    generateRealisticTime(index) {
        const baseTime = new Date();
        baseTime.setHours(9, 0, 0, 0);
        baseTime.setMinutes(baseTime.getMinutes() + (index * 2) + Math.random() * 10);
        return baseTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    }

    createClassData() {
        const userSubjects = (this.currentUser && this.currentUser.subjects) || ['Data Structures', 'Algorithms', 'Database Systems'];
        const studentCount = Array.isArray(this.data.students) ? this.data.students.length : 10;
        const presentCount = Array.isArray(this.data.attendance) ? this.data.attendance.filter(a => a.status === 'present').length : 0;
        const lateCount = Array.isArray(this.data.attendance) ? this.data.attendance.filter(a => a.status === 'late').length : 0;
        const absentCount = studentCount - (Array.isArray(this.data.attendance) ? this.data.attendance.length : 0);
        
        this.data.classes = [
            {
                id: 1,
                name: userSubjects[0] || 'Data Structures & Algorithms',
                code: 'CS201',
                time: '09:00',
                duration: 90,
                status: 'active',
                students: studentCount,
                present: presentCount,
                absent: Math.max(0, absentCount),
                late: lateCount,
                room: 'Room-101'
            },
            {
                id: 2,
                name: userSubjects[1] || 'Database Management Systems',
                code: 'CS301',
                time: '11:00',
                duration: 90,
                status: 'scheduled',
                students: studentCount,
                present: 0,
                absent: 0,
                late: 0,
                room: 'Room-102'
            },
            {
                id: 3,
                name: userSubjects[2] || 'Software Engineering',
                code: 'CS401',
                time: '14:00',
                duration: 90,
                status: 'scheduled',
                students: studentCount,
                present: 0,
                absent: 0,
                late: 0,
                room: 'Room-103'
            }
        ];
    }

    createRecentActivity() {
        const recentAttendance = Array.isArray(this.data.attendance) ? this.data.attendance.slice(-3) : [];
        const userName = (this.currentUser && this.currentUser.name) || 'Faculty';
        
        this.data.recentActivity = [
            ...recentAttendance.map(record => ({
                type: 'attendance',
                title: 'Student marked attendance',
                description: `${record.name} checked in at ${record.checkIn}`,
                time: this.getRelativeTime(record.checkIn),
                icon: 'fas fa-check'
            })),
            {
                type: 'class',
                title: 'Class session started',
                description: `${this.data.classes[0].name} - ${this.data.classes[0].code}`,
                time: '1 hour ago',
                icon: 'fas fa-play'
            },
            {
                type: 'system',
                title: 'Dashboard loaded',
                description: `Welcome back, ${userName}`,
                time: 'Just now',
                icon: 'fas fa-user'
            }
        ];
    }

    getRelativeTime(timeStr) {
        if (!timeStr) return 'Unknown';
        
        try {
            const now = new Date();
            const time = new Date();
            const [hours, minutes] = timeStr.split(':');
            time.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
            
            const diffMs = now - time;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} minutes ago`;
            return `${Math.floor(diffMins / 60)} hours ago`;
        } catch (error) {
            return 'Unknown';
        }
    }

    // Enhanced event listener setup with cleanup tracking
    setupEventListeners() {
        try {
            // Navigation
            document.querySelectorAll('.sidebar-menu a').forEach(link => {
                const handler = (e) => {
                    e.preventDefault();
                    const section = link.getAttribute('data-section');
                    if (section) {
                        this.navigateToSection(section);
                    }
                };
                link.addEventListener('click', handler);
                this.eventListeners.push({ element: link, event: 'click', handler });
            });

            this.setupModalHandlers();
            this.setupSearchAndFilters();
            
            // Logout handler
            const logoutLinks = document.querySelectorAll('[href="#logout"]');
            logoutLinks.forEach(link => {
                const handler = (e) => {
                    e.preventDefault();
                    this.logout();
                };
                link.addEventListener('click', handler);
                this.eventListeners.push({ element: link, event: 'click', handler });
            });

            this.setupMobileMenu();
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    setupModalHandlers() {
        const elements = {
            createClassBtn: document.getElementById('createClassBtn'),
            addClassBtn: document.getElementById('addClassBtn'),
            closeModal: document.querySelector('.modal .close'),
            cancelBtn: document.getElementById('cancelCreate'),
            form: document.getElementById('createClassForm')
        };

        if (elements.createClassBtn) {
            const handler = () => this.showModal('createClassModal');
            elements.createClassBtn.addEventListener('click', handler);
            this.eventListeners.push({ element: elements.createClassBtn, event: 'click', handler });
        }
        
        if (elements.addClassBtn) {
            const handler = () => this.showModal('createClassModal');
            elements.addClassBtn.addEventListener('click', handler);
            this.eventListeners.push({ element: elements.addClassBtn, event: 'click', handler });
        }
        
        if (elements.closeModal) {
            const handler = () => this.hideModal('createClassModal');
            elements.closeModal.addEventListener('click', handler);
            this.eventListeners.push({ element: elements.closeModal, event: 'click', handler });
        }
        
        if (elements.cancelBtn) {
            const handler = () => this.hideModal('createClassModal');
            elements.cancelBtn.addEventListener('click', handler);
            this.eventListeners.push({ element: elements.cancelBtn, event: 'click', handler });
        }
        
        if (elements.form) {
            const handler = (e) => {
                e.preventDefault();
                this.createNewClass();
            };
            elements.form.addEventListener('submit', handler);
            this.eventListeners.push({ element: elements.form, event: 'submit', handler });
        }

        // Modal outside click
        const outsideClickHandler = (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        };
        window.addEventListener('click', outsideClickHandler);
        this.eventListeners.push({ element: window, event: 'click', handler: outsideClickHandler });
    }

    setupSearchAndFilters() {
        const elements = {
            studentSearch: document.getElementById('studentSearch'),
            classFilter: document.getElementById('classFilter'),
            statusFilter: document.getElementById('statusFilter')
        };

        if (elements.studentSearch) {
            const handler = () => this.filterAttendance();
            elements.studentSearch.addEventListener('input', handler);
            this.eventListeners.push({ element: elements.studentSearch, event: 'input', handler });
        }
        
        if (elements.classFilter) {
            const handler = () => this.filterAttendance();
            elements.classFilter.addEventListener('change', handler);
            this.eventListeners.push({ element: elements.classFilter, event: 'change', handler });
        }
        
        if (elements.statusFilter) {
            const handler = () => this.filterAttendance();
            elements.statusFilter.addEventListener('change', handler);
            this.eventListeners.push({ element: elements.statusFilter, event: 'change', handler });
        }
    }

    setupMobileMenu() {
        if (!document.getElementById('mobileMenuToggle') && window.innerWidth <= 768) {
            const menuToggle = document.createElement('button');
            menuToggle.id = 'mobileMenuToggle';
            menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            menuToggle.className = 'mobile-menu-toggle';
            menuToggle.style.cssText = `
                display: block;
                background: transparent;
                border: none;
                color: white;
                font-size: 1.5rem;
                padding: 8px;
                cursor: pointer;
                @media (min-width: 769px) { display: none; }
            `;
            
            const headerContent = document.querySelector('.header-content');
            if (headerContent && headerContent.children.length > 0) {
                headerContent.insertBefore(menuToggle, headerContent.children[1] || headerContent.firstChild);
            }
            
            const handler = () => {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar) sidebar.classList.toggle('show');
            };
            
            menuToggle.addEventListener('click', handler);
            this.eventListeners.push({ element: menuToggle, event: 'click', handler });
        }
    }

    navigateToSection(sectionName) {
        try {
            document.querySelectorAll('.sidebar-menu a').forEach(link => {
                link.classList.remove('active');
            });
            
            const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
            if (activeLink) activeLink.classList.add('active');

            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            
            const targetSection = document.getElementById(`${sectionName}-section`);
            if (targetSection) targetSection.classList.add('active');

            this.currentSection = sectionName;

            switch(sectionName) {
                case 'attendance':
                    this.loadAttendanceData();
                    break;
                case 'classes':
                    this.loadAllClasses();
                    break;
                case 'qr-generator':
                    this.setupQRGenerator();
                    break;
                case 'analytics':
                    this.loadAnalytics();
                    break;
            }
        } catch (error) {
            console.error('Navigation error:', error);
        }
    }

    // CHART FUNCTIONS REMOVED TO FIX MEMORY LEAK
    // The initializeCharts, createAttendanceChart, createPerformanceChart functions
    // have been removed as they were causing memory leaks

    // Enhanced class loading
    loadTodayClasses() {
        const container = document.getElementById('todayClasses');
        if (!container) return;

        try {
            const todayClasses = Array.isArray(this.data.classes) ? 
                this.data.classes.filter(cls => cls.status !== 'ended') : [];
            
            if (todayClasses.length === 0) {
                container.innerHTML = '<div class="no-data">No classes scheduled for today</div>';
                return;
            }
            
            container.innerHTML = todayClasses.map(cls => `
                <div class="class-card" data-class-id="${cls.id}">
                    <div class="class-header">
                        <div class="class-info">
                            <h4>${this.escapeHtml(cls.name)}</h4>
                            <div class="class-code">${this.escapeHtml(cls.code)}</div>
                        </div>
                        <div class="class-status status-${cls.status}">${cls.status}</div>
                    </div>
                    <div class="class-details">
                        <div class="class-detail">
                            <i class="fas fa-clock"></i>
                            <span>${cls.time} (${cls.duration} min)</span>
                        </div>
                        <div class="class-detail">
                            <i class="fas fa-users"></i>
                            <span>${cls.students || 0} students</span>
                        </div>
                        <div class="class-detail">
                            <i class="fas fa-check-circle"></i>
                            <span>${cls.present || 0}/${cls.students || 0} present</span>
                        </div>
                    </div>
                    <div class="class-actions">
                        <button class="btn btn-primary btn-sm" onclick="dashboard.startClass(${cls.id})">
                            <i class="fas fa-play"></i> ${cls.status === 'active' ? 'Active' : 'Start'}
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="dashboard.generateQR(${cls.id})">
                            <i class="fas fa-qrcode"></i> QR Code
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="dashboard.viewClassDetails(${cls.id})">
                            <i class="fas fa-eye"></i> Details
                        </button>
                    </div>
                </div>
            `).join('');

            this.updateStats();
        } catch (error) {
            console.error('Error loading today classes:', error);
            if (container) {
                container.innerHTML = '<div class="error">Error loading classes</div>';
            }
        }
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text || '').replace(/[&<>"']/g, (m) => map[m]);
    }

    loadAllClasses() {
        const container = document.getElementById('allClasses');
        if (!container) return;

        try {
            const classes = Array.isArray(this.data.classes) ? this.data.classes : [];
            
            if (classes.length === 0) {
                container.innerHTML = '<div class="no-data">No classes found</div>';
                return;
            }

            container.innerHTML = classes.map(cls => `
                <div class="class-card" data-class-id="${cls.id}">
                    <div class="class-header">
                        <div class="class-info">
                            <h4>${this.escapeHtml(cls.name)}</h4>
                            <div class="class-code">${this.escapeHtml(cls.code)}</div>
                        </div>
                        <div class="class-status status-${cls.status}">${cls.status}</div>
                    </div>
                    <div class="class-details">
                        <div class="class-detail">
                            <i class="fas fa-clock"></i>
                            <span>${cls.time} (${cls.duration} min)</span>
                        </div>
                        <div class="class-detail">
                            <i class="fas fa-users"></i>
                            <span>${cls.students || 0} students</span>
                        </div>
                        <div class="class-detail">
                            <i class="fas fa-percentage"></i>
                            <span>${(cls.students || 0) > 0 ? Math.round(((cls.present || 0) / cls.students) * 100) : 0}% attendance</span>
                        </div>
                    </div>
                    <div class="class-actions">
                        <button class="btn btn-primary btn-sm" onclick="dashboard.editClass(${cls.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="dashboard.generateQR(${cls.id})">
                            <i class="fas fa-qrcode"></i> QR Code
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="dashboard.viewClassDetails(${cls.id})">
                            <i class="fas fa-eye"></i> Details
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading all classes:', error);
            if (container) {
                container.innerHTML = '<div class="error">Error loading classes</div>';
            }
        }
    }

    loadRecentActivity() {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        try {
            const activities = Array.isArray(this.data.recentActivity) ? this.data.recentActivity : [];
            
            if (activities.length === 0) {
                container.innerHTML = '<div class="no-data">No recent activity</div>';
                return;
            }

            container.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon" style="background: rgba(37, 99, 235, 0.2); color: #3b82f6;">
                        <i class="${activity.icon || 'fas fa-info'}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${this.escapeHtml(activity.title)}</div>
                        <div class="activity-description">${this.escapeHtml(activity.description)}</div>
                    </div>
                    <div class="activity-time">${this.escapeHtml(activity.time)}</div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading recent activity:', error);
            if (container) {
                container.innerHTML = '<div class="error">Error loading activity</div>';
            }
        }
    }

    loadAttendanceData() {
        try {
            this.updateAttendanceSummary();
            this.updateAttendanceTable();
            this.populateClassFilter();
        } catch (error) {
            console.error('Error loading attendance data:', error);
        }
    }

    updateAttendanceSummary() {
        try {
            const attendance = Array.isArray(this.data.attendance) ? this.data.attendance : [];
            const students = Array.isArray(this.data.students) ? this.data.students : [];
            
            const presentCount = attendance.filter(a => a.status === 'present').length;
            const absentCount = Math.max(0, students.length - attendance.length);
            const lateCount = attendance.filter(a => a.status === 'late').length;

            const elements = {
                present: document.getElementById('presentCount'),
                absent: document.getElementById('absentCount'),
                late: document.getElementById('lateCount')
            };

            if (elements.present) elements.present.textContent = presentCount;
            if (elements.absent) elements.absent.textContent = absentCount;
            if (elements.late) elements.late.textContent = lateCount;
        } catch (error) {
            console.error('Error updating attendance summary:', error);
        }
    }

    updateAttendanceTable() {
        const tbody = document.getElementById('attendanceTableBody');
        if (!tbody) return;

        try {
            const attendance = Array.isArray(this.data.attendance) ? this.data.attendance : [];
            
            if (attendance.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6">No attendance records found</td></tr>';
                return;
            }

            tbody.innerHTML = attendance.map(record => `
                <tr>
                    <td>${this.escapeHtml(record.studentId || '')}</td>
                    <td>${this.escapeHtml(record.name || '')}</td>
                    <td>${this.escapeHtml(record.class || '')}</td>
                    <td>${record.checkIn || '-'}</td>
                    <td><span class="status-badge status-${record.status || 'unknown'}">${record.status || 'unknown'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="dashboard.editAttendance('${record.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error updating attendance table:', error);
            tbody.innerHTML = '<tr><td colspan="6">Error loading attendance data</td></tr>';
        }
    }

    populateClassFilter() {
        const classFilter = document.getElementById('classFilter');
        if (!classFilter) return;

        try {
            const classes = Array.isArray(this.data.classes) ? this.data.classes : [];
            const classCodes = [...new Set(classes.map(c => c.code).filter(Boolean))];
            
            classFilter.innerHTML = '<option value="">All Classes</option>' + 
                classCodes.map(code => `<option value="${this.escapeHtml(code)}">${this.escapeHtml(code)}</option>`).join('');
        } catch (error) {
            console.error('Error populating class filter:', error);
        }
    }

    filterAttendance() {
        try {
            const searchTerm = (document.getElementById('studentSearch')?.value || '').toLowerCase();
            const classFilter = document.getElementById('classFilter')?.value || '';
            const statusFilter = document.getElementById('statusFilter')?.value || '';

            const attendance = Array.isArray(this.data.attendance) ? this.data.attendance : [];
            
            const filteredData = attendance.filter(record => {
                const matchesSearch = (record.name || '').toLowerCase().includes(searchTerm) || 
                                    (record.studentId || '').toLowerCase().includes(searchTerm);
                const matchesClass = !classFilter || record.class === classFilter;
                const matchesStatus = !statusFilter || record.status === statusFilter;

                return matchesSearch && matchesClass && matchesStatus;
            });

            const tbody = document.getElementById('attendanceTableBody');
            if (tbody) {
                if (filteredData.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6">No matching records found</td></tr>';
                } else {
                    tbody.innerHTML = filteredData.map(record => `
                        <tr>
                            <td>${this.escapeHtml(record.studentId || '')}</td>
                            <td>${this.escapeHtml(record.name || '')}</td>
                            <td>${this.escapeHtml(record.class || '')}</td>
                            <td>${record.checkIn || '-'}</td>
                            <td><span class="status-badge status-${record.status || 'unknown'}">${record.status || 'unknown'}</span></td>
                            <td>
                                <button class="btn btn-sm btn-outline" onclick="dashboard.editAttendance('${record.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error filtering attendance:', error);
            const tbody = document.getElementById('attendanceTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6">Error filtering data</td></tr>';
            }
        }
    }

    updateStats() {
        try {
            const classes = Array.isArray(this.data.classes) ? this.data.classes : [];
            const students = Array.isArray(this.data.students) ? this.data.students : [];
            const attendance = Array.isArray(this.data.attendance) ? this.data.attendance : [];
            
            const totalClasses = classes.length;
            const totalStudents = students.length;
            const totalPresent = attendance.filter(a => a.status === 'present').length;
            const avgAttendance = totalStudents > 0 ? ((totalPresent / totalStudents) * 100).toFixed(1) : 0;
            const atRiskStudents = Math.max(0, totalStudents - totalPresent - 2);

            const elements = {
                totalClasses: document.getElementById('totalClasses'),
                totalStudents: document.getElementById('totalStudents'),
                avgAttendance: document.getElementById('avgAttendance'),
                atRiskStudents: document.getElementById('atRiskStudents')
            };

            if (elements.totalClasses) elements.totalClasses.textContent = totalClasses;
            if (elements.totalStudents) elements.totalStudents.textContent = totalStudents;
            if (elements.avgAttendance) elements.avgAttendance.textContent = avgAttendance + '%';
            if (elements.atRiskStudents) elements.atRiskStudents.textContent = atRiskStudents;
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    // Modal functions with error handling
    showModal(modalId) {
        try {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        } catch (error) {
            console.error('Error showing modal:', error);
        }
    }

    hideModal(modalId) {
        try {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('show');
                document.body.style.overflow = 'auto';
                const form = modal.querySelector('form');
                if (form) form.reset();
            }
        } catch (error) {
            console.error('Error hiding modal:', error);
        }
    }

    // Class actions
    startClass(classId) {
        try {
            const classData = this.data.classes.find(c => c.id == classId);
            if (classData) {
                classData.status = 'active';
                this.loadTodayClasses();
                this.showAlert(`Class ${classData.name} started!`, 'success');
            } else {
                this.showAlert('Class not found', 'error');
            }
        } catch (error) {
            console.error('Error starting class:', error);
            this.showAlert('Error starting class', 'error');
        }
    }

    generateQR(classId) {
        try {
            const classData = this.data.classes.find(c => c.id == classId);
            if (classData) {
                this.navigateToSection('qr-generator');
                this.showAlert(`Generating QR code for ${classData.name}`, 'info');
                
                // Auto-populate QR generator with class data
                setTimeout(() => {
                    const iframe = document.querySelector('#qr-generator-section iframe');
                    if (iframe) {
                        try {
                            const iframeWindow = iframe.contentWindow;
                            if (iframeWindow && iframeWindow.postMessage) {
                                iframeWindow.postMessage({
                                    type: 'POPULATE_CLASS_DATA',
                                    data: {
                                        className: classData.name,
                                        room: classData.room || 'Room-101',
                                        faculty: this.currentUser?.name || 'Faculty',
                                        subject: classData.name
                                    }
                                }, '*');
                            }
                        } catch (crossOriginError) {
                            console.log('Cannot auto-populate QR generator (cross-origin)');
                        }
                    }
                }, 1000);
            } else {
                this.showAlert('Class not found', 'error');
            }
        } catch (error) {
            console.error('Error generating QR:', error);
            this.showAlert('Error generating QR code', 'error');
        }
    }

    viewClassDetails(classId) {
        try {
            const classData = this.data.classes.find(c => c.id == classId);
            if (classData) {
                const attendanceRate = (classData.students || 0) > 0 ? 
                    (((classData.present || 0) / classData.students) * 100).toFixed(1) : 0;
                
                this.showAlert(`
                    <div style="text-align: left;">
                        <h4>${this.escapeHtml(classData.name)} (${this.escapeHtml(classData.code)})</h4>
                        <p><strong>Time:</strong> ${classData.time} (${classData.duration} minutes)</p>
                        <p><strong>Room:</strong> ${this.escapeHtml(classData.room || 'TBA')}</p>
                        <p><strong>Students:</strong> ${classData.students || 0}</p>
                        <p><strong>Present:</strong> ${classData.present || 0}</p>
                        <p><strong>Absent:</strong> ${classData.absent || 0}</p>
                        <p><strong>Late:</strong> ${classData.late || 0}</p>
                        <p><strong>Attendance Rate:</strong> ${attendanceRate}%</p>
                        <p><strong>Status:</strong> ${classData.status}</p>
                    </div>
                `, 'info');
            } else {
                this.showAlert('Class not found', 'error');
            }
        } catch (error) {
            console.error('Error viewing class details:', error);
            this.showAlert('Error loading class details', 'error');
        }
    }

    editClass(classId) {
        try {
            const classData = this.data.classes.find(c => c.id === classId);
            if (classData) {
                const elements = {
                    className: document.getElementById('className'),
                    classCode: document.getElementById('classCode'),
                    classTime: document.getElementById('classTime'),
                    classDuration: document.getElementById('classDuration')
                };

                if (elements.className) elements.className.value = classData.name || '';
                if (elements.classCode) elements.classCode.value = classData.code || '';
                if (elements.classTime) elements.classTime.value = classData.time || '';
                if (elements.classDuration) elements.classDuration.value = classData.duration || 90;
                
                this.showModal('createClassModal');
                this.currentEditingClassId = classId;
            } else {
                this.showAlert('Class not found', 'error');
            }
        } catch (error) {
            console.error('Error editing class:', error);
            this.showAlert('Error loading class for editing', 'error');
        }
    }

    createNewClass() {
        try {
            const form = document.getElementById('createClassForm');
            if (!form) {
                this.showAlert('Form not found', 'error');
                return;
            }

            const className = document.getElementById('className')?.value?.trim() || '';
            const classCode = document.getElementById('classCode')?.value?.trim() || '';
            const classTime = document.getElementById('classTime')?.value || '';
            const classDuration = parseInt(document.getElementById('classDuration')?.value) || 90;

            if (!className || !classCode || !classTime) {
                this.showAlert('Please fill in all required fields', 'error');
                return;
            }

            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(classTime)) {
                this.showAlert('Please enter a valid time format (HH:MM)', 'error');
                return;
            }

            const newClass = {
                id: this.currentEditingClassId || Date.now(),
                name: className,
                code: classCode,
                time: classTime,
                duration: classDuration,
                status: 'scheduled',
                students: Array.isArray(this.data.students) ? this.data.students.length : 0,
                present: 0,
                absent: 0,
                late: 0,
                room: `Room-${Math.floor(Math.random() * 200) + 100}`
            };

            if (this.currentEditingClassId) {
                const index = this.data.classes.findIndex(c => c.id === this.currentEditingClassId);
                if (index !== -1) {
                    this.data.classes[index] = { ...this.data.classes[index], ...newClass };
                    this.showAlert('Class updated successfully!', 'success');
                } else {
                    this.showAlert('Class not found for update', 'error');
                    return;
                }
                this.currentEditingClassId = null;
            } else {
                if (!Array.isArray(this.data.classes)) {
                    this.data.classes = [];
                }
                this.data.classes.push(newClass);
                this.showAlert('Class created successfully!', 'success');
            }

            this.hideModal('createClassModal');
            this.loadTodayClasses();
            this.loadAllClasses();
            this.updateStats();
        } catch (error) {
            console.error('Error creating/updating class:', error);
            this.showAlert('Error saving class', 'error');
        }
    }

    editAttendance(recordId) {
        try {
            const attendance = Array.isArray(this.data.attendance) ? this.data.attendance : [];
            const record = attendance.find(a => a.id == recordId);
            
            if (record) {
                const validStatuses = ['present', 'late', 'absent'];
                const newStatus = prompt(
                    `Change status for ${record.name}:\nCurrent: ${record.status}\nEnter: present, late, or absent`, 
                    record.status
                );
                
                if (newStatus && validStatuses.includes(newStatus.toLowerCase())) {
                    record.status = newStatus.toLowerCase();
                    this.updateAttendanceTable();
                    this.updateAttendanceSummary();
                    this.showAlert('Attendance updated successfully!', 'success');
                } else if (newStatus !== null) {
                    this.showAlert('Invalid status. Please enter: present, late, or absent', 'error');
                }
            } else {
                this.showAlert('Attendance record not found', 'error');
            }
        } catch (error) {
            console.error('Error editing attendance:', error);
            this.showAlert('Error updating attendance', 'error');
        }
    }

    // Enhanced real-time updates with proper cleanup
    startRealTimeUpdates() {
        try {
            // Clear existing intervals
            this.intervals.forEach(intervalId => clearInterval(intervalId));
            this.intervals = [];

            // Simulate real-time attendance updates - REDUCED FREQUENCY
            const attendanceInterval = setInterval(() => {
                this.simulateAttendanceUpdate();
            }, 60000); // Increased from 45s to 60s
            this.intervals.push(attendanceInterval);

            // Update time displays - REDUCED FREQUENCY
            const timeInterval = setInterval(() => {
                this.updateTimeDisplays();
            }, 120000); // Increased from 60s to 120s
            this.intervals.push(timeInterval);
        } catch (error) {
            console.error('Error starting real-time updates:', error);
        }
    }

    simulateAttendanceUpdate() {
        try {
            if (!Array.isArray(this.data.attendance) || !Array.isArray(this.data.students)) {
                return;
            }

            // REDUCED simulation frequency
            if (Math.random() > 0.9 && this.data.attendance.length < this.data.students.length) {
                const presentStudentIds = new Set(this.data.attendance.map(a => a.studentId));
                const absentStudents = this.data.students.filter(s => !presentStudentIds.has(s.rollNumber));
                
                if (absentStudents.length > 0) {
                    const randomStudent = absentStudents[Math.floor(Math.random() * absentStudents.length)];
                    const newRecord = {
                        id: Date.now(),
                        studentId: randomStudent.rollNumber,
                        name: randomStudent.name,
                        class: randomStudent.class,
                        checkIn: new Date().toLocaleTimeString('en-US', { 
                            hour12: false, 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        }),
                        status: Math.random() > 0.8 ? 'late' : 'present'
                    };

                    this.data.attendance.push(newRecord);
                    
                    const activeClass = this.data.classes.find(c => c.status === 'active');
                    if (activeClass) {
                        if (newRecord.status === 'present') {
                            activeClass.present = (activeClass.present || 0) + 1;
                        } else if (newRecord.status === 'late') {
                            activeClass.late = (activeClass.late || 0) + 1;
                        }
                        activeClass.absent = Math.max(0, (activeClass.students || 0) - (activeClass.present || 0) - (activeClass.late || 0));
                    }

                    if (this.currentSection === 'attendance') {
                        this.updateAttendanceTable();
                        this.updateAttendanceSummary();
                    }

                    if (this.currentSection === 'dashboard') {
                        this.loadTodayClasses();
                        this.updateStats();
                    }

                    if (!Array.isArray(this.data.recentActivity)) {
                        this.data.recentActivity = [];
                    }
                    
                    this.data.recentActivity.unshift({
                        type: 'attendance',
                        title: 'New student attendance',
                        description: `${newRecord.name} marked ${newRecord.status}`,
                        time: 'Just now',
                        icon: 'fas fa-check'
                    });

                    if (this.data.recentActivity.length > 10) {
                        this.data.recentActivity.pop();
                    }

                    this.loadRecentActivity();
                    this.showNotification(`${newRecord.name} marked attendance`, newRecord.status);
                }
            }
        } catch (error) {
            console.error('Error simulating attendance update:', error);
        }
    }

    updateTimeDisplays() {
        try {
            const now = new Date();
            
            if (Array.isArray(this.data.classes)) {
                this.data.classes.forEach(cls => {
                    try {
                        const [hour, minute] = (cls.time || '').split(':');
                        const classTime = new Date();
                        classTime.setHours(parseInt(hour) || 0, parseInt(minute) || 0, 0, 0);
                        const classEndTime = new Date(classTime.getTime() + (cls.duration || 90) * 60000);

                        if (now >= classTime && now <= classEndTime && cls.status === 'scheduled') {
                            cls.status = 'active';
                        } else if (now > classEndTime && cls.status === 'active') {
                            cls.status = 'ended';
                        }
                    } catch (timeError) {
                        console.error('Error updating class time for class:', cls.id, timeError);
                    }
                });
            }

            if (this.currentSection === 'dashboard') {
                this.loadTodayClasses();
            }
        } catch (error) {
            console.error('Error updating time displays:', error);
        }
    }

    showNotification(message, type = 'info') {
        try {
            console.log(`Notification (${type}): ${message}`);
            
            const notificationCount = document.querySelector('.notification-count');
            if (notificationCount) {
                let count = parseInt(notificationCount.textContent) || 0;
                notificationCount.textContent = count + 1;
            }

            this.createToastNotification(message, type);
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    createToastNotification(message, type) {
        try {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <div class="toast-content">
                    <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}"></i>
                    <span>${this.escapeHtml(message)}</span>
                </div>
            `;
            
            toast.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                background: var(--card-bg, #1e293b);
                border: 1px solid var(--border-color, #374151);
                border-radius: 8px;
                padding: 12px 16px;
                color: var(--text-light, #f1f5f9);
                z-index: 2001;
                min-width: 300px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                transform: translateX(400px);
                transition: transform 0.3s ease;
            `;

            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.transform = 'translateX(0)';
            }, 100);

            setTimeout(() => {
                toast.style.transform = 'translateX(400px)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, 4000);
        } catch (error) {
            console.error('Error creating toast notification:', error);
        }
    }

    showAlert(message, type = 'info') {
        try {
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${type}`;
            alertDiv.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}"></i>
                <div>${message}</div>
            `;

            alertDiv.style.cssText = `
                padding: 12px 16px;
                margin: 10px 0;
                border-radius: 8px;
                background: var(--alert-bg-${type}, #1e293b);
                border: 1px solid var(--alert-border-${type}, #374151);
                color: var(--text-light, #f1f5f9);
                display: flex;
                align-items: center;
                gap: 8px;
            `;

            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.insertBefore(alertDiv, mainContent.firstChild);
                
                setTimeout(() => {
                    if (alertDiv.parentNode) {
                        alertDiv.parentNode.removeChild(alertDiv);
                    }
                }, 5000);
            }
        } catch (error) {
            console.error('Error showing alert:', error);
        }
    }

    setupNavigation() {
        try {
            const popstateHandler = (e) => {
                if (e.state && e.state.section) {
                    this.navigateToSection(e.state.section);
                }
            };
            window.addEventListener('popstate', popstateHandler);
            this.eventListeners.push({ element: window, event: 'popstate', handler: popstateHandler });

            history.replaceState({ section: this.currentSection }, '', `#${this.currentSection}`);
        } catch (error) {
            console.error('Error setting up navigation:', error);
        }
    }

    loadAnalytics() {
        console.log('Loading analytics data...');
    }

    async exportAttendanceData() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const data = {
                date: today,
                faculty: this.currentUser?.name || 'Unknown Faculty',
                facultyId: this.currentUser?.facultyId || 'Unknown',
                classes: this.data.classes || [],
                attendance: this.data.attendance || [],
                students: this.data.students || [],
                exportTime: new Date().toISOString()
            };

            const dataStr = JSON.stringify(data, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_${today}_${this.currentUser?.facultyId || 'faculty'}.json`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showAlert('Attendance data exported successfully!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showAlert('Error exporting data', 'error');
        }
    }

    logout() {
        try {
            if (confirm('Are you sure you want to logout?')) {
                this.cleanup();
                sessionStorage.removeItem('classflow_user');
                window.location.href = '../login.html'; // FIXED PATH
            }
        } catch (error) {
            console.error('Error during logout:', error);
            sessionStorage.removeItem('classflow_user');
            window.location.href = '../login.html'; // FIXED PATH
        }
    }

    async refreshData() {
        try {
            this.showAlert('Refreshing data...', 'info');
            await this.loadInitialData();
            this.loadTodayClasses();
            this.loadAttendanceData();
            this.loadRecentActivity();
            this.showAlert('Data refreshed successfully!', 'success');
        } catch (error) {
            console.error('Refresh error:', error);
            this.showAlert('Error refreshing data', 'error');
        }
    }

    getAttendanceStats() {
        try {
            const students = Array.isArray(this.data.students) ? this.data.students : [];
            const attendance = Array.isArray(this.data.attendance) ? this.data.attendance : [];
            
            const totalStudents = students.length;
            const presentStudents = attendance.filter(a => a.status === 'present').length;
            const lateStudents = attendance.filter(a => a.status === 'late').length;
            const absentStudents = Math.max(0, totalStudents - attendance.length);
            
            return {
                total: totalStudents,
                present: presentStudents,
                late: lateStudents,
                absent: absentStudents,
                attendanceRate: totalStudents > 0 ? ((presentStudents / totalStudents) * 100).toFixed(1) : '0'
            };
        } catch (error) {
            console.error('Error getting attendance stats:', error);
            return {
                total: 0,
                present: 0,
                late: 0,
                absent: 0,
                attendanceRate: '0'
            };
        }
    }

    // Cleanup function to prevent memory leaks
    cleanup() {
        try {
            // Clear all intervals
            this.intervals.forEach(intervalId => clearInterval(intervalId));
            this.intervals = [];

            // Remove all event listeners
            this.eventListeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
            this.eventListeners = [];

            console.log('Dashboard cleanup completed');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    // Destructor
    destroy() {
        this.cleanup();
        this.currentUser = null;
        this.data = {
            classes: [],
            students: [],
            attendance: [],
            analytics: {},
            recentActivity: []
        };
    }
}

// Enhanced initialization with better error handling and cleanup
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Cleanup any existing dashboard instance
        if (window.dashboard && typeof window.dashboard.destroy === 'function') {
            window.dashboard.destroy();
        }

        window.dashboard = new FacultyDashboard();
        
        // Add global utility functions
        window.exportData = () => {
            if (window.dashboard) {
                window.dashboard.exportAttendanceData();
            } else {
                console.error('Dashboard not initialized');
            }
        };
        
        window.refreshData = () => {
            if (window.dashboard) {
                window.dashboard.refreshData();
            } else {
                console.error('Dashboard not initialized');
            }
        };
        
        // Handle responsive sidebar for mobile
        if (window.innerWidth <= 768) {
            const clickHandler = (e) => {
                if (!e.target.closest('.sidebar') && !e.target.closest('.mobile-menu-toggle')) {
                    const sidebar = document.querySelector('.sidebar');
                    if (sidebar) {
                        sidebar.classList.remove('show');
                    }
                }
            };
            document.body.addEventListener('click', clickHandler);
            
            // Store handler for cleanup
            if (window.dashboard) {
                window.dashboard.eventListeners.push({ 
                    element: document.body, 
                    event: 'click', 
                    handler: clickHandler 
                });
            }
        }
        
        console.log('Faculty Dashboard initialized successfully!');
        console.log('Available global functions: exportData(), refreshData()');
        console.log('Dashboard instance available as window.dashboard');
        
    } catch (error) {
        console.error('Error initializing Faculty Dashboard:', error);
        alert('Error initializing dashboard. Please refresh the page.');
    }
});

// Enhanced window resize handler with cleanup
window.addEventListener('resize', () => {
    try {
        // No chart resize needed since charts are removed
        console.log('Window resized');
    } catch (error) {
        console.error('Error handling window resize:', error);
    }
});

// Enhanced page visibility handler
document.addEventListener('visibilitychange', () => {
    try {
        if (document.visibilityState === 'visible' && window.dashboard) {
            setTimeout(() => {
                if (window.dashboard && typeof window.dashboard.refreshData === 'function') {
                    window.dashboard.refreshData();
                }
            }, 1000);
        }
    } catch (error) {
        console.error('Error handling visibility change:', error);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    try {
        if (window.dashboard && typeof window.dashboard.cleanup === 'function') {
            window.dashboard.cleanup();
        }
    } catch (error) {
        console.error('Error during page unload cleanup:', error);
    }
});