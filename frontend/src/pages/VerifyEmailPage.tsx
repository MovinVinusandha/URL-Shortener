import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axiosInstance, { extractBackendError } from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import { toast } from 'react-hot-toast';

const VerifyEmailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const token = new URLSearchParams(location.search).get('token') || '';

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setErrorMessage('No verification token was provided.');
      return;
    }

    const verify = async () => {
      try {
        await axiosInstance.post('/auth/verify-email', { token });
        setSuccess(true);
        if (user) {
          updateUser({ emailVerified: true });
        }
      } catch (err: unknown) {
        const msg = extractBackendError(err, 'The verification link is invalid or has expired.');
        setErrorMessage(msg);
      } finally {
        setVerifying(false);
      }
    };

    verify();
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResending(true);
    try {
      await axiosInstance.post('/auth/resend-verification', { email: resendEmail.trim().toLowerCase() });
      toast.success('If an unverified account exists, a new link has been sent!');
      setResendEmail('');
    } catch (err: unknown) {
      const msg = extractBackendError(err, 'Failed to resend verification email.');
      toast.error(msg);
    } finally {
      setResending(false);
    }
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
          <Link to="/login" className="btn-solid">
            Log in
          </Link>
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
            {verifying ? (
              <div className="space-y-4 py-6">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <h2 className="text-lg font-semibold text-foreground">Verifying your email...</h2>
                <p className="text-xs text-muted-foreground">Please wait a moment while we validate your link.</p>
              </div>
            ) : success ? (
              <div className="space-y-4 py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Email Verified!</h1>
                <p className="text-sm text-muted-foreground">
                  Your email address has been successfully verified. You have full access to your account.
                </p>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => navigate(user ? '/dashboard' : '/login')}
                    className="w-full btn-solid py-2 text-center flex items-center justify-center gap-1.5"
                  >
                    {user ? 'Go to Dashboard' : 'Proceed to Log in'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 py-2">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-foreground">Verification Failed</h1>
                  <p className="text-sm text-rose-500 mt-1">{errorMessage}</p>
                </div>

                <div className="pt-3 border-t border-border text-left space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Need a new verification link? Enter your email address below:
                  </p>
                  <form onSubmit={handleResend} className="space-y-2">
                    <input
                      type="email"
                      required
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="janedoe@email.com"
                      className="w-full px-3.5 py-2 border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground bg-background border-input placeholder:text-muted-foreground text-sm"
                    />
                    <button
                      type="submit"
                      disabled={resending || !resendEmail.trim()}
                      className="w-full btn-solid py-2 text-center flex items-center justify-center text-xs font-semibold disabled:opacity-50"
                    >
                      {resending ? 'Sending...' : 'Resend Verification Link'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default VerifyEmailPage;
