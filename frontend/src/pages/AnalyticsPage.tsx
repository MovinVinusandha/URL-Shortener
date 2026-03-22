import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useOutletContext } from 'react-router-dom';
import type { DashboardLayoutContext } from '../layouts/DashboardLayout';
import { 
  ArrowLeft, MousePointerClick, Globe, Monitor, 
  Link as LinkIcon, Activity, BarChart2,
  User, Percent, Share2
} from 'lucide-react';

interface AnalyticsData {
  totalClicks: number;
  clicksByDate: { date: string; count: number }[];
  clicksByCountry: { name: string; count: number }[];
  clicksByDevice: { name: string; count: number }[];
  clicksByBrowser: { name: string; count: number }[];
}

const COLORS = ['#7c3aed', '#c4b5fd', '#8b5cf6', '#a78bfa', '#ddd6fe'];

const AnalyticsPage: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const navigate = useNavigate();
  const { setNavStats } = useOutletContext<DashboardLayoutContext>();
  
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hash) return;
    
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

  if (!hash) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-[60vh]">
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Select a link</h2>
          <p className="text-sm text-gray-500 mb-6">Please select a link from your dashboard to view its detailed analytics.</p>
          <Link to="/dashboard" className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-md font-medium inline-block">Go to Links</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium text-sm">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center max-w-md w-full">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Error Loading Analytics</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-md transition-colors text-sm font-medium w-full flex items-center justify-center gap-2"
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

  const totalClicks = data.totalClicks || 0;
  const clicksByDate = data.clicksByDate || [];
  const clicksByCountry = data.clicksByCountry || [];
  const clicksByDevice = data.clicksByDevice || [];
  const clicksByBrowser = data.clicksByBrowser || [];

  useEffect(() => {
    setNavStats({ totalClicks, linkCount: 0 });
  }, [totalClicks, setNavStats]);

  return (
    <>
        <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 flex flex-col gap-8">
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Analytics for <span className="text-violet-600">/{hash}</span></h2>
            </div>
          </div>

          {/* Summary Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-sm font-medium flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4" /> Total Clicks
                </p>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-gray-900 text-3xl font-semibold tracking-tight">{totalClicks.toLocaleString()}</p>
              </div>
              <p className="text-xs text-gray-400 mt-1">All time</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" /> Unique Visitors
                </p>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-gray-900 text-3xl font-semibold tracking-tight">-</p>
              </div>
              <p className="text-xs text-gray-400 mt-1">Not tracked yet</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-sm font-medium flex items-center gap-2">
                  <Percent className="w-4 h-4" /> Avg. CTR
                </p>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-gray-900 text-3xl font-semibold tracking-tight">-</p>
              </div>
              <p className="text-xs text-gray-400 mt-1">Not tracked yet</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-sm font-medium flex items-center gap-2">
                  <Share2 className="w-4 h-4" /> Top Source
                </p>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-gray-900 text-3xl font-semibold tracking-tight truncate">
                  {clicksByBrowser.length > 0 ? clicksByBrowser[0].name : '-'}
                </p>
              </div>
              <p className="text-xs text-gray-400 mt-1">Top Referrer</p>
            </div>

          </section>

          {/* Main Chart */}
          <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Clicks over time</h2>
                <p className="text-sm text-gray-500">Daily breakdown of link performance</p>
              </div>
              <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-1">
                <button className="px-3 py-1.5 text-xs font-medium rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-50">24h</button>
                <button className="px-3 py-1.5 text-xs font-medium rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-50">7d</button>
                <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 text-gray-900 shadow-sm">30d</button>
                <button className="px-3 py-1.5 text-xs font-medium rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-50">All</button>
              </div>
            </div>
            
            <div className="relative w-full h-[300px]">
              {clicksByDate.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={clicksByDate} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15}/>
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
                      fill="url(#colorCount)" 
                      activeDot={{ r: 6, fill: '#ffffff', stroke: '#7c3aed', strokeWidth: 2 }} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 border border-dashed border-gray-200 rounded-lg">
                  No data available for the selected period
                </div>
              )}
            </div>
          </section>

          {/* Breakdown Grids */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Countries */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-0 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-sm text-gray-900">Top Countries</h3>
              </div>
              <div className="flex flex-col flex-1 overflow-y-auto max-h-[300px]">
                {clicksByCountry.length > 0 ? (
                  clicksByCountry.map((country) => {
                    const pct = totalClicks > 0 ? Math.round((country.count / totalClicks) * 100) : 0;
                    return (
                      <div key={country.name} className="group flex items-center justify-between p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 relative">
                        <div className="absolute left-0 top-0 bottom-0 bg-violet-600/10 z-0 rounded-r-sm transition-all" style={{ width: `${pct}%` }}></div>
                        <div className="flex items-center gap-3 z-10">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 truncate">{country.name}</span>
                        </div>
                        <span className="text-sm text-gray-500 z-10">{country.count}</span>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex items-center justify-center p-8 text-sm text-gray-400">No data</div>
                )}
              </div>
            </div>

            {/* Devices */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-0 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-sm text-gray-900">Devices</h3>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center items-center h-[300px]">
                {clicksByDevice.length > 0 ? (
                  <>
                    <div className="relative w-full h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={clicksByDevice}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="count"
                            nameKey="name"
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
                          <div key={device.name} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            <span className="text-xs text-gray-500">{device.name} ({pct}%)</span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-400">No data</div>
                )}
              </div>
            </div>

            {/* Referrers */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-0 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-sm text-gray-900">Referrers</h3>
              </div>
              <div className="flex flex-col flex-1 overflow-y-auto max-h-[300px]">
                {clicksByBrowser.length > 0 ? (
                  clicksByBrowser.map((browser) => {
                    const pct = totalClicks > 0 ? Math.round((browser.count / totalClicks) * 100) : 0;
                    return (
                      <div key={browser.name} className="group flex items-center justify-between p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 relative">
                        <div className="absolute left-0 top-0 bottom-0 bg-gray-100 z-0 rounded-r-sm transition-all" style={{ width: `${pct}%` }}></div>
                        <div className="flex items-center gap-3 z-10">
                          <div className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-[10px] font-bold text-gray-900 shadow-sm uppercase">
                            {browser.name.substring(0, 1)}
                          </div>
                          <span className="text-sm font-medium text-gray-900 truncate">{browser.name}</span>
                        </div>
                        <span className="text-sm text-gray-500 z-10">{browser.count}</span>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex items-center justify-center p-8 text-sm text-gray-400">No data</div>
                )}
              </div>
            </div>

          </section>
        </main>
    </>
  );
};

export default AnalyticsPage;
