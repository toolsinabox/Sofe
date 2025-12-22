import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  ArrowRight,
  ShoppingBag,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StatCard = ({ title, value, subValue, icon: Icon, color, loading }) => {
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
            {loading ? (
              <div className="h-8 w-24 bg-gray-700 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-white">{value}</p>
            )}
            {subValue && <p className="text-gray-500 text-sm mt-1">{subValue}</p>}
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
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, ordersRes, productsRes] = await Promise.all([
        axios.get(`${API}/stats/dashboard`),
        axios.get(`${API}/orders?limit=5`),
        axios.get(`${API}/products?limit=5&sort_by=sales`)
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
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
          title="Total Revenue"
          value={stats ? formatCurrency(stats.total_revenue) : '$0.00'}
          subValue={`${stats?.pending_orders || 0} orders pending`}
          icon={DollarSign}
          color="emerald"
          loading={loading}
        />
        <StatCard
          title="Total Orders"
          value={stats?.total_orders?.toLocaleString() || '0'}
          icon={ShoppingCart}
          color="blue"
          loading={loading}
        />
        <StatCard
          title="Total Customers"
          value={stats?.total_customers?.toLocaleString() || '0'}
          icon={Users}
          color="purple"
          loading={loading}
        />
        <StatCard
          title="Total Products"
          value={stats?.total_products?.toLocaleString() || '0'}
          subValue={`${stats?.low_stock_products || 0} low stock`}
          icon={Package}
          color="orange"
          loading={loading}
        />
      </div>

      {/* Alerts */}
      {stats && (stats.low_stock_products > 0 || stats.out_of_stock_products > 0) && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-yellow-400" size={24} />
              <div>
                <p className="text-yellow-400 font-medium">Inventory Alert</p>
                <p className="text-yellow-400/70 text-sm">
                  {stats.low_stock_products} {stats.low_stock_products === 1 ? 'item' : 'items'} low on stock, {stats.out_of_stock_products} {stats.out_of_stock_products === 1 ? 'item' : 'items'} out of stock.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingBag size={40} className="mx-auto mb-2 opacity-30" />
                <p>No orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-teal-600/20 rounded-lg flex items-center justify-center">
                        <ShoppingBag size={18} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{order.order_number}</p>
                        <p className="text-gray-500 text-xs">{order.customer_name}</p>
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
            )}
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
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package size={40} className="mx-auto mb-2 opacity-30" />
                <p>No products yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-3">
                        <img
                          src={product.images?.[0] || 'https://via.placeholder.com/40'}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div>
                          <p className="text-white font-medium text-sm line-clamp-1">{product.name}</p>
                          <p className="text-gray-500 text-xs">{product.sales_count} sales</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium text-sm">{formatCurrency(product.price)}</p>
                      <span className={`text-xs ${product.stock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MerchantDashboard;
