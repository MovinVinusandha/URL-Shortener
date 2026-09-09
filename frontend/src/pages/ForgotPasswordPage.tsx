import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import axiosInstance, { extractBackendError } from '../api/axiosInstance';
import BrandLogo from '../components/BrandLogo';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axiosInstance.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = extractBackendError(err, 'Failed to process password reset request. Please try again.');
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
            {submitted ? (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Check your inbox</h1>
                <p className="text-sm text-muted-foreground">
                  If an account exists for <span className="font-semibold text-foreground">{email}</span>, you will receive an email with instructions to reset your password.
                </p>
                <div className="pt-4 space-y-2">
                  <Link
                    to="/login"
                    className="w-full btn-solid py-2 text-center flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Log in
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold tracking-tight text-foreground mb-1.5">Reset your password</h1>
                  <p className="text-xs text-muted-foreground">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-foreground text-left">Account Email</label>
                    <div className="relative">
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="janedoe@email.com" 
                        className="w-full px-3.5 py-2 border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground bg-background border-input placeholder:text-muted-foreground transition-colors text-sm"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="text-rose-500 text-xs text-center font-medium pt-1">
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full btn-solid mt-2 text-center flex justify-center py-2 disabled:opacity-50"
                  >
                    {loading ? 'Sending link...' : 'Send reset link'}
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

export default ForgotPasswordPage;
