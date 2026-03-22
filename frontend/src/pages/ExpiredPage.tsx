import React from 'react';
import { Link } from 'react-router-dom';

const ExpiredPage: React.FC = () => {
  return (
    <div className="antialiased min-h-screen flex flex-col bg-white text-black font-sans">
      {/* BEGIN: Navigation Bar */}
      <nav className="w-full flex items-center justify-between px-6 py-4 fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md">
        {/* Logo */}
        <div className="flex-shrink-0 flex items-center">
          <Link to="/" className="font-bold text-2xl tracking-tighter">
            trim
          </Link>
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center space-x-3">
          <Link 
            to="/login" 
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-md border border-gray-200 transition-colors"
          >
            Log in
          </Link>
          <Link 
            to="/register" 
            className="px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-md transition-colors"
          >
            Sign up
          </Link>
        </div>
      </nav>
      {/* END: Navigation Bar */}

      {/* BEGIN: Main Content */}
      <main className="flex-grow flex flex-col items-center justify-start pt-24 pb-16 px-4">
        {/* Hero Section with Grid & Gradient */}
        <section className="relative w-full max-w-6xl h-[600px] rounded-3xl overflow-hidden border border-gray-100 flex flex-col items-center justify-center bg-white shadow-sm mt-8">
          
          {/* Background Layers */}
          <div 
            className="absolute inset-0 opacity-50"
            style={{ 
              backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)',
              backgroundSize: '80px 80px' 
            }} 
          />
          <div 
            className="absolute inset-0 mix-blend-multiply"
            style={{ 
              background: 'radial-gradient(circle at 20% 80%, rgba(230, 220, 255, 0.6) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(220, 245, 230, 0.6) 0%, transparent 50%), radial-gradient(circle at 50% 20%, rgba(255, 240, 245, 0.3) 0%, transparent 50%)'
            }} 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent" />
          
          {/* Content Container */}
          <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-2xl">
            {/* Circular Badge with Logo */}
            <div className="w-24 h-24 bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center justify-center mb-10 border border-gray-50">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUAklCfWlFP_lC7C5MiKEbMf6DXDMrH6xTFnjLpDt2iO7Xt1lTJ6ub55qVAKIZRtGzGEiaj01zBHRoyv3hVCik3zr-G6CxFqHUf_w3O9MWPwwcDCZ4J4KfxMZ7nDcbSO4EyvJsMlaVDdQerQC_tw5R3MyX_XPlqp0YTG3SlpnNvi3An3N72hH7Td1U6VW4X6bBPVx6z8sDqiT7zdFOSBSlEevfPk98IV2vUsa-uBCbNdyBw8skAdAXjYUJMKPcAjidBMU" 
                alt="Trim Logo" 
                className="w-12 h-12 object-contain"
              />
            </div>
            
            {/* Heading */}
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-gray-900 mb-6">
              Expired link
            </h1>
            
            {/* Subtext */}
            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-lg mx-auto leading-relaxed">
              This link has expired. Please contact the owner of this link to get a new one.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link 
                to="/register"
                className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-900 transition-colors w-full sm:w-auto text-center shadow-md"
              >
                Try trim today
              </Link>
              <Link 
                to="/"
                className="px-6 py-3 bg-white text-gray-800 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors w-full sm:w-auto text-center shadow-sm"
              >
                Learn more
              </Link>
            </div>
          </div>
        </section>
      </main>
      {/* END: Main Content */}
    </div>
  );
};

export default ExpiredPage;
