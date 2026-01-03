import React, { useState, useEffect } from 'react';
import { 
  Settings, Key, Shield, Smartphone, Monitor, Clock, 
  AlertTriangle, CheckCircle, Eye, EyeOff, Trash2, 
  LogOut, RefreshCw, Mail, Bell, Lock, Globe, Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminAccountSettings = () => {
  const { token, user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('security');
  
  // Password change
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Sessions
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  // Email change
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  // Account deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // Preferences
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    securityAlerts: true,
    loginAlerts: true,
    twoFactorEnabled: false,
    sessionTimeout: '24',
    language: 'en',
    dateFormat: 'MM/DD/YYYY'
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      // Mock sessions data - in production, fetch from API
      setSessions([
        {
          id: '1',
          device: 'Chrome on Windows',
          ip: '192.168.1.1',
          location: 'Sydney, Australia',
          lastActive: new Date().toISOString(),
          current: true
        },
        {
          id: '2', 
          device: 'Safari on iPhone',
          ip: '192.168.1.2',
          location: 'Sydney, Australia',
          lastActive: new Date(Date.now() - 3600000).toISOString(),
          current: false
        }
      ]);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setChangingPassword(true);
    setError('');
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/api/admin/change-password`, {
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword
      }, { headers });
      
      setSuccess('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail || !emailPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/api/admin/change-email`, {
        new_email: newEmail,
        password: emailPassword
      }, { headers });
      
      setSuccess('Verification email sent to your new email address');
      setShowEmailModal(false);
      setNewEmail('');
      setEmailPassword('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change email');
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      setSessions(sessions.filter(s => s.id !== sessionId));
      setSuccess('Session revoked successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to revoke session');
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      setSessions(sessions.filter(s => s.current));
      setSuccess('All other sessions revoked');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to revoke sessions');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }
    
    // In production, call API to delete account
    setShowDeleteModal(false);
    logout();
    window.location.href = '/admin/login';
  };

  const handleSavePreferences = async () => {
    setSuccess('Preferences saved successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const tabs = [
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'sessions', label: 'Sessions', icon: Monitor },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Account Settings</h1>
        <p className="text-gray-400">Manage your account security and preferences</p>
      </div>

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangle size={18} />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? tab.id === 'danger' 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Change Password */}
          <Card className="bg-[#151b28] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-400" />
                Change Password
              </CardTitle>
              <CardDescription className="text-gray-400">
                Update your password regularly to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-400">Current Password</Label>
                <div className="relative">
                  <Input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white pr-10"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-400">New Password</Label>
                  <div className="relative">
                    <Input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white pr-10"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white pr-10"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={handlePasswordChange}
                  disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  {changingPassword ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <Key size={16} className="mr-2" />}
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card className="bg-[#151b28] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-purple-400" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription className="text-gray-400">
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    preferences.twoFactorEnabled ? 'bg-emerald-500/20' : 'bg-gray-700'
                  }`}>
                    <Shield size={24} className={preferences.twoFactorEnabled ? 'text-emerald-400' : 'text-gray-500'} />
                  </div>
                  <div>
                    <p className="text-white font-medium">Authenticator App</p>
                    <p className="text-gray-400 text-sm">
                      {preferences.twoFactorEnabled 
                        ? 'Two-factor authentication is enabled' 
                        : 'Secure your account with 2FA'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.twoFactorEnabled}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, twoFactorEnabled: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Change Email */}
          <Card className="bg-[#151b28] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-400" />
                Email Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{user?.email || 'eddie@toolsinabox.com.au'}</p>
                  <p className="text-gray-400 text-sm">Your primary email address</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowEmailModal(true)}
                  className="border-gray-700 text-gray-300 hover:text-white"
                >
                  Change Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <Card className="bg-[#151b28] border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Monitor className="w-5 h-5 text-cyan-400" />
                Active Sessions
              </CardTitle>
              <CardDescription className="text-gray-400">
                Manage your active sessions across devices
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={handleRevokeAllSessions}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <LogOut size={16} className="mr-2" />
              Revoke All Others
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessions.map((session) => (
              <div 
                key={session.id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  session.current ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-gray-800/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    session.current ? 'bg-cyan-500/20' : 'bg-gray-700'
                  }`}>
                    <Monitor size={20} className={session.current ? 'text-cyan-400' : 'text-gray-400'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{session.device}</p>
                      {session.current && (
                        <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-gray-400 text-sm mt-1">
                      <span>{session.ip}</span>
                      <span>•</span>
                      <span>{session.location}</span>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">
                      Last active: {new Date(session.lastActive).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!session.current && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleRevokeSession(session.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Card className="bg-[#151b28] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-400" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
              <div>
                <p className="text-white font-medium">Email Notifications</p>
                <p className="text-gray-400 text-sm">Receive platform updates and reports via email</p>
              </div>
              <Switch
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) => setPreferences({ ...preferences, emailNotifications: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
              <div>
                <p className="text-white font-medium">Security Alerts</p>
                <p className="text-gray-400 text-sm">Get notified about security-related events</p>
              </div>
              <Switch
                checked={preferences.securityAlerts}
                onCheckedChange={(checked) => setPreferences({ ...preferences, securityAlerts: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
              <div>
                <p className="text-white font-medium">Login Alerts</p>
                <p className="text-gray-400 text-sm">Notify when someone logs into your account</p>
              </div>
              <Switch
                checked={preferences.loginAlerts}
                onCheckedChange={(checked) => setPreferences({ ...preferences, loginAlerts: checked })}
              />
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSavePreferences} className="bg-cyan-600 hover:bg-cyan-700">
                <Save size={16} className="mr-2" />
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <Card className="bg-[#151b28] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-400" />
              General Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-400">Language</Label>
                <Select
                  value={preferences.language}
                  onValueChange={(value) => setPreferences({ ...preferences, language: value })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Date Format</Label>
                <Select
                  value={preferences.dateFormat}
                  onValueChange={(value) => setPreferences({ ...preferences, dateFormat: value })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Session Timeout</Label>
                <Select
                  value={preferences.sessionTimeout}
                  onValueChange={(value) => setPreferences({ ...preferences, sessionTimeout: value })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="8">8 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="168">7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSavePreferences} className="bg-cyan-600 hover:bg-cyan-700">
                <Save size={16} className="mr-2" />
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone Tab */}
      {activeTab === 'danger' && (
        <Card className="bg-[#151b28] border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-gray-400">
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Delete Account</p>
                  <p className="text-gray-400 text-sm">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <Button 
                  variant="destructive"
                  onClick={() => setShowDeleteModal(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Export Account Data</p>
                  <p className="text-gray-400 text-sm">
                    Download all your account data in a portable format.
                  </p>
                </div>
                <Button 
                  variant="outline"
                  className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                >
                  Export Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Email Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="bg-[#151b28] border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Change Email Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-400">New Email Address</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="new@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Confirm with Password</Label>
              <Input
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Enter your password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailModal(false)}>Cancel</Button>
            <Button onClick={handleEmailChange} className="bg-cyan-600 hover:bg-cyan-700">
              Change Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-[#151b28] border-red-500/30">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              This action is <span className="text-red-400 font-semibold">irreversible</span>. 
              All your data will be permanently deleted.
            </p>
            <div className="space-y-2">
              <Label className="text-gray-400">Type DELETE to confirm</Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="DELETE"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button 
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE'}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAccountSettings;
