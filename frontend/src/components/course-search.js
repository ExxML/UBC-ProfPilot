import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BACKEND_URL, DEPARTMENT_MAPPINGS, UNIVERSITY_CONFIG } from '../config.js';
import CircularProgress from './circular-progress.js';

const CourseSearch = () => {
  const [formData, setFormData] = useState({
    course_name: '',
    department_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ percentage: 0, phase: 'idle', message: 'Ready to search' });
  const [searchDurationMs, setSearchDurationMs] = useState(null);
  const socketRef = useRef(null);
  const sessionIdRef = useRef(null);
  const startTimeRef = useRef(null);
  const timeoutRef = useRef(null);
  const inactivityTimeoutRef = useRef(null);
  const lastMessageTimeRef = useRef(null);

  // If no updates from backend for SEARCH_TIMEOUT ms, update progress msg and wait FINAL_SEARCH_TIMEOUT ms before completely timing out
  const FINAL_SEARCH_TIMEOUT = 60000;
  const SEARCH_TIMEOUT = 120000;

  // Shared timeout handler - eliminates duplication between inactivity and HTTP timeouts
  const createTimeoutHandler = () => {
    return () => {
      setError(`Request timed out after 3 minutes. The API service likely ran out of memory while loading course professors. Try searching a course with fewer professors.`);
      setLoading(false);
      setProgress({ percentage: 0, phase: 'timeout', message: 'Request timed out' });
    };
  };

  // Inactivity detection handler - starts the FINAL_SEARCH_TIMEOUT when backend stops sending updates
  const handleInactivityTimeout = useCallback(() => {
    setProgress(prev => ({ ...prev, message: 'Waiting 1 minute for backend response...' }));
    timeoutRef.current = setTimeout(createTimeoutHandler(), FINAL_SEARCH_TIMEOUT);
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    const backendUrl = API_BACKEND_URL || 'http://localhost:3001';
    socketRef.current = io(backendUrl, {
      // Add connection options to prevent memory leaks
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: false, // Reuse connections when possible
    });
    sessionIdRef.current = Date.now().toString();

    const socket = socketRef.current;

    // Store event handlers for proper cleanup
    const handleProgress = (data) => {
      // Clear any existing timeout since backend is active again
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Update last message time and reset inactivity timer
      lastMessageTimeRef.current = Date.now();
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      inactivityTimeoutRef.current = setTimeout(handleInactivityTimeout, SEARCH_TIMEOUT); // Wait for no updates from backend before starting FINAL_SEARCH_TIMEOUT countdown

      setProgress({
        percentage: data.percentage,
        phase: data.phase,
        message: data.message
      });
    };

    const handleComplete = (data) => {
      setResult(data);
      const end = performance.now();
      setSearchDurationMs(end - (startTimeRef.current || end));
      setLoading(false);
      setProgress({ percentage: 100, phase: 'complete', message: 'Course search complete!' });

      // Clear both timeout timers
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
    };

    const handleError = (data) => {
      setError(data.error);
      setLoading(false);
      setProgress({ percentage: 0, phase: 'error', message: 'Course search failed' });

      // Clear both timeout timers
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
    };

    // Listen for events
    socket.on('course-search-progress', handleProgress);
    socket.on('course-search-complete', handleComplete);
    socket.on('course-search-error', handleError);

    return () => {
      // Properly cleanup all event listeners
      if (socket) {
        socket.off('course-search-progress', handleProgress);
        socket.off('course-search-complete', handleComplete);
        socket.off('course-search-error', handleError);
        socket.disconnect();
      }
      // Clear refs and timers
      socketRef.current = null;
      startTimeRef.current = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
    };
  }, [handleInactivityTimeout]);

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
    setProgress({ percentage: 0, phase: 'department-load', message: 'Initializing API (1-2 mins)... If >4 mins, try reloading the page...' });

    // Clear previous timer references to prevent memory leaks
    if (startTimeRef.current) {
      startTimeRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
    startTimeRef.current = performance.now();
    setSearchDurationMs(null);

    if (socketRef.current) {
      // For WebSocket: Initialize last message time to start inactivity detection
      lastMessageTimeRef.current = Date.now();

      socketRef.current.emit('start-course-search', {
        course_name: formData.course_name,
        department_number: DEPARTMENT_MAPPINGS[formData.department_name],
        university_number: UNIVERSITY_CONFIG.number,
        sessionId: sessionIdRef.current
      });
    } else {
      // For HTTP: Set up timeout immediately since no progress updates
      timeoutRef.current = setTimeout(createTimeoutHandler(), SEARCH_TIMEOUT + FINAL_SEARCH_TIMEOUT);
      // Fallback to direct HTTP request if WebSocket is not available
      try {
        const response = await axios.get(`${API_BACKEND_URL}/course`, {
          params: {
            course_name: formData.course_name,
            department_number: DEPARTMENT_MAPPINGS[formData.department_name],
            university_number: UNIVERSITY_CONFIG.number
          }
        });
        setResult(response.data);
        setProgress({ percentage: 100, phase: 'complete', message: 'Course search complete!' });
        const end = performance.now();
        setSearchDurationMs(end - (startTimeRef.current || end));

        // Clear both timeout timers
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (inactivityTimeoutRef.current) {
          clearTimeout(inactivityTimeoutRef.current);
          inactivityTimeoutRef.current = null;
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message);
        setProgress({ percentage: 0, phase: 'error', message: 'Course search failed' });

        // Clear both timeout timers
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (inactivityTimeoutRef.current) {
          clearTimeout(inactivityTimeoutRef.current);
          inactivityTimeoutRef.current = null;
        }
      } finally {
        setLoading(false);
      }
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
              placeholder="Ex. CPSC110"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the course code (no spaces)
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
              {Array.from(Object.keys(DEPARTMENT_MAPPINGS)).sort().map((deptName) => (
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

        {/* Course Search Info */}
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-900 mb-2">
            <span className="text-xl font-medium">Course Search 🔎</span>
          </p>
          <p className="text-sm text-gray-800">
            Search for any UBC course to get a list of all the professors who have taught the course!
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Due to API service limits, only the first 200 professors will be loaded.
          </p>
        </div>


        <button
          type="submit"
          disabled={!isFormValid || loading}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {loading ? 'Searching Course...' : 'Search Course'}
        </button>
      </form>

      {/* Progress Bar */}
      {loading && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-primary-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Searching Course</h3>
          </div>
          <div className="flex items-center justify-center py-8">
            <CircularProgress
              percentage={progress.percentage}
              phase={progress.phase}
              message={progress.message}
              size={140}
              strokeWidth={10}
              animate={true}
              searchType="course"
            />
          </div>
        </div>
      )}

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
                <p className="text-gray-900">
                  {Array.from(Object.keys(DEPARTMENT_MAPPINGS)).find(name => 
                    DEPARTMENT_MAPPINGS[name] === result.department_number
                  ) || result.department_number}
                </p>
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
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-xs text-gray-600">
            {searchDurationMs !== null && result.professors && (
              <span>{result.professors.length} professor(s) found in {(searchDurationMs / 1000).toFixed(2)} seconds</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseSearch;
