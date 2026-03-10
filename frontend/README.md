# ✂️ SnipURL — Vite + React URL Shortener Frontend

A modern, fast, and responsive web application built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**. Designed as the user interface for the Spring Boot URL Shortener backend.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)


## 🌟 Key Features

- **⚡ Anonymous URL Shortening**: Shorten long URLs instantly from the home page without logging in.
- **🔐 JWT Authentication**: Complete Login and Register flows with JWT access token management.
- **📊 User Dashboard**:
  - View all user-created shortened URLs in a responsive data table.
  - Track live click counts (`accessed_times`) per link.
  - Per-user `localStorage` persistence across page refreshes with background sync from the database.
- **✏️ Link Management**: Edit destination URLs (`PUT /url/{hash}`) and Delete mappings (`DELETE /url/{hash}`) directly from the dashboard.
- **🌓 Light & Dark Theme**: Toggle between Light and Dark modes with automatic OS preference detection and `localStorage` state persistence.
- **🛡️ Smart Error Handling**: Extracts and displays exact error messages sent by the Spring Boot API (e.g. duplicate URL alerts).
- **🔁 Automatic Session Handling**: Axios interceptor automatically attaches Bearer tokens and handles `401 Unauthorized` responses by clearing local session and redirecting to login.



## 🛠️ Technology Stack

- **Framework**: [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Icons**: [Lucide React](https://lucide.dev/)



## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.0.0` or higher
- **npm**: `v10.0.0` or higher
- **Spring Boot Backend**: Running on `http://localhost:8080`

### Installation

1. Clone the repository and navigate to the `frontend-app` directory:
   ```bash
   cd frontend-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root of `frontend-app`:
   ```env
   VITE_API_BASE_URL=
   ```
   > **Note**: Leaving `VITE_API_BASE_URL` empty routes all requests through the Vite dev server proxy to `http://localhost:8080`, completely preventing browser CORS issues.

4. Start the Development Server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

5. Build for Production:
   ```bash
   npm run build
   ```
   The compiled assets will be generated in the `dist/` directory.



## 🔗 Backend API Integration & Mapping

The frontend communicates with the Spring Boot URL Shortener backend (`http://localhost:8080`) through the following endpoints:

| Action / Feature | HTTP Method | Endpoint | Auth Required | Description |
|---|---|---|---|---|
| **Anonymous Shorten** | `POST` | `/shorten` | ❌ Public | Shortens a long URL; returns `{ longUrl, shortUrl, createdAt }` |
| **Login** | `POST` | `/auth/login` | ❌ Public | Authenticates user; returns `{ token }` (JWT) & sets `refreshToken` cookie |
| **Register** | `POST` | `/user` | ❌ Public | Registers a new user account |
| **Get User Profile** | `GET` | `/auth/me` | ✅ Bearer Token | Fetches currently logged in user's profile |
| **Get All URLs** | `GET` | `/url/all` | 🛡️ Admin Only | Fetches all shortened URLs in system |
| **Get Link Details** | `GET` | `/url/{hash}` | ✅ Bearer Token | Fetches updated click count (`accessed_times`) & details |
| **Update URL** | `PUT` | `/url/{hash}` | ✅ Bearer Token | Updates destination URL for a hash |
| **Delete URL** | `DELETE` | `/url/{hash}` | ✅ Bearer Token | Deletes a URL mapping |
| **Short Link Redirect**| `GET` | `/{hash}` | ❌ Public | Backend HTTP 302 redirect to destination URL |



## 🔒 Security & Session Handling

- **JWT Access Token**: Stored in standard `localStorage` upon login and sent via the `Authorization: Bearer <token>` header on all requests.
- **Refresh Token**: Stored in a secure `HttpOnly` cookie by the Spring Boot backend (`POST /auth/refresh`).
- **401 Response Interceptor**: If an access token expires or is invalid, the Axios response interceptor automatically clears `localStorage` and redirects the user to `/login` (excluding auth pages to avoid redirect loops).



## 🎨 Theme Customization

The app features a custom dual-theme design:
- Toggle between Light and Dark modes using the Sun/Moon button in the header.
- Theme preference is saved in `localStorage` under the key `'theme'`.
- Supports operating system color scheme preferences (`prefers-color-scheme: dark`).



## 📁 Project Structure

```
frontend-app/
├── public/                    # Static assets & favicons
├── src/
│   ├── api/
│   │   └── axiosInstance.ts   # Axios instance with request/response interceptors & error helper
│   ├── components/
│   │   ├── EditModal.tsx      # Modal dialog to update destination URL
│   │   ├── Navbar.tsx         # Responsive navbar with user avatar & theme toggle
│   │   ├── ProtectedRoute.tsx # Auth guard for private routes
│   │   ├── ShortenForm.tsx    # URL shortening form component
│   │   ├── ThemeToggle.tsx    # Animated Sun/Moon light & dark mode toggle button
│   │   └── UrlTable.tsx       # Data table & mobile cards with click analytics & actions
│   ├── context/
│   │   ├── AuthContext.tsx    # Global authentication state & user profile loader
│   │   └── ThemeContext.tsx   # Global dark/light theme state provider
│   ├── pages/
│   │   ├── DashboardPage.tsx  # Protected user dashboard (analytics, list, CRUD)
│   │   ├── HomePage.tsx       # Public landing page with anonymous shortener hero
│   │   ├── LoginPage.tsx      # User login form
│   │   └── RegisterPage.tsx   # User registration form
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces matching Spring Boot DTOs
│   ├── App.tsx                # App routes setup & context providers
│   ├── main.tsx               # Application entry point
│   └── index.css              # Global styles, Tailwind directives & custom utilities
├── .env                       # Environment variables (VITE_API_BASE_URL)
├── postcss.config.js          # PostCSS configuration for Tailwind
├── tailwind.config.js         # Tailwind CSS configuration with class-based dark mode
├── tsconfig.json              # TypeScript compiler options
└── vite.config.ts             # Vite configuration with dev server API proxy
```



## 📄 License

This project is licensed under the [MIT License](LICENSE).
