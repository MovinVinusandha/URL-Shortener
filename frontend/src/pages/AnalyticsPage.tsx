import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import axiosInstance from '../api/axiosInstance';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { ArrowLeft, MousePointerClick, Globe, Monitor, Compass } from 'lucide-react';

interface AnalyticsData {
  totalClicks: number;
  clicksByDate: { date: string; count: number }[];
  clicksByCountry: { name: string; count: number }[];
  clicksByDevice: { name: string; count: number }[];
  clicksByBrowser: { name: string; count: number }[];
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

const AnalyticsPage: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const navigate = useNavigate();
  
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await axiosInstance.get<AnalyticsData>(`/analytics/${hash}`);
        setData(response.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.status === 404 ? 'Analytics not found or unauthorized.' : 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [hash]);

  if (loading) {
    return (
      <div className="page-bg min-h-screen">
        <Navbar />
        <div className="flex flex-col items-center justify-center mt-32">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-medium">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-bg min-h-screen">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="card p-8 border-red-500/20 bg-red-500/5">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
            <p className="text-slate-300">{error}</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Format data for Recharts Pie
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
          <p className="text-slate-300 mb-1">{label}</p>
          <p className="text-violet-400 font-bold">{payload[0].value} clicks</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-bg min-h-screen pb-12">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between animate-slide-up">
          <div>
            <button 
              onClick={() => navigate('/dashboard')}
              className="group flex items-center text-sm text-slate-400 hover:text-white transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" />
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
              Analytics for <span className="text-violet-500 ml-2">/{hash}</span>
            </h1>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="card p-6 flex flex-col relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-500/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center text-slate-400 mb-2">
              <MousePointerClick className="w-4 h-4 mr-2" />
              <span className="text-sm font-semibold uppercase tracking-wider">Total Clicks</span>
            </div>
            <p className="text-4xl font-bold text-slate-900 dark:text-white relative z-10">{data.totalClicks}</p>
          </div>
          
          <div className="card p-6 flex flex-col relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center text-slate-400 mb-2">
              <Globe className="w-4 h-4 mr-2" />
              <span className="text-sm font-semibold uppercase tracking-wider">Top Country</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white relative z-10 truncate">
              {data.clicksByCountry.length > 0 ? data.clicksByCountry[0].name : '-'}
            </p>
          </div>

          <div className="card p-6 flex flex-col relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center text-slate-400 mb-2">
              <Monitor className="w-4 h-4 mr-2" />
              <span className="text-sm font-semibold uppercase tracking-wider">Top Device</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white relative z-10 truncate">
              {data.clicksByDevice.length > 0 ? data.clicksByDevice[0].name : '-'}
            </p>
          </div>

          <div className="card p-6 flex flex-col relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center text-slate-400 mb-2">
              <Compass className="w-4 h-4 mr-2" />
              <span className="text-sm font-semibold uppercase tracking-wider">Top Browser</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white relative z-10 truncate">
              {data.clicksByBrowser.length > 0 ? data.clicksByBrowser[0].name : '-'}
            </p>
          </div>
        </div>

        {/* Clicks Over Time (Line Chart) */}
        <div className="card p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Clicks over last 30 days</h2>
          <div className="h-72 w-full">
            {data.clicksByDate.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.clicksByDate} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} activeDot={{ r: 8, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} />
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickMargin={10} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 border border-dashed border-slate-700 rounded-xl">
                No click data available yet
              </div>
            )}
          </div>
        </div>

        {/* Categorical Data (Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
          
          {/* Countries Bar Chart */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Countries</h2>
            <div className="h-64">
              {data.clicksByCountry.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.clicksByCountry} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                      {data.clicksByCountry.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">No data</div>
              )}
            </div>
          </div>

          {/* Devices Pie Chart */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Devices</h2>
            <div className="h-64 relative">
              {data.clicksByDevice.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.clicksByDevice}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="name"
                    >
                      {data.clicksByDevice.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">No data</div>
              )}
              {/* Custom Legend */}
              <div className="absolute bottom-0 w-full flex flex-wrap justify-center gap-4 mt-2">
                {data.clicksByDevice.map((d, i) => (
                  <div key={d.name} className="flex items-center text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {d.name} ({d.count})
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Browsers List */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Browsers</h2>
            {data.clicksByBrowser.length > 0 ? (
              <div className="space-y-4">
                {data.clicksByBrowser.map((browser, index) => {
                  const percentage = Math.round((browser.count / data.totalClicks) * 100);
                  return (
                    <div key={browser.name} className="flex flex-col">
                      <div className="flex justify-between items-end mb-1 text-sm">
                        <span className="text-slate-200">{browser.name}</span>
                        <span className="text-slate-400">{browser.count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div 
                          className="bg-violet-500 h-1.5 rounded-full" 
                          style={{ width: `${percentage}%`, backgroundColor: COLORS[index % COLORS.length] }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="w-full h-32 flex items-center justify-center text-slate-500">No data</div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default AnalyticsPage;
