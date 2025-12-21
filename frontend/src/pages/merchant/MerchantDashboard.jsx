import React from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowRight,
  ShoppingBag,
  UserPlus,
  AlertTriangle,
  Truck,
  Star,
  CreditCard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { merchantStats, salesChartData, recentActivity, topProducts, orders } from '../../data/mock';

const StatCard = ({ title, value, subValue, change, changeType, icon: Icon, color }) => {
  const colors = {
    emerald: 'from-emerald-500 to-teal-600',
    blue: 'from-blue-500 to-cyan-600',
    purple: 'from-purple-500 to-pink-600',
    orange: 'from-orange-500 to-amber-600'
  };

  return (
    <Card className="bg-[#151b28] border-gray-800 hover:border-gray-700 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {subValue && <p className="text-gray-500 text-sm mt-1">{subValue}</p>}
            {change !== undefined && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                changeType === 'positive' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {changeType === 'positive' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{change}%</span>
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

const MerchantDashboard = () => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const activityIcons = {
    ShoppingCart,
    UserPlus,
    AlertTriangle,
    Truck,
    Star,
    CreditCard
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'processing': return 'bg-blue-500/20 text-blue-400';
      case 'shipped': return 'bg-purple-500/20 text-purple-400';
      case 'delivered': return 'bg-emerald-500/20 text-emerald-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(merchantStats.todaySales)}
          subValue={`${merchantStats.pendingOrders} orders pending`}
          change={12.5}
          changeType="positive"
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Total Orders"
          value={merchantStats.totalOrders.toLocaleString()}
          subValue={`${merchantStats.completedOrders} completed`}
          change={8.2}
          changeType="positive"
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          title="Total Customers"
          value={merchantStats.totalCustomers.toLocaleString()}
          subValue={`${merchantStats.newCustomers} new this month`}
          change={5.4}
          changeType="positive"
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Avg Order Value"
          value={formatCurrency(merchantStats.averageOrderValue)}
          subValue={`${merchantStats.conversionRate}% conversion`}
          change={3.2}
          changeType="positive"
          icon={Package}
          color="orange"
        />
      </div>

      {/* Charts and Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card className="bg-[#151b28] border-gray-800 lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg font-semibold">Weekly Sales</CardTitle>
              <button className="text-emerald-400 text-sm hover:text-emerald-300 flex items-center gap-1">
                View Report <ArrowUpRight size={14} />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-4 pt-4">
              {salesChartData.map((item, index) => {
                const maxSales = Math.max(...salesChartData.map(d => d.sales));
                const height = (item.sales / maxSales) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-emerald-500/20 to-emerald-500/80 rounded-t-lg hover:from-emerald-500/30 hover:to-emerald-400 transition-all duration-300 cursor-pointer relative group"
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {formatCurrency(item.sales)}<br />
                        <span className="text-gray-400">{item.orders} orders</span>
                      </div>
                    </div>
                    <span className="text-gray-500 text-xs">{item.date}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-[#151b28] border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-lg font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.slice(0, 5).map((activity) => {
                const IconComponent = activityIcons[activity.icon] || ShoppingBag;
                return (
                  <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-800/30 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      activity.type === 'order' ? 'bg-emerald-500/20 text-emerald-400' :
                      activity.type === 'customer' ? 'bg-blue-500/20 text-blue-400' :
                      activity.type === 'product' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      <IconComponent size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300 text-sm truncate">{activity.message}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders and Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="bg-[#151b28] border-gray-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg font-semibold">Recent Orders</CardTitle>
              <Link to="/merchant/orders" className="text-emerald-400 text-sm hover:text-emerald-300 flex items-center gap-1">
                View All <ArrowRight size={14} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-teal-600/20 rounded-lg flex items-center justify-center">
                      <ShoppingBag size={18} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{order.id}</p>
                      <p className="text-gray-500 text-xs">{order.customer}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium text-sm">{formatCurrency(order.total)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="bg-[#151b28] border-gray-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg font-semibold">Top Products</CardTitle>
              <Link to="/merchant/products" className="text-emerald-400 text-sm hover:text-emerald-300 flex items-center gap-1">
                View All <ArrowRight size={14} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{product.name}</p>
                      <p className="text-gray-500 text-xs">{product.sales.toLocaleString()} sales</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium text-sm">{formatCurrency(product.revenue)}</p>
                    <span className={`text-xs flex items-center gap-1 ${
                      product.trend >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {product.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(product.trend)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MerchantDashboard;
