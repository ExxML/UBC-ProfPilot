# UBC ProfPilot

UBC ProfPilot is a web app designed to help students make informed decisions about their course selections by providing comprehensive information about UBC professors and courses. The application sources data from RateMyProfessors to offer a comprehensive view of professor ratings, course information, and more!

## ✨ Features

- Professor ratings AI summary
- Course search for past professors
- Modern, responsive user interface
- Live data scraping and updates
- Interactive search components

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
  - Playwright (WebKit)
  - Cheerio
  - Axios
- **API Integration**: OpenAI API
- **Real-time Communication**: Socket.IO

## 📁 Project Structure

```
UBC-ProfPilot/
├── frontend/                 # React frontend application
│   ├── public/              # Static files
│   └── src/
│       ├── assets/          # Images and media files
│       ├── components/      # React components
│       │   ├── circular-progress.js
│       │   ├── course-search.js
│       │   └── prof-search.js
│       ├── app.js          # Main application component
│       ├── config.js       # Configuration settings
│       └── index.js        # Application entry point
│
├── backend/                 # Node.js backend server
│   ├── src/
│   │   ├── browser.js      # Browser automation logic
│   │   ├── course-data.js  # Course data handling
│   │   ├── prof-data.js    # Professor data handling
│   │   └── prof-url.js     # Professor URL management
│   ├── index.js            # Server entry point
│   └── Dockerfile          # Docker configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js
- npm package manager

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with `OPENAI_API_KEY` (Do not include `FRONTEND_URL` if you wish to run the app locally)
4. Start the server:
   ```bash
   npm start
   ```
   The server will start on `http://localhost:3001`

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3000` (React default)

## 🐳 Docker
### For server deployment, the backend **requires a Dockerfile image** for Playwright WebKit dependencies.

## 🏢 Deployment

### Backend Deployment (Render)
1. **Platform**: Render Web Service
2. **Language**: Select **Docker** (required for Playwright WebKit)
3. **Configuration**:
   - Set root directory to `backend`
   - Add the following environment variables:
     - `OPENAI_API_KEY` - Your OpenAI API key
     - `FRONTEND_URL` - URL of your deployed frontend

### Frontend Deployment (Vercel)
1. **Platform**: Vercel (Recommended to avoid Render cold starts)
2. **Framework Preset**: Select **"Create React App"**
3. **Configuration**:
   - Set root directory to `frontend`
   - Add the following environment variable:
     - `REACT_APP_BACKEND_URL` - URL of your deployed backend

## 🔧 Configuration
- University configuration can be modified in `frontend/src/config.js` (Default UBC)

## 📊 Data

All professor ratings and course information are sourced from [RateMyProfessors.com](https://www.ratemyprofessors.com).