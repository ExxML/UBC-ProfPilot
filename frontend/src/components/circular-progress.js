import React from 'react';

const CircularProgress = ({ 
  percentage = 0, 
  size = 120, 
  strokeWidth = 8, 
  message = 'Loading...', 
  phase = 'idle',
  animate = true,
  searchType = ''
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Phase colors and icons
  const phaseConfig = {
    'idle': { color: '#e5e7eb', icon: '⏳', bgColor: '#f3f4f6' },
    'url-search': { color: '#3b82f6', icon: '🔍', bgColor: '#dbeafe' },
    'url-found': { color: '#10b981', icon: '✅', bgColor: '#d1fae5' },
    'page-load': { color: '#f59e0b', icon: '📄', bgColor: '#fef3c7' },
    'ratings-load': { color: '#8b5cf6', icon: '⭐', bgColor: '#ede9fe' },
    'ai-summary': { color: '#06b6d4', icon: '🤖', bgColor: '#cffafe' },
    'department-load': { color: '#3b82f6', icon: '🏢', bgColor: '#dbeafe' },
    'professor-load': { color: '#f59e0b', icon: '👨‍🏫', bgColor: '#fef3c7' },
    'course-check': { color: '#8b5cf6', icon: '📚', bgColor: '#ede9fe' },
    'complete': { color: '#10b981', icon: '🎉', bgColor: '#d1fae5' },
    'error': { color: '#ef4444', icon: '❌', bgColor: '#fee2e2' }
  };

  const config = phaseConfig[phase] || phaseConfig.idle;

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-6 progress-bounce-in">
      {/* Circular Progress */}
      <div className="relative">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
            className="opacity-20"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={config.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`transition-all duration-500 ease-out ${animate ? 'progress-glow' : ''}`}
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            }}
          />
          {/* Glow effect for active progress */}
          {animate && percentage > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={config.color}
              strokeWidth={strokeWidth / 2}
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="opacity-30 progress-pulse"
              style={{
                filter: 'blur(2px)'
              }}
            />
          )}
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div 
            className="text-2xl mb-1 p-2 rounded-full transition-colors duration-300"
            style={{ backgroundColor: config.bgColor }}
          >
            {config.icon}
          </div>
          <div className="text-lg font-bold text-gray-700">
            {Math.round(percentage)}%
          </div>
        </div>
      </div>

      {/* Progress message */}
      <div className="text-center max-w-xs">
        <div className="text-sm font-medium text-gray-900 mb-1">
          {getPhaseTitle(phase)}
        </div>
        <div className="text-xs text-gray-600 leading-relaxed">
          {message}
        </div>
      </div>

      {/* Phase indicators */}
      <div className="flex space-x-2 mt-4">
        {Object.entries(phaseConfig).slice(1, searchType === 'course' ? 4 : searchType === 'professor' ? 6 : 0).map(([phaseKey, phaseData], index) => (
          <div
            key={phaseKey}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              getPhaseOrder(phase) > index 
                ? 'scale-110' 
                : getPhaseOrder(phase) === index 
                ? 'scale-125 animate-pulse' 
                : 'scale-75'
            }`}
            style={{
              backgroundColor: getPhaseOrder(phase) >= index ? (getPhaseOrder(phase) === index ? config.color : phaseData.color) : '#e5e7eb'
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Helper function to get phase title
const getPhaseTitle = (phase) => {
  const titles = {
    'idle': 'Ready to Search',
    'url-search': 'Finding Professor',
    'url-found': 'Professor Found',
    'page-load': 'Loading Page',
    'ratings-load': 'Loading Ratings',
    'ai-summary': 'Generating Summary',
    'department-load': 'Loading Department',
    'professor-load': 'Finding Professors',
    'course-check': 'Checking Course Ratings',
    'complete': 'Complete!',
    'error': 'Error Occurred'
  };
  return titles[phase] || 'Processing...';
};

// Helper function to get phase order for indicators
const getPhaseOrder = (phase) => {
  const order = {
    'idle': -1,
    'url-search': 0,
    'url-found': 1,
    'page-load': 2,
    'ratings-load': 3,
    'ai-summary': 4,
    'department-load': 0,
    'professor-load': 1,
    'course-check': 2,
    'complete': 5,
    'error': -1
  };
  return order[phase] || -1;
};

export default CircularProgress;
