import { useEffect } from 'react';

// Add pulsing glow animations
const glowAnimations = Array.from({ length: 8 }, (_, index) => `
@keyframes pulse-glow-${index} {
  0% {
    opacity: 0.02;
  }
  100% {
    opacity: ${Math.max(0.15, 0.15 * Math.exp(-index * 0.4))};
  }
}
`);

const GLOW_PADDING = 30;
const CircularProgress = ({
  percentage = 0,
  size = 120,
  strokeWidth = 8,
  message = 'Loading...',
  phase = 'idle',
  searchType = ''
}) => {
  // Inject pulsing glow animations into document head
  useEffect(() => {
    const styleId = 'circular-progress-glow-animations';
    const existingStyle = document.getElementById(styleId);

    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = glowAnimations.join('\n');
      document.head.appendChild(style);
    }

    return () => {
      const style = document.getElementById(styleId);
      if (style && style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);
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
    'error': { color: '#ef4444', icon: '❌', bgColor: '#fee2e2' },
    'timeout': { color: '#f97316', icon: '⏰', bgColor: '#fed7aa' }
  };

  const config = phaseConfig[phase] || phaseConfig.idle;

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-6 progress-bounce-in">
      {/* Circular Progress */}
      <div className="relative">
        <svg
          width={size + GLOW_PADDING}
          height={size + GLOW_PADDING}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={(size + GLOW_PADDING) / 2}
            cy={(size + GLOW_PADDING) / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
            className="opacity-20"
          />
          {/* Multiple glow layers for neon effect with pulsing animation */}
          {Array.from({ length: 8 }, (_, index) => {
            const glowWidth = 10 - index;
            const baseOpacity = Math.max(0.05, 0.15 * Math.exp(-index * 0.4));
            return (
              <circle
                key={`glow-${index}`}
                cx={(size + GLOW_PADDING) / 2}
                cy={(size + GLOW_PADDING) / 2}
                r={radius}
                stroke={config.color}
                strokeWidth={strokeWidth + glowWidth}
                fill="none"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
                style={{
                  stroke: config.color,
                  opacity: baseOpacity,
                  animation: `pulse-glow-${index} 1s ease-in-out infinite alternate`
                }}
              />
            );
          })}
          {/* Main progress circle */}
          <circle
            cx={(size + GLOW_PADDING) / 2}
            cy={(size + GLOW_PADDING) / 2}
            r={radius}
            stroke={config.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out relative z-10"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div 
            className="p-2 mb-1 text-2xl rounded-full transition-colors duration-300"
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
      <div className="text-center">
        <div className="text-sm font-medium text-gray-900 mb-1">
          {getPhaseTitle(phase)}
        </div>
        <div className="text-xs text-gray-600 leading-relaxed">
          {message}
        </div>
      </div>

      {/* Phase indicators */}
      <div className="flex space-x-2 mt-4">
        {getPhaseIndicators(searchType).map((phaseKey, index) => {
          const phaseData = phaseConfig[phaseKey];
          return (
            <div
              key={phaseKey}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                getPhaseOrder(phase) > index 
                  ? 'scale-110' 
                  // Always animate the first phase
                  : getPhaseOrder(phase) === index || index === 0
                  ? 'scale-125 animate-pulse' 
                  : 'scale-75'
              }`}
              style={{
                // Always light up the first phase
                backgroundColor: (getPhaseOrder(phase) >= index || index === 0) ? (getPhaseOrder(phase) === index ? config.color : phaseData.color) : '#e5e7eb'
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// Helper function to get phase indicators for each search type
const getPhaseIndicators = (searchType) => {
  if (searchType === 'professor') {
    return ['url-search', 'url-found', 'page-load', 'ratings-load', 'ai-summary'];
  } else if (searchType === 'course') {
    return ['department-load', 'professor-load', 'course-check'];
  }
  return [];
};

// Helper function to get phase title
const getPhaseTitle = (phase) => {
  const titles = {
    'idle': 'Ready to Search',
    'url-search': 'Finding Professor',
    'url-found': 'Professor Found',
    'page-load': 'Loading Professor Page',
    'ratings-load': 'Loading Ratings',
    'ai-summary': 'Summarizing',
    'department-load': 'Loading Department',
    'professor-load': 'Finding Professors',
    'course-check': 'Checking Course Professors',
    'complete': 'Complete!',
    'error': 'Error Occurred',
    'timeout': 'Request Timeout'
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
    'error': -1,
    'timeout': -1
  };
  return order[phase] || -1;
};

export default CircularProgress;
