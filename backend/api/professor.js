const professorURL = require('../src/prof-url');
const professorData = require('../src/prof-data');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { fname, lname, university } = req.query || {};

  if (!fname || !lname || !university) {
    res.status(400).json({
      error: 'Missing required parameters: fname, lname, and university are required'
    });
    return;
  }

  try {
    professorURL(String(fname), String(lname), String(university), (urlResponse) => {
      if (!urlResponse || !urlResponse.URL) {
        res.status(404).json({
          error: 'Professor not found or error generating URL',
          details: urlResponse ? urlResponse.error : 'No response from URL generator'
        });
        return;
      }

      professorData(urlResponse.URL, (data) => {
        if (data && data.error) {
          res.status(500).json({
            error: 'Error fetching professor data',
            details: data.error,
            status: data.status
          });
          return;
        }

        res.status(200).json({
          URL: urlResponse.URL,
          first_name: urlResponse.lname,
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
  } catch (error) {
    res.status(500).json({ error: 'Unexpected server error', details: error.message });
  }
};


