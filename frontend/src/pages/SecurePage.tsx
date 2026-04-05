import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';

const SecurePage: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
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
    <div 
      className="font-sans antialiased bg-white dark:bg-black text-gray-900 dark:text-white min-h-screen w-full flex items-center justify-center relative bg-[length:40px_40px] bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#2a2a2a_1px,transparent_1px),linear-gradient(to_bottom,#2a2a2a_1px,transparent_1px)]"
    >
      <div 
        className="w-full max-w-sm relative z-10 bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 p-8 space-y-8" 
        style={{ boxShadow: "rgba(0, 0, 0, 0.02) 0px 1px 2px, rgba(0, 0, 0, 0.02) 0px 2px 4px, rgba(0, 0, 0, 0.02) 0px 4px 8px, rgba(0, 0, 0, 0.02) 0px 8px 16px, rgba(0, 0, 0, 0.02) 0px 16px 32px, rgba(0, 0, 0, 0.02) 0px 32px 64px" }}
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUAklCfWlFP_lC7C5MiKEbMf6DXDMrH6xTFnjLpDt2iO7Xt1lTJ6ub55qVAKIZRtGzGEiaj01zBHRoyv3hVCik3zr-G6CxFqHUf_w3O9MWPwwcDCZ4J4KfxMZ7nDcbSO4EyvJsMlaVDdQerQC_tw5R3MyX_XPlqp0YTG3SlpnNvi3An3N72hH7Td1U6VW4X6bBPVx6z8sDqiT7zdFOSBSlEevfPk98IV2vUsa-uBCbNdyBw8skAdAXjYUJMKPcAjidBMU" 
            alt="Logo" 
            className="h-8 w-auto object-contain mx-auto"
          />
        </div>

        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">Password Required</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">This link is protected. Enter the password to continue.</p>
        </div>

        <div className="mt-8 space-y-6">
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white text-left">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="••••••••" 
                  className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-0 text-gray-900 dark:text-white bg-white dark:bg-black border-gray-200 dark:border-gray-800"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center font-medium pt-1">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full flex items-center justify-center px-4 py-2.5 rounded-lg bg-black dark:bg-white text-sm font-medium text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 mt-4"
            >
              {loading ? 'Unlocking...' : 'Unlock Link'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default SecurePage;
