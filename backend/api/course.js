const findProfessorsForCourse = require('../src/course-data');

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

  const { course_name, department_number, university_number } = req.query || {};

  if (!course_name || !department_number || !university_number) {
    res.status(400).json({
      error: 'Missing required parameters: course_name, department_number, and university_number are required'
    });
    return;
  }

  try {
    findProfessorsForCourse(String(course_name), String(department_number), String(university_number), (error, professors) => {
      if (error) {
        res.status(500).json({
          error: 'Error finding professors for the specified course',
          details: error.message
        });
        return;
      }

      if (!professors || professors.length === 0) {
        res.status(404).json({
          error: 'No professors found teaching the specified course',
          course_name: course_name,
          department_number: department_number,
          university_number: university_number
        });
        return;
      }

      res.status(200).json({
        course_name: course_name,
        department_number: department_number,
        university_number: university_number,
        professors_count: professors.length,
        professors: professors.map(prof => ({
          name: prof.name,
          first_name: prof.lastName,
          last_name: prof.firstName,
          department: prof.department,
          university: prof.university,
          profile_url: prof.profileURL,
          num_ratings: prof.numRatings
        }))
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Unexpected server error', details: error.message });
  }
};


