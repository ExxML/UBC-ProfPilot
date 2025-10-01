const professorURL = require('./src/prof-url')
const professorData = require('./src/prof-data')
const findProfessorsForCourse = require('./src/course-data')
const { closeBrowser, closePersistentBrowser } = require('./src/browser')
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
var app = express();
const cors = require('cors');
const frontendUrl = process.env.FRONTEND_URL

app.use(cors({origin: frontendUrl || 'http://localhost:3000'}));

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store active connections by session ID with cleanup tracking
const activeConnections = new Map();
const connectionTimestamps = new Map();
const CONNECTION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Track connected clients for auto-shutdown
const connectedClients = new Set();

// Cleanup stale connections every 5 minutes
const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [sessionId, timestamp] of connectionTimestamps.entries()) {
        if (now - timestamp > CONNECTION_TIMEOUT) {
            activeConnections.delete(sessionId);
            connectionTimestamps.delete(sessionId);
            console.log(`Cleaned up stale connection: ${sessionId}`);
        }
    }
}, 5 * 60 * 1000);

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Track client connection
    connectedClients.add(socket.id);

    // Set up heartbeat monitoring for reliable disconnection detection
    const HEARTBEAT_TIMEOUT = 30000; // 30 seconds
    let heartbeatTimeout;

    // Monitor connection heartbeat
    const resetHeartbeatTimeout = () => {
        if (heartbeatTimeout) {
            clearTimeout(heartbeatTimeout);
        }
        heartbeatTimeout = setTimeout(() => {
            console.log(`No heartbeat from client ${socket.id} for ${HEARTBEAT_TIMEOUT}ms, forcing socket disconnect`);
            socket.disconnect(true); // Force disconnect
        }, HEARTBEAT_TIMEOUT);
    };

    // Listen for heartbeat events
    socket.conn.on('heartbeat', () => {
        resetHeartbeatTimeout();
    });

    // Also listen for packet events (any activity)
    socket.conn.on('packet', () => {
        resetHeartbeatTimeout();
    });

    // Initial heartbeat timeout setup
    resetHeartbeatTimeout();
    
    socket.on('start-professor-search', (data) => {
        const { fname, lname, university, sessionId } = data;
        activeConnections.set(sessionId, socket.id);
        connectionTimestamps.set(sessionId, Date.now());
        
        // Emit progress updates
        const emitProgress = (phase, percentage, message) => {
            socket.emit('search-progress', { phase, percentage, message });
        };
        
        emitProgress('url-search', 10, 'Searching for professor profile...');
        
        professorURL(fname, lname, university, (urlResponse) => {
            if (!urlResponse || !urlResponse.URL) {
                socket.emit('search-error', {
                    error: 'Professor not found or error generating URL',
                    details: urlResponse ? urlResponse.error : 'No response from URL generator'
                });
                return;
            }
            
            emitProgress('url-found', 25, 'Professor profile found, loading data...');
            
            professorData(urlResponse.URL, (data) => {
                if (data.error) {
                    socket.emit('search-error', {
                        error: 'Error fetching professor data',
                        details: data.error,
                        status: data.status
                    });
                    return;
                }
                
                socket.emit('search-complete', {
                    URL: urlResponse.URL,
                    first_name: urlResponse.lname,  // First/last names are swapped
                    last_name: urlResponse.fname,
                    university: urlResponse.university,
                    would_take_again: data.percentage,
                    difficulty: data.difficulty,
                    overall_quality: data.quality,
                    ratings: data.ratings,
                    summary: data.summary
                });
            }, emitProgress);
        }, emitProgress);
    });
    
    socket.on('start-course-search', (data) => {
        const { course_name, department_number, university_number, sessionId } = data;
        activeConnections.set(sessionId, socket.id);
        connectionTimestamps.set(sessionId, Date.now());
        
        // Emit progress updates
        const emitProgress = (phase, percentage, message) => {
            socket.emit('course-search-progress', { phase, percentage, message });
        };
        
        emitProgress('department-load', 5, 'Starting course search...');
        
        findProfessorsForCourse(course_name, department_number, university_number, (error, professors) => {
            if (error) {
                socket.emit('course-search-error', {
                    error: 'Error searching for course professors',
                    details: error.message
                });
                return;
            }
            
            socket.emit('course-search-complete', {
                course_name: course_name,
                department_number: department_number,
                university_number: university_number,
                professors_count: professors.length,
                professors: professors.map(prof => ({
                    name: prof.name,
                    first_name: prof.lastName,  // First/last names are swapped
                    last_name: prof.firstName,
                    department: prof.department,
                    university: prof.university,
                    profile_url: prof.profileURL,
                    num_ratings: prof.numRatings
                }))
            });
        }, emitProgress);
    });
    
    socket.on('disconnect', async () => {
        console.log('Client disconnected:', socket.id);

        // Clear heartbeat timeout
        if (heartbeatTimeout) {
            clearTimeout(heartbeatTimeout);
        }

        // Remove from client tracking
        connectedClients.delete(socket.id);

        // Remove from active connections and timestamps
        for (let [sessionId, socketId] of activeConnections.entries()) {
            if (socketId === socket.id) {
                activeConnections.delete(sessionId);
                connectionTimestamps.delete(sessionId);
                break;
            }
        }

        // Report number of clients still connected
        console.log(`Clients remaining: ${connectedClients.size}`);

        // Check if no clients are connected and close persistent browser
        if (connectedClients.size === 0) {
            console.log('No clients connected, closing persistent browser...');
            try {
                await closePersistentBrowser();
                console.log('Persistent browser closed successfully');
            } catch (error) {
                console.error('Error closing persistent browser:', error.message);
            }
        }
    });
});

app.get('/professor', function (req, res) {
    const fname = req.query.fname;
    const lname = req.query.lname;
    const university = req.query.university;
    
    if (!fname || !lname || !university) {
        return res.status(400).json({
            error: 'Missing required parameters: fname, lname, and university are required'
        });
    }
    
    professorURL(fname, lname, university, (urlResponse) => {
        if (!urlResponse || !urlResponse.URL) {
            return res.status(404).json({
                error: 'Professor not found or error generating URL',
                details: urlResponse ? urlResponse.error : 'No response from URL generator'
            });
        }
        
        console.log(`Fetching data for: ${urlResponse.URL}`);
        
        professorData(urlResponse.URL, (data) => {
            if (data.error) {
                console.error('Error from professorData:', data.error);
                return res.status(500).json({
                    error: 'Error fetching professor data',
                    details: data.error,
                    status: data.status
                });
            }
            
            res.json({
                URL: urlResponse.URL,
                first_name: urlResponse.lname,  // First/last names are swapped
                last_name: urlResponse.fname,
                university: urlResponse.university,
                would_take_again: data.percentage,
                difficulty: data.difficulty,
                overall_quality: data.quality,
                ratings: data.ratings,
                summary: data.summary
            });
        });
    });
});

app.get('/course', function (req, res) {
    const courseName = req.query.course_name;
    const departmentNumber = req.query.department_number;
    const universityNumber = req.query.university_number;
    
    if (!courseName || !departmentNumber || !universityNumber) {
        return res.status(400).json({
            error: 'Missing required parameters: course_name, department_number, and university_number are required'
        });
    }
    
    findProfessorsForCourse(courseName, departmentNumber, universityNumber, (error, professors) => {
        if (error) {
            console.error('Error finding professors for course:', error.message);
            return res.status(500).json({
                error: 'Error finding professors for the specified course',
                details: error.message
            });
        }
        
        if (!professors || professors.length === 0) {
            return res.status(404).json({
                error: 'No professors found teaching the specified course',
                course_name: courseName,
                department_number: departmentNumber,
                university_number: universityNumber
            });
        }
        
        // Format the response to include professor names and relevant information
        const response = {
            course_name: courseName,
            department_number: departmentNumber,
            university_number: universityNumber,
            professors_count: professors.length,
            professors: professors.map(prof => ({
                name: prof.name,
                first_name: prof.lastName,  // First/last names are swapped
                last_name: prof.firstName,
                department: prof.department,
                university: prof.university,
                profile_url: prof.profileURL,
                num_ratings: prof.numRatings
            }))
        };
        res.json(response);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});

// Shutdown handling
const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Starting shutdown...`);
    
    // Clear cleanup interval
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
    }

    // Notify all connected clients about shutdown
    io.emit('server_shutdown', { message: 'Server is shutting down' });
    
    // Stop accepting new connections
    server.close(async (err) => {
        if (err) {
            console.error('Error closing server:', err);
        } else {
            console.log('HTTP server closed');
        }
        
        try {
            // Clear connection tracking
            activeConnections.clear();
            connectionTimestamps.clear();

            // Disconnect all socket clients
            const sockets = await io.fetchSockets();
            await Promise.all(sockets.map(socket => socket.disconnect(true)));
            console.log('All socket connections terminated');

            // Close all browser instances with timeout protection
            console.log('Closing browser instances...');
            try {
                await Promise.race([
                    closeBrowser(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Browser cleanup timeout')), 20000)
                    )
                ]);
                console.log('Browser cleanup completed');
            } catch (browserError) {
                console.error('Browser cleanup failed or timed out:', browserError.message);
            }
            
            // Run garbage collection if available
            if (global.gc) {
                try {
                    global.gc();
                    console.log('Forced garbage collection completed');
                } catch (gcError) {
                    console.warn('Failed to force garbage collection:', gcError.message);
                }
            }

            console.log('Shutdown completed');
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    });
    
    // Force exit if shutdown takes too long
    setTimeout(() => {
        console.error('Shutdown timed out after 60 seconds, forcing exit');
        process.exit(1);
    }, 60000);
};

// Register signal handlers for graceful shutdown
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    await shutdown('uncaughtException');
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    await shutdown('unhandledRejection');
});