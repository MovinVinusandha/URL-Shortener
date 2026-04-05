import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import axiosInstance, { extractBackendError } from '../api/axiosInstance';
import type { RegisterPayload } from '../types';
import { toast } from 'react-hot-toast';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState<RegisterPayload>({
    name: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axiosInstance.post('/user', form);
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err: unknown) {
      const backendMessage = extractBackendError(err, 'Registration failed. Please try again.');
      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="font-sans antialiased bg-white dark:bg-black text-gray-900 dark:text-white min-h-screen flex flex-col relative bg-[length:40px_40px] bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#2a2a2a_1px,transparent_1px),linear-gradient(to_bottom,#2a2a2a_1px,transparent_1px)]"
    >
      <div className="flex-1 flex flex-col items-center pt-16 pb-8 px-6 sm:px-12 relative overflow-y-auto w-full">
        
        <div className="flex items-center gap-2 mb-12 relative z-10">
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUAklCfWlFP_lC7C5MiKEbMf6DXDMrH6xTFnjLpDt2iO7Xt1lTJ6ub55qVAKIZRtGzGEiaj01zBHRoyv3hVCik3zr-G6CxFqHUf_w3O9MWPwwcDCZ4J4KfxMZ7nDcbSO4EyvJsMlaVDdQerQC_tw5R3MyX_XPlqp0YTG3SlpnNvi3An3N72hH7Td1U6VW4X6bBPVx6z8sDqiT7zdFOSBSlEevfPk98IV2vUsa-uBCbNdyBw8skAdAXjYUJMKPcAjidBMU" 
            alt="Logo" 
            className="h-8 w-auto object-contain mx-auto"
          />
        </div>

        <div 
          className="w-full max-w-sm relative z-10 mb-16 bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 p-8 space-y-8" 
          style={{ boxShadow: "rgba(0, 0, 0, 0.02) 0px 1px 2px, rgba(0, 0, 0, 0.02) 0px 2px 4px, rgba(0, 0, 0, 0.02) 0px 4px 8px, rgba(0, 0, 0, 0.02) 0px 8px 16px, rgba(0, 0, 0, 0.02) 0px 16px 32px, rgba(0, 0, 0, 0.02) 0px 32px 64px" }}
        >
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">Create your Trim account</h1>
          </div>

          <div className="mt-8 space-y-6">
            {success && (
              <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-4">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-emerald-700 dark:text-emerald-400 text-sm">Account created! Redirecting to login…</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900 dark:text-white text-left">Full name</label>
                <input 
                  type="text"
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Jane Doe" 
                  className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-0 text-gray-900 dark:text-white bg-white dark:bg-black border-gray-200 dark:border-gray-800"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900 dark:text-white text-left">Work email</label>
                <input 
                  type="email" 
                  name="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="panic@thedis.co" 
                  className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-0 text-gray-900 dark:text-white bg-white dark:bg-black border-gray-200 dark:border-gray-800"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900 dark:text-white text-left">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={form.password}
                    onChange={handleChange}
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
                disabled={loading || success}
                className="w-full flex items-center justify-center px-4 py-2.5 rounded-lg bg-black dark:bg-white text-sm font-medium text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>

            <div className="relative">
              <div aria-hidden="true" className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-sm font-medium leading-6">
                <span className="bg-white dark:bg-black px-2 text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wider">OR</span>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                type="button"
                onClick={() => toast('Social login is coming soon!', { icon: '🚧' })}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm bg-white dark:bg-black text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                </svg>
                Continue with Google
              </button>
              <button 
                type="button"
                onClick={() => toast('Social login is coming soon!', { icon: '🚧' })}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm bg-white dark:bg-black text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path>
                </svg>
                Continue with GitHub
              </button>
            </div>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-gray-900 dark:text-white hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 dark:text-gray-400 max-w-sm px-4 mt-auto relative z-10">
          By continuing, you agree to Dub's <a className="font-medium text-gray-700 dark:text-gray-300 hover:underline" href="#">Terms of Service</a> and <a className="font-medium text-gray-700 dark:text-gray-300 hover:underline" href="#">Privacy Policy</a>
        </div>
        
      </div>
    </div>
  );
};

export default RegisterPage;
