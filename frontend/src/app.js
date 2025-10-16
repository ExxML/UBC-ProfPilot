import React, { useState } from 'react';
import ProfessorSearch from './components/prof-search';
import CourseSearch from './components/course-search';
import RMPIcon from './assets/RMP_Icon.jpg';
import UBCIcon from './assets/UBC_Icon.png';
import ProfPilotIcon from './assets/ProfPilot_Icon.png';

function App() {
  const [activeTab, setActiveTab] = useState('professor');

  return (
    <div className="min-h-screen flex flex-col text-gray-900">
      <div className="liquid-bg" aria-hidden="true"></div>
      {/* Header */}
      <header className="glass shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <img src={ProfPilotIcon} alt="ProfPilot" className="h-9 w-9 mr-2" />
              <h1 className="text-3xl font-bold">UBC ProfPilot</h1>
              <span className="ml-3 text-md text-black" style={{marginLeft: 20, marginTop: 5}}>
                A RateMyProfessors Scraper & Summarizer for UBC students
              </span>
            </div>
            <div className="flex items-center">
              <img src={UBCIcon} alt="UBC" className="h-20 w-50" style={{marginRight: 12, borderRadius: 15}} />
              <img src={RMPIcon} alt="RMP" className="h-20 w-20" style={{marginLeft: 12, borderRadius: 15}} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-24">
        {/* Tab Navigation */}
        <div className="glass rounded-lg shadow-sm border overflow-hidden">
          <nav className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('professor')}
              className={`flex-1 py-4 px-6 text-sm font-medium text-center border-b-2 transition-colors duration-200 ${
                activeTab === 'professor'
                  ? 'border-primary-600 text-primary-700 bg-white/70'
                  : 'border-transparent text-gray-700 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Search Professor
              </div>
            </button>
            <button
              onClick={() => setActiveTab('course')}
              className={`flex-1 py-4 px-6 text-sm font-medium text-center border-b-2 transition-colors duration-200 ${
                activeTab === 'course'
                  ? 'border-primary-600 text-primary-700 bg-white/70'
                  : 'border-transparent text-gray-700 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Search Course
              </div>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'professor' && <ProfessorSearch />}
            {activeTab === 'course' && <CourseSearch />}  
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="glass border-t border-gray-200 mt-12 fixed bottom-0 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="relative">
            <div className="text-center text-sm text-gray-500">
               <p className="mt-1" style={{marginBottom: "10px"}}>Data sourced from <a href="https://www.ratemyprofessors.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline">RateMyProfessors</a></p>
             </div>
             <div className="text-center text-sm text-gray-500">
               <p className="mt-1">This site is not affiliated with RateMyProfessors or the University of British Columbia</p>
            </div>
            {/* GitHub Link - Bottom Right */}
            <div className="absolute top-1/2 right-0 transform -translate-y-1/2">
              <a 
                href="https://github.com/ExxML/UBC-ProfPilot" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-gray-800 hover:text-black transition-colors duration-200"
                title="View project on GitHub"
              >
                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
