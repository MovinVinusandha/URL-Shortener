import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import FoldersPage from './pages/FoldersPage';
import TagsPage from './pages/TagsPage';
import ExpiredPage from './pages/ExpiredPage';
import SecurePage from './pages/SecurePage';
import SettingsPage from './pages/SettingsPage';
import SecurityPage from './pages/SecurityPage';
import DashboardLayout from './layouts/DashboardLayout';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* ── Public Routes ─────────────────────────────────── */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/expired" element={<ExpiredPage />} />
            <Route path="/secure/:hash" element={<SecurePage />} />

            {/* ── Protected Routes ──────────────────────────────── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/analytics/:hash" element={<AnalyticsPage />} />
                <Route path="/folders" element={<FoldersPage />} />
                <Route path="/tags" element={<TagsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/security" element={<SecurityPage />} />
              </Route>
            </Route>

            {/* ── Catch-all ─────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
