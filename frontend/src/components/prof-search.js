import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BACKEND_URL, UNIVERSITY_CONFIG } from '../config.js';
import CircularProgress from './circular-progress.js';

const ProfessorSearch = () => {
  const [formData, setFormData] = useState({
    fname: '',
    lname: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ percentage: 0, phase: 'idle', message: 'Ready to search' });
  const [searchDurationMs, setSearchDurationMs] = useState(null);
  const socketRef = useRef(null);
  const sessionIdRef = useRef(null);
  const startTimeRef = useRef(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const backendUrl = API_BACKEND_URL || 'http://localhost:3000';
    socketRef.current = io(backendUrl);
    sessionIdRef.current = Date.now().toString();

    // Listen for progress updates
    socketRef.current.on('search-progress', (data) => {
      setProgress({
        percentage: data.percentage,
        phase: data.phase,
        message: data.message
      });
    });

    // Listen for search completion
    socketRef.current.on('search-complete', (data) => {
      setResult(data);
      const end = performance.now();
      setSearchDurationMs(end - (startTimeRef.current || end));
      setLoading(false);
      setProgress({ percentage: 100, phase: 'complete', message: 'Search complete!' });
    });

    // Listen for search errors
    socketRef.current.on('search-error', (data) => {
      setError(data.error);
      setLoading(false);
      setProgress({ percentage: 0, phase: 'error', message: 'Search failed' });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

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
    setProgress({ percentage: 0, phase: 'url-search', message: 'Starting search...' });
    startTimeRef.current = performance.now();
    setSearchDurationMs(null);

    if (socketRef.current) {
      socketRef.current.emit('start-professor-search', {
        fname: formData.fname,
        lname: formData.lname,
        university: UNIVERSITY_CONFIG.name,
        sessionId: sessionIdRef.current
      });
    } else {
      // Fallback to direct HTTP request if WebSocket is not available
      try {
        const response = await axios.get(`${API_BACKEND_URL}/professor`, {
          params: {
            fname: formData.fname,
            lname: formData.lname,
            university: UNIVERSITY_CONFIG.name
          }
        });
        setResult(response.data);
        setProgress({ percentage: 100, phase: 'complete', message: 'Search complete!' });
        const end = performance.now();
        setSearchDurationMs(end - (startTimeRef.current || end));
      } catch (err) {
        setError(err.response?.data?.error || err.message);
        setProgress({ percentage: 0, phase: 'error', message: 'Search failed' });
      } finally {
        setLoading(false);
      }
    }
  };

  const isFormValid = formData.fname.trim() && formData.lname.trim();

  return (
    <div className="space-y-6">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="fname" className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <input
              type="text"
              id="fname"
              name="fname"
              value={formData.fname}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Ex. Gregor"
              required
            />
          </div>
          <div>
            <label htmlFor="lname" className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <input
              type="text"
              id="lname"
              name="lname"
              value={formData.lname}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Ex. Kiczales"
              required
            />
          </div>
        </div>

        {/* Prof Search Info */}
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-900 mb-2">
            <span className="text-xl font-medium">Professor Search 🔎</span>
          </p>
          <p className="text-sm text-gray-800">
            Search for any professor at UBC to get an AI summary of all their ratings from RateMyProfessors!
          </p>
        </div>

        <button
          type="submit"
          disabled={!isFormValid || loading}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {loading ? 'Searching...' : 'Search Professor'}
        </button>
      </form>

      {/* Progress Bar */}
      {loading && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-primary-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Searching Professor</h3>
          </div>
          <div className="flex items-center justify-center py-8">
            <CircularProgress
              percentage={progress.percentage}
              phase={progress.phase}
              message={progress.message}
              size={140}
              strokeWidth={10}
              animate={true}
              searchType="professor"
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
            <h3 className="text-lg font-medium text-gray-900">Professor Information</h3>
          </div>
          <div className="p-6 space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Name</h4>
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {result.first_name} {result.last_name}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">University</h4>
                <p className="text-gray-900 capitalize">{result.university}</p>
              </div>
            </div>

            {/* Ratings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-green-800">Overall Quality</h4>
                <p className="text-2xl font-bold text-green-600">{result.overall_quality}/5</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-800">Difficulty</h4>
                <p className="text-2xl font-bold text-yellow-600">{result.difficulty}/5</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800">Would Take Again</h4>
                <p className="text-2xl font-bold text-blue-600">{result.would_take_again}%</p>
              </div>
            </div>

            {/* Summary */}
            {result.summary && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">AI Summary</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{result.summary}</p>
                </div>
              </div>
            )}

            {/* Profile Link */}
            <div className="pt-4 border-t border-gray-200">
              <a
                href={result.URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-primary-600 hover:text-primary-700"
              >
                View on RateMyProfessors
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-xs text-gray-600">
            {searchDurationMs !== null && result.ratings && (
              <span>{result.ratings.length} rating(s) found in {(searchDurationMs / 1000).toFixed(2)} seconds</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessorSearch;
