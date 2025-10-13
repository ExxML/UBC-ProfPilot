import express from 'express';
import cors from 'cors';
import professorURL from '../src/prof-url.js';
import professorData from '../src/prof-data.js';
import findProfessorsForCourse from '../src/course-data.js';

const app = express();

const frontendUrl = process.env.FRONTEND_URL;

app.use(cors({origin: frontendUrl || 'http://localhost:3000'}));
app.use(express.json());

// Health check endpoint
app.get('/api', (req, res) => {
    res.json({ status: 'ok', message: 'UBC ProfPilot API is running' });
});

// Professor URL endpoint
app.get('/api/professor-url', async (req, res) => {
    try {
        const { firstName, lastName } = req.query;
        if (!firstName || !lastName) {
            return res.status(400).json({ error: 'firstName and lastName are required' });
        }
        const url = await professorURL(firstName, lastName);
        res.json({ url });
    } catch (error) {
        console.error('Error fetching professor URL:', error);
        res.status(500).json({ error: error.message });
    }
});

// Professor data endpoint
app.get('/api/professor-data', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: 'url is required' });
        }
        const data = await professorData(url);
        res.json(data);
    } catch (error) {
        console.error('Error fetching professor data:', error);
        res.status(500).json({ error: error.message });
    }
});

// Course professors endpoint
app.get('/api/course-professors', async (req, res) => {
    try {
        const { courseCode } = req.query;
        if (!courseCode) {
            return res.status(400).json({ error: 'courseCode is required' });
        }
        const professors = await findProfessorsForCourse(courseCode);
        res.json({ professors });
    } catch (error) {
        console.error('Error fetching course professors:', error);
        res.status(500).json({ error: error.message });
    }
});

// Export the Express app as a serverless function
export default app;
