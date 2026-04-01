import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useOutletContext } from 'react-router-dom';
import type { DashboardLayoutContext } from '../layouts/DashboardLayout';
import { 
  ArrowLeft, MousePointerClick, Globe, Monitor, 
  Link as LinkIcon, Activity,
  Users, Percent, Share2
} from 'lucide-react';

interface AnalyticsData {
  totalClicks: number;
  clicksByDate: { date: string; count: number }[];
  clicksByCountry: { country: string; count: number }[];
  clicksByDevice: { device: string; count: number }[];
  clicksByBrowser: { browser: string; count: number }[];
}

const COLORS = ['#7c3aed', '#c4b5fd', '#8b5cf6', '#a78bfa', '#ddd6fe'];

const AnalyticsPage: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const navigate = useNavigate();
  const { setNavStats } = useOutletContext<DashboardLayoutContext>();
  
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const endpoint = hash ? `/api/analytics/${hash}` : '/api/analytics';
        const response = await axiosInstance.get<AnalyticsData>(endpoint, { params: { period } });
        setData(response.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.status === 404 ? 'Analytics not found or unauthorized.' : 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [hash, period]);

  useEffect(() => {
    if (data) {
      setNavStats({ totalClicks: data.totalClicks || 0, linkCount: 0 });
    }
  }, [data, setNavStats]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium text-sm">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-8 text-center max-w-md w-full">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Error Loading Analytics</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black rounded-md transition-colors text-sm font-medium w-full flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white p-3 rounded-md shadow-xl text-sm border border-gray-700">
          <p className="text-gray-400 mb-1">{label}</p>
          <p className="font-semibold text-white">{payload[0].value} clicks</p>
        </div>
      );
    }
    return null;
  };

  const totalClicks = data?.totalClicks || 0;
  const clicksByDate = data?.clicksByDate || [];
  const clicksByCountry = data?.clicksByCountry || [];
  const clicksByDevice = data?.clicksByDevice || [];
  const clicksByBrowser = data?.clicksByBrowser || [];

  return (
    <>
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 bg-gray-50 dark:bg-gray-900">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {hash ? (
                <>Analytics for <span className="text-[#7c3aed]">/{hash}</span></>
              ) : (
                'Overall Analytics'
              )}
            </h1>
          </div>
        </div>

        {/* Summary Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm p-6 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center gap-2">
                <MousePointerClick className="w-4 h-4" /> Total Clicks
              </p>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-gray-900 dark:text-white text-3xl font-semibold tracking-tight">{totalClicks.toLocaleString()}</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">All time</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm p-6 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" /> Unique Visitors
              </p>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-gray-900 dark:text-white text-3xl font-semibold tracking-tight">-</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">Not tracked yet</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm p-6 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center gap-2">
                <Percent className="w-4 h-4" /> Avg. CTR
              </p>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-gray-900 dark:text-white text-3xl font-semibold tracking-tight">-</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">Not tracked yet</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm p-6 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center gap-2">
                <Share2 className="w-4 h-4" /> Top Source
              </p>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-gray-900 dark:text-white text-3xl font-semibold tracking-tight truncate">
                {clicksByBrowser.length > 0 ? clicksByBrowser[0].browser : 'N/A'}
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-1">Top Referrer</p>
          </div>

        </section>

        {/* Main Chart */}
        <section className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Clicks over time</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Daily breakdown of link performance</p>
            </div>
            <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 p-1">
              {['24h', '7d', '30d', 'all'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    period === p 
                    ? 'bg-white dark:bg-slate-700 text-black dark:text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {p === 'all' ? 'All time' : p}
                </button>
              ))}
            </div>
          </div>
          
          <div className="relative w-full h-[300px]">
            {clicksByDate.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={clicksByDate} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#7c3aed" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorClicks)" 
                    activeDot={{ r: 6, fill: '#ffffff', stroke: '#7c3aed', strokeWidth: 2 }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-slate-800 rounded-lg">
                No data available for the selected period
              </div>
            )}
          </div>
        </section>

        {/* Breakdown Grids */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Countries */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm p-0 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <h3 className="font-medium text-sm text-gray-900 dark:text-white">Top Countries</h3>
            </div>
            <div className="flex flex-col flex-1 overflow-y-auto max-h-[300px]">
              {clicksByCountry.length > 0 ? (
                clicksByCountry.slice(0, 5).map((country) => {
                  const pct = totalClicks > 0 ? (country.count / totalClicks) * 100 : 0;
                  return (
                    <div key={country.country} className="group flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors border-b border-gray-100 dark:border-slate-800/50 last:border-0 relative">
                      <div className="absolute left-0 top-0 bottom-0 bg-[#7c3aed]/10 z-0 rounded-r-sm transition-all" style={{ width: `${pct}%` }}></div>
                      <div className="flex items-center gap-3 z-10">
                        <Globe className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{country.country}</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 z-10">{country.count}</span>
                    </div>
                  )
                })
              ) : (
                <div className="flex items-center justify-center p-8 text-sm text-gray-400 dark:text-gray-600">No data</div>
              )}
            </div>
          </div>

          {/* Devices */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm p-0 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <h3 className="font-medium text-sm text-gray-900 dark:text-white">Devices</h3>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center items-center h-[300px]">
              {clicksByDevice.length > 0 ? (
                <>
                  <div className="relative w-full h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={clicksByDevice}
                          innerRadius="70%"
                          outerRadius="90%"
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="device"
                          stroke="none"
                        >
                          {clicksByDevice.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 mt-4">
                    {clicksByDevice.map((device, i) => {
                      const pct = totalClicks > 0 ? Math.round((device.count / totalClicks) * 100) : 0;
                      return (
                        <div key={device.device} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{device.device} ({pct}%)</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-400 dark:text-gray-600">No data</div>
              )}
            </div>
          </div>

          {/* Referrers */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm p-0 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <h3 className="font-medium text-sm text-gray-900 dark:text-white">Referrers</h3>
            </div>
            <div className="flex flex-col flex-1 overflow-y-auto max-h-[300px]">
              {clicksByBrowser.length > 0 ? (
                clicksByBrowser.slice(0, 5).map((browser) => {
                  const pct = totalClicks > 0 ? (browser.count / totalClicks) * 100 : 0;
                  return (
                    <div key={browser.browser} className="group flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors border-b border-gray-100 dark:border-slate-800/50 last:border-0 relative">
                      <div className="absolute left-0 top-0 bottom-0 bg-[#7c3aed]/10 z-0 rounded-r-sm transition-all" style={{ width: `${pct}%` }}></div>
                      <div className="flex items-center gap-3 z-10">
                        <div className="w-6 h-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded flex items-center justify-center text-[10px] font-bold text-gray-900 dark:text-white shadow-sm uppercase">
                          {browser.browser.substring(0, 1)}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{browser.browser}</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 z-10">{browser.count}</span>
                    </div>
                  )
                })
              ) : (
                <div className="flex items-center justify-center p-8 text-sm text-gray-400 dark:text-gray-600">No data</div>
              )}
            </div>
          </div>

        </section>
      </main>
    </>
  );
};

export default AnalyticsPage;
