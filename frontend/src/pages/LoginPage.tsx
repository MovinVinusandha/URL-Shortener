import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import axiosInstance, { extractBackendError } from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import type { JwtResponse } from '../types';
import { toast } from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, token } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);

  const from = location.state?.from?.pathname || '/dashboard';

  // If already authenticated, redirect away from login
  useEffect(() => {
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, navigate]);

  // Reset oauth loading on mount, browser bfcache restore (back navigation), or window focus
  useEffect(() => {
    setOauthLoading(null);

    const handlePageShow = () => {
      setOauthLoading(null);
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthError = params.get('oauth_error');
    if (oauthError) {
      setOauthLoading(null);
      setError(decodeURIComponent(oauthError));
      toast.error(decodeURIComponent(oauthError));
    }
  }, [location.search]);

  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUnverifiedEmail(null);
    setLoading(true);
    try {
      const trimmed = identifier.trim();
      const payload = trimmed.includes('@')
        ? { email: trimmed, password }
        : { identifier: trimmed, password };

      const { data } = await axiosInstance.post<JwtResponse>('/auth/login', payload);
      await login(data.token);
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.response?.data?.error === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(err.response.data.email || identifier.trim());
        setError(err.response.data.message || 'Please verify your email before logging in.');
      } else {
        const backendMessage = extractBackendError(err, 'Invalid email/username or password. Please try again.');
        setError(backendMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setIsResending(true);
    try {
      await axiosInstance.post('/auth/resend-verification', { email: unverifiedEmail });
      toast.success('Verification link resent! Check your inbox.');
    } catch (err: unknown) {
      const msg = extractBackendError(err, 'Failed to resend verification email.');
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'github') => {
    setOauthLoading(provider);
    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    window.location.href = `${apiBase}/auth/oauth/${provider}`;
  };

  return (
    <div className="antialiased min-h-screen flex flex-col bg-background text-foreground font-sans relative">
      {/* Background subtle mesh */}
      <div 
        className="absolute inset-0 z-0 opacity-40"
        style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      {/* BEGIN: Navigation Bar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <BrandLogo className="h-8 w-auto text-foreground" />
            </Link>
          </div>

          {/* Auth Button */}
          <div className="flex items-center gap-3">
            {token ? (
              <Link 
                to="/dashboard" 
                className="btn-solid"
              >
                Dashboard
              </Link>
            ) : (
              <Link 
                to="/register" 
                className="btn-solid"
              >
                Sign up
              </Link>
            )}
          </div>
        </div>
      </header>
      {/* END: Navigation Bar */}

      {/* BEGIN: Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center pt-8 pb-16 px-4 z-10 relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="w-full max-w-md mx-auto"
        >
          
          {/* Brand Logo Outside Card */}
          <div className="mb-8 flex justify-center">
            <BrandLogo className="h-9 w-auto text-foreground mx-auto" />
          </div>

          {/* Card Container */}
          <div className="bg-background border border-border rounded-xl p-8 shadow-xl max-w-md w-full mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold tracking-tight text-foreground mb-1.5">Log in to your trim account</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-foreground text-left">Email or username</label>
                <input 
                  type="text" 
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="janedoe@email.com" 
                  className="w-full px-3.5 py-2 border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground bg-background border-input placeholder:text-muted-foreground transition-colors text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-foreground text-left">Password</label>
                  <Link 
                    to="/forgot-password" 
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-3.5 py-2 border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground bg-background border-input placeholder:text-muted-foreground transition-colors text-sm"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {unverifiedEmail ? (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-left space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-700 dark:text-amber-400">
                      <p className="font-semibold">Email verification required</p>
                      <p className="mt-0.5 text-muted-foreground">{error}</p>
                    </div>
                  </div>
                  <div className="pt-1 flex items-center justify-between border-t border-amber-500/15">
                    <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[180px]">{unverifiedEmail}</span>
                    <button
                      type="button"
                      disabled={isResending}
                      onClick={handleResendVerification}
                      className="text-xs text-primary font-medium hover:underline disabled:opacity-50"
                    >
                      {isResending ? 'Sending...' : 'Resend link'}
                    </button>
                  </div>
                </div>
              ) : error ? (
                <div className="text-rose-500 text-xs text-center font-medium pt-1">
                  {error}
                </div>
              ) : null}

              <button 
                type="submit"
                disabled={loading}
                className="w-full btn-solid mt-2 text-center flex justify-center py-2"
              >
                {loading ? 'Logging in...' : 'Log in with email'}
              </button>
            </form>

            <div className="relative my-6">
              <div aria-hidden="true" className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs font-medium leading-6">
                <span className="bg-background px-2 text-muted-foreground uppercase tracking-wider text-[10px]">OR</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button 
                type="button"
                disabled={loading || oauthLoading !== null}
                onClick={() => handleOAuthLogin('google')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg bg-background text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {oauthLoading === 'google' ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
              <button 
                type="button"
                disabled={loading || oauthLoading !== null}
                onClick={() => handleOAuthLogin('github')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg bg-background text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {oauthLoading === 'github' ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Connecting to GitHub...</span>
                  </>
                ) : (
                  <>
                    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path>
                    </svg>
                    <span>Continue with GitHub</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-foreground hover:underline">
                Sign up
              </Link>
            </p>
          </div>

          <div className="text-center text-xs text-muted-foreground max-w-sm px-4 mt-6 mx-auto">
            By logging in, you agree to our{' '}
            <Link to="/terms-and-conditions" className="underline hover:text-foreground">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</Link>.
          </div>
        </motion.div>
      </main>
      {/* END: Main Content */}
    </div>
  );
};

export default LoginPage;
