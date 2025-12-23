import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  ArrowRight,
  ShoppingBag,
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StatCard = ({ title, value, subValue, icon: Icon, trend, loading }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs font-medium">{title}</p>
          {loading ? (
            <div className="h-6 w-20 bg-gray-100 rounded animate-pulse mt-1" />
          ) : (
            <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
          )}
          {subValue && (
            <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
              {trend === 'up' && <TrendingUp size={10} className="text-green-500" />}
              {trend === 'down' && <TrendingDown size={10} className="text-red-500" />}
              {subValue}
            </p>
          )}
        </div>
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
      </div>
    </div>
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
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'shipped': return 'bg-purple-100 text-purple-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Revenue"
          value={stats ? formatCurrency(stats.total_revenue) : '$0.00'}
          subValue={stats?.pending_orders ? `${stats.pending_orders} pending orders` : null}
          icon={DollarSign}
          loading={loading}
        />
        <StatCard
          title="Total Orders"
          value={stats?.total_orders?.toLocaleString() || '0'}
          icon={ShoppingCart}
          loading={loading}
        />
        <StatCard
          title="Customers"
          value={stats?.total_customers?.toLocaleString() || '0'}
          icon={Users}
          loading={loading}
        />
        <StatCard
          title="Products"
          value={stats?.total_products?.toLocaleString() || '0'}
          subValue={stats?.low_stock_products ? `${stats.low_stock_products} low stock` : null}
          icon={Package}
          loading={loading}
        />
      </div>

      {/* Alerts */}
      {stats && (stats.low_stock_products > 0 || stats.out_of_stock_products > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-800 text-sm">Inventory Alert</p>
              <p className="text-amber-700 text-xs">
                {stats.low_stock_products} products low in stock, {stats.out_of_stock_products} out of stock
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders and Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Orders</h2>
            <Link to="/merchant/orders" className="text-blue-600 text-xs hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="p-3">
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {orders.map((order) => (
                  <Link 
                    key={order.id} 
                    to={`/merchant/orders/${order.id}`}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-xs">{order.order_number}</p>
                        <p className="text-gray-500 text-xs">{order.customer_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 text-xs">{formatCurrency(order.total)}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Top Products</h2>
            <Link to="/merchant/products" className="text-blue-600 text-xs hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="p-3">
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No products yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {products.map((product) => (
                  <Link 
                    key={product.id} 
                    to={`/merchant/products/${product.id}`}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {product.images?.[0] ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Package className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-xs truncate max-w-[160px]">{product.name}</p>
                        <p className="text-gray-400 text-xs">{product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 text-xs">{formatCurrency(product.price)}</p>
                      <p className="text-gray-400 text-xs">{product.stock_quantity} in stock</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantDashboard;
