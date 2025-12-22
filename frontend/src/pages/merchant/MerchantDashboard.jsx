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
      <CardContent className="p-3 sm:p-4 md:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-gray-400 text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1">{title}</p>
            {loading ? (
              <div className="h-5 sm:h-6 w-16 sm:w-20 bg-gray-700 rounded animate-pulse" />
            ) : (
              <p className="text-base sm:text-lg md:text-xl font-bold text-white truncate">{value}</p>
            )}
            {subValue && <p className="text-gray-500 text-[10px] sm:text-xs mt-0.5 truncate">{subValue}</p>}
          </div>
          <div className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
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
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      {/* Stats Grid - 2 columns on mobile, 4 on larger screens */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <StatCard
          title="Total Revenue"
          value={stats ? formatCurrency(stats.total_revenue) : '$0.00'}
          subValue={`${stats?.pending_orders || 0} pending`}
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
          title="Customers"
          value={stats?.total_customers?.toLocaleString() || '0'}
          icon={Users}
          color="purple"
          loading={loading}
        />
        <StatCard
          title="Products"
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
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-yellow-400 flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
              <p className="text-yellow-400 text-xs sm:text-sm">
                <span className="font-medium">Alert:</span> {stats.low_stock_products} low stock, {stats.out_of_stock_products} out of stock
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders and Top Products - Stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
        {/* Recent Orders */}
        <Card className="bg-[#151b28] border-gray-800">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm sm:text-base font-semibold">Recent Orders</CardTitle>
              <Link to="/merchant/orders" className="text-emerald-400 text-[10px] sm:text-xs hover:text-emerald-300 flex items-center gap-0.5">
                View All <ArrowRight size={12} />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 pt-0">
            {loading ? (
              <div className="space-y-1.5 sm:space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-11 sm:h-14 bg-gray-800 rounded animate-pulse" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-4 sm:py-6 text-gray-500">
                <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 opacity-30" />
                <p className="text-xs sm:text-sm">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {orders.map((order) => (
                  <Link 
                    key={order.id} 
                    to={`/merchant/orders/${order.id}`}
                    className="flex items-center justify-between p-2 sm:p-2.5 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500/20 to-teal-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <ShoppingBag size={16} className="sm:w-[18px] sm:h-[18px] text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium text-xs sm:text-sm truncate">{order.order_number}</p>
                        <p className="text-gray-500 text-xs truncate">{order.customer_name}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-white font-medium text-xs sm:text-sm">{formatCurrency(order.total)}</p>
                      <span className={`text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="bg-[#151b28] border-gray-800">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm sm:text-base font-semibold">Top Products</CardTitle>
              <Link to="/merchant/products" className="text-emerald-400 text-[10px] sm:text-xs hover:text-emerald-300 flex items-center gap-0.5">
                View All <ArrowRight size={12} />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 pt-0">
            {loading ? (
              <div className="space-y-1.5 sm:space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-11 sm:h-14 bg-gray-800 rounded animate-pulse" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-4 sm:py-6 text-gray-500">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 opacity-30" />
                <p className="text-xs sm:text-sm">No products yet</p>
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {products.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-2 sm:p-2.5 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-700 rounded flex items-center justify-center text-white font-medium text-[10px] sm:text-xs flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                        <img
                          src={product.images?.[0] || 'https://via.placeholder.com/40'}
                          alt={product.name}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-medium text-xs sm:text-sm line-clamp-1">{product.name}</p>
                          <p className="text-gray-500 text-xs">{product.sales_count || 0} sales</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-white font-medium text-xs sm:text-sm">{formatCurrency(product.price)}</p>
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
