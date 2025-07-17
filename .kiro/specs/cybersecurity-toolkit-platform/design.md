# Design Document

## Overview

The Cybersecurity Toolkit Platform will be a modern, full-stack web application built with Flask (Python) backend API and a React frontend. The platform will feature a microservice-oriented architecture with clear separation between authentication, scanning services, and data management. The React frontend will communicate with the Flask backend through RESTful APIs and WebSocket connections for real-time updates. The design emphasizes a dark, techy aesthetic with neon accents, smooth animations, and a responsive layout that works across desktop and mobile devices.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Flask API     │    │   Database      │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (SQLite)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │
        │                       ▼
        │               ┌─────────────────┐
        └──────────────►│ Scanning Engine │
         (WebSocket)    │ (Subprocess)    │
                        └─────────────────┘
```

### Technology Stack

**Backend API:**
- Flask (Python web framework)
- Flask-RESTful (RESTful API development)
- SQLAlchemy (ORM for database operations)
- Flask-JWT-Extended (JWT token authentication)
- Flask-SocketIO (WebSocket support for real-time updates)
- Flask-CORS (Cross-Origin Resource Sharing)
- Werkzeug (password hashing)
- SQLite (development database)

**Frontend:**
- React 18+ (Component-based UI framework)
- React Router (Client-side routing)
- Axios (HTTP client for API calls)
- Socket.IO Client (Real-time WebSocket communication)
- Styled Components or CSS Modules (Component styling)
- React Hook Form (Form handling and validation)
- React Query/TanStack Query (Server state management)
- Framer Motion (Animations and transitions)

**Development Tools:**
- Vite (Fast build tool and dev server)
- TypeScript (Type safety)
- ESLint + Prettier (Code quality)
- Jest + React Testing Library (Testing)

**Security Tools Integration:**
- Subprocess management for tool execution
- Real-time WebSocket communication for progress updates
- File system management for scan results

## Components and Interfaces

### 1. Authentication System

**Backend Components:**
- `AuthAPI`: RESTful endpoints for authentication operations
- `User` model: Stores user credentials and profile data
- `JWTManager`: Manages JWT token creation and validation

**Frontend Components:**
- `AuthContext`: React context for authentication state management
- `LoginForm`: Login component with form validation
- `RegisterForm`: Registration component with validation
- `ProtectedRoute`: Route wrapper for authenticated pages
- `AuthService`: API service for authentication calls

**API Endpoints:**
```python
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET /api/auth/profile
```

**React Interfaces:**
```typescript
interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}
```

### 2. User Dashboard

**Backend Components:**
- `DashboardAPI`: RESTful endpoints for dashboard data
- `StatsCalculator`: Computes user statistics
- `DashboardService`: Aggregates user data and recent activity

**Frontend Components:**
- `Dashboard`: Main dashboard page component
- `WelcomeSection`: User greeting and quick stats
- `QuickActions`: Tool selection buttons
- `RecentScansWidget`: Recent scan summaries with status
- `UserStats`: Statistics cards and charts
- `SystemStatus`: Tool availability indicators

**API Endpoints:**
```python
GET /api/dashboard/stats
GET /api/dashboard/recent-scans
GET /api/dashboard/system-status
```

**Features:**
- Welcome message with user name
- Quick action buttons for each tool
- Recent scans summary (last 5 scans)
- User statistics (total scans, success rate)
- System status indicators

### 3. Scanning Engine

**Backend Components:**
- `ScanAPI`: RESTful endpoints for scan operations
- `ScanManager`: Orchestrates multiple tool executions
- `ToolRunner`: Abstract base class for tool implementations
- `NmapRunner`, `GobusterRunner`, `DirbRunner`: Specific tool implementations
- `ProgressTracker`: Real-time progress monitoring via WebSocket

**Frontend Components:**
- `ScanForm`: Tool selection and target input form
- `ScanProgress`: Real-time progress display with animations
- `ScanResults`: Results display with syntax highlighting
- `ToolSelector`: Multi-tool selection interface
- `ScanService`: API service for scan operations

**API Endpoints:**
```python
POST /api/scans/start
GET /api/scans/{scan_id}/status
POST /api/scans/{scan_id}/stop
GET /api/scans/{scan_id}/results
GET /api/scans/{scan_id}/export
```

**WebSocket Events:**
```typescript
interface ScanProgressEvent {
  scanId: string;
  tool: string;
  progress: number;
  status: 'running' | 'completed' | 'failed';
  output?: string;
}
```

### 4. History Management

**Backend Components:**
- `ScanHistory`: Database model for storing scan records
- `HistoryAPI`: RESTful endpoints for history operations
- `HistoryService`: Handles history queries and filtering
- `SearchEngine`: Implements search and filtering logic

**Frontend Components:**
- `HistoryPage`: Main history page with filters and search
- `ScanHistoryList`: Paginated list of historical scans
- `HistoryFilters`: Date, tool, and status filtering interface
- `SearchBar`: Real-time search with debouncing
- `ScanDetailModal`: Detailed view of individual scans
- `HistoryService`: API service for history operations

**API Endpoints:**
```python
GET /api/history/scans?page=1&limit=20&filter=...
GET /api/history/scans/{scan_id}
POST /api/history/scans/{scan_id}/rerun
DELETE /api/history/scans/{scan_id}
GET /api/history/search?q=...
```

**Features:**
- Chronological scan listing with infinite scroll
- Advanced filtering (date, tool, target, status)
- Real-time search functionality
- Pagination for large result sets
- Scan re-execution capability

### 5. Settings Management

**Backend Components:**
- `UserSettings`: Database model for user preferences
- `SettingsAPI`: RESTful endpoints for settings operations
- `SettingsService`: Handles settings CRUD operations

**Frontend Components:**
- `SettingsPage`: Main settings page with tabbed interface
- `ProfileSettings`: Profile information editing form
- `SecuritySettings`: Password change and security options
- `ScanningPreferences`: Default tool and wordlist configuration
- `UIPreferences`: Theme and notification settings
- `SettingsService`: API service for settings operations

**API Endpoints:**
```python
GET /api/settings/profile
PUT /api/settings/profile
POST /api/settings/password
GET /api/settings/preferences
PUT /api/settings/preferences
DELETE /api/settings/account
```

**Settings Categories:**
- Profile Information (name, email)
- Security Settings (password change)
- Scanning Preferences (default tools, wordlists)
- UI Preferences (theme, notifications)

### 6. Theme System

**Frontend Components:**
- `ThemeProvider`: React context provider for theme state
- `ThemeToggle`: Theme switching button component
- `useTheme`: Custom hook for theme management
- CSS custom properties for theme variables
- Local storage persistence for theme preferences

**Theme Context Interface:**
```typescript
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}
```

**Theme Variables:**
```css
:root {
  --primary-bg: #0a0a0a;
  --secondary-bg: #1a1a1a;
  --accent-color: #00ff88;
  --text-primary: #ffffff;
  --text-secondary: #cccccc;
  --border-color: #333333;
}

[data-theme="light"] {
  --primary-bg: #ffffff;
  --secondary-bg: #f8f9fa;
  --accent-color: #007acc;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --border-color: #dee2e6;
}
```

## Data Models

### User Model
```python
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    scans = db.relationship('ScanHistory', backref='user', lazy=True)
    settings = db.relationship('UserSettings', backref='user', uselist=False)
```

### ScanHistory Model
```python
class ScanHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    target_ip = db.Column(db.String(45), nullable=False)
    tools_used = db.Column(db.JSON)  # List of tools used
    status = db.Column(db.String(20))  # running, completed, failed, stopped
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    results_path = db.Column(db.String(255))
    scan_config = db.Column(db.JSON)  # Store scan configuration
```

### UserSettings Model
```python
class UserSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    theme = db.Column(db.String(10), default='dark')
    default_tools = db.Column(db.JSON)
    notifications_enabled = db.Column(db.Boolean, default=True)
    default_wordlist = db.Column(db.String(255))
    auto_export = db.Column(db.Boolean, default=False)
```

## Error Handling

### Error Categories

1. **Authentication Errors**
   - Invalid credentials
   - Session timeout
   - Account locked/disabled

2. **Validation Errors**
   - Invalid IP addresses
   - Missing required fields
   - File path validation

3. **System Errors**
   - Tool execution failures
   - File system errors
   - Database connection issues

4. **Network Errors**
   - Target unreachable
   - Timeout errors
   - Permission denied

### Error Response Format
```json
{
  "error": true,
  "message": "User-friendly error message",
  "code": "ERROR_CODE",
  "details": "Technical details for debugging",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Error Handling Strategy

- **Frontend**: Display user-friendly error messages with retry options
- **Backend**: Log detailed errors for debugging while returning sanitized messages
- **Scanning**: Graceful degradation when tools fail, partial results display
- **Database**: Transaction rollback and connection retry mechanisms

## Testing Strategy

### Unit Testing
- **Backend**: Test all models, controllers, and utility functions
- **Frontend**: Test JavaScript functions and UI interactions
- **Tools**: Mock subprocess calls for tool execution testing

### Integration Testing
- **API Endpoints**: Test all REST endpoints with various inputs
- **Database Operations**: Test CRUD operations and relationships
- **Authentication Flow**: Test complete login/logout cycles

### End-to-End Testing
- **User Workflows**: Test complete user journeys from registration to scanning
- **Cross-browser Testing**: Ensure compatibility across modern browsers
- **Responsive Testing**: Verify mobile and desktop layouts

### Security Testing
- **Input Validation**: Test for SQL injection, XSS, and command injection
- **Authentication**: Test session management and access controls
- **File Security**: Test file upload/download security measures

### Performance Testing
- **Concurrent Users**: Test multiple simultaneous scan operations
- **Large Result Sets**: Test history pagination and search performance
- **Memory Usage**: Monitor memory consumption during long-running scans

## UI/UX Design Specifications

### Color Scheme
- **Dark Theme**: Deep blacks (#0a0a0a) with neon green accents (#00ff88)
- **Light Theme**: Clean whites (#ffffff) with blue accents (#007acc)
- **Status Colors**: Green (success), Red (error), Yellow (warning), Blue (info)

### Typography
- **Primary Font**: 'Fira Code' or 'JetBrains Mono' for code/technical feel
- **Secondary Font**: 'Inter' or 'Roboto' for readability
- **Font Sizes**: Responsive scale from 14px to 32px

### Animation Guidelines
- **Transition Duration**: 300ms for most interactions
- **Easing**: cubic-bezier(0.4, 0.0, 0.2, 1) for smooth feel
- **Progress Animations**: Smooth progress bar updates
- **Page Transitions**: Fade and slide effects between sections

### Layout Principles
- **Mobile-First**: Responsive design starting from 320px width
- **Grid System**: CSS Grid for main layout, Flexbox for components
- **Spacing**: Consistent 8px grid system for margins and padding
- **Accessibility**: WCAG 2.1 AA compliance with proper contrast ratios