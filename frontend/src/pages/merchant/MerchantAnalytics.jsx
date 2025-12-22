import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '../../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantAnalytics = () => {
  const [dateRange, setDateRange] = useState('30d');
  const [stats, setStats] = useState({
    revenue: 12450.80,
    revenue_change: 12.5,
    orders: 156,
    orders_change: 8.3,
    customers: 89,
    customers_change: -2.1,
    avg_order: 79.81,
    avg_order_change: 4.2
  });
  
  const [chartData] = useState({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    revenue: [1250, 1890, 1456, 2100, 1678, 2456, 1620],
    orders: [12, 18, 14, 21, 16, 24, 15]
  });

  const [topProducts] = useState([
    { name: 'Running Shoes Ultra', sales: 45, revenue: 5398.55 },
    { name: 'Portable Power Bank', sales: 38, revenue: 1899.62 },
    { name: 'Ceramic Coffee Mug Set', sales: 32, revenue: 1279.68 },
    { name: 'Wireless Earbuds Pro', sales: 28, revenue: 2239.72 },
    { name: 'Yoga Mat Premium', sales: 24, revenue: 959.76 }
  ]);

  const [recentOrders] = useState([
    { id: 'ORD-001', customer: 'John Smith', total: 149.99, status: 'completed', date: '2025-12-21' },
    { id: 'ORD-002', customer: 'Sarah Johnson', total: 89.50, status: 'processing', date: '2025-12-21' },
    { id: 'ORD-003', customer: 'Mike Wilson', total: 234.00, status: 'pending', date: '2025-12-20' },
    { id: 'ORD-004', customer: 'Emma Davis', total: 67.25, status: 'completed', date: '2025-12-20' }
  ]);

  const StatCard = ({ title, value, change, icon: Icon, prefix = '', suffix = '' }) => (
    <div className="bg-gray-800 rounded-lg p-5">
      <div className="flex items-center justify-between">
        <div className="p-2 bg-gray-700 rounded-lg">
          <Icon size={20} className="text-blue-400" />
        </div>
        <div className={`flex items-center gap-1 text-sm ${
          change >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          {change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(change)}%
        </div>
      </div>
      <p className="text-gray-400 text-sm mt-3">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </p>
    </div>
  );

  const maxRevenue = Math.max(...chartData.revenue);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Track your store performance and sales</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-10 px-3 bg-gray-800 border border-gray-700 rounded-md text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="12m">Last 12 months</option>
          </select>
          <Button variant="outline" className="border-gray-700">
            <Calendar size={16} className="mr-2" /> Custom Range
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Revenue" value={stats.revenue} change={stats.revenue_change} icon={DollarSign} prefix="$" />
        <StatCard title="Total Orders" value={stats.orders} change={stats.orders_change} icon={ShoppingCart} />
        <StatCard title="New Customers" value={stats.customers} change={stats.customers_change} icon={Users} />
        <StatCard title="Avg. Order Value" value={stats.avg_order} change={stats.avg_order_change} icon={Package} prefix="$" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="col-span-2 bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Revenue Overview</h2>
          <div className="flex items-end justify-between h-48 gap-2">
            {chartData.labels.map((label, i) => (
              <div key={label} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500/80 rounded-t hover:bg-blue-400 transition-colors cursor-pointer"
                  style={{ height: `${(chartData.revenue[i] / maxRevenue) * 100}%` }}
                  title={`$${chartData.revenue[i]}`}
                />
                <span className="text-xs text-gray-500 mt-2">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-gray-400">Revenue</span>
            </div>
            <div className="text-sm text-gray-400">
              Total: <span className="text-white font-medium">${chartData.revenue.reduce((a, b) => a + b, 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top Products</h2>
          <div className="space-y-4">
            {topProducts.map((product, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-white text-sm truncate max-w-[140px]">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.sales} sales</p>
                  </div>
                </div>
                <span className="text-green-400 text-sm font-medium">${product.revenue.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-gray-800 rounded-lg p-6 mt-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Orders</h2>
        <table className="w-full">
          <thead>
            <tr className="text-gray-400 text-sm">
              <th className="text-left pb-3">Order ID</th>
              <th className="text-left pb-3">Customer</th>
              <th className="text-left pb-3">Date</th>
              <th className="text-left pb-3">Status</th>
              <th className="text-right pb-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map(order => (
              <tr key={order.id} className="border-t border-gray-700">
                <td className="py-3 text-white font-mono text-sm">{order.id}</td>
                <td className="py-3 text-gray-300">{order.customer}</td>
                <td className="py-3 text-gray-400 text-sm">{order.date}</td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    order.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    order.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="py-3 text-right text-white font-medium">${order.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MerchantAnalytics;
