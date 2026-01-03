import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Store, Users, Package,
  ShoppingCart, RefreshCw, ArrowUpRight, Award, Target, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminAnalytics = () => {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/admin/analytics/overview`, { headers });
      setAnalytics(res.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.detail || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchAnalytics();
  }, [token, fetchAnalytics]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  const stores = analytics?.stores || {};
  const metrics = analytics?.metrics || {};
  const monthlyRevenue = analytics?.monthly_revenue || [];
  const topStores = analytics?.top_stores || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Analytics</h1>
          <p className="text-gray-400">Comprehensive overview of your platform performance</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border-cyan-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cyan-400 text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-white mt-1">{formatCurrency(metrics.total_revenue)}</p>
                <div className="flex items-center gap-1 mt-2 text-emerald-400 text-sm">
                  <TrendingUp size={14} />
                  <span>All time</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border-emerald-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-400 text-sm font-medium">Monthly Recurring</p>
                <p className="text-3xl font-bold text-white mt-1">{formatCurrency(metrics.mrr)}</p>
                <div className="flex items-center gap-1 mt-2 text-emerald-400 text-sm">
                  <Zap size={14} />
                  <span>MRR</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <Target className="w-7 h-7 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-400 text-sm font-medium">Total Stores</p>
                <p className="text-3xl font-bold text-white mt-1">{stores.total}</p>
                <div className="flex items-center gap-1 mt-2 text-purple-400 text-sm">
                  <span className="text-emerald-400">{stores.active} active</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-yellow-400">{stores.trial} trial</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                <Store className="w-7 h-7 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-red-600/20 border-orange-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-400 text-sm font-medium">Total Orders</p>
                <p className="text-3xl font-bold text-white mt-1">{metrics.total_orders?.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2 text-orange-400 text-sm">
                  <ShoppingCart size={14} />
                  <span>Platform-wide</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                <ShoppingCart className="w-7 h-7 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#151b28] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Products</p>
                <p className="text-2xl font-bold text-white">{metrics.total_products?.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#151b28] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Customers</p>
                <p className="text-2xl font-bold text-white">{metrics.total_customers?.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#151b28] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Platform Users</p>
                <p className="text-2xl font-bold text-white">{metrics.total_users?.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="bg-[#151b28] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Monthly Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyRevenue.length > 0 ? (
              <div className="h-64 flex items-end gap-2 pt-4">
                {monthlyRevenue.map((item, index) => {
                  const maxRevenue = Math.max(...monthlyRevenue.map(d => d.revenue));
                  const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full bg-gradient-to-t from-cyan-500/20 to-cyan-500/80 rounded-t-lg hover:from-cyan-500/30 hover:to-cyan-400 transition-all duration-300 cursor-pointer relative group"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      >
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
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
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Store Distribution */}
        <Card className="bg-[#151b28] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-purple-400" />
              Stores by Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stores.by_plan || {}).map(([plan, count]) => {
                const total = stores.total || 1;
                const percentage = Math.round((count / total) * 100);
                const colors = {
                  free: 'bg-gray-500',
                  starter: 'bg-blue-500',
                  professional: 'bg-purple-500',
                  enterprise: 'bg-amber-500'
                };
                return (
                  <div key={plan} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 capitalize">{plan}</span>
                      <span className="text-white font-semibold">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[plan]} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Stores */}
      <Card className="bg-[#151b28] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Top Performing Stores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topStores.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Rank</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Store</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Revenue</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {topStores.map((store, index) => (
                    <tr key={store.store_id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-4 px-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-amber-500/20 text-amber-400' :
                          index === 1 ? 'bg-gray-400/20 text-gray-400' :
                          index === 2 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-gray-700 text-gray-500'
                        }`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-white font-medium">{store.store_name}</p>
                          <p className="text-gray-500 text-sm">{store.subdomain}.getcelora.com</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-emerald-400 font-semibold">{formatCurrency(store.revenue)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-white">{store.orders}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No revenue data yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;
