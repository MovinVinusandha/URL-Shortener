import React, { useState, useEffect } from 'react';
import { Copy, Check, AlertCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import Skeleton from 'react-loading-skeleton';
import { motion, AnimatePresence } from 'framer-motion';

const SettingsPage: React.FC = () => {
  const { user, logout, loading, updateUser } = useAuth();
  
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

  // Sync state if user loads after mount
  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.email) setEmail(user.email);
  }, [user]);

  const userIdDisplay = (user as any)?.publicId || user?.id || 'Unknown ID';

  const handleUpdateName = async () => {
    setIsUpdatingName(true);
    setNameMessage(null);
    try {
      await axiosInstance.put('/users/me', { name, email: user?.email });
      if (typeof updateUser === 'function') updateUser({ name });
      setNameMessage({ type: 'success', text: 'Name updated successfully.' });
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
      await axiosInstance.put('/users/me', { name: user?.name, email });
      if (typeof updateUser === 'function') updateUser({ email });
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
      await axiosInstance.delete('/users/me');
      logout();
    } catch (error: any) {
      setDeleteError(error.response?.data?.message || 'Failed to delete account.');
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

        {[...Array(3)].map((_, i) => (
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
        
        <div className="bg-background border border-rose-500/20 rounded-xl overflow-hidden">
          <div className="p-6">
            <Skeleton width={160} height={20} />
            <div className="mt-2 mb-4"><Skeleton width="100%" height={32} /></div>
          </div>
          <div className="px-6 py-4 bg-background border-t border-rose-500/20 flex items-center justify-end">
            <Skeleton width={140} height={32} borderRadius={6} />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4 max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account settings and preferences.</p>
      </div>

      {/* Your Name Card */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="p-6">
          <h3 className="text-base font-medium text-foreground">Your Name</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Please enter your full name, or a display name you are comfortable with.
          </p>
          <div className="max-w-md">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 border border-input rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-background text-foreground transition-colors text-sm"
            />
          </div>
          {nameMessage && (
            <div className={`mt-3 text-sm flex items-center gap-1.5 ${nameMessage.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {nameMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {nameMessage.text}
            </div>
          )}
        </div>
        <div className="px-6 py-3.5 bg-background border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Please use 32 characters at maximum.</p>
          <button
            onClick={handleUpdateName}
            disabled={isUpdatingName || name === user?.name || !name.trim()}
            className="btn-solid disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdatingName ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Your Email Card */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="p-6">
          <h3 className="text-base font-medium text-foreground">Your Email</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Please enter the email address you want to use to log in.
          </p>
          <div className="max-w-md">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 border border-input rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-background text-foreground transition-colors text-sm"
            />
          </div>
          {emailMessage && (
            <div className={`mt-3 text-sm flex items-center gap-1.5 ${emailMessage.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {emailMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {emailMessage.text}
            </div>
          )}
        </div>
        <div className="px-6 py-3.5 bg-background border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">We will email you to verify the change.</p>
          <button
            onClick={handleUpdateEmail}
            disabled={isUpdatingEmail || email === user?.email || !email.trim()}
            className="btn-solid disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdatingEmail ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Your User ID Card */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="p-6">
          <h3 className="text-base font-medium text-foreground">Your User ID</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            This is your unique identifier when communicating with support.
          </p>
          <div className="max-w-md flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={userIdDisplay}
              className="flex-1 px-3.5 py-2 border border-input rounded-lg bg-background text-foreground font-medium text-sm cursor-not-allowed"
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
                 {user?.name ? user.name.charAt(0) : user?.email ? user.email.charAt(0) : 'U'}
               </div>
               <div className="min-w-0">
                 <div className="font-medium text-foreground text-sm truncate">{user?.name || 'User'}</div>
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
