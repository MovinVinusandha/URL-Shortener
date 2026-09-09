import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, AlertCircle, AlertTriangle, ShieldCheck, Mail, Globe, Link2, Unlink, Loader2, User as UserIcon, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axiosInstance, { extractBackendError } from '../api/axiosInstance';
import Skeleton from 'react-loading-skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import type { OAuthAccount } from '../types';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, loading, updateUser } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');

  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);

  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const [isResendingVerification, setIsResendingVerification] = useState(false);

  const [oauthAccounts, setOauthAccounts] = useState<OAuthAccount[]>([]);
  const [loadingOAuth, setLoadingOAuth] = useState(false);

  const [copied, setCopied] = useState(false);
  const [oauthConnecting, setOauthConnecting] = useState<'google' | 'github' | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);



  // Sync state if user loads after mount
  useEffect(() => {
    if (user?.username) setUsername(user.username);
    if (user?.email) setEmail(user.email);
  }, [user]);

  // Reset oauthConnecting on mount or bfcache restore (back navigation)
  useEffect(() => {
    setOauthConnecting(null);

    const handlePageShow = () => {
      setOauthConnecting(null);
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  // Fetch connected OAuth accounts
  useEffect(() => {
    if (user && typeof axiosInstance?.get === 'function') {
      setLoadingOAuth(true);
      axiosInstance.get<OAuthAccount[]>('/users/me/oauth-accounts')
        .then(({ data }) => setOauthAccounts(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoadingOAuth(false));
    }
  }, [user]);

  const [usernameStatus, setUsernameStatus] = useState<{
    state: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'current';
    message?: string;
  }>({ state: 'idle' });

  // Debounced username format and availability check
  useEffect(() => {
    const uname = (username || '').trim();
    if (!uname) {
      setUsernameStatus({ state: 'idle' });
      return;
    }

    if (user?.username && uname.toLowerCase() === user.username.toLowerCase()) {
      setUsernameStatus({ state: 'current', message: 'Current handle' });
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(uname)) {
      setUsernameStatus({
        state: 'invalid',
        message: 'Must be 3-30 letters, numbers, or underscores',
      });
      return;
    }

    setUsernameStatus({ state: 'checking', message: 'Checking availability...' });

    const timer = setTimeout(async () => {
      try {
        const { data } = await axiosInstance.get<{ available: boolean; message: string }>(
          `/auth/check-username?username=${encodeURIComponent(uname)}`
        );
        if (data.available) {
          setUsernameStatus({ state: 'available', message: 'Username is available' });
        } else {
          setUsernameStatus({ state: 'taken', message: data.message || 'Username is already taken' });
        }
      } catch {
        setUsernameStatus({ state: 'idle' });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, user?.username]);

  // Client-side domain typo detector
  const checkEmailTypo = (emailStr: string): string | null => {
    const trimmed = emailStr.trim().toLowerCase();
    if (!trimmed.includes('@')) return null;
    const domain = trimmed.split('@')[1];
    const typos: Record<string, string> = {
      'gmail.co': 'gmail.com',
      'gmail.cm': 'gmail.com',
      'gmai.com': 'gmail.com',
      'gamil.com': 'gmail.com',
      'gmial.com': 'gmail.com',
      'gmail.con': 'gmail.com',
      'yaho.com': 'yahoo.com',
      'yahoo.co': 'yahoo.com',
      'hotmial.com': 'hotmail.com',
      'outlok.com': 'outlook.com',
    };
    if (typos[domain]) {
      return `Did you mean @${typos[domain]}? '${domain}' cannot receive emails.`;
    }
    return null;
  };

  const userIdDisplay = (user as any)?.publicId || user?.id || 'Unknown ID';

  const handleInitiateUpdateUsername = () => {
    setUsernameMessage(null);
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setUsernameMessage({ type: 'error', text: 'Username cannot be empty.' });
      return;
    }
    if (cleanUsername === user?.username?.toLowerCase()) {
      setUsernameMessage({ type: 'error', text: 'This is already your current handle.' });
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
      setUsernameMessage({ type: 'error', text: 'Username must be 3-30 characters (letters, numbers, underscores).' });
      return;
    }
    if (usernameStatus.state === 'taken') {
      setUsernameMessage({ type: 'error', text: 'This username is already taken. Please pick another.' });
      return;
    }
    setIsUsernameModalOpen(true);
  };

  const handleConfirmUpdateUsername = async () => {
    setIsUpdatingUsername(true);
    setUsernameMessage(null);
    try {
      const cleanUsername = username.trim().toLowerCase();
      await axiosInstance.put('/users/me', { username: cleanUsername, email: user?.email });
      if (typeof updateUser === 'function') updateUser({ username: cleanUsername });
      setUsernameMessage({ type: 'success', text: 'Username updated successfully.' });
      setIsUsernameModalOpen(false);
      toast.success('Handle changed successfully!');
    } catch (error: any) {
      const msg = extractBackendError(error, 'Failed to update username. It may already be in use.');
      setUsernameMessage({ type: 'error', text: msg });
      setIsUsernameModalOpen(false);
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const handleInitiateUpdateEmail = () => {
    setEmailMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setEmailMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    if (cleanEmail === user?.email?.toLowerCase()) {
      setEmailMessage({ type: 'error', text: 'This is already your current email address.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailMessage({ type: 'error', text: 'Invalid email address format.' });
      return;
    }
    const typoWarning = checkEmailTypo(cleanEmail);
    if (typoWarning) {
      setEmailMessage({ type: 'error', text: typoWarning });
      return;
    }
    setIsEmailModalOpen(true);
  };

  const handleConfirmUpdateEmail = async () => {
    setIsUpdatingEmail(true);
    setEmailMessage(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const payload: { email: string; username?: string } = {
        email: cleanEmail,
        ...(user?.username ? { username: user.username } : {}),
      };
      await axiosInstance.put('/users/me', payload);
      if (typeof updateUser === 'function') updateUser({ email: cleanEmail, emailVerified: false });
      setIsEmailModalOpen(false);
      toast.success('Email updated! Verification email sent.');
      navigate('/verify-email-pending', { state: { email: cleanEmail } });
    } catch (error: any) {
      const msg = extractBackendError(error, 'Failed to update email. Please verify domain or try again.');
      setEmailMessage({ type: 'error', text: msg });
      setIsEmailModalOpen(false);
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setIsResendingVerification(true);
    try {
      await axiosInstance.post('/auth/resend-verification', { email: user.email });
      toast.success('Verification link sent to your email!');
    } catch {
      toast.error('Could not resend verification email. Please try again later.');
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleConnectProvider = (provider: 'google' | 'github') => {
    setOauthConnecting(provider);
    window.location.href = `${apiBase}/auth/oauth/${provider}`;
  };

  const handleUnlinkProvider = async (provider: string) => {
    try {
      await axiosInstance.delete(`/users/me/oauth-accounts/${provider}`);
      setOauthAccounts(prev => prev.filter(a => a.provider !== provider));
      toast.success(`Disconnected ${provider} successfully.`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to disconnect ${provider}. Ensure you have a password set first.`);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(String(userIdDisplay));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await axiosInstance.delete('/users/me');
      toast.success('Your account and all associated data have been permanently deleted.');
      logout();
      navigate('/login');
    } catch (error: any) {
      const msg = extractBackendError(error, 'Failed to delete account.');
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const isConfirmationMatch = confirmationText === 'confirm delete account';

  if (loading && !user) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4 max-w-4xl mx-auto space-y-6">
        <div className="mb-6">
          <Skeleton width={200} height={28} />
          <div className="mt-1"><Skeleton width={300} height={18} /></div>
        </div>

        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-background border border-border rounded-xl overflow-hidden">
            <div className="p-6">
              <Skeleton width={120} height={20} />
              <div className="mt-1 mb-4"><Skeleton width="60%" height={16} /></div>
              <div className="max-w-md">
                <Skeleton height={38} borderRadius={6} />
              </div>
            </div>
            <div className="px-6 py-4 bg-background border-t border-border flex items-center justify-between">
              <Skeleton width={200} height={14} />
              <Skeleton width={120} height={32} borderRadius={6} />
            </div>
          </div>
        ))}
      </motion.div>
    );
  }

  const isGoogleConnected = oauthAccounts.some(a => a.provider.toUpperCase() === 'GOOGLE');
  const isGithubConnected = oauthAccounts.some(a => a.provider.toUpperCase() === 'GITHUB');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4 max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account profile, login credentials, and social connections.</p>
      </div>

      {/* Your Email Card */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-medium text-foreground">Your Email</h3>
            {user?.emailVerified ? (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium border border-emerald-500/20">
                <Check className="w-3.5 h-3.5" /> Verified
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5" /> Unverified
                </span>
                <button
                  type="button"
                  disabled={isResendingVerification}
                  onClick={handleResendVerification}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {isResendingVerification ? 'Sending...' : 'Resend Link'}
                </button>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            The email address you use to receive notifications and log in.
          </p>
          <div className="max-w-md space-y-1.5">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailMessage(null);
              }}
              className="w-full px-3.5 py-2 border border-input rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-background text-foreground transition-colors text-sm"
            />
            {checkEmailTypo(email) && (
              <p className="text-xs text-amber-500 flex items-center gap-1 mt-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {checkEmailTypo(email)}
              </p>
            )}
          </div>
          {emailMessage && (
            <div className={`mt-3 text-sm flex items-center gap-1.5 ${emailMessage.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {emailMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {emailMessage.text}
            </div>
          )}
        </div>
        <div className="px-6 py-3.5 bg-background border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Changing email requires verifying the new address.</p>
          <button
            type="button"
            onClick={handleInitiateUpdateEmail}
            disabled={isUpdatingEmail || email.trim().toLowerCase() === user?.email?.toLowerCase() || !email.trim()}
            className="btn-solid disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Update Email
          </button>
        </div>
      </div>

      {/* Your Username Card */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="p-6">
          <h3 className="text-base font-medium text-foreground">Username</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Your unique handle used to identify you and log in to your account.
          </p>
          <div className="max-w-md space-y-1.5">
            <div className="relative flex items-center">
              <span className="absolute left-3 text-muted-foreground text-sm font-mono">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setUsernameMessage(null);
                }}
                placeholder="username"
                className="w-full pl-8 pr-10 py-2 border border-input rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-background text-foreground transition-colors text-sm font-mono"
              />
              <div className="absolute right-3 flex items-center">
                {usernameStatus.state === 'checking' && (
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                )}
                {usernameStatus.state === 'available' && (
                  <Check className="w-4 h-4 text-emerald-500" />
                )}
                {(usernameStatus.state === 'taken' || usernameStatus.state === 'invalid') && (
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>
            </div>

            {/* Availability status text */}
            {usernameStatus.state !== 'idle' && (
              <div className="text-xs flex items-center gap-1.5 mt-1 font-medium">
                {usernameStatus.state === 'available' && (
                  <span className="text-emerald-500 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> {usernameStatus.message}
                  </span>
                )}
                {usernameStatus.state === 'taken' && (
                  <span className="text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {usernameStatus.message}
                  </span>
                )}
                {usernameStatus.state === 'invalid' && (
                  <span className="text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {usernameStatus.message}
                  </span>
                )}
                {usernameStatus.state === 'current' && (
                  <span className="text-muted-foreground">Current handle</span>
                )}
              </div>
            )}
          </div>
          {usernameMessage && (
            <div className={`mt-3 text-sm flex items-center gap-1.5 ${usernameMessage.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {usernameMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {usernameMessage.text}
            </div>
          )}
        </div>
        <div className="px-6 py-3.5 bg-background border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">3-30 characters, letters, numbers, and underscores only.</p>
          <button
            type="button"
            onClick={handleInitiateUpdateUsername}
            disabled={
              isUpdatingUsername || 
              username.trim().toLowerCase() === user?.username?.toLowerCase() || 
              !username.trim() ||
              usernameStatus.state === 'taken' ||
              usernameStatus.state === 'invalid'
            }
            className="btn-solid disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Update Username
          </button>
        </div>
      </div>



      {/* Connected Accounts Card */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="p-6">
          <h3 className="text-base font-medium text-foreground">Connected Social Accounts</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Connect your Google or GitHub account to log in with one click.
          </p>
          
          <div className="space-y-3 max-w-md">
            {/* Google */}
            <div className="flex items-center justify-between p-3.5 border border-border rounded-xl bg-secondary/30">
              <div className="flex items-center gap-3">
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                </svg>
                <div>
                  <div className="text-sm font-medium text-foreground">Google</div>
                  <div className="text-xs text-muted-foreground">
                    {isGoogleConnected ? 'Connected' : 'Not connected'}
                  </div>
                </div>
              </div>

              {isGoogleConnected ? (
                <button
                  type="button"
                  onClick={() => handleUnlinkProvider('GOOGLE')}
                  className="text-xs font-medium text-rose-500 hover:text-rose-600 px-3 py-1.5 border border-rose-500/20 rounded-lg hover:bg-rose-500/10 transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  disabled={oauthConnecting !== null}
                  onClick={() => handleConnectProvider('google')}
                  className="text-xs font-medium btn-solid px-3 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {oauthConnecting === 'google' && (
                    <svg className="animate-spin h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {oauthConnecting === 'google' ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>

            {/* GitHub */}
            <div className="flex items-center justify-between p-3.5 border border-border rounded-xl bg-secondary/30">
              <div className="flex items-center gap-3">
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path>
                </svg>
                <div>
                  <div className="text-sm font-medium text-foreground">GitHub</div>
                  <div className="text-xs text-muted-foreground">
                    {isGithubConnected ? 'Connected' : 'Not connected'}
                  </div>
                </div>
              </div>

              {isGithubConnected ? (
                <button
                  type="button"
                  onClick={() => handleUnlinkProvider('GITHUB')}
                  className="text-xs font-medium text-rose-500 hover:text-rose-600 px-3 py-1.5 border border-rose-500/20 rounded-lg hover:bg-rose-500/10 transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  disabled={oauthConnecting !== null}
                  onClick={() => handleConnectProvider('github')}
                  className="text-xs font-medium btn-solid px-3 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {oauthConnecting === 'github' && (
                    <svg className="animate-spin h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {oauthConnecting === 'github' ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Your User ID Card */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="p-6">
          <h3 className="text-base font-medium text-foreground">Your Public ID</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            This is your unique identifier when communicating with support.
          </p>
          <div className="max-w-md flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={userIdDisplay}
              className="flex-1 px-3.5 py-2 border border-input rounded-lg bg-background text-foreground font-medium text-sm cursor-not-allowed font-mono"
            />
            <button
              onClick={copyToClipboard}
              className="p-2 border border-input rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              title="Copy User ID"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Card */}
      <div className="bg-background border border-rose-500/20 rounded-xl overflow-hidden">
        <div className="p-6">
          <h3 className="text-base font-medium text-rose-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Delete Account
          </h3>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            Permanently remove your personal account and all of its contents from our platform. This action is not reversible, so please continue with caution.
          </p>
        </div>
        <div className="px-6 py-3.5 bg-background border-t border-rose-500/20 flex items-center justify-end">
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors shadow-sm"
          >
            Delete Account
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isEmailModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.15 }} 
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 8 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.96, y: 8 }} 
              transition={{ duration: 0.15, ease: "easeOut" }} 
              className="bg-background max-w-md w-full rounded-2xl p-6 shadow-2xl relative border border-border space-y-4"
            >
              <button 
                onClick={() => setIsEmailModalOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-foreground">Confirm Email Change</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Changing your email address will immediately require verification. You will be redirected to verify your new email before accessing your account again.
                </p>
              </div>

              <div className="bg-secondary/40 p-3.5 rounded-xl border border-border space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Current Email:</span>
                  <span className="font-semibold text-foreground">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>New Email:</span>
                  <span className="font-semibold text-primary">{email.trim().toLowerCase()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  disabled={isUpdatingEmail}
                  className="flex-1 py-2 px-4 rounded-lg border border-border text-xs font-semibold hover:bg-secondary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUpdateEmail}
                  disabled={isUpdatingEmail}
                  className="flex-1 py-2 px-4 rounded-lg btn-solid text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isUpdatingEmail ? 'Updating...' : 'Confirm & Send Link'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isUsernameModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.15 }} 
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 8 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.96, y: 8 }} 
              transition={{ duration: 0.15, ease: "easeOut" }} 
              className="bg-background max-w-md w-full rounded-2xl p-6 shadow-2xl relative border border-border space-y-4"
            >
              <button 
                onClick={() => setIsUsernameModalOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-primary" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-foreground">Confirm Username Change</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Are you sure you want to change your username handle? Your public links and profile will reflect your new handle immediately.
                </p>
              </div>

              <div className="bg-secondary/40 p-3.5 rounded-xl border border-border space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Current Handle:</span>
                  <span className="font-semibold font-mono text-foreground">@{user?.username}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>New Handle:</span>
                  <span className="font-semibold font-mono text-primary">@{username.trim().toLowerCase()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUsernameModalOpen(false)}
                  disabled={isUpdatingUsername}
                  className="flex-1 py-2 px-4 rounded-lg border border-border text-xs font-semibold hover:bg-secondary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUpdateUsername}
                  disabled={isUpdatingUsername}
                  className="flex-1 py-2 px-4 rounded-lg btn-solid text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingUsername ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isUpdatingUsername ? 'Updating...' : 'Confirm Change'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

      {isDeleteModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          transition={{ duration: 0.15 }} 
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 8 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.96, y: 8 }} 
            transition={{ duration: 0.15, ease: "easeOut" }} 
            className="bg-background max-w-md w-full rounded-2xl p-6 shadow-2xl relative border border-border"
          >
            <button 
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-md"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
               <AlertTriangle className="w-5 h-5 text-rose-500" /> Delete Account
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Warning: This will permanently delete your account, along with all your links, analytics, and folders. This action cannot be undone.
            </p>

            <div className="bg-secondary/40 p-4 rounded-xl flex items-center gap-3 mb-6 border border-border">
               <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase shrink-0">
                 {user?.username ? user.username.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
               </div>
               <div className="min-w-0">
                 <div className="font-medium text-foreground text-sm truncate">{user?.username || user?.email || 'User'}</div>
                 <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
               </div>
            </div>

            <div className="mb-6">
               <label className="block text-xs font-medium text-foreground mb-2">
                 To verify, type <span className="font-bold text-rose-500">confirm delete account</span> below
               </label>
               <input
                 type="text"
                 value={confirmationText}
                 onChange={(e) => setConfirmationText(e.target.value)}
                 className="w-full px-3.5 py-2 border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-background text-foreground text-sm"
                 placeholder="confirm delete account"
               />
            </div>

            {deleteError && (
              <div className="mb-4 text-xs text-rose-500 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> {deleteError}
              </div>
            )}

            <button
               disabled={!isConfirmationMatch || isDeleting}
               onClick={handleDeleteAccount}
               className="w-full py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
            >
               {isDeleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SettingsPage;
