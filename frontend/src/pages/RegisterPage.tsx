import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, MailCheck, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance, { extractBackendError } from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import type { RegisterPayload } from '../types';
import { toast } from 'react-hot-toast';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';

  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [form, setForm] = useState<RegisterPayload>({
    username: '',
    email: '',
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password) {
      setError('Please fill in all fields');
      return;
    }

    if (form.username && !/^[a-zA-Z0-9_]{3,30}$/.test(form.username.trim())) {
      setError('Username must be 3 to 30 letters, numbers, or underscores');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setStep('confirm');
    setError('');
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const payload: RegisterPayload = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      };
      if (form.username && form.username.trim()) {
        payload.username = form.username.trim().toLowerCase();
      }

      await axiosInstance.post('/user', payload);
      setRegisteredEmail(form.email);
    } catch (err: unknown) {
      const backendMessage = extractBackendError(err, 'Registration failed. Please check your information and try again.');
      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setResending(true);
    try {
      await axiosInstance.post('/auth/resend-verification', { email: registeredEmail });
      toast.success('Verification link resent! Check your inbox.');
    } catch (err: unknown) {
      const msg = extractBackendError(err, 'Could not resend verification email. Please try again later.');
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'github') => {
    window.location.href = `${apiBase}/auth/oauth/${provider}`;
  };

  return (
    <div className="antialiased min-h-screen flex flex-col bg-background text-foreground font-sans relative">
      {/* Background subtle mesh */}
      <div 
        className="absolute inset-0 z-0 opacity-40"
        style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <BrandLogo className="h-8 w-auto text-foreground" />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {token ? (
              <Link to="/dashboard" className="btn-solid">
                Dashboard
              </Link>
            ) : (
              <Link to="/login" className="btn-solid">
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center pt-8 pb-16 px-4 z-10 relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="w-full max-w-md mx-auto"
        >
          
          <div className="mb-8 flex justify-center">
            <BrandLogo className="h-9 w-auto text-foreground mx-auto" />
          </div>

          <div className="bg-background border border-border rounded-xl p-8 shadow-xl max-w-md w-full mx-auto">
            {registeredEmail ? (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  <MailCheck className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Verify your email</h1>
                <p className="text-sm text-muted-foreground">
                  We sent a verification link to <span className="font-semibold text-foreground">{registeredEmail}</span>. Please click the link to activate your account.
                </p>
                <div className="pt-3 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full btn-solid py-2 text-center flex justify-center"
                  >
                    Proceed to Log in
                  </button>
                  <button
                    type="button"
                    disabled={resending}
                    onClick={handleResend}
                    className="w-full px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {resending ? 'Sending...' : 'Didn’t receive an email? Resend'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold tracking-tight text-foreground mb-1.5">Create your trim account</h1>
                </div>

                <div className="space-y-6">
                  <form onSubmit={step === 'form' ? handleNextStep : handleFinalSubmit} className="space-y-4">
                    {/* Username */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-medium text-foreground text-left">Username</label>
                        <span className="text-[10px] text-muted-foreground">Unique handle (optional)</span>
                      </div>
                      <input 
                        type="text"
                        name="username"
                        disabled={step === 'confirm'}
                        value={form.username || ''}
                        onChange={handleChange}
                        placeholder="janedoe" 
                        className="w-full px-3.5 py-2 border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground bg-background border-input placeholder:text-muted-foreground disabled:opacity-50 disabled:bg-secondary transition-all duration-200 text-sm"
                      />
                    </div>

                    {/* Work email */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-foreground text-left">Work email</label>
                      <input 
                        type="email" 
                        name="email"
                        required
                        disabled={step === 'confirm'}
                        value={form.email}
                        onChange={handleChange}
                        placeholder="janedoe@email.com" 
                        className="w-full px-3.5 py-2 border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground bg-background border-input placeholder:text-muted-foreground disabled:opacity-50 disabled:bg-secondary transition-all duration-200 text-sm"
                      />
                    </div>

                    {/* Password slot */}
                    <div className="space-y-1.5">
                      <div className="min-h-[22px]">
                        <AnimatePresence mode="wait" initial={false}>
                          {step === 'form' ? (
                            <motion.div
                              key="label-password"
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 4 }}
                              transition={{ duration: 0.15 }}
                            >
                              <label className="block text-xs font-medium text-foreground text-left">Password</label>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="label-confirm"
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 4 }}
                              transition={{ duration: 0.15 }}
                              className="flex items-center justify-between"
                            >
                              <label className="block text-xs font-medium text-foreground text-left">Confirm Password</label>
                              <button 
                                type="button" 
                                onClick={() => {
                                  setStep('form');
                                  setError('');
                                }} 
                                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" /> Change info
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      <motion.div 
                        key={step}
                        initial={{ opacity: 0, x: step === 'confirm' ? 12 : -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="relative"
                      >
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          name={step === 'form' ? 'password' : 'confirmPassword'}
                          required
                          autoFocus={step === 'confirm'}
                          value={step === 'form' ? form.password : confirmPassword}
                          onChange={step === 'form' ? handleChange : (e) => setConfirmPassword(e.target.value)}
                          placeholder={step === 'form' ? 'At least 8 characters' : 'Enter your password again'} 
                          className="w-full px-3.5 py-2 border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground bg-background border-input placeholder:text-muted-foreground transition-colors text-sm"
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </motion.div>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div 
                          initial={{ opacity: 0, y: -4, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -4, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="text-rose-500 text-xs text-center font-medium pt-1 overflow-hidden"
                        >
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full btn-solid mt-2 text-center flex justify-center py-2"
                    >
                      {loading ? (step === 'form' ? 'Processing...' : 'Creating account...') : (step === 'form' ? 'Continue' : 'Complete signup')}
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
                      onClick={() => handleOAuthLogin('google')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg bg-background text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                    >
                      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                      </svg>
                      Continue with Google
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleOAuthLogin('github')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg bg-background text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                    >
                      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path>
                      </svg>
                      Continue with GitHub
                    </button>
                  </div>

                  <p className="text-center text-xs text-muted-foreground mt-6">
                    Already have an account?{' '}
                    <Link to="/login" className="font-semibold text-foreground hover:underline">
                      Log in
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="text-center text-xs text-muted-foreground max-w-sm px-4 mt-6 mx-auto">
            By creating an account, you agree to our{' '}
            <Link to="/terms-and-conditions" className="underline hover:text-foreground">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</Link>.
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default RegisterPage;
