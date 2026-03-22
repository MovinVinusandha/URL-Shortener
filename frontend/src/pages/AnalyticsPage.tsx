import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  ArrowLeft, MousePointerClick, Globe, Monitor, 
  Link as LinkIcon, BarChart2, Folder, Tag, Activity,
  HelpCircle, Gift, ChevronsUpDown,
  User, Percent, Share2, Search
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

  return (
    <div className="min-h-screen flex text-gray-900 bg-gray-50 font-sans">
      {/* Leftmost Slim Sidebar */}
      <aside className="w-16 border-r border-gray-200 bg-white flex flex-col items-center py-4 shrink-0 h-screen sticky top-0 hidden sm:flex">
        <div className="mb-8 font-bold text-xl tracking-tighter cursor-pointer" onClick={() => navigate('/dashboard')}>
          <svg width="32" height="18" viewBox="0 0 287 164" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.00505 48.0549C0.0880079 48.1461 0.0903883 48.1461 0.0877943 40.5168C0.0837503 28.6847 0.189021 16.8508 0.00219248 5.02158C-0.0550435 1.3981 0.994503 0.0145566 4.78305 0.0196536C50.4448 0.0812676 96.1066 0.0117803 141.768 2.57447e-07C142.867 -0.000304743 143.965 0.270447 145.865 0.520111C143.992 3.48743 142.433 5.94428 140.887 8.41003C133.548 20.119 126.139 31.7855 118.924 43.5709C117.01 46.6967 114.922 48.2153 110.989 48.087C101.335 47.7719 91.661 47.9639 81.9963 48.0716C73.1478 48.1702 68.6907 52.4257 68.5963 61.2201C68.3726 82.0486 68.3508 102.879 68.223 123.709C68.1984 127.709 70.0347 130.432 73.7672 131.693C77.8906 133.085 80.4137 130.66 82.4408 127.555C96.003 106.777 109.507 85.9612 123.094 65.2001C129.933 54.751 136.438 44.04 143.904 34.0527C172.956 -4.81268 224.332 -8.89307 261.554 24.4109C294.228 53.6465 294.385 108.536 262.006 139.805C246.844 154.447 228.927 162.691 207.833 163.095C185.344 163.526 162.844 163.35 140.349 163.416C139.57 163.418 138.79 163.177 137.176 162.913C151.36 141.741 165.199 121.083 179.37 99.9284C181.561 101.898 183.227 103.452 184.952 104.938C194.84 113.45 209.339 114.795 220.36 108.244C231.206 101.797 236.942 88.5494 234.186 75.964C231.606 64.1801 224.087 56.7778 212.57 54.2858C200.297 51.6302 189.594 55.2682 182.314 65.8799C174.5 77.2708 167.327 89.0996 159.769 100.668C150.57 114.748 141.185 128.707 132.021 142.809C122.808 156.986 109.963 164.173 92.9738 163.461C86.6729 163.197 80.2028 163.334 74.133 161.91C59.3329 158.438 49.215 146.15 48.9144 130.994C48.4651 108.339 48.6969 85.6704 48.6918 63.0075C48.6892 51.3669 45.4759 48.0168 33.9837 48.0035C25.4857 47.9937 16.9877 48.0313 8.00505 48.0549Z" fill="#121112"></path>
          </svg>
        </div>
        <nav className="flex-1 flex flex-col items-center gap-4">
        </nav>
        <div className="mt-auto flex flex-col items-center gap-4">
          <button className="text-gray-500 hover:text-gray-900 transition-colors">
            <Gift className="w-5 h-5" />
          </button>
          <button className="text-gray-500 hover:text-gray-900 transition-colors">
            <HelpCircle className="w-5 h-5" />
          </button>
          <button className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center text-sm font-medium">
            U
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 overflow-x-hidden">
        
        {/* Top Header */}
        <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-md transition-colors" onClick={() => navigate('/dashboard')}>
              <h1 className="text-gray-900 font-semibold flex items-center gap-1">
                workspace
                <ChevronsUpDown className="w-4 h-4 text-gray-400" />
              </h1>
            </div>
            <div className="relative w-64 hidden lg:block ml-4">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full rounded-md border-0 py-1.5 pl-9 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6 bg-gray-50"
                placeholder="Search..."
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        {/* Top Navigation Tabs */}
        <nav className="border-b border-gray-200 bg-white px-6 sticky top-16 z-10">
          <div className="max-w-6xl mx-auto flex items-center justify-between h-12">
            <div className="flex items-center gap-8 h-full">
              <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors h-full border-b-2 border-transparent">
                <LinkIcon className="w-4 h-4" /> Links
              </Link>
              <div className="flex items-center gap-2 text-sm font-medium text-blue-600 h-full border-b-2 border-blue-600">
                <BarChart2 className="w-4 h-4" /> Analytics
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors h-full border-b-2 border-transparent cursor-not-allowed">
                <Folder className="w-4 h-4" /> Folders
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors h-full border-b-2 border-transparent cursor-not-allowed">
                <Tag className="w-4 h-4" /> Tags
              </div>
            </div>
            <div className="flex items-center gap-4 text-gray-500">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-medium">{totalClicks} Clicks</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Dashboard Content */}
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
      </div>
    </div>
  );
};

export default AnalyticsPage;
