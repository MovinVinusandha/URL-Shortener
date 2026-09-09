import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import axiosInstance, { extractBackendError } from '../api/axiosInstance';
import BrandLogo from '../components/BrandLogo';

const ResetPasswordPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const token = new URLSearchParams(location.search).get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing password reset token.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post('/auth/reset-password', {
        token,
        newPassword,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = extractBackendError(err, 'Failed to reset password. The link may have expired.');
      setError(msg);
    } finally {
      setLoading(false);
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

          <div className="bg-background border border-border rounded-xl p-8 shadow-xl max-w-md w-full mx-auto">
            {success ? (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Password Reset Successfully</h1>
                <p className="text-sm text-muted-foreground">
                  Your password has been updated. You can now log in with your new credentials.
                </p>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full btn-solid py-2 text-center flex items-center justify-center gap-1.5"
                  >
                    Go to Log in
                  </button>
                </div>
              </div>
            ) : !token ? (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-rose-500" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Invalid Reset Link</h1>
                <p className="text-sm text-muted-foreground">
                  This password reset link is missing a valid security token.
                </p>
                <div className="pt-4">
                  <Link
                    to="/forgot-password"
                    className="w-full btn-solid py-2 text-center flex items-center justify-center gap-1.5"
                  >
                    Request a new link
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold tracking-tight text-foreground mb-1.5">Set a new password</h1>
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-foreground text-left">New Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters" 
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

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-foreground text-left">Confirm New Password</label>
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password" 
                      className="w-full px-3.5 py-2 border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground bg-background border-input placeholder:text-muted-foreground transition-colors text-sm"
                    />
                  </div>

                  {error && (
                    <div className="text-rose-500 text-xs text-center font-medium pt-1">
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading || !newPassword || !confirmPassword}
                    className="w-full btn-solid mt-2 text-center flex justify-center py-2 disabled:opacity-50"
                  >
                    {loading ? 'Updating password...' : 'Reset password'}
                  </button>
                </form>

                <div className="text-center mt-6">
                  <Link to="/login" className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Log in
                  </Link>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default ResetPasswordPage;
