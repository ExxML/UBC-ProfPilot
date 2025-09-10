const findProfessorsForCourse = require('../src/course-data');

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { course_name: courseName, department_number: departmentNumber, university_number: universityNumber } = req.query;
    
    if (!courseName || !departmentNumber || !universityNumber) {
        return res.status(400).json({
            error: 'Missing required parameters: course_name, department_number, and university_number are required'
        });
    }
    
    try {
        const professors = await new Promise((resolve, reject) => {
            findProfessorsForCourse(courseName, departmentNumber, universityNumber, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
        
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
        
        return res.json(response);
        
    } catch (error) {
        console.error('Error finding professors for course:', error.message);
        return res.status(500).json({
            error: 'Error finding professors for the specified course',
            details: error.message
        });
    }
};
