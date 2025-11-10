import { useState } from "react";
import { DEPARTMENT_MAPPINGS, UNIVERSITY_CONFIG } from "../config.js";
import { useSearch } from "../hooks/use-search.js";
import ProgressDisplay from "./progress-display.js";

const CourseSearch = () => {
  const [formData, setFormData] = useState({
    course_name: "",
    department_name: "",
  });

  const {
    loading,
    result,
    error,
    progress,
    searchDurationMs,
    startSearch,
    stopSearch,
    emitEvent,
    setProgress,
  } = useSearch({
    progressEvent: "course-search-progress",
    completeEvent: "course-search-complete",
    errorEvent: "course-search-error",
    completeMessage: "Course search complete!",
    errorMessage: "Course search failed",
    timeoutErrorMessage:
      "Request timed out after 3 minutes. The API service likely ran out of memory while loading course professors. Try searching a course with fewer professors.",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSkipProfessors = () => {
    console.log(`Skipping ${progress.phase} phase...`);
    setProgress((prev) => ({
      ...prev,
      message: "Skipping remaining professors...",
    }));
    emitEvent("skip-professors-load", { phase: progress.phase });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    startSearch(
      "start-course-search",
      {
        course_name: formData.course_name,
        department_number: DEPARTMENT_MAPPINGS.get(formData.department_name),
        university_number: UNIVERSITY_CONFIG.number,
        phase: "department-load",
      },
      "Cold-starting API (~2 mins)... If >4 mins, please reload the page and try again.",
    );
  };

  const isFormValid =
    formData.course_name.trim() && formData.department_name.trim();

  return (
    <div className="space-y-6">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="course_name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Course Name
            </label>
            <input
              type="text"
              id="course_name"
              name="course_name"
              value={formData.course_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Ex. CPSC110"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the course code (no spaces, case-insensitive)
            </p>
          </div>
          <div>
            <label
              htmlFor="department_name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Department
            </label>
            <select
              id="department_name"
              name="department_name"
              value={formData.department_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">Select a department...</option>
              {Array.from(DEPARTMENT_MAPPINGS.keys())
                .sort()
                .map((deptName) => (
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
        <div className="p-4 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-900 mb-2">
            <span className="text-xl font-medium">Course Search 🔎</span>
          </p>
          <p className="text-sm text-gray-800">
            Search for any UBC course to get a list of all the professors who
            have taught the course!
          </p>
        </div>

        <button
          type="submit"
          disabled={!isFormValid || loading}
          className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {loading ? "Searching Course..." : "Search Course"}
        </button>
      </form>

      {/* Progress Bar */}
      <ProgressDisplay
        loading={loading}
        progress={progress}
        onStop={stopSearch}
        onSkip={handleSkipProfessors}
        title="Searching Course"
        searchType="course"
        skipPhases={["professor-load", "course-check"]}
        skipTitle={
          progress.phase === "professor-load"
            ? "Start checking course professors"
            : "Display course professors"
        }
      />

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 rounded-md border border-red-200">
          <div className="flex">
            <svg
              className="h-5 w-5 text-red-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
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
        <div className="overflow-hidden bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 bg-primary-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Course Information
            </h3>
            <p className="text-sm text-gray-600">
              {result.course_name} - {result.professors_count} professor(s)
              found
            </p>
          </div>
          <div className="p-6">
            {/* Course Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Course</h4>
                <p className="text-lg font-semibold text-gray-900">
                  {result.course_name}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">
                  Department
                </h4>
                <p className="text-gray-900">
                  {Array.from(DEPARTMENT_MAPPINGS.keys()).find(
                    (name) =>
                      DEPARTMENT_MAPPINGS.get(name) ===
                      result.department_number,
                  ) || result.department_number}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">
                  Professors Found
                </h4>
                <p className="text-lg font-semibold text-primary-600">
                  {result.professors_count}
                </p>
              </div>
            </div>

            {/* Professors List */}
            {result.professors && result.professors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-4">
                  Professors Teaching This Course:
                </h4>
                <div className="space-y-3">
                  {result.professors.map((professor, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">
                            {professor.name}
                          </h5>
                          <p className="text-sm text-gray-600">
                            {professor.department}
                          </p>
                          <p className="text-sm text-gray-500">
                            {professor.university}
                          </p>
                          {professor.num_ratings && (
                            <p className="text-xs text-primary-600 mt-1">
                              {professor.num_ratings} rating(s) for{" "}
                              {result.course_name}
                            </p>
                          )}
                        </div>
                        <div className="ml-4">
                          <a
                            href={professor.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
                          >
                            View Profile
                            <svg
                              className="ml-1 h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
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
          <div className="px-6 py-3 bg-gray-50 text-xs text-gray-600 border-t border-gray-200">
            {searchDurationMs !== null && result.professors && (
              <span>
                {result.professors.length} professor(s) found in{" "}
                {(searchDurationMs / 1000).toFixed(2)} seconds
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseSearch;
