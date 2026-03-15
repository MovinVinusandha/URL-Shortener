import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Lock, ArrowRight, AlertCircle, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';

const SecurePage: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await axiosInstance.post(`/unlock/${hash}`, { password: password.trim() });
      if (response.data && response.data.longUrl) {
        window.location.href = response.data.longUrl;
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 400) {
        setError('Incorrect password. Please try again.');
      } else if (err.response?.status === 404) {
        setError('Link not found or no longer active.');
      } else {
        setError('An error occurred while unlocking the link.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      {/* Subtle background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-500/10 dark:bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="card w-full max-w-md p-8 relative z-10 animate-fade-in shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-violet-100 dark:bg-violet-500/10 rounded-2xl flex items-center justify-center mb-5 border border-violet-200 dark:border-violet-500/20 shadow-sm">
            <Lock className="w-7 h-7 text-violet-600 dark:text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Password Protected</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            This link requires a password to access.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3 animate-slide-up">
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="input-field py-3 text-center tracking-widest text-lg pr-12"
              placeholder="Enter password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Unlock Link
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center flex items-center justify-center gap-1.5 text-slate-400 dark:text-slate-500 text-xs">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Secured by URL Shortener</span>
        </div>
      </div>
    </div>
  );
};

export default SecurePage;
