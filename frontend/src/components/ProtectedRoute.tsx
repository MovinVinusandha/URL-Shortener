import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import BrandLogo from './BrandLogo';

/**
 * Wraps protected routes. Redirects to /login if no token is present.
 * Shows a modern Arcane/Framer loading screen while AuthContext validates the stored token.
 */
const ProtectedRoute: React.FC = () => {
  const { token, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground relative select-none">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center gap-4 text-center px-4"
        >
          {/* Minimalist 8-Spoke / 12-Spoke Spinner Wheel */}
          <div className="w-5 h-5 relative flex items-center justify-center">
            <svg 
              className="animate-spin w-5 h-5 text-neutral-400 dark:text-neutral-500" 
              viewBox="0 0 24 24" 
              fill="none"
            >
              <circle 
                className="opacity-20 stroke-current" 
                cx="12" 
                cy="12" 
                r="10" 
                strokeWidth="2.5" 
              />
              <path 
                className="opacity-90 fill-none stroke-current" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeDasharray="60"
                strokeDashoffset="45"
                d="M12 2a10 10 0 0 1 10 10" 
              />
            </svg>
          </div>

          {/* Minimalist Centered Message */}
          <p className="text-sm text-foreground/90 font-medium tracking-tight">
            Authenticating your session…
          </p>
        </motion.div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user && user.emailVerified === false) {
    return <Navigate to="/verify-email-pending" state={{ email: user.email }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
