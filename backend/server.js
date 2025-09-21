const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
const HTTP_PORT = 3000;
const HTTPS_PORT = 3001;

// Middleware
app.use(cors({
    origin: ['https://localhost:3001', 'http://localhost:3000', 'https://localhost:3000'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// MongoDB Connection
const MONGO_URI = 'mongodb+srv://classflowUser:yh3XySsKXk_a.3t@classflow.ljnj8tm.mongodb.net/classflowDB?retryWrites=true&w=majority&appName=ClassFlow';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    console.log('📊 Database: classflowDB');
}).catch(err => {
    console.log('❌ MongoDB connection error:', err.message);
    console.log('💡 Check your Atlas connection string and network access');
});

// Student Schema
const studentSchema = new mongoose.Schema({
    rollNumber: { 
        type: String, 
        required: true, 
        unique: true,
        validate: {
            validator: function(v) {
                return /^\d{7}$/.test(v);
            },
            message: 'Roll number must be exactly 7 digits'
        }
    },
    name: { type: String, required: true },
    class: { type: String, required: true },
    parentContact: { 
        type: String,
        validate: {
            validator: function(v) {
                return !v || /^\d{10}$/.test(v);
            },
            message: 'Parent contact must be 10 digits'
        }
    }
}, {
    timestamps: true
});

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
    studentRoll: { 
        type: String, 
        required: true,
        validate: {
            validator: function(v) {
                return /^\d{7}$/.test(v);
            },
            message: 'Student roll must be exactly 7 digits'
        }
    },
    date: { type: String, required: true }, // YYYY-MM-DD format
    time: { type: String, required: true }, // HH:MM format
    status: { type: String, default: 'present', enum: ['present', 'absent'] },
    qrData: { 
        type: Object,
        validate: {
            validator: function(v) {
                return !v || (v.type === 'CLASSFLOW_ATTENDANCE' && v.class && v.room);
            },
            message: 'QR data must be valid ClassFlow attendance data'
        }
    }
}, {
    timestamps: true
});

// Create compound index for efficient queries
attendanceSchema.index({ studentRoll: 1, date: 1 }, { unique: true });

const Student = mongoose.model('Student', studentSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);

// Utility Functions
const formatDate = (date = new Date()) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

const formatTime = (date = new Date()) => {
    return date.toLocaleTimeString('en-GB', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
    });
};

// Routes

// Test route with better formatting
app.get('/', (req, res) => {
    if (req.protocol === 'http' && fs.existsSync('cert.pem')) {
        return res.redirect(`https://${req.get('host').replace(':3000', ':3001')}${req.url}`);
    }
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ClassFlow Backend</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
                .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
                .success { background: #d4edda; color: #155724; }
                .error { background: #f8d7da; color: #721c24; }
                .links a { display: inline-block; margin: 10px; padding: 10px 15px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <h1>🎯 ClassFlow MVP Backend</h1>
            <div class="status ${mongoose.connection.readyState === 1 ? 'success' : 'error'}">
                <strong>Server Status:</strong> ✅ Online<br>
                <strong>Database:</strong> ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}<br>
                <strong>Port:</strong> ${req.protocol.toUpperCase()} ${req.get('host')}<br>
                <strong>Time:</strong> ${new Date().toLocaleString()}
            </div>
            
            <h3>📱 Application Links:</h3>
            <div class="links">
                <a href="/index.html">🏠 Main Dashboard</a>
                <a href="/student/scanner.html">📱 Student Scanner</a>
                <a href="/faculty/dashboard.html">👨‍🏫 Faculty Dashboard</a>
                <a href="/qr-generator.html">📳 QR Generator</a>
            </div>
            
            <h3>🔧 Admin Actions:</h3>
            <div class="links">
                <a href="/api/students/seed">👥 Add Sample Students</a>
                <a href="/api/status">📊 System Status</a>
                <a href="/api/attendance/today">📋 Today's Attendance</a>
            </div>
        </body>
        </html>
    `);
});

// Enhanced sample student seeding
app.get('/api/students/seed', async (req, res) => {
    try {
        const sampleStudents = [
            { rollNumber: '2023001', name: 'Rahul Sharma', class: 'CS-A', parentContact: '9876543210' },
            { rollNumber: '2023002', name: 'Priya Singh', class: 'CS-A', parentContact: '9876543211' },
            { rollNumber: '2023003', name: 'Amit Kumar', class: 'CS-A', parentContact: '9876543212' },
            { rollNumber: '2023004', name: 'Sneha Patel', class: 'CS-A', parentContact: '9876543213' },
            { rollNumber: '2023005', name: 'Rohit Gupta', class: 'CS-A', parentContact: '9876543214' },
            { rollNumber: '2023006', name: 'Anjali Verma', class: 'CS-A', parentContact: '9876543215' },
            { rollNumber: '2023007', name: 'Vikash Singh', class: 'CS-A', parentContact: '9876543216' },
            { rollNumber: '2023008', name: 'Pooja Jain', class: 'CS-A', parentContact: '9876543217' },
            { rollNumber: '2023009', name: 'Arjun Reddy', class: 'CS-A', parentContact: '9876543218' },
            { rollNumber: '2023010', name: 'Kavya Nair', class: 'CS-A', parentContact: '9876543219' }
        ];

        const existingCount = await Student.countDocuments();
        
        if (existingCount > 0) {
            return res.json({ 
                success: true, 
                message: 'Students already exist in database', 
                count: existingCount,
                note: 'Database already seeded',
                students: await Student.find({}, 'rollNumber name class')
            });
        }

        await Student.insertMany(sampleStudents);
        
        res.json({ 
            success: true, 
            message: 'Sample students added successfully!', 
            students: sampleStudents,
            count: sampleStudents.length
        });
        
    } catch (error) {
        console.error('Seed error:', error);
        if (error.code === 11000) {
            const studentCount = await Student.countDocuments();
            res.json({ 
                success: true, 
                message: 'Students already exist in database', 
                count: studentCount,
                note: 'Some duplicates skipped'
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Error adding students',
                error: error.message 
            });
        }
    }
});

// Get all students with better error handling
app.get('/api/students', async (req, res) => {
    try {
        const students = await Student.find({}).select('rollNumber name class parentContact').sort({ rollNumber: 1 });
        res.json({ 
            success: true, 
            count: students.length,
            students 
        });
    } catch (error) {
        console.error('Students fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching students',
            error: error.message 
        });
    }
});

// FIXED: Enhanced attendance marking with proper 409 handling
app.post('/api/attendance', async (req, res) => {
    try {
        const { studentRoll, qrData } = req.body;
        
        console.log('📝 Attendance request:', { studentRoll, qrData: qrData?.class || 'No QR data' });
        
        // Validation
        if (!studentRoll) {
            return res.status(400).json({ 
                success: false, 
                message: 'Student roll number is required' 
            });
        }

        if (!/^\d{7}$/.test(studentRoll)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Roll number must be exactly 7 digits (e.g., 2023001)' 
            });
        }
        
        const today = formatDate();
        const currentTime = formatTime();

        // Check if student exists
        const student = await Student.findOne({ rollNumber: studentRoll });
        if (!student) {
            return res.status(404).json({ 
                success: false, 
                message: `Student with roll number ${studentRoll} not found. Please check the roll number or contact admin.`
            });
        }

        // Check if already marked today
        const existingAttendance = await Attendance.findOne({ studentRoll, date: today });
        if (existingAttendance) {
            // FIXED: Return 200 instead of 409, but with special flag
            return res.status(200).json({ 
                success: true, 
                message: `Welcome back, ${student.name}! You've already marked attendance today.`,
                data: {
                    rollNumber: studentRoll,
                    student: student.name,
                    class: student.class,
                    time: existingAttendance.time,
                    date: today,
                    status: existingAttendance.status,
                    previouslyMarked: true, // Special flag for frontend
                    originalTime: existingAttendance.time
                }
            });
        }

        // Validate QR data if provided
        if (qrData && (!qrData.type || qrData.type !== 'CLASSFLOW_ATTENDANCE')) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid QR code. Please scan a valid ClassFlow attendance QR code.' 
            });
        }

        // Determine if student is late (example: after 9:15 AM)
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        let status = 'present';
        
        // Simple late detection: if after 9:15 AM
        if (currentHour > 9 || (currentHour === 9 && currentMinute > 15)) {
            status = 'late';
        }

        // Create new attendance record
        const attendance = new Attendance({
            studentRoll,
            date: today,
            time: currentTime,
            status: status,
            qrData: qrData || null
        });

        await attendance.save();

        console.log(`✅ Attendance marked (${status}):`, { student: student.name, roll: studentRoll, time: currentTime });

        res.json({
            success: true,
            message: status === 'late' ? 
                `Attendance marked as LATE for ${student.name}. Please arrive on time next time.` : 
                `Attendance marked successfully for ${student.name}!`,
            data: {
                rollNumber: studentRoll,
                student: student.name,
                class: student.class,
                date: today,
                time: currentTime,
                status: status,
                qrData: qrData || null,
                previouslyMarked: false
            }
        });

    } catch (error) {
        console.error('❌ Attendance error:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid data provided',
                errors: Object.values(error.errors).map(e => e.message)
            });
        }

        // Handle MongoDB duplicate key error
        if (error.code === 11000) {
            return res.status(200).json({
                success: true,
                message: 'Attendance already marked for today',
                data: {
                    rollNumber: studentRoll,
                    student: 'Student',
                    time: 'Earlier today',
                    date: today,
                    previouslyMarked: true
                }
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Server error while marking attendance', 
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get attendance for a specific date with enhanced data
app.get('/api/attendance/:date', async (req, res) => {
    const date = req.params.date;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid date format. Use YYYY-MM-DD format.'
        });
    }
    
    try {
        const attendanceRecords = await Attendance.find({ date }).sort({ time: 1 });
        
        const attendanceWithDetails = await Promise.all(
            attendanceRecords.map(async (record) => {
                const student = await Student.findOne({ rollNumber: record.studentRoll });
                return {
                    rollNumber: record.studentRoll,
                    name: student ? student.name : 'Unknown Student',
                    class: student ? student.class : 'Unknown',
                    time: record.time,
                    status: record.status,
                    qrData: record.qrData || null,
                    markedAt: record.createdAt
                };
            })
        );

        res.json({ 
            success: true, 
            date: date,
            count: attendanceWithDetails.length,
            attendance: attendanceWithDetails 
        });

    } catch (error) {
        console.error('❌ Fetch attendance error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error while fetching attendance', 
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get today's attendance (helper route)
app.get('/api/attendance/today', (req, res) => {
    const today = formatDate();
    res.redirect(`/api/attendance/${today}`);
});

// Get attendance statistics
app.get('/api/stats/:date?', async (req, res) => {
    try {
        const date = req.params.date || formatDate();
        
        const [totalStudents, presentToday, lateToday, totalAttendanceRecords] = await Promise.all([
            Student.countDocuments(),
            Attendance.countDocuments({ date, status: 'present' }),
            Attendance.countDocuments({ date, status: 'late' }),
            Attendance.countDocuments()
        ]);
        
        const totalMarked = presentToday + lateToday;
        const attendanceRate = totalStudents > 0 ? Math.round((totalMarked / totalStudents) * 100) : 0;
        
        res.json({
            success: true,
            date,
            stats: {
                totalStudents,
                presentToday,
                lateToday,
                totalMarked,
                absentToday: totalStudents - totalMarked,
                attendanceRate: `${attendanceRate}%`,
                totalRecords: totalAttendanceRecords
            }
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Database status check with detailed info
app.get('/api/status', async (req, res) => {
    try {
        const [studentCount, attendanceCount, todayAttendance] = await Promise.all([
            Student.countDocuments(),
            Attendance.countDocuments(),
            Attendance.countDocuments({ date: formatDate() })
        ]);
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            database: {
                connected: mongoose.connection.readyState === 1,
                name: mongoose.connection.name,
                students: studentCount,
                totalAttendanceRecords: attendanceCount,
                todayAttendance: todayAttendance
            },
            server: {
                uptime: Math.floor(process.uptime()),
                httpPort: HTTP_PORT,
                httpsPort: HTTPS_PORT,
                httpsAvailable: fs.existsSync('cert.pem'),
                environment: process.env.NODE_ENV || 'development',
                nodeVersion: process.version
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching system status',
            error: error.message 
        });
    }
});

// Add individual student (for testing)
app.post('/api/students', async (req, res) => {
    try {
        const { rollNumber, name, className, parentContact } = req.body;
        
        if (!rollNumber || !name || !className) {
            return res.status(400).json({
                success: false,
                message: 'Roll number, name, and class are required'
            });
        }
        
        const student = new Student({
            rollNumber,
            name,
            class: className,
            parentContact
        });
        
        await student.save();
        
        res.json({
            success: true,
            message: 'Student added successfully',
            student
        });
        
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Student with this roll number already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error adding student',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('💥 Server Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        availableRoutes: [
            'GET /',
            'GET /api/students/seed',
            'GET /api/students',
            'POST /api/students',
            'POST /api/attendance',
            'GET /api/attendance/:date',
            'GET /api/attendance/today',
            'GET /api/stats/:date?',
            'GET /api/status'
        ]
    });
});

// Generate self-signed certificate for development
const generateCert = () => {
    try {
        execSync('openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/C=IN/ST=MP/L=Bhopal/O=ClassFlow/CN=localhost"', {stdio: 'inherit'});
        console.log('✅ SSL certificates generated');
        return true;
    } catch (error) {
        console.log('❌ Failed to generate certs (OpenSSL required). Camera may not work on mobile without HTTPS.');
        return false;
    }
};

// Start servers
if (!fs.existsSync('key.pem') || !fs.existsSync('cert.pem')) {
    console.log('🔐 Generating SSL certificates for HTTPS...');
    generateCert();
}

let usingHTTPS = false;
if (fs.existsSync('key.pem') && fs.existsSync('cert.pem')) {
    const options = {
        key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem')
    };
    
    https.createServer(options, app).listen(HTTPS_PORT, () => {
        console.log(`🔐 HTTPS Server running on https://localhost:${HTTPS_PORT}`);
        console.log('📱 For mobile access: https://YOUR-IP:3001 (accept security warning)');
        usingHTTPS = true;
    });
}

// Always start HTTP, redirect to HTTPS if available
app.listen(HTTP_PORT, () => {
    console.log(`🚀 HTTP Server running on http://localhost:${HTTP_PORT}`);
    console.log(`📱 Frontend accessible at ${usingHTTPS ? 'https://localhost:3001' : 'http://localhost:3000'}`);
    console.log(`📊 API base URL: ${usingHTTPS ? 'https://localhost:3001/api' : 'http://localhost:3000/api'}`);
    console.log('⏰ Server started at:', new Date().toLocaleString());
    
    if (!usingHTTPS) {
        console.log('⚠️  HTTPS not available - Camera scanning on mobile may fail.');
        console.log('💡 Install OpenSSL or use ngrok: npx ngrok http 3000');
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    mongoose.connection.close(() => {
        console.log('📦 MongoDB connection closed');
        process.exit(0);
    });
});

console.log('\n📋 Available URLs:');
console.log('   Main App: ' + (usingHTTPS ? 'https://localhost:3001' : 'http://localhost:3000'));
console.log('   Student Scanner: ' + (usingHTTPS ? 'https://localhost:3001/student/scanner.html' : 'http://localhost:3000/student/scanner.html'));
console.log('   Faculty Dashboard: ' + (usingHTTPS ? 'https://localhost:3001/faculty/dashboard.html' : 'http://localhost:3000/faculty/dashboard.html'));
console.log('   QR Generator: ' + (usingHTTPS ? 'https://localhost:3001/qr-generator.html' : 'http://localhost:3000/qr-generator.html'));
console.log('   For mobile testing: Use ngrok or access via IP with HTTPS\n');