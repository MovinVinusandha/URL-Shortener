import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, ShieldCheck, KeyRound, Eye, EyeOff, Mail, Send, CheckCircle2 } from 'lucide-react';
import axiosInstance, { extractBackendError } from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

const SecurityPage: React.FC = () => {
  const { user, authConfig } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Email setup flow state for OAuth-only users
  const [emailSent, setEmailSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const hasExistingPassword = user?.hasPassword !== false;

  const isFormValid = currentPassword.length > 0 && newPassword.length >= 8 && confirmPassword.length > 0;
  const isButtonDisabled = !isFormValid || isLoading || newPassword !== confirmPassword;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (currentPassword === newPassword) {
      setMessage({ type: 'error', text: 'New password cannot be the same as your current password.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await axiosInstance.put('/users/me/password', { currentPassword, newPassword });
      toast.success('Password updated successfully!');
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const msg = extractBackendError(error, 'Failed to update password.');
      setMessage({ type: 'error', text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPasswordSetup = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      await axiosInstance.post('/users/me/password/request-setup');
      setEmailSent(true);
      setCooldown(60);
      if (authConfig && !authConfig.smtpConfigured) {
        toast('Password setup link generated! Check server logs.', { icon: 'ℹ️' });
        setMessage({
          type: 'success',
          text: `Email delivery is not configured on this instance. The setup link for ${user?.email || 'your account'} has been printed directly to the server/docker logs.`,
        });
      } else {
        toast.success('Password setup link sent to your email!');
        setMessage({
          type: 'success',
          text: `A secure link to set your password has been sent to ${user?.email || 'your email'}. Check your inbox!`,
        });
      }
    } catch (error: any) {
      const msg = extractBackendError(error, 'Failed to send password setup email.');
      setMessage({ type: 'error', text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4 max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Security Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your password and security credentials.</p>
      </div>

      <div className="bg-background border border-border rounded-xl overflow-hidden">
        {hasExistingPassword ? (
          /* Regular User: Change Password Form */
          <form onSubmit={handleUpdatePassword}>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h3 className="text-base font-medium text-foreground">Change Password</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                Update your password to keep your account secure. Use at least 8 characters.
              </p>

              <div className="space-y-4 max-w-md">
                <div>
                  <label htmlFor="currentPassword" className="block text-xs font-medium text-foreground mb-1.5">
                    Current Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        setMessage(null);
                      }}
                      placeholder="Enter current password"
                      className="w-full px-3.5 pr-10 py-2 border border-input rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-background text-foreground transition-colors text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-xs font-medium text-foreground mb-1.5">
                    New Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setMessage(null);
                      }}
                      placeholder="At least 8 characters"
                      className="w-full px-3.5 pr-10 py-2 border border-input rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-background text-foreground transition-colors text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-medium text-foreground mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setMessage(null);
                      }}
                      placeholder="Repeat new password"
                      className="w-full px-3.5 pr-10 py-2 border border-input rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-background text-foreground transition-colors text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Match Indicator */}
                {newPassword && confirmPassword && (
                  <div className="text-xs flex items-center gap-1.5 font-medium">
                    {newPassword === confirmPassword ? (
                      <span className="text-emerald-500 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Passwords match
                      </span>
                    ) : (
                      <span className="text-rose-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match
                      </span>
                    )}
                  </div>
                )}

                {message && (
                  <div className={`mt-3 text-sm flex items-center gap-1.5 ${message.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {message.text}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3.5 bg-background border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Minimum 8 characters. You'll receive a security email confirming the change.</p>
              <button
                type="submit"
                disabled={isButtonDisabled}
                className="btn-solid disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? 'Saving...' : 'Update Password'}
              </button>
            </div>
          </form>
        ) : (
          /* OAuth User: Verification Link Setup Flow */
          <div className="p-6">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-medium text-foreground">Set Account Password</h3>
              </div>
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium border border-amber-500/20">
                <AlertCircle className="w-3.5 h-3.5" /> Social Login (No password set)
              </span>
            </div>

            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Your account is currently linked to your social login. To establish a standalone password, we'll verify your email address first.
            </p>

            <div className="max-w-xl bg-card border border-border/60 rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex-1 text-sm space-y-1">
                  <p className="font-medium text-foreground">Email Verification Required</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    We will send a secure verification link to <strong className="text-foreground">{user?.email}</strong>. 
                    Opening this link will allow you to create your password securely.
                  </p>
                </div>
              </div>

              {message && (
                <div className={`text-sm p-3 rounded-lg border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'} flex items-start gap-2`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                  <span>{message.text}</span>
                </div>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRequestPasswordSetup}
                  disabled={isLoading || cooldown > 0}
                  className="btn-solid flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {isLoading
                    ? 'Sending...'
                    : cooldown > 0
                    ? `Resend link in ${cooldown}s`
                    : emailSent
                    ? 'Resend Setup Link'
                    : 'Send Password Setup Link'}
                </button>
                {emailSent && cooldown === 0 && (
                  <span className="text-xs text-muted-foreground">Did not receive it? You can resend now.</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SecurityPage;
