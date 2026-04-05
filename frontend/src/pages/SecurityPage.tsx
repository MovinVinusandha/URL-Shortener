import React, { useState } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';

const SecurityPage: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const isFormValid = currentPassword.length > 0 && newPassword.length >= 8 && confirmPassword.length > 0;
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
      await axiosInstance.put('/api/users/me/password', { currentPassword, newPassword });
      setMessage({ type: 'success', text: 'Password updated successfully!' });
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
    <div className="py-8 max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your password and security preferences.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Password</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">
            Update your password to keep your account secure.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Must be at least 8 characters.</p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>

            {message && (
              <div className={`mt-3 text-sm flex items-center gap-1.5 ${message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {message.text}
              </div>
            )}
            
            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 mt-6">
              <button
                type="submit"
                disabled={isButtonDisabled}
                className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SecurityPage;
