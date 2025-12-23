import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '../../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StatCard = ({ title, value, change, icon: Icon, prefix = '', suffix = '' }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-3">
    <div className="flex items-center justify-between">
      <div className="p-1.5 bg-gray-100 rounded-lg">
        <Icon size={14} className="text-blue-600" />
      </div>
      <div className={`flex items-center gap-0.5 text-xs ${
        change >= 0 ? 'text-green-600' : 'text-red-600'
      }`}>
        {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {Math.abs(change)}%
      </div>
    </div>
    <p className="text-gray-500 text-xs mt-2">{title}</p>
    <p className="text-xl font-bold text-gray-900">
      {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
    </p>
  </div>
);

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

  const maxRevenue = Math.max(...chartData.revenue);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-xs">Track your store performance and sales</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-8 px-2 bg-white border border-gray-200 rounded-md text-gray-900 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="12m">Last 12 months</option>
          </select>
          <Button variant="outline" size="sm" className="border-gray-200 h-8">
            <Calendar size={14} className="mr-1" /> Custom
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <StatCard title="Total Revenue" value={stats.revenue} change={stats.revenue_change} icon={DollarSign} prefix="$" />
        <StatCard title="Total Orders" value={stats.orders} change={stats.orders_change} icon={ShoppingCart} />
        <StatCard title="New Customers" value={stats.customers} change={stats.customers_change} icon={Users} />
        <StatCard title="Avg. Order Value" value={stats.avg_order} change={stats.avg_order_change} icon={Package} prefix="$" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Revenue Overview</h2>
          <div className="flex items-end justify-between h-36 gap-1.5">
            {chartData.labels.map((label, i) => (
              <div key={label} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                  style={{ height: `${(chartData.revenue[i] / maxRevenue) * 100}%` }}
                  title={`$${chartData.revenue[i]}`}
                />
                <span className="text-xs text-gray-500 mt-1">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-gray-500">Revenue</span>
            </div>
            <div className="text-sm text-gray-500">
              Total: <span className="text-gray-900 font-medium">${chartData.revenue.reduce((a, b) => a + b, 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h2>
          <div className="space-y-4">
            {topProducts.map((product, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-gray-900 text-sm truncate max-w-[140px]">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.sales} sales</p>
                  </div>
                </div>
                <span className="text-green-600 text-sm font-medium">${product.revenue.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h2>
        <table className="w-full">
          <thead>
            <tr className="text-gray-500 text-sm">
              <th className="text-left pb-3">Order ID</th>
              <th className="text-left pb-3">Customer</th>
              <th className="text-left pb-3">Date</th>
              <th className="text-left pb-3">Status</th>
              <th className="text-right pb-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map(order => (
              <tr key={order.id} className="border-t border-gray-100">
                <td className="py-3 text-gray-900 font-mono text-sm">{order.id}</td>
                <td className="py-3 text-gray-700">{order.customer}</td>
                <td className="py-3 text-gray-500 text-sm">{order.date}</td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    order.status === 'completed' ? 'bg-green-100 text-green-700' :
                    order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="py-3 text-right text-gray-900 font-medium">${order.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MerchantAnalytics;
