import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Users,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowRight,
  Activity,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const StatCard = ({ title, value, change, changeType, icon: Icon, color, loading }) => {
  const colors = {
    cyan: 'from-cyan-500 to-blue-600',
    emerald: 'from-emerald-500 to-teal-600',
    purple: 'from-purple-500 to-pink-600',
    orange: 'from-orange-500 to-red-600'
  };

  return (
    <Card className="bg-[#151b28] border-gray-800 hover:border-gray-700 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
            {loading ? (
              <div className="h-8 w-24 bg-gray-700 animate-pulse rounded"></div>
            ) : (
              <p className="text-2xl font-bold text-white">{value}</p>
            )}
            {change !== undefined && !loading && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                changeType === 'positive' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {changeType === 'positive' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{change}%</span>
                <span className="text-gray-500">vs last month</span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
            <Icon size={24} className="text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AdminDashboard = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch platform stats and merchants in parallel
      const [statsRes, merchantsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/stats`, { headers }),
        axios.get(`${API_URL}/api/admin/websites?limit=5`, { headers })
      ]);
      
      setStats(statsRes.data);
      setMerchants(merchantsRes.data);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError(err.response?.data?.detail || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const monthlyRevenueData = stats?.monthly_revenue || [];

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name || 'Admin'}</h1>
          <p className="text-gray-400 text-sm">Here's what's happening with your platform</p>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-lg text-gray-300 text-sm transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Merchants"
          value={stats?.total_merchants?.toLocaleString() || '0'}
          change={8.2}
          changeType="positive"
          icon={Store}
          color="cyan"
          loading={loading}
        />
        <StatCard
          title="Active Merchants"
          value={stats?.active_merchants?.toLocaleString() || '0'}
          change={5.4}
          changeType="positive"
          icon={Users}
          color="emerald"
          loading={loading}
        />
        <StatCard
          title="Platform Revenue"
          value={formatCurrency(stats?.total_revenue)}
          change={12.5}
          changeType="positive"
          icon={DollarSign}
          color="purple"
          loading={loading}
        />
        <StatCard
          title="Total Orders"
          value={stats?.total_orders?.toLocaleString() || '0'}
          change={3.8}
          changeType="positive"
          icon={ShoppingCart}
          color="orange"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="bg-[#151b28] border-gray-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg font-semibold">Monthly Revenue</CardTitle>
              <button className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center gap-1">
                View Report <ArrowUpRight size={14} />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <RefreshCw className="animate-spin text-gray-500" size={32} />
              </div>
            ) : monthlyRevenueData.length > 0 ? (
              <div className="h-64 flex items-end gap-3 pt-4">
                {monthlyRevenueData.map((item, index) => {
                  const maxRevenue = Math.max(...monthlyRevenueData.map(d => d.revenue));
                  const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full bg-gradient-to-t from-cyan-500/20 to-cyan-500/80 rounded-t-lg hover:from-cyan-500/30 hover:to-cyan-400 transition-all duration-300 cursor-pointer relative group"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {formatCurrency(item.revenue)}
                        </div>
                      </div>
                      <span className="text-gray-500 text-xs">{item.month}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No revenue data yet. Add merchants to see statistics.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Health */}
        <Card className="bg-[#151b28] border-gray-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg font-semibold">Platform Overview</CardTitle>
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <Activity size={16} />
                All Systems Operational
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                <div>
                  <p className="text-white font-medium">Total Products</p>
                  <p className="text-gray-400 text-sm">Across all merchants</p>
                </div>
                <div className="text-right">
                  {loading ? (
                    <div className="h-8 w-16 bg-gray-700 animate-pulse rounded"></div>
                  ) : (
                    <p className="text-2xl font-bold text-cyan-400">{stats?.total_products?.toLocaleString() || '0'}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                <div>
                  <p className="text-white font-medium">Total Customers</p>
                  <p className="text-gray-400 text-sm">Registered customers</p>
                </div>
                <div className="text-right">
                  {loading ? (
                    <div className="h-8 w-16 bg-gray-700 animate-pulse rounded"></div>
                  ) : (
                    <p className="text-2xl font-bold text-emerald-400">{stats?.total_customers?.toLocaleString() || '0'}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                <div>
                  <p className="text-white font-medium">Platform Users</p>
                  <p className="text-gray-400 text-sm">Admin & merchant accounts</p>
                </div>
                <div className="text-right">
                  {loading ? (
                    <div className="h-8 w-16 bg-gray-700 animate-pulse rounded"></div>
                  ) : (
                    <p className="text-2xl font-bold text-purple-400">{stats?.total_users?.toLocaleString() || '0'}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Merchants */}
      <Card className="bg-[#151b28] border-gray-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-lg font-semibold">Recent Merchants</CardTitle>
            <Link to="/admin/merchants" className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-800/50 animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : merchants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Merchant</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Plan</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Revenue</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Orders</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {merchants.map((merchant) => (
                    <tr key={merchant.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {merchant.logo ? (
                            <img
                              src={merchant.logo.startsWith('/api') ? `${API_URL}${merchant.logo}` : merchant.logo}
                              alt={merchant.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                              <Store size={20} className="text-white" />
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium">{merchant.name}</p>
                            <p className="text-gray-500 text-sm">{merchant.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          merchant.plan === 'Enterprise'
                            ? 'bg-purple-500/20 text-purple-400'
                            : merchant.plan === 'Professional'
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {merchant.plan}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-white font-medium">
                        {formatCurrency(merchant.revenue)}
                      </td>
                      <td className="py-4 px-4 text-gray-300">
                        {(merchant.orders || 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          merchant.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {merchant.status?.charAt(0).toUpperCase() + merchant.status?.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Store size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 mb-2">No merchants yet</p>
              <Link 
                to="/admin/merchants" 
                className="text-cyan-400 hover:text-cyan-300 text-sm"
              >
                Add your first merchant →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
