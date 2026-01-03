import React, { useState, useEffect } from 'react';
import {
  Settings, Bell, Shield, Globe, Mail, CreditCard, Save, RefreshCw,
  Toggle, AlertTriangle, Check, X, Info, Megaphone, Trash2, Plus, Edit
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminSettings = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const [featureFlags, setFeatureFlags] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [activeTab, setActiveTab] = useState('general');
  
  // Announcement modal
  const [announcementModal, setAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    type: 'info',
    active: true
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [settingsRes, flagsRes, announcementsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/settings`, { headers }),
        axios.get(`${API_URL}/api/admin/feature-flags`, { headers }),
        axios.get(`${API_URL}/api/admin/announcements`, { headers })
      ]);
      
      setSettings(settingsRes.data);
      setFeatureFlags(flagsRes.data);
      setAnnouncements(announcementsRes.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/api/admin/settings`, settings, { headers });
      alert('Settings saved successfully!');
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatureFlag = async (flagName, enabled) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/api/admin/feature-flags/${flagName}`, {
        feature_name: flagName,
        enabled
      }, { headers });
      
      setFeatureFlags(prev => prev.map(f => 
        f.name === flagName ? { ...f, enabled } : f
      ));
    } catch (err) {
      alert('Failed to update feature flag');
    }
  };

  const saveAnnouncement = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (editingAnnouncement) {
        await axios.put(`${API_URL}/api/admin/announcements/${editingAnnouncement.id}`, announcementForm, { headers });
      } else {
        await axios.post(`${API_URL}/api/admin/announcements`, announcementForm, { headers });
      }
      setAnnouncementModal(false);
      setEditingAnnouncement(null);
      setAnnouncementForm({ title: '', message: '', type: 'info', active: true });
      fetchData();
    } catch (err) {
      alert('Failed to save announcement');
    }
  };

  const deleteAnnouncement = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/api/admin/announcements/${id}`, { headers });
      fetchData();
    } catch (err) {
      alert('Failed to delete announcement');
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'features', label: 'Feature Flags', icon: Toggle },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'security', label: 'Security', icon: Shield },
  ];

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
          <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
          <p className="text-gray-400">Configure your platform settings and features</p>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-[#151b28] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                Platform Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-400">Platform Name</Label>
                <Input
                  value={settings.platform_name || ''}
                  onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-400">Support Email</Label>
                <Input
                  value={settings.support_email || ''}
                  onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-400">Default Currency</Label>
                <Select
                  value={settings.default_currency || 'USD'}
                  onValueChange={(value) => setSettings({ ...settings, default_currency: value })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="AUD">AUD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#151b28] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-400" />
                Subscription Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-400">Default Plan</Label>
                <Select
                  value={settings.default_plan || 'free'}
                  onValueChange={(value) => setSettings({ ...settings, default_plan: value })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter ($29/mo)</SelectItem>
                    <SelectItem value="professional">Professional ($79/mo)</SelectItem>
                    <SelectItem value="enterprise">Enterprise ($299/mo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-400">Trial Period (days)</Label>
                <Input
                  type="number"
                  value={settings.trial_days || 14}
                  onChange={(e) => setSettings({ ...settings, trial_days: parseInt(e.target.value) })}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-400">Max Stores per User</Label>
                <Input
                  type="number"
                  value={settings.max_stores_per_user || 5}
                  onChange={(e) => setSettings({ ...settings, max_stores_per_user: parseInt(e.target.value) })}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#151b28] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                Access Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Allow New Signups</p>
                  <p className="text-gray-500 text-sm">Enable/disable new store registrations</p>
                </div>
                <Switch
                  checked={settings.allow_signups}
                  onCheckedChange={(checked) => setSettings({ ...settings, allow_signups: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Require Email Verification</p>
                  <p className="text-gray-500 text-sm">Users must verify email before access</p>
                </div>
                <Switch
                  checked={settings.require_email_verification}
                  onCheckedChange={(checked) => setSettings({ ...settings, require_email_verification: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Maintenance Mode</p>
                  <p className="text-gray-500 text-sm">Show maintenance page to all users</p>
                </div>
                <Switch
                  checked={settings.maintenance_mode}
                  onCheckedChange={(checked) => setSettings({ ...settings, maintenance_mode: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#151b28] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-400" />
                Integration Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="text-white">Email (Resend)</span>
                </div>
                {settings.smtp_configured ? (
                  <span className="flex items-center gap-1 text-emerald-400 text-sm">
                    <Check size={16} /> Configured
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-yellow-400 text-sm">
                    <AlertTriangle size={16} /> Not Configured
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <span className="text-white">Stripe Payments</span>
                </div>
                {settings.stripe_configured ? (
                  <span className="flex items-center gap-1 text-emerald-400 text-sm">
                    <Check size={16} /> Configured
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-yellow-400 text-sm">
                    <AlertTriangle size={16} /> Not Configured
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feature Flags */}
      {activeTab === 'features' && (
        <Card className="bg-[#151b28] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Feature Flags</CardTitle>
            <CardDescription className="text-gray-400">
              Enable or disable platform features globally
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {featureFlags.map(flag => (
                <div key={flag.name} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                  <div>
                    <p className="text-white font-medium capitalize">{flag.name.replace(/_/g, ' ')}</p>
                    <p className="text-gray-500 text-sm">{flag.description}</p>
                  </div>
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={(checked) => toggleFeatureFlag(flag.name, checked)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Announcements */}
      {activeTab === 'announcements' && (
        <Card className="bg-[#151b28] border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">Platform Announcements</CardTitle>
              <CardDescription className="text-gray-400">
                Create announcements visible to all merchants
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setEditingAnnouncement(null);
                setAnnouncementForm({ title: '', message: '', type: 'info', active: true });
                setAnnouncementModal(true);
              }}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Announcement
            </Button>
          </CardHeader>
          <CardContent>
            {announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.map(announcement => (
                  <div
                    key={announcement.id}
                    className={`p-4 rounded-lg border ${
                      announcement.type === 'warning' ? 'border-yellow-500/30 bg-yellow-500/10' :
                      announcement.type === 'error' ? 'border-red-500/30 bg-red-500/10' :
                      announcement.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10' :
                      'border-blue-500/30 bg-blue-500/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Info className={`w-5 h-5 mt-0.5 ${
                          announcement.type === 'warning' ? 'text-yellow-400' :
                          announcement.type === 'error' ? 'text-red-400' :
                          announcement.type === 'success' ? 'text-emerald-400' :
                          'text-blue-400'
                        }`} />
                        <div>
                          <h4 className="text-white font-medium">{announcement.title}</h4>
                          <p className="text-gray-400 text-sm mt-1">{announcement.message}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              announcement.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {announcement.active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-gray-500 text-xs">
                              Created {new Date(announcement.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingAnnouncement(announcement);
                            setAnnouncementForm(announcement);
                            setAnnouncementModal(true);
                          }}
                          className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => deleteAnnouncement(announcement.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No announcements yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card className="bg-[#151b28] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-400" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Check className="w-6 h-6 text-emerald-400" />
                <div>
                  <p className="text-white font-medium">Exclusive Admin Access</p>
                  <p className="text-gray-400 text-sm">Only eddie@toolsinabox.com.au has admin access</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-white font-medium">Admin Account</h3>
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">eddie@toolsinabox.com.au</p>
                    <p className="text-gray-500 text-sm">Super Admin • Platform Owner</p>
                  </div>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                    Exclusive Access
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-800/30 rounded-lg">
              <h4 className="text-white font-medium mb-2">Security Features</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-400" />
                  JWT token authentication
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-400" />
                  bcrypt password hashing
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-400" />
                  Activity logging enabled
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-400" />
                  Store data isolation
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Announcement Modal */}
      <Dialog open={announcementModal} onOpenChange={setAnnouncementModal}>
        <DialogContent className="bg-[#151b28] border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-400">Title</Label>
              <Input
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-400">Message</Label>
              <Textarea
                value={announcementForm.message}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white mt-1"
                rows={4}
              />
            </div>
            <div>
              <Label className="text-gray-400">Type</Label>
              <Select
                value={announcementForm.type}
                onValueChange={(value) => setAnnouncementForm({ ...announcementForm, type: value })}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={announcementForm.active}
                onCheckedChange={(checked) => setAnnouncementForm({ ...announcementForm, active: checked })}
              />
              <Label className="text-gray-400">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnouncementModal(false)}>Cancel</Button>
            <Button onClick={saveAnnouncement} className="bg-cyan-600 hover:bg-cyan-700">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSettings;
