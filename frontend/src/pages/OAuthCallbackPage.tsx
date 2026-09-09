import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import { toast } from 'react-hot-toast';

const OAuthCallbackPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const oauthError = params.get('error') || params.get('oauth_error');

    if (oauthError) {
      setError(decodeURIComponent(oauthError));
      toast.error(decodeURIComponent(oauthError));
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    if (token) {
      login(token)
        .then(() => {
          toast.success('Successfully logged in!');
          navigate('/dashboard', { replace: true });
        })
        .catch(() => {
          setError('Failed to authenticate session with token.');
          setTimeout(() => navigate('/login'), 2000);
        });
    } else {
      setError('No authentication token received.');
      setTimeout(() => navigate('/login'), 2000);
    }
  }, [location.search, login, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground font-sans p-4">
      <div className="mb-6">
        <BrandLogo className="h-9 w-auto text-foreground mx-auto" />
      </div>

      <div className="bg-background border border-border rounded-xl p-8 shadow-xl max-w-sm w-full text-center space-y-4">
        {error ? (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-rose-500" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Authentication Failed</h2>
            <p className="text-xs text-rose-500">{error}</p>
            <p className="text-xs text-muted-foreground">Redirecting to login page...</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <h2 className="text-base font-semibold text-foreground">Completing Social Login...</h2>
            <p className="text-xs text-muted-foreground">Setting up your secure session.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
