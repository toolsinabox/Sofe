import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, Mail, DollarSign, TrendingUp, Clock, Send, Check, Eye, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantAbandonedCarts = () => {
  const [carts, setCarts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, not-recovered, recovered
  const [selectedCart, setSelectedCart] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(null);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      const params = filter === 'recovered' ? '?recovered=true' : filter === 'not-recovered' ? '?recovered=false' : '';
      const [cartsRes, statsRes] = await Promise.all([
        axios.get(`${API}/abandoned-carts${params}`),
        axios.get(`${API}/abandoned-carts/stats`)
      ]);
      setCarts(cartsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendRecoveryEmail = async (cartId, emailType) => {
    setSendingEmail(cartId);
    try {
      await axios.post(`${API}/abandoned-carts/${cartId}/send-recovery`, null, {
        params: { email_type: emailType }
      });
      alert(`Recovery email sent successfully!`);
      fetchData();
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    } finally {
      setSendingEmail(null);
    }
  };

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60); // minutes
    
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Abandoned Cart Recovery</h1>
          <p className="text-gray-400 text-sm mt-1">Recover lost sales with targeted emails</p>
        </div>
        <Button onClick={fetchData} variant="outline" className="border-gray-700">
          <RefreshCw size={16} className="mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <ShoppingCart size={14} /> Abandoned Carts
            </div>
            <p className="text-2xl font-bold text-white">{stats.total_carts}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <DollarSign size={14} /> Lost Revenue
            </div>
            <p className="text-2xl font-bold text-red-400">${stats.total_abandoned_value?.toFixed(2)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Check size={14} /> Recovered
            </div>
            <p className="text-2xl font-bold text-green-400">{stats.recovered_carts}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <TrendingUp size={14} /> Recovery Rate
            </div>
            <p className="text-2xl font-bold text-blue-400">{stats.recovery_rate}%</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <DollarSign size={14} /> Recovered Value
            </div>
            <p className="text-2xl font-bold text-green-400">${stats.recovered_value?.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {[{ key: 'all', label: 'All Carts' }, { key: 'not-recovered', label: 'Pending Recovery' }, { key: 'recovered', label: 'Recovered' }].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Carts List */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-900">
              <th className="text-left p-4 text-gray-400 font-medium">Customer</th>
              <th className="text-left p-4 text-gray-400 font-medium">Cart Value</th>
              <th className="text-left p-4 text-gray-400 font-medium">Items</th>
              <th className="text-left p-4 text-gray-400 font-medium">Last Activity</th>
              <th className="text-left p-4 text-gray-400 font-medium">Emails Sent</th>
              <th className="text-left p-4 text-gray-400 font-medium">Status</th>
              <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {carts.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500">
                  No abandoned carts found in the last 7 days
                </td>
              </tr>
            ) : (
              carts.map((cart) => (
                <tr key={cart.id} className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="p-4">
                    <p className="text-white font-medium">{cart.customer_name || 'Guest'}</p>
                    <p className="text-sm text-gray-500">{cart.customer_email}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-white font-bold">${cart.subtotal?.toFixed(2)}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-gray-300">{cart.items?.length || 0} {(cart.items?.length || 0) === 1 ? 'item' : 'items'}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock size={14} />
                      {formatTimeAgo(cart.last_activity)}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-gray-300">{cart.recovery_emails_sent || 0}</span>
                  </td>
                  <td className="p-4">
                    {cart.recovered ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                        Recovered
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
                        Abandoned
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedCart(cart)}
                        className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {!cart.recovered && (
                        <Button
                          size="sm"
                          onClick={() => sendRecoveryEmail(cart.cart_id, 'reminder')}
                          disabled={sendingEmail === cart.cart_id}
                          className="bg-blue-600 hover:bg-blue-700 text-xs"
                        >
                          {sendingEmail === cart.cart_id ? (
                            'Sending...'
                          ) : (
                            <><Mail size={14} className="mr-1" /> Send Email</>
                          )}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cart Detail Modal */}
      {selectedCart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-lg mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Cart Details</h3>
              <button onClick={() => setSelectedCart(null)} className="text-gray-400 hover:text-white">
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Customer</p>
                <p className="text-white">{selectedCart.customer_name || 'Guest'}</p>
                <p className="text-gray-500 text-sm">{selectedCart.customer_email}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">Items</p>
                <div className="space-y-2">
                  {selectedCart.items?.map((item, i) => (
                    <div key={i} className="flex justify-between bg-gray-900 rounded p-2">
                      <span className="text-white">{item.name} × {item.quantity}</span>
                      <span className="text-gray-400">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between pt-4 border-t border-gray-700">
                <span className="text-gray-400">Total</span>
                <span className="text-xl font-bold text-white">${selectedCart.subtotal?.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                onClick={() => sendRecoveryEmail(selectedCart.cart_id, 'reminder')}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Mail size={16} className="mr-2" /> Send Reminder
              </Button>
              <Button
                onClick={() => sendRecoveryEmail(selectedCart.cart_id, 'discount')}
                variant="outline"
                className="flex-1 border-gray-600"
              >
                <DollarSign size={16} className="mr-2" /> Offer Discount
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantAbandonedCarts;
