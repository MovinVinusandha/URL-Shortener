import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

const OAuthCallbackPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const oauthError = params.get('error') || params.get('oauth_error');

    if (oauthError) {
      setError(decodeURIComponent(oauthError));
      toast.error(decodeURIComponent(oauthError));
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    if (token) {
      login(token)
        .then(() => {
          toast.success('Successfully logged in!');
          navigate('/dashboard', { replace: true });
        })
        .catch(() => {
          setError('Failed to authenticate session with token.');
          setTimeout(() => navigate('/login'), 2000);
        });
    } else {
      setError('No authentication token received.');
      setTimeout(() => navigate('/login'), 2000);
    }
  }, [location.search, login, navigate]);

  return (
    <div className="antialiased min-h-screen flex flex-col items-center justify-center bg-background text-foreground font-sans p-4 relative select-none">
      {/* Subtle radial background mesh matching login/register pages */}
      <div 
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="z-10 flex flex-col items-center w-full max-w-sm"
      >
        <div className="mb-8">
          <BrandLogo className="h-9 w-auto text-foreground mx-auto" />
        </div>

        <div className="bg-background border border-border rounded-xl p-8 shadow-xl max-w-sm w-full text-center space-y-4">
          {error ? (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-rose-500" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Authentication Failed</h2>
              <p className="text-xs text-rose-500">{error}</p>
              <p className="text-xs text-muted-foreground">Redirecting to login page...</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="w-8 h-8 mx-auto relative flex items-center justify-center">
                <svg 
                  className="animate-spin w-8 h-8 text-primary" 
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
              <h2 className="text-base font-semibold text-foreground">Completing Social Login...</h2>
              <p className="text-xs text-muted-foreground">Connecting your account and setting up your secure session.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default OAuthCallbackPage;
