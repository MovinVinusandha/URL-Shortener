# Frontend Application - trim

Modern single-page application (SPA) built with React 19, TypeScript, Vite, Tailwind CSS, and Framer Motion, featuring link management, interactive analytics, dynamic QR codes, and multi-subdomain routing support.

## Key Features

- **Framer Motion Animations**: Fluid page transitions, modal dialog animations, and interactive hover states using Framer Motion with `AnimatePresence`.
- **Skeleton Loaders**: Dedicated skeleton loading placeholders preventing layout shifts during asynchronous data fetches across tables and cards.
- **Interactive Data Visualization**: Comprehensive analytics charts powered by Recharts (30-day click trends, device pie charts, OS distribution bars, top browser metrics, and country statistics).
- **Toast Notification System**: Integrated `react-hot-toast` notifications providing contextual feedback for API operations, clipboard actions, and coming-soon alerts.
- **Shared Layout Architecture**: Centralized `DashboardLayout` wrapping authenticated routes with a persistent sidebar, active navigation indicators, theme toggles, and responsive mobile drawers.
- **Dynamic Theming**: Light and dark mode support managed through React Context (`ThemeContext`) and persisted in local storage.
- **Subdomain Routing Support**: Built-in compatibility with the 3-pillar subdomain architecture (`app.trim.com` for application views and `trim.com` for root landing and link resolution).

## Setup

### Prerequisites
- Node.js 18.0+
- npm (Node Package Manager)

### Steps to Run Locally
1. Navigate to the `frontend` directory:
```bash
cd frontend
```
2. Install dependencies:
```bash
npm install
```
3. Create your local environment configuration:
```bash
cp .env.example .env
```
4. Start the Vite development server:
```bash
npm run dev
```
The frontend will be accessible at `http://localhost:5173`.

## Configuration

The frontend application requires the following environment variables:

| Variable | Description | Default | Example |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base endpoint of the Spring Boot REST API | `http://localhost:8080` | `https://api.trim.com` |
| `VITE_ROOT_DOMAIN` | Base domain displayed in short link input prefixes | `http://localhost:8080` | `https://trim.com` |

## Pages & Routing

The client-side routing is organized into public access pages and authenticated views wrapped within the shared `DashboardLayout`.

### Public Routes

| Route | Component | Description |
| :--- | :--- | :--- |
| `/` | `HomePage` | Public landing page featuring instant URL shortening, live previews, and feature showcases. |
| `/login` | `LoginPage` | Authentication portal for account login and access token retrieval. |
| `/register` | `RegisterPage` | Account registration interface for new users (with dynamic disable guard). |
| `/forgot-password` | `ForgotPasswordPage` | Request password reset email (with console log fallback). |
| `/reset-password` | `ResetPasswordPage` | Enter new password using secure reset token. |
| `/verify-email` | `VerifyEmailPage` | Confirm email ownership via verification token. |
| `/expired` | `ExpiredPage` | Landing notice presented when navigating to an expired short URL. |
| `/secure/:hash` | `SecurePage` | Password authentication screen required to unlock password-protected destination links. |
| `*` | `NotFoundPage` | 404 page for unmatched routes. |

### Protected Routes (Wrapped in `DashboardLayout`)

| Route | Component | Description |
| :--- | :--- | :--- |
| `/dashboard` | `DashboardPage` | Main link management table with search, folder filtering, tag badges, and quick action modals. |
| `/analytics` | `AnalyticsPage` | Aggregate performance overview across all user-owned links. |
| `/analytics/:hash` | `AnalyticsPage` | In-depth 30-day analytics dashboard with timeseries charts, device breakdowns, and geo-distribution. |
| `/folders` | `FoldersPage` | Folder creation, management, and folder-level link aggregation. |
| `/tags` | `TagsPage` | Custom colored tag creation, editing, and deletion for multi-dimensional link classification. |
| `/settings` | `SettingsPage` | User profile details, account update forms, and account hard-delete controls. |
| `/settings/security` | `SecurityPage` | Password change form and security credentials management. |

## Core Components

| Component | Path | Description |
| :--- | :--- | :--- |
| `DashboardLayout` | `src/layouts/DashboardLayout.tsx` | Main shell with sidebar navigation, user profile header, and main content area. |
| `ProtectedRoute` | `src/components/ProtectedRoute.tsx` | Route guard validating JWT authentication and redirecting unauthenticated users. |
| `BrandLogo` | `src/components/BrandLogo.tsx` | SVG brand logo with customized light/dark branding variations. |
| `CreateLinkModal` | `src/components/CreateLinkModal.tsx` | Modal form supporting custom aliases, passwords, expiration dates, folders, and tags. |
| `EditModal` | `src/components/EditModal.tsx` | Modal form for editing existing link destinations and metadata. |
| `CreateTagModal` | `src/components/CreateTagModal.tsx` | Modal form for creating and customizing colored tags. |
| `FolderModal` | `src/components/FolderModal.tsx` | Modal form for creating and updating folder names. |
| `DateRangePicker` | `src/components/DateRangePicker.tsx` | Date range selector component for analytics filtering. |
| `Navbar` | `src/components/Navbar.tsx` | Top navigation bar for landing and public pages. |
| `ShortenForm` | `src/components/ShortenForm.tsx` | Quick URL shortening input form. |
| `ThemeToggle` | `src/components/ThemeToggle.tsx` | Interactive light/dark mode switcher. |
| `UrlTable` | `src/components/UrlTable.tsx` | Data table displaying shortened URLs, tags, clicks, and action menus. |

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Vite development server at `http://localhost:5173`. |
| `npm run build` | Compile TypeScript and build production bundle into `dist/`. |
| `npm run preview` | Locally preview production build output. |
| `npm run lint` | Run Oxlint linter across the codebase. |
| `npm test` | Execute unit and component tests with Vitest. |
| `npm run test:e2e` | Run end-to-end browser tests with Playwright. |
