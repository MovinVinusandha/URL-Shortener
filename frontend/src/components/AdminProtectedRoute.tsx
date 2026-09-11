import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

/**
 * Route guard that ensures the user is authenticated and possesses
 * either ADMIN or ROOT role.
 */
const AdminProtectedRoute: React.FC = () => {
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
          <p className="text-sm text-foreground/90 font-medium tracking-tight">
            Verifying administrative access…
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

  const role = user?.role?.toUpperCase() || '';
  const isAdmin = role === 'ADMIN' || role === 'ROLE_ADMIN' || role === 'ROOT' || role === 'ROLE_ROOT';

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
