# UBC ProfPilot

UBC ProfPilot is a web app designed to help students make informed decisions about their course selections by providing comprehensive information about UBC professors and courses. The application sources data from RateMyProfessors to offer a comprehensive view of professor ratings, course information, and more!

## 📑 Table of Contents

- [✨ Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [🐳 Docker](#-docker)
- [🏢 Deployment](#-deployment)
  - [Backend Deployment (Render)](#backend-deployment-render)
  - [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
- [🔧 Configuration](#-configuration)
- [📡 API Endpoints](#-api-endpoints)
- [📊 Data Sources](#-data-sources)
- [📝 License](#-license)

## ✨ Features

- **Professor Search**: Search for UBC professors by name and view comprehensive ratings data
- **AI-Powered Summaries**: Get AI-generated summaries of professor ratings using Gemini API
- **Course Search**: Find all professors who have taught a specific course
- **Real-time Progress Updates**: Live progress tracking during data scraping via Socket.IO
- **Modern UI**: Responsive interface built with React and TailwindCSS
- **Department Filtering**: Support for 140+ UBC departments with RateMyProfessors integration
- **Optimized Performance**: Connection pooling, browser reuse, and efficient data fetching

## 🛠️ Tech Stack

### Frontend
- **Framework**: React.js
- **Styling**: TailwindCSS
- **HTTP Client**: Axios
- **Real-time Communication**: Socket.IO

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Web Scraping**: 
  - Playwright (Chromium browser)
  - Cheerio (HTML parsing)
  - Axios (HTTP requests with custom connection pooling)
- **API Integration**: Gemini API (Google's AI models for rating summaries)
- **Real-time Communication**: Socket.IO (progress updates and search coordination)
- **Environment Management**: dotenv

## 📁 Project Structure

```
UBC-ProfPilot/
├── frontend/                 # React frontend application
│   ├── public/              # Static files
│   │   ├── ProfPilot_Icon.png
│   │   └── index.html
│   └── src/
│       ├── assets/          # Images and media files
│       ├── components/      # React components
│       │   ├── circular-progress.js  # Progress indicator component
│       │   ├── course-search.js      # Course search interface
│       │   └── prof-search.js        # Professor search interface
│       ├── app.js          # Main application component
│       ├── config.js       # Configuration (university, departments, API URL)
│       ├── index.css       # Global styles
│       └── index.js        # Application entry point
│
├── backend/                 # Node.js backend server
│   ├── src/
│   │   ├── axios-config.js # Axios configuration with connection pooling
│   │   ├── browser.js      # Playwright browser automation
│   │   ├── course-data.js  # Course data scraping logic
│   │   ├── index.js        # Express server and Socket.IO setup
│   │   ├── prof-data.js    # Professor data scraping and AI summary
│   │   └── prof-url.js     # Professor URL lookup
│   ├── Dockerfile          # Docker configuration for Playwright
│   └── package.json        # Backend dependencies
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v14 or higher recommended)
- **npm** (v6 or higher)
- **Gemini API Key** (required for professor rating summaries)

### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies (this will also install Chromium browser via Playwright):
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` directory with the following variables:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   # FRONTEND_URL is optional for local development
   # Only set it for production deployment
   # FRONTEND_URL=https://your-frontend-url.com
   ```
4. Start the server:
   ```bash
   npm start
   ```
   The server will start on `http://localhost:3001`

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend` directory with the following variable:
   ```env
   # REACT_APP_BACKEND_URL is optional for local development
   # Only set it for production deployment
   # REACT_APP_BACKEND_URL=https://your-backend-url.com
   ```
4. Start the development server:
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3000`

## 🐳 Docker

The backend includes a Dockerfile that uses the official Playwright image to ensure all browser dependencies are properly installed. This is **required** for deployment environments.

**Key Docker features:**
- Based on `mcr.microsoft.com/playwright:v1.52.0-jammy`
- Installs Chromium browser with all system dependencies
- Direct Node.js execution (PID 1) for proper signal handling
- See more in `backend/Dockerfile`

## 🏢 Deployment

### Backend Deployment (Render)
1. **Platform**: Render Web Service
2. **Build Environment**: Select **Docker** (required for Playwright Chromium)
3. **Configuration**:
   - Set root directory to `backend`
   - Add environment variables:
     - `GEMINI_API_KEY` - Your Gemini API key for generating professor summaries
     - `FRONTEND_URL` - Full URL of your deployed frontend (e.g., `https://your-frontend.vercel.app`)

### Frontend Deployment (Vercel)
1. **Platform**: Vercel (Recommended for fast cold starts and CDN distribution)
2. **Framework Preset**: Select **"Create React App"**
3. **Configuration**:
   - Set root directory to `frontend`
   - Add environment variable:
     - `REACT_APP_BACKEND_URL` - Full URL of your deployed backend (e.g., `https://your-backend.onrender.com`)
   - All other settings can be left as default

## 🔧 Configuration

### University Settings
University configuration can be modified in `frontend/src/config.js`:
```javascript
export const UNIVERSITY_CONFIG = {
  name: 'University of British Columbia',
  shortName: 'UBC',
  number: '1413'  // RateMyProfessors university ID
};
```
The `config.js` file also contains mappings for 140+ UBC departments to their RateMyProfessors department IDs. These are used for course searches.

## 📡 API Endpoints

The backend provides the following REST API endpoints:

### GET `/professor`
Search for a professor and get their ratings data.

**Query Parameters:**
- `fname` - First name
- `lname` - Last name  
- `university` - University number (e.g., '1413' for UBC)

**Response:**
```json
{
  "URL": "https://www.ratemyprofessors.com/professor/...",
  "first_name": "John",
  "last_name": "Doe",
  "university": "University of British Columbia",
  "would_take_again": 85.5,
  "difficulty": 3.2,
  "overall_quality": 4.5,
  "ratings": [...],
  "summary": "AI-generated summary..."
}
```

### GET `/course`
Find all professors who have taught a specific course.

**Query Parameters:**
- `course_name` - Course code (e.g., 'CPSC 110')
- `department_number` - Department ID from RateMyProfessors
- `university_number` - University ID (e.g., '1413')

**Response:**
```json
{
  "course_name": "CPSC 110",
  "professors_count": 5,
  "professors": [
    {
      "name": "John Doe",
      "first_name": "John",
      "last_name": "Doe",
      "department": "Computer Science",
      "profile_url": "https://...",
      "num_ratings": 42
    }
  ]
}
```

### Socket.IO Events
The application uses Socket.IO for real-time progress updates:

**Client → Server:**
- `start-professor-search` - Initiate professor search
- `start-course-search` - Initiate course search
- `skip-ratings-load` - Skip loading additional ratings
- `skip-professors-load` - Skip loading professor details

**Server → Client:**
- `search-progress` - Progress updates during professor search
- `course-search-progress` - Progress updates during course search
- `search-complete` - Professor search results
- `course-search-complete` - Course search results
- `search-error` / `course-search-error` - Error notifications

## 📊 Data Sources

All professor ratings and course information are sourced from [RateMyProfessors.com](https://www.ratemyprofessors.com). The application:
- Scrapes data in real-time (no database required)
- Uses Playwright for dynamic content loading
- Implements connection pooling for efficient HTTP requests
- Generates AI summaries using Google's Gemini models

## 📝 License

This project is licensed under the MIT License.