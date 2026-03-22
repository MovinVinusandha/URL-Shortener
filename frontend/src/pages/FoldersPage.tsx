import React from 'react';
import { Link } from 'react-router-dom';
import { Folder } from 'lucide-react';

const FoldersPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center flex-1 h-[60vh]">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-8 max-w-md w-full text-center shadow-sm">
        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <Folder className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Folder Management</h2>
        <p className="text-sm text-gray-500 mb-6">Organize your links into folders. Interface coming soon.</p>
        <Link to="/dashboard" className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-md font-medium inline-block">Go to Links</Link>
      </div>
    </div>
  );
};

export default FoldersPage;
