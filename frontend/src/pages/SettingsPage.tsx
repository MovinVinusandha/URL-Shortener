import React, { useState } from 'react';
import { Copy, Check, AlertCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const [copied, setCopied] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
        <div className="text-sm text-red-600 mt-2">Delete modal will be implemented here.</div>
      )}
    </div>
  );
};

export default SettingsPage;
