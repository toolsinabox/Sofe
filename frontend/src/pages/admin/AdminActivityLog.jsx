import React, { useState, useEffect } from 'react';
import {
  Activity, RefreshCw, Search, Filter, Clock, User, Store, Key,
  LogIn, Edit, Trash2, Settings, Shield, Eye, ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminActivityLog = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loginHistory, setLoginHistory] = useState({ admin_logins: [], merchant_logins: [] });
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('activity');

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [logsRes, historyRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/activity-log?limit=100`, { headers }),
        axios.get(`${API_URL}/api/admin/login-history?limit=50`, { headers })
      ]);
      
      setLogs(logsRes.data);
      setLoginHistory(historyRes.data);
    } catch (err) {
      console.error('Error fetching activity log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { // eslint-disable-next-line react-hooks/exhaustive-deps
  
    if (token) fetchData();
  }, [token]);

  const getActionIcon = (action) => {
    switch (action) {
      case 'login': return <LogIn className="w-4 h-4" />;
      case 'update_store': return <Edit className="w-4 h-4" />;
      case 'delete_product': return <Trash2 className="w-4 h-4" />;
      case 'suspend_store': return <Shield className="w-4 h-4" />;
      case 'activate_store': return <Shield className="w-4 h-4" />;
      case 'impersonate': return <Eye className="w-4 h-4" />;
      case 'reset_password': return <Key className="w-4 h-4" />;
      case 'update_settings': return <Settings className="w-4 h-4" />;
      case 'update_feature_flag': return <Settings className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'login': return 'text-emerald-400 bg-emerald-500/20';
      case 'delete_product':
      case 'delete_user': return 'text-red-400 bg-red-500/20';
      case 'suspend_store': return 'text-yellow-400 bg-yellow-500/20';
      case 'activate_store': return 'text-emerald-400 bg-emerald-500/20';
      case 'impersonate': return 'text-purple-400 bg-purple-500/20';
      case 'reset_password': return 'text-orange-400 bg-orange-500/20';
      default: return 'text-cyan-400 bg-cyan-500/20';
    }
  };

  const filteredLogs = actionFilter === 'all' 
    ? logs 
    : logs.filter(log => log.action === actionFilter);

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity Log</h1>
          <p className="text-gray-400">Track all admin actions and login history</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-4">
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'activity'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Activity size={18} />
          Activity Log
        </button>
        <button
          onClick={() => setActiveTab('logins')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'logins'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <LogIn size={18} />
          Login History
        </button>
      </div>

      {/* Activity Log Tab */}
      {activeTab === 'activity' && (
        <Card className="bg-[#151b28] border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Admin Actions
            </CardTitle>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="update_store">Update Store</SelectItem>
                <SelectItem value="suspend_store">Suspend Store</SelectItem>
                <SelectItem value="activate_store">Activate Store</SelectItem>
                <SelectItem value="impersonate">Impersonate</SelectItem>
                <SelectItem value="reset_password">Reset Password</SelectItem>
                <SelectItem value="update_settings">Update Settings</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {filteredLogs.length > 0 ? (
              <div className="space-y-3">
                {filteredLogs.map((log, index) => (
                  <div
                    key={log.id || index}
                    className="flex items-start gap-4 p-4 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium capitalize">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-gray-500 text-sm">
                          by {log.admin_email}
                        </span>
                      </div>
                      {log.details && (
                        <div className="mt-1 text-gray-400 text-sm">
                          {log.details.store_id && (
                            <span className="mr-3">Store: {log.details.store_id.slice(0, 8)}...</span>
                          )}
                          {log.details.owner_email && (
                            <span className="mr-3">Owner: {log.details.owner_email}</span>
                          )}
                          {log.details.flag && (
                            <span>Feature: {log.details.flag} → {log.details.enabled ? 'ON' : 'OFF'}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Clock size={14} />
                      {formatTimeAgo(log.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No activity logs found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Login History Tab */}
      {activeTab === 'logins' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Admin Logins */}
          <Card className="bg-[#151b28] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                Admin Logins
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loginHistory.admin_logins.length > 0 ? (
                <div className="space-y-3">
                  {loginHistory.admin_logins.map((login, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-white text-sm">{login.admin_email}</p>
                          <p className="text-gray-500 text-xs">{login.details?.ip || 'System'}</p>
                        </div>
                      </div>
                      <div className="text-gray-500 text-xs flex items-center gap-1">
                        <Clock size={12} />
                        {formatTimeAgo(login.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No admin logins recorded</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Merchant Logins */}
          <Card className="bg-[#151b28] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-cyan-400" />
                Merchant Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loginHistory.merchant_logins.length > 0 ? (
                <div className="space-y-3">
                  {loginHistory.merchant_logins.slice(0, 20).map((session, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                          <Store className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-white text-sm">{session.owner_id?.slice(0, 8)}...</p>
                          <p className="text-gray-500 text-xs">Store: {session.store_id?.slice(0, 8)}...</p>
                        </div>
                      </div>
                      <div className="text-gray-500 text-xs flex items-center gap-1">
                        <Clock size={12} />
                        {formatTimeAgo(session.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No merchant sessions recorded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#151b28] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <LogIn className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Logins</p>
                <p className="text-xl font-bold text-white">
                  {logs.filter(l => l.action === 'login').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#151b28] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Impersonations</p>
                <p className="text-xl font-bold text-white">
                  {logs.filter(l => l.action === 'impersonate').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#151b28] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Edit className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Store Updates</p>
                <p className="text-xl font-bold text-white">
                  {logs.filter(l => l.action.includes('store')).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#151b28] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Key className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Password Resets</p>
                <p className="text-xl font-bold text-white">
                  {logs.filter(l => l.action === 'reset_password').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminActivityLog;
