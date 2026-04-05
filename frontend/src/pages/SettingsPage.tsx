import React, { useState } from 'react';
import { Copy, Check, AlertCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const [copied, setCopied] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fallback id logic if publicId is missing
  const userIdDisplay = (user as any)?.publicId || user?.id || 'Unknown ID';

  const handleUpdateName = async () => {
    setIsUpdatingName(true);
    setNameMessage(null);
    try {
      // Endpoint requires both name and email, or we just send name and keep current email
      // Let's send the current email state so it doesn't try to change it to null
      await axiosInstance.put('/api/users/me', { name, email: user?.email });
      setNameMessage({ type: 'success', text: 'Name updated successfully.' });
      // In a real app we'd update AuthContext here, but often a reload or login fetch is needed
    } catch (error: any) {
      setNameMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update name.' });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdateEmail = async () => {
    setIsUpdatingEmail(true);
    setEmailMessage(null);
    try {
      await axiosInstance.put('/api/users/me', { name: user?.name, email });
      setEmailMessage({ type: 'success', text: 'Email updated successfully.' });
    } catch (error: any) {
      if (error.response?.status === 409) {
        setEmailMessage({ type: 'error', text: 'This email is already taken.' });
      } else {
        setEmailMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update email.' });
      }
    } finally {
      setIsUpdatingEmail(false);
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
      await axiosInstance.delete('/api/users/me');
      logout();
    } catch (error: any) {
      setDeleteError(error.response?.data?.message || 'Failed to delete account.');
    } finally {
      setIsDeleting(false);
    }
  };

  const isConfirmationMatch = confirmationText === 'confirm delete account';

  return (
    <div className="py-8 max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account settings and preferences.</p>
      </div>

      {/* Your Name Card */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Your Name</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
            Please enter your full name, or a display name you are comfortable with.
          </p>
          <div className="max-w-md">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
          {nameMessage && (
            <div className={`mt-3 text-sm flex items-center gap-1.5 ${nameMessage.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {nameMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {nameMessage.text}
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">Please use 32 characters at maximum.</p>
          <button
            onClick={handleUpdateName}
            disabled={isUpdatingName || name === user?.name || !name.trim()}
            className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isUpdatingName ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Your Email Card */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Your Email</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
            Please enter the email address you want to use to log in.
          </p>
          <div className="max-w-md">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
          {emailMessage && (
            <div className={`mt-3 text-sm flex items-center gap-1.5 ${emailMessage.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {emailMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {emailMessage.text}
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">We will email you to verify the change.</p>
          <button
            onClick={handleUpdateEmail}
            disabled={isUpdatingEmail || email === user?.email || !email.trim()}
            className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isUpdatingEmail ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Your User ID Card */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Your User ID</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
            This is your unique identifier when communicating with support.
          </p>
          <div className="max-w-md flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={userIdDisplay}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800/80 text-gray-600 dark:text-gray-400 font-mono text-sm cursor-not-allowed"
            />
            <button
              onClick={copyToClipboard}
              className="p-2 border border-gray-300 dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-gray-600 dark:text-gray-300"
              title="Copy User ID"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Card */}
      <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/30 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Delete Account
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 mb-4">
            Permanently remove your personal account and all of its contents from our platform. This action is not reversible, so please continue with caution.
          </p>
        </div>
        <div className="px-6 py-4 bg-red-50 dark:bg-red-900/10 border-t border-red-100 dark:border-red-900/30 flex items-center justify-end">
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
          >
            Delete Account
          </button>
        </div>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
               <AlertTriangle className="w-6 h-6 text-red-500" /> Delete Account
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Warning: This will permanently delete your account, along with all your links, analytics, and folders. This action cannot be undone.
            </p>

            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg flex items-center gap-3 mb-6 border border-gray-100 dark:border-slate-800">
               <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold uppercase shadow-sm shrink-0">
                 {user?.name ? user.name.charAt(0) : user?.email ? user.email.charAt(0) : 'U'}
               </div>
               <div className="min-w-0">
                 <div className="font-medium text-gray-900 dark:text-white truncate">{user?.name || 'User'}</div>
                 <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</div>
               </div>
            </div>

            <div className="mb-6">
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                 To verify, type <span className="font-bold">confirm delete account</span> below
               </label>
               <input
                 type="text"
                 value={confirmationText}
                 onChange={(e) => setConfirmationText(e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                 placeholder="confirm delete account"
               />
            </div>

            {deleteError && (
              <div className="mb-4 text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> {deleteError}
              </div>
            )}

            <button
               disabled={!isConfirmationMatch || isDeleting}
               onClick={handleDeleteAccount}
               className="w-full py-2.5 rounded-md font-medium text-sm transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed dark:disabled:bg-slate-800 dark:disabled:text-slate-600 bg-red-600 text-white hover:bg-red-700"
            >
               {isDeleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
