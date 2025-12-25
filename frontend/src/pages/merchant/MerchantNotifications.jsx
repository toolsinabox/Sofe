import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  Bell, CheckCircle, Trash2, ShoppingCart, RotateCcw, Star, Package,
  AlertTriangle, CreditCard, Settings, ExternalLink, Clock, CheckCheck,
  Filter, RefreshCw
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MerchantNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ total: 0, unread: 0, by_type: {} });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter === 'unread') params.is_read = false;
      if (typeFilter !== 'all') params.type = typeFilter;
      
      const [notifRes, statsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/notifications`, { params }),
        axios.get(`${BACKEND_URL}/api/notifications/stats`)
      ]);
      setNotifications(notifRes.data.notifications || []);
      setStats(statsRes.data || { total: 0, unread: 0, by_type: {} });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, typeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await axios.post(`${BACKEND_URL}/api/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/notifications/mark-all-read`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/notifications/${id}`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const clearAllRead = async () => {
    if (!window.confirm('Clear all read notifications?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/notifications/clear-all`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to clear:', error);
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      order: <ShoppingCart className="w-5 h-5 text-blue-600" />,
      return: <RotateCcw className="w-5 h-5 text-orange-600" />,
      review: <Star className="w-5 h-5 text-yellow-600" />,
      stock: <Package className="w-5 h-5 text-purple-600" />,
      payment: <CreditCard className="w-5 h-5 text-green-600" />,
      system: <Settings className="w-5 h-5 text-gray-600" />
    };
    return icons[type] || <Bell className="w-5 h-5 text-gray-600" />;
  };

  const getTypeBgColor = (type) => {
    const colors = {
      order: 'bg-blue-100',
      return: 'bg-orange-100',
      review: 'bg-yellow-100',
      stock: 'bg-purple-100',
      payment: 'bg-green-100',
      system: 'bg-gray-100'
    };
    return colors[type] || 'bg-gray-100';
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      normal: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800'
    };
    if (priority === 'normal' || priority === 'low') return null;
    return <Badge className={styles[priority] || 'bg-gray-100'}>{priority}</Badge>;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'order', label: 'Orders' },
    { value: 'return', label: 'Returns' },
    { value: 'review', label: 'Reviews' },
    { value: 'stock', label: 'Stock' },
    { value: 'payment', label: 'Payments' },
    { value: 'system', label: 'System' }
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500">Stay updated with your store activities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchNotifications}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          {stats.unread > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-1" /> Mark All Read
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={clearAllRead}>
            <Trash2 className="w-4 h-4 mr-1" /> Clear Read
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.unread}</p>
                <p className="text-sm text-gray-500">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.by_type?.order || 0}</p>
                <p className="text-sm text-gray-500">Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.by_type?.review || 0}</p>
                <p className="text-sm text-gray-500">Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Tabs value={filter} onValueChange={setFilter} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {stats.unread > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {stats.unread}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex gap-1 ml-auto">
          {typeOptions.map(opt => (
            <Button
              key={opt.value}
              variant={typeFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter(opt.value)}
              className="text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No notifications</p>
              <p className="text-sm mt-2">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notif => (
                <div 
                  key={notif.id} 
                  className={`p-4 hover:bg-gray-50 flex items-start gap-4 ${!notif.is_read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className={`p-2 rounded-lg flex-shrink-0 ${getTypeBgColor(notif.type)}`}>
                    {getTypeIcon(notif.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium ${!notif.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notif.title}
                      </span>
                      {!notif.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                      {getPriorityBadge(notif.priority)}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{notif.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatTime(notif.created_at)}
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">{notif.type}</Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {notif.link && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={notif.link}>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    {!notif.is_read && (
                      <Button variant="ghost" size="sm" onClick={() => markAsRead(notif.id)}>
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700"
                      onClick={() => deleteNotification(notif.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
