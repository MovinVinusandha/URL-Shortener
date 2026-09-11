import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import VerifyEmailPendingPage from './pages/VerifyEmailPendingPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import FoldersPage from './pages/FoldersPage';
import TagsPage from './pages/TagsPage';
import UtmTemplatesPage from './pages/UtmTemplatesPage';
import ExpiredPage from './pages/ExpiredPage';
import NotFoundPage from './pages/NotFoundPage';
import SecurePage from './pages/SecurePage';
import SettingsPage from './pages/SettingsPage';
import SecurityPage from './pages/SecurityPage';
import EventsPage from './pages/EventsPage';
import DashboardLayout from './layouts/DashboardLayout';
import BlockedPage from './pages/BlockedPage';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminLinksPage from './pages/admin/AdminLinksPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminSecurityPage from './pages/admin/AdminSecurityPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
            {/* ── Public Routes ─────────────────────────────────── */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/verify-email-pending" element={<VerifyEmailPendingPage />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
            <Route path="/expired" element={<ExpiredPage />} />
            <Route path="/not-found" element={<NotFoundPage />} />
            <Route path="/secure/:hash" element={<SecurePage />} />
            <Route path="/blocked/:hash" element={<BlockedPage />} />
            <Route path="/blocked" element={<BlockedPage />} />

            {/* ── Protected User Routes ─────────────────────────── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/dashboard/f/:folderSlug" element={<DashboardPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/analytics/:hash" element={<AnalyticsPage />} />
                <Route path="/analytics/f/:folderSlug" element={<AnalyticsPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/folders" element={<FoldersPage />} />
                <Route path="/tags" element={<TagsPage />} />
                <Route path="/utm-templates" element={<UtmTemplatesPage />} />
                <Route path="/utm" element={<Navigate to="/utm-templates" replace />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/security" element={<SecurityPage />} />
              </Route>
            </Route>

            {/* ── Protected Admin Routes ────────────────────────── */}
            <Route element={<AdminProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminOverviewPage />} />
                <Route path="/admin/links" element={<AdminLinksPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/security" element={<AdminSecurityPage />} />
                <Route path="/admin/settings" element={<AdminSettingsPage />} />
              </Route>
            </Route>

            {/* ── Catch-all ─────────────────────────────────────── */}
            <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Toaster position="bottom-center" toastOptions={{ duration: 3000 }} />
      <BrowserRouter>
        <AuthProvider>
          <AnimatedRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
