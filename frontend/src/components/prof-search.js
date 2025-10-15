import { useState } from 'react';
import { UNIVERSITY_CONFIG } from '../config.js';
import { useSearch } from '../hooks/use-search.js';
import ProgressDisplay from './progress-display.js';

// Utility function to parse AI summary with formatting
const parseAISummary = (text) => {
  if (!text) return null;
  
  // Normalize line breaks: handle CRLF, CR, literal "\n" sequences, and real newlines
  const normalized = String(text)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\\n/g, '\n');
  
  // Split by normalized newlines
  const lines = normalized.split('\n');
  
  return lines.map((line, lineIndex) => {
    if (!line.trim()) {
      // Empty line - render as line break
      return <br key={lineIndex} />;
    }
    
    // Process bold formatting within each line
    const parts = [];
    let currentText = line;
    let partIndex = 0;
    
    // Find all bold patterns (**text**)
    const boldPattern = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;
    
    while ((match = boldPattern.exec(currentText)) !== null) {
      // Add text before the bold part
      if (match.index > lastIndex) {
        const beforeText = currentText.slice(lastIndex, match.index);
        if (beforeText) {
          parts.push(<span key={`${lineIndex}-${partIndex++}`}>{beforeText}</span>);
        }
      }
      
      // Add the bold part
      parts.push(<strong key={`${lineIndex}-${partIndex++}`}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text after last bold part
    if (lastIndex < currentText.length) {
      const remainingText = currentText.slice(lastIndex);
      if (remainingText) {
        parts.push(<span key={`${lineIndex}-${partIndex++}`}>{remainingText}</span>);
      }
    }
    
    // If no bold formatting was found, just return the line as is
    if (parts.length === 0) {
      parts.push(<span key={`${lineIndex}-0`}>{line}</span>);
    }
    
    return <div key={lineIndex} className="mb-1">{parts}</div>;
  });
};

const ProfessorSearch = () => {
  const [formData, setFormData] = useState({
    fname: '',
    lname: ''
  });

  const { loading, result, error, progress, searchDurationMs, startSearch, stopSearch, emitEvent, setProgress } = useSearch({
    progressEvent: 'search-progress',
    completeEvent: 'search-complete',
    errorEvent: 'search-error',
    completeMessage: 'Search complete!',
    errorMessage: 'Search failed',
    timeoutErrorMessage: 'Request timed out after 3 minutes. The API service likely ran out of memory while loading professor ratings. Try searching a professor with fewer ratings.'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSkipRatings = () => {
    console.log('Skipping remaining ratings...');
    setProgress(prev => ({
      ...prev,
      message: 'Skipping remaining ratings...'
    }));
    emitEvent('skip-ratings-load', {});
  };


  const handleSubmit = (e) => {
    e.preventDefault();
    startSearch(
      'start-professor-search',
      {
        fname: formData.fname,
        lname: formData.lname,
        university: UNIVERSITY_CONFIG.name,
        phase: 'url-search'
      },
      'Initializing API (1-2 mins)... If >4 mins, try reloading the page...'
    );
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
      <ProgressDisplay
        loading={loading}
        progress={progress}
        onStop={stopSearch}
        onSkip={handleSkipRatings}
        title="Searching Professor"
        searchType="professor"
        skipPhases={['ratings-load']}
        skipTitle="Generate AI summary"
      />

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
      {!loading && result && (
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
                <p className="text-2xl font-bold text-blue-600">{result.would_take_again}</p>
              </div>
            </div>

            {/* Summary */}
            {result.summary && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">AI Summary</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-gray-700">{parseAISummary(result.summary)}</div>
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
