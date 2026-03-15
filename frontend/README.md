<h1 align="center">Frontend UI - URL Shortener</h1>

## Setup
### Prerequisites
- Node.js 18+
- npm (Node Package Manager)

### Steps to Run Locally
1. Navigate to the `frontend` directory.
2. Install the required dependencies:
```bash
npm install
```
3. Configure your local environment variables (see Configuration section below).
4. Start the Vite development server:
```bash
npm run dev
```
The application will instantly be available at `http://localhost:5173`. Ensure your backend API is also running locally so the frontend can successfully communicate with it.

## Configuration
Create a `.env` file in the root of the `frontend` directory before running the development server.

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URL of the Spring Boot Backend API | `http://localhost:8080` |

## Pages & Routing
The React Router implementation separates the application into public views and protected views that strictly require authentication.

### Public Routes
- `/` - Landing Page and anonymous URL shortener.
- `/login` - Authentication form to log into an existing account.
- `/register` - Registration form to create a new user account.

### Protected Routes
- `/dashboard` - User-scoped dashboard to manage URLs. Elevates to a global list if accessed by the `ROOT` system admin.
- `/analytics/:hash` - Detailed insights page visualizing 30-day traffic data, geographic locations, and device metrics for a specific URL hash.
