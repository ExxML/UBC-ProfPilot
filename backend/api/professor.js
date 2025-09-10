const professorURL = require('../src/prof-url');
const professorData = require('../src/prof-data');

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
    
    const { fname, lname, university } = req.query;
    
    if (!fname || !lname || !university) {
        return res.status(400).json({
            error: 'Missing required parameters: fname, lname, and university are required'
        });
    }
    
    try {
        // Wrap callback-based functions in promises
        const urlResponse = await new Promise((resolve, reject) => {
            professorURL(fname, lname, university, (result) => {
                if (!result || !result.URL) {
                    reject(new Error(result?.error || 'No response from URL generator'));
                } else {
                    resolve(result);
                }
            });
        });
        
        console.log(`Fetching data for: ${urlResponse.URL}`);
        
        const data = await new Promise((resolve, reject) => {
            professorData(urlResponse.URL, (result) => {
                if (result.error) {
                    reject(new Error(result.error));
                } else {
                    resolve(result);
                }
            });
        });
        
        return res.json({
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
        
    } catch (error) {
        console.error('Error in professor API:', error.message);
        return res.status(500).json({
            error: 'Error fetching professor data',
            details: error.message
        });
    }
};
