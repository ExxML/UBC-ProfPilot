import CircularProgress from "./circular-progress.js";

const ProgressDisplay = ({
  loading,
  progress,
  onStop,
  onSkip,
  title,
  searchType,
  skipPhases = [],
  skipTitle = "Skip Loading",
}) => {
  if (!loading) return null;

  const showSkipButton = skipPhases.includes(progress.phase);

  return (
    <div className="relative overflow-hidden bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between px-6 py-4 bg-primary-50 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <button
          onClick={onStop}
          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
          title="Stop search and reset"
        >
          Stop
        </button>
      </div>
      <div className="flex items-center justify-center py-8">
        <CircularProgress
          percentage={progress.percentage}
          phase={progress.phase}
          message={progress.message}
          size={140}
          strokeWidth={10}
          searchType={searchType}
        />
      </div>
      {showSkipButton && onSkip && (
        <div className="absolute bottom-4 right-4">
          <button
            onClick={onSkip}
            className="px-4 py-2 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 shadow-md transition-colors duration-200"
            title={skipTitle}
          >
            {searchType === 'prof' ? 'Skip remaining ratings' : 'Skip remaining professors'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProgressDisplay;
