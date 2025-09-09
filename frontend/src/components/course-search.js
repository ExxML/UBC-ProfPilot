import React, { useState } from 'react';
import axios from 'axios';
import departments from './department-number-map.js';

const CourseSearch = () => {
  const [formData, setFormData] = useState({
    course_name: '',
    department_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.get('http://localhost:3000/course', {
        params: {
          course_name: formData.course_name,
          department_number: departments[formData.department_name],
          university_number: '1413' // UBC university number
        }
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.course_name.trim() && formData.department_name.trim();

  return (
    <div className="space-y-6">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="course_name" className="block text-sm font-medium text-gray-700 mb-2">
              Course Name
            </label>
            <input
              type="text"
              id="course_name"
              name="course_name"
              value={formData.course_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., CPSC 110, MATH 100, ENGL 110"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the course code
            </p>
          </div>
          <div>
            <label htmlFor="department_name" className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              id="department_name"
              name="department_name"
              value={formData.department_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">Select a department...</option>
              {Object.keys(departments).sort().map((deptName) => (
                <option key={deptName} value={deptName}>
                  {deptName}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select the department for your course
            </p>
          </div>
        </div>

        {/* University Info */}
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-600">
            <span className="font-medium">University:</span> University of British Columbia (UBC)
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">University Number:</span> 1413
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Search is automatically limited to UBC courses
          </p>
        </div>


        <button
          type="submit"
          disabled={!isFormValid || loading}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching Course...
            </div>
          ) : (
            'Search Course'
          )}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Search Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-primary-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Course Information</h3>
            <p className="text-sm text-gray-600">
              {result.course_name} - {result.professors_count} professor(s) found
            </p>
          </div>
          <div className="p-6">
            {/* Course Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Course</h4>
                <p className="text-lg font-semibold text-gray-900">{result.course_name}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Department</h4>
                <p className="text-gray-900">{formData.department_name}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Professors Found</h4>
                <p className="text-lg font-semibold text-primary-600">{result.professors_count}</p>
              </div>
            </div>

            {/* Professors List */}
            {result.professors && result.professors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-4">Professors Teaching This Course:</h4>
                <div className="space-y-3">
                  {result.professors.map((professor, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{professor.name}</h5>
                          <p className="text-sm text-gray-600">{professor.department}</p>
                          <p className="text-sm text-gray-500">{professor.university}</p>
                          {professor.num_ratings && (
                            <p className="text-xs text-primary-600 mt-1">
                              {professor.num_ratings} rating(s) for {result.course_name}
                            </p>
                          )}
                        </div>
                        <div className="ml-4">
                          <a
                            href={professor.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary-600 hover:text-primary-700 text-sm"
                          >
                            View Profile
                            <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseSearch;
