import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axiosInstance, { extractBackendError } from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import { toast } from 'react-hot-toast';

const VerifyEmailPendingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const passedEmail = (location.state as { email?: string })?.email || user?.email || '';
  const [email, setEmail] = useState(passedEmail);
  const [resending, setResending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleResend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }

    setResending(true);
    setSentSuccess(false);
    try {
      await axiosInstance.post('/auth/resend-verification', { email: email.trim().toLowerCase() });
      setSentSuccess(true);
      toast.success('Verification email sent! Please check your inbox.');
    } catch (err: unknown) {
      const msg = extractBackendError(err, 'Failed to send verification link.');
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  const handleBackToLogin = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="antialiased min-h-screen flex flex-col bg-background text-foreground font-sans relative">
      <div 
        className="absolute inset-0 z-0 opacity-40"
        style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo className="h-8 w-auto text-foreground" />
          </Link>
          <button 
            type="button" 
            onClick={() => logout()}
            className="btn-ghost text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center pt-8 pb-16 px-4 z-10 relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="w-full max-w-md mx-auto"
        >
          <div className="mb-8 flex justify-center">
            <BrandLogo className="h-9 w-auto text-foreground mx-auto" />
          </div>

          <div className="bg-background border border-border rounded-xl p-8 shadow-xl max-w-md w-full mx-auto text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>

            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Verify your email
            </h1>

            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              We have sent a verification link to{' '}
              {email ? (
                <span className="font-semibold text-foreground">{email}</span>
              ) : (
                'your email address'
              )}
              . Please check your inbox and click the link to activate your account.
            </p>

            {sentSuccess && (
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-left">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-xs text-emerald-500 font-medium">
                  A fresh verification email has been dispatched!
                </p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-border flex flex-col gap-3">
              {!email ? (
                <form onSubmit={handleResend} className="space-y-2 text-left">
                  <label className="text-xs text-muted-foreground font-medium">
                    Enter email to resend link
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full px-3.5 py-2 border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground bg-background border-input placeholder:text-muted-foreground text-sm"
                  />
                  <button
                    type="submit"
                    disabled={resending}
                    className="w-full btn-solid py-2 text-center flex items-center justify-center gap-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>{resending ? 'Sending link...' : 'Resend Verification Email'}</span>
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => handleResend()}
                  disabled={resending}
                  className="w-full btn-ghost border border-border py-2 text-center flex items-center justify-center gap-1.5 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
                >
                  {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>{resending ? 'Sending...' : 'Resend Verification Email'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full btn-ghost py-2 text-center flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <span>Back to Log in</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default VerifyEmailPendingPage;
