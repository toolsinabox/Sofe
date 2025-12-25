import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  Activity, Search, Clock, User, Package, ShoppingCart, Users, Tag,
  Edit, Trash2, Plus, Download, LogIn, LogOut, Upload, RefreshCw,
  Filter, Calendar, ChevronLeft, ChevronRight
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MerchantActivityLog() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, by_action: {}, by_resource: {}, recent_24h: 0 });
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = { limit: pageSize, skip: page * pageSize };
      if (actionFilter !== 'all') params.action = actionFilter;
      if (resourceFilter !== 'all') params.resource_type = resourceFilter;
      
      const [logsRes, statsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/activity-log`, { params }),
        axios.get(`${BACKEND_URL}/api/activity-log/stats`)
      ]);
      setLogs(logsRes.data.logs || []);
      setStats(statsRes.data || { total: 0, by_action: {}, by_resource: {}, recent_24h: 0 });
    } catch (error) {
      console.error('Failed to fetch activity log:', error);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, resourceFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const clearOldLogs = async () => {
    if (!window.confirm('Clear activity logs older than 30 days?')) return;
    try {
      const res = await axios.delete(`${BACKEND_URL}/api/activity-log/clear?days_to_keep=30`);
      alert(`Cleared ${res.data.deleted} old log entries`);
      fetchLogs();
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const exportLogs = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/activity-log`, { params: { limit: 10000 } });
      const data = JSON.stringify(res.data.logs, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-log-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const getActionIcon = (action) => {
    const icons = {
      created: <Plus className="w-4 h-4 text-green-600" />,
      updated: <Edit className="w-4 h-4 text-blue-600" />,
      deleted: <Trash2 className="w-4 h-4 text-red-600" />,
      login: <LogIn className="w-4 h-4 text-purple-600" />,
      logout: <LogOut className="w-4 h-4 text-gray-600" />,
      export: <Download className="w-4 h-4 text-orange-600" />,
      import: <Upload className="w-4 h-4 text-teal-600" />
    };
    return icons[action] || <Activity className="w-4 h-4 text-gray-600" />;
  };

  const getResourceIcon = (type) => {
    const icons = {
      product: <Package className="w-4 h-4" />,
      order: <ShoppingCart className="w-4 h-4" />,
      customer: <Users className="w-4 h-4" />,
      coupon: <Tag className="w-4 h-4" />,
      user: <User className="w-4 h-4" />
    };
    return icons[type] || <Activity className="w-4 h-4" />;
  };

  const getActionBadge = (action) => {
    const styles = {
      created: 'bg-green-100 text-green-800',
      updated: 'bg-blue-100 text-blue-800',
      deleted: 'bg-red-100 text-red-800',
      login: 'bg-purple-100 text-purple-800',
      logout: 'bg-gray-100 text-gray-800',
      export: 'bg-orange-100 text-orange-800',
      import: 'bg-teal-100 text-teal-800'
    };
    return <Badge className={styles[action] || 'bg-gray-100'}>{action}</Badge>;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredLogs = logs.filter(log =>
    log.resource_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-500">Track all changes and activities in your store</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={clearOldLogs}>
            <Trash2 className="w-4 h-4 mr-1" /> Clear Old
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.recent_24h}</p>
                <p className="text-sm text-gray-500">Last 24 Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Plus className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.by_action?.created || 0}</p>
                <p className="text-sm text-gray-500">Created</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Edit className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.by_action?.updated || 0}</p>
                <p className="text-sm text-gray-500">Updated</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by resource or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="export">Export</SelectItem>
            <SelectItem value="import">Import</SelectItem>
          </SelectContent>
        </Select>
        <Select value={resourceFilter} onValueChange={(v) => { setResourceFilter(v); setPage(0); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Resource" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Resources</SelectItem>
            <SelectItem value="product">Products</SelectItem>
            <SelectItem value="order">Orders</SelectItem>
            <SelectItem value="customer">Customers</SelectItem>
            <SelectItem value="coupon">Coupons</SelectItem>
            <SelectItem value="user">Users</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activity Log List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No activity logged yet</p>
              <p className="text-sm mt-2">Activities will appear here as you use the platform</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredLogs.map(log => (
                <div key={log.id} className="p-4 hover:bg-gray-50 flex items-start gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                    {getActionIcon(log.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {getActionBadge(log.action)}
                      <Badge variant="outline" className="capitalize">
                        {getResourceIcon(log.resource_type)}
                        <span className="ml-1">{log.resource_type}</span>
                      </Badge>
                    </div>
                    
                    <p className="text-gray-900">
                      <span className="font-medium">{log.user_name || log.user_email || 'System'}</span>
                      {' '}{log.action}{' '}
                      {log.resource_name && (
                        <span className="font-medium">"{log.resource_name}"</span>
                      )}
                    </p>
                    
                    {log.details && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatTime(log.created_at)}
                      </span>
                      {log.ip_address && (
                        <span>IP: {log.ip_address}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        
        {/* Pagination */}
        {stats.total > pageSize && (
          <div className="p-4 border-t flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, stats.total)} of {stats.total}
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={(page + 1) * pageSize >= stats.total}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
