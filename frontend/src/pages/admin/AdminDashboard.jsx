import React from 'react';
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
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { platformStats, merchants, monthlyRevenueData } from '../../data/mock';

const StatCard = ({ title, value, change, changeType, icon: Icon, color }) => {
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
            <p className="text-2xl font-bold text-white">{value}</p>
            {change !== undefined && (
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
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Merchants"
          value={platformStats.totalMerchants.toLocaleString()}
          change={8.2}
          changeType="positive"
          icon={Store}
          color="cyan"
        />
        <StatCard
          title="Active Merchants"
          value={platformStats.activeMerchants.toLocaleString()}
          change={5.4}
          changeType="positive"
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="Platform Revenue"
          value={formatCurrency(platformStats.totalRevenue)}
          change={12.5}
          changeType="positive"
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="Total Orders"
          value={platformStats.totalOrders.toLocaleString()}
          change={3.8}
          changeType="positive"
          icon={ShoppingCart}
          color="orange"
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
            <div className="h-64 flex items-end gap-3 pt-4">
              {monthlyRevenueData.map((item, index) => {
                const maxRevenue = Math.max(...monthlyRevenueData.map(d => d.revenue));
                const height = (item.revenue / maxRevenue) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-cyan-500/20 to-cyan-500/80 rounded-t-lg hover:from-cyan-500/30 hover:to-cyan-400 transition-all duration-300 cursor-pointer relative group"
                      style={{ height: `${height}%` }}
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
          </CardContent>
        </Card>

        {/* Platform Health */}
        <Card className="bg-[#151b28] border-gray-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg font-semibold">Platform Health</CardTitle>
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
                  <p className="text-white font-medium">API Response Time</p>
                  <p className="text-gray-400 text-sm">Average across all endpoints</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-400">45ms</p>
                  <p className="text-gray-500 text-xs">-12% from yesterday</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                <div>
                  <p className="text-white font-medium">Uptime</p>
                  <p className="text-gray-400 text-sm">Last 30 days</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-400">99.98%</p>
                  <p className="text-gray-500 text-xs">2 incidents resolved</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                <div>
                  <p className="text-white font-medium">Active Sessions</p>
                  <p className="text-gray-400 text-sm">Current merchant sessions</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-cyan-400">847</p>
                  <p className="text-gray-500 text-xs">+23% from average</p>
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
                {merchants.slice(0, 5).map((merchant) => (
                  <tr key={merchant.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={merchant.logo}
                          alt={merchant.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
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
                      {merchant.orders.toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        merchant.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {merchant.status.charAt(0).toUpperCase() + merchant.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
