import React, { useState } from 'react';
import { Check, AlertCircle, ShieldCheck, KeyRound } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const SecurityPage: React.FC = () => {
  let auth: any = null;
  try {
    auth = useAuth();
  } catch {
    auth = { user: null, updateUser: () => {} };
  }
  const user = auth?.user;
  const updateUser = auth?.updateUser;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const hasExistingPassword = user?.hasPassword !== false;

  const isFormValid = hasExistingPassword
    ? (currentPassword.length > 0 && newPassword.length >= 8 && confirmPassword.length > 0)
    : (newPassword.length >= 8 && confirmPassword.length > 0);

  const isButtonDisabled = !isFormValid || isLoading || newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      if (hasExistingPassword) {
        await axiosInstance.put('/users/me/password', { currentPassword, newPassword });
        setMessage({ type: 'success', text: 'Password updated successfully!' });
      } else {
        await axiosInstance.post('/users/me/password', { newPassword });
        if (typeof updateUser === 'function') {
          updateUser({ hasPassword: true });
        }
        setMessage({ type: 'success', text: 'Password set successfully! You can now log in using email/username and password.' });
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update password.' });
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
        <div className="p-6">
          <div className="flex items-center gap-2 mb-1">
            {hasExistingPassword ? (
              <ShieldCheck className="w-5 h-5 text-primary" />
            ) : (
              <KeyRound className="w-5 h-5 text-amber-500" />
            )}
            <h3 className="text-base font-medium text-foreground">
              {hasExistingPassword ? 'Change Password' : 'Set Account Password'}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            {hasExistingPassword
              ? 'Update your password to keep your account secure.'
              : 'Your account was created via social login. Setting a password allows you to log in with your email or username directly.'}
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            {hasExistingPassword && (
              <div>
                <label htmlFor="currentPassword" className="block text-xs font-medium text-foreground mb-1.5">
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2 border border-input rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-background text-foreground transition-colors text-sm"
                />
              </div>
            )}
            <div>
              <label htmlFor="newPassword" className="block text-xs font-medium text-foreground mb-1.5">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 border border-input rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-background text-foreground transition-colors text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Must be at least 8 characters.</p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-foreground mb-1.5">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2 border border-input rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-background text-foreground transition-colors text-sm"
              />
            </div>

            {message && (
              <div className={`mt-3 text-sm flex items-center gap-1.5 ${message.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {message.text}
              </div>
            )}
            
            <div className="pt-4 border-t border-border mt-6">
              <button
                type="submit"
                disabled={isButtonDisabled}
                className="btn-solid disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : hasExistingPassword ? 'Save Changes' : 'Set Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

export default SecurityPage;
