import React from 'react';
import { Clock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const ExpiredPage: React.FC = () => {
  return (
    <div className="page-bg min-h-screen flex flex-col items-center justify-center p-4">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-red-500/5 dark:bg-red-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-orange-500/5 dark:bg-orange-900/10 rounded-full blur-3xl" />
      </div>

      <div className="card p-10 flex flex-col items-center max-w-md w-full text-center animate-slide-up">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center mb-6">
          <Clock className="w-8 h-8 text-red-500 dark:text-red-400" />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
          410 - Link Expired
        </h1>
        
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          This link has expired and is no longer available.
        </p>

        <Link
          to="/"
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go back home
        </Link>
      </div>
    </div>
  );
};

export default ExpiredPage;
