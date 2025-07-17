# Cybersecurity Toolkit Platform

A comprehensive web-based cybersecurity toolkit platform that provides an intuitive interface for running various security scanning tools.

## Project Structure

```
├── backend/                 # Flask API backend
│   ├── models/             # Database models
│   ├── routes/             # API route handlers
│   ├── uploads/            # File upload directory
│   ├── scan_results/       # Scan results storage
│   ├── app.py             # Flask application factory
│   ├── config.py          # Configuration management
│   └── requirements.txt   # Python dependencies
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── contexts/      # React context providers
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service functions
│   │   └── types/         # TypeScript type definitions
│   ├── package.json       # Node.js dependencies
│   └── vite.config.ts     # Vite configuration
└── README.md              # Project documentation
```

## Technology Stack

### Backend
- **Flask** - Web framework
- **SQLAlchemy** - Database ORM
- **Flask-JWT-Extended** - JWT authentication
- **Flask-SocketIO** - Real-time communication
- **Flask-CORS** - Cross-origin resource sharing
- **Flask-RESTful** - RESTful API development

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Socket.IO Client** - Real-time communication
- **React Hook Form** - Form management
- **TanStack Query** - Server state management
- **Framer Motion** - Animations

## Setup Instructions

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Copy environment file and configure:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Run the Flask application:
   ```bash
   python app.py
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Copy environment file and configure:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Development

- Backend API runs on `http://localhost:5000`
- Frontend development server runs on `http://localhost:5173`
- The Vite dev server is configured to proxy API requests to the backend

## Environment Variables

### Backend (.env)
- `FLASK_ENV` - Flask environment (development/production)
- `SECRET_KEY` - Flask secret key
- `JWT_SECRET_KEY` - JWT signing key
- `DATABASE_URL` - Database connection string
- `FRONTEND_URL` - Frontend URL for CORS

### Frontend (.env)
- `VITE_API_BASE_URL` - Backend API base URL
- `VITE_SOCKET_URL` - Socket.IO server URL
- `VITE_APP_NAME` - Application name
- `VITE_APP_VERSION` - Application version