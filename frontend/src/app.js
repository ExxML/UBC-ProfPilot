import React, { useState } from 'react';
import ProfessorSearch from './components/prof-search';
import CourseSearch from './components/course-search';
import RMPIcon from './assets/RMP_Icon.jpg';
import HandshakeIcon from './assets/Handshake_Icon.png';
import UBCIcon from './assets/UBC_Icon.png';

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
              <h1 className="text-3xl font-bold">UBC ProfPilot</h1>
              <span className="ml-3 text-sm text-gray-700 bg-white/70 px-2 py-1 rounded-full">
                RateMyProfessors Scraper & Summarizer
              </span>
            </div>
            <div className="flex items-center">
              <img src={UBCIcon} alt="UBC" className="h-20 w-50" style={{marginLeft: 3, borderRadius: 15}} />
              <img src={HandshakeIcon} alt="Handshake" className="h-14 w-14" />
              <img src={RMPIcon} alt="RMP" className="h-20 w-20" style={{marginRight: 3, borderRadius: 15}} />
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
          <div className="text-center text-sm text-gray-500">
             <p className="mt-1" style={{marginBottom: "10px"}}>Data sourced from <a href="https://www.ratemyprofessors.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline">RateMyProfessors</a></p>
           </div>
           <div className="text-center text-sm text-gray-500">
             <p className="mt-1">This site is not affiliated with RateMyProfessors or the University of British Columbia</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
