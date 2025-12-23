import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Progress } from '../../components/ui/progress';
import { 
  Crown, Star, Users, Gift, TrendingUp, Settings, Plus, Edit, Trash2,
  Award, Sparkles, Zap, Target, Heart, ChevronRight, Search
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MerchantLoyalty() {
  const [activeTab, setActiveTab] = useState('overview');
  const [settings, setSettings] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [tierForm, setTierForm] = useState({
    name: '',
    min_points: 0,
    max_points: '',
    points_multiplier: 1.0,
    discount_percentage: 0,
    free_shipping: false,
    priority_support: false,
    exclusive_access: false,
    birthday_bonus: 0,
    color: '#6B7280'
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsRes, customersRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/marketing/loyalty/settings`),
        axios.get(`${BACKEND_URL}/api/marketing/loyalty/customers`)
      ]);
      setSettings(settingsRes.data);
      setCustomers(customersRes.data.customers || []);
    } catch (error) {
      console.error('Failed to fetch loyalty data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateSettings = async (updates) => {
    try {
      await axios.put(`${BACKEND_URL}/api/marketing/loyalty/settings`, updates);
      fetchData();
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const saveTier = async () => {
    try {
      const tiers = [...(settings?.tiers || [])];
      if (editingTier) {
        const index = tiers.findIndex(t => t.id === editingTier.id);
        if (index >= 0) {
          tiers[index] = { ...editingTier, ...tierForm };
        }
      } else {
        tiers.push({ id: crypto.randomUUID(), ...tierForm });
      }
      
      await updateSettings({ tiers });
      setShowTierModal(false);
      setEditingTier(null);
      resetTierForm();
    } catch (error) {
      console.error('Failed to save tier:', error);
    }
  };

  const deleteTier = async (tierId) => {
    if (!window.confirm('Delete this tier?')) return;
    const tiers = settings.tiers.filter(t => t.id !== tierId);
    await updateSettings({ tiers });
  };

  const resetTierForm = () => {
    setTierForm({
      name: '',
      min_points: 0,
      max_points: '',
      points_multiplier: 1.0,
      discount_percentage: 0,
      free_shipping: false,
      priority_support: false,
      exclusive_access: false,
      birthday_bonus: 0,
      color: '#6B7280'
    });
  };

  const openEditTier = (tier) => {
    setEditingTier(tier);
    setTierForm({
      name: tier.name || '',
      min_points: tier.min_points || 0,
      max_points: tier.max_points || '',
      points_multiplier: tier.points_multiplier || 1.0,
      discount_percentage: tier.discount_percentage || 0,
      free_shipping: tier.free_shipping || false,
      priority_support: tier.priority_support || false,
      exclusive_access: tier.exclusive_access || false,
      birthday_bonus: tier.birthday_bonus || 0,
      color: tier.color || '#6B7280'
    });
    setShowTierModal(true);
  };

  const adjustPoints = async (customerId, points, type, description) => {
    try {
      await axios.post(`${BACKEND_URL}/api/marketing/loyalty/points/add`, null, {
        params: { customer_id: customerId, points, type, description }
      });
      fetchData();
    } catch (error) {
      console.error('Failed to adjust points:', error);
    }
  };

  const getTierByPoints = (points) => {
    if (!settings?.tiers?.length) return null;
    const sortedTiers = [...settings.tiers].sort((a, b) => b.min_points - a.min_points);
    return sortedTiers.find(t => points >= t.min_points) || null;
  };

  const filteredCustomers = customers.filter(c => 
    c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading loyalty program...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-yellow-500" />
            Loyalty Program
          </h1>
          <p className="text-muted-foreground">Reward your best customers and increase retention</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSettingsModal(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={() => { resetTierForm(); setEditingTier(null); setShowTierModal(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tier
          </Button>
        </div>
      </div>

      {/* Program Status */}
      <Card className={settings?.is_enabled ? 'border-green-200 bg-green-50/50' : 'border-orange-200 bg-orange-50/50'}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${settings?.is_enabled ? 'bg-green-100' : 'bg-orange-100'}`}>
                {settings?.is_enabled ? <Sparkles className="h-5 w-5 text-green-600" /> : <Settings className="h-5 w-5 text-orange-600" />}
              </div>
              <div>
                <p className="font-medium">{settings?.program_name || 'Rewards Program'}</p>
                <p className="text-sm text-muted-foreground">
                  {settings?.is_enabled ? 'Program is active' : 'Program is currently disabled'}
                </p>
              </div>
            </div>
            <Switch
              checked={settings?.is_enabled}
              onCheckedChange={(checked) => updateSettings({ is_enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Points Issued</p>
                <p className="text-2xl font-bold">
                  {customers.reduce((sum, c) => sum + (c.lifetime_points || 0), 0).toLocaleString()}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Points</p>
                <p className="text-2xl font-bold">
                  {customers.reduce((sum, c) => sum + (c.available_points || 0), 0).toLocaleString()}
                </p>
              </div>
              <Gift className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Points Value</p>
                <p className="text-2xl font-bold">
                  ${((customers.reduce((sum, c) => sum + (c.available_points || 0), 0)) * (settings?.points_value || 0.01)).toFixed(2)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tiers">Tiers</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Earning Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Earning Rules
              </CardTitle>
              <CardDescription>How customers earn points</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Points per $1 spent</p>
                  <p className="text-2xl font-bold">{settings?.points_per_dollar || 1}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Sign-up Bonus</p>
                  <p className="text-2xl font-bold">{settings?.signup_bonus || 0}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Referral Bonus</p>
                  <p className="text-2xl font-bold">{settings?.referral_bonus || 0}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Review Bonus</p>
                  <p className="text-2xl font-bold">{settings?.review_bonus || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Redemption Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Redemption Rules
              </CardTitle>
              <CardDescription>How customers can use their points</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Point Value</p>
                  <p className="text-2xl font-bold">${settings?.points_value || 0.01}</p>
                  <p className="text-xs text-muted-foreground">per point</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Min. Redemption</p>
                  <p className="text-2xl font-bold">{settings?.min_points_redeem || 100}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Points Expiry</p>
                  <p className="text-2xl font-bold">{settings?.points_expiry_days || 'Never'}</p>
                  <p className="text-xs text-muted-foreground">{settings?.points_expiry_days ? 'days' : ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4">
          {settings?.tiers?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Crown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No tiers configured yet</p>
                <Button onClick={() => setShowTierModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Tier
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {settings?.tiers?.sort((a, b) => a.min_points - b.min_points).map((tier, index) => (
                <Card key={tier.id} className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: tier.color }} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" style={{ color: tier.color }} />
                        {tier.name}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditTier(tier)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteTier(tier.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      {tier.min_points.toLocaleString()}+ points
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {tier.points_multiplier > 1 && (
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          <span>{tier.points_multiplier}x points earning</span>
                        </div>
                      )}
                      {tier.discount_percentage > 0 && (
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-blue-500" />
                          <span>{tier.discount_percentage}% automatic discount</span>
                        </div>
                      )}
                      {tier.free_shipping && (
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-green-500" />
                          <span>Free shipping</span>
                        </div>
                      )}
                      {tier.birthday_bonus > 0 && (
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-pink-500" />
                          <span>{tier.birthday_bonus} birthday bonus points</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Program Members</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No members found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Customer</th>
                        <th className="text-left p-3 font-medium">Tier</th>
                        <th className="text-right p-3 font-medium">Available Points</th>
                        <th className="text-right p-3 font-medium">Lifetime Points</th>
                        <th className="text-left p-3 font-medium">Referral Code</th>
                        <th className="text-right p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => {
                        const tier = getTierByPoints(customer.available_points || 0);
                        return (
                          <tr key={customer.id} className="border-b hover:bg-muted/30">
                            <td className="p-3">
                              <div>
                                <p className="font-medium">{customer.customer_name || 'Unknown'}</p>
                                <p className="text-sm text-muted-foreground">{customer.customer_email}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              {tier ? (
                                <Badge style={{ backgroundColor: tier.color, color: 'white' }}>
                                  {tier.name}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">No Tier</Badge>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono">
                              {(customer.available_points || 0).toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-mono text-muted-foreground">
                              {(customer.lifetime_points || 0).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <code className="bg-muted px-2 py-1 rounded text-xs">
                                {customer.referral_code}
                              </code>
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const points = prompt('Enter points to add (negative to subtract):');
                                  if (points) {
                                    adjustPoints(customer.customer_id, parseInt(points), 'adjustment', 'Manual adjustment');
                                  }
                                }}
                              >
                                Adjust Points
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tier Modal */}
      <Dialog open={showTierModal} onOpenChange={setShowTierModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTier ? 'Edit Tier' : 'Create New Tier'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tier Name</Label>
                <Input
                  placeholder="e.g., Gold"
                  value={tierForm.name}
                  onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  type="color"
                  value={tierForm.color}
                  onChange={(e) => setTierForm({ ...tierForm, color: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum Points</Label>
                <Input
                  type="number"
                  value={tierForm.min_points}
                  onChange={(e) => setTierForm({ ...tierForm, min_points: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Points Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={tierForm.points_multiplier}
                  onChange={(e) => setTierForm({ ...tierForm, points_multiplier: parseFloat(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Automatic Discount %</Label>
                <Input
                  type="number"
                  value={tierForm.discount_percentage}
                  onChange={(e) => setTierForm({ ...tierForm, discount_percentage: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Birthday Bonus Points</Label>
                <Input
                  type="number"
                  value={tierForm.birthday_bonus}
                  onChange={(e) => setTierForm({ ...tierForm, birthday_bonus: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Free Shipping</Label>
                <Switch
                  checked={tierForm.free_shipping}
                  onCheckedChange={(checked) => setTierForm({ ...tierForm, free_shipping: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Priority Support</Label>
                <Switch
                  checked={tierForm.priority_support}
                  onCheckedChange={(checked) => setTierForm({ ...tierForm, priority_support: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Exclusive Access</Label>
                <Switch
                  checked={tierForm.exclusive_access}
                  onCheckedChange={(checked) => setTierForm({ ...tierForm, exclusive_access: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTierModal(false)}>Cancel</Button>
            <Button onClick={saveTier}>{editingTier ? 'Update' : 'Create'} Tier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Loyalty Program Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Program Name</Label>
              <Input
                value={settings?.program_name || ''}
                onChange={(e) => setSettings({ ...settings, program_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Points per $1 Spent</Label>
                <Input
                  type="number"
                  value={settings?.points_per_dollar || 1}
                  onChange={(e) => setSettings({ ...settings, points_per_dollar: parseFloat(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Point Value ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings?.points_value || 0.01}
                  onChange={(e) => setSettings({ ...settings, points_value: parseFloat(e.target.value) || 0.01 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Points to Redeem</Label>
                <Input
                  type="number"
                  value={settings?.min_points_redeem || 100}
                  onChange={(e) => setSettings({ ...settings, min_points_redeem: parseInt(e.target.value) || 100 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Points Expiry (days)</Label>
                <Input
                  type="number"
                  placeholder="Never"
                  value={settings?.points_expiry_days || ''}
                  onChange={(e) => setSettings({ ...settings, points_expiry_days: parseInt(e.target.value) || null })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Signup Bonus</Label>
                <Input
                  type="number"
                  value={settings?.signup_bonus || 0}
                  onChange={(e) => setSettings({ ...settings, signup_bonus: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Review Bonus</Label>
                <Input
                  type="number"
                  value={settings?.review_bonus || 0}
                  onChange={(e) => setSettings({ ...settings, review_bonus: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Referral Bonus (Referrer)</Label>
                <Input
                  type="number"
                  value={settings?.referral_bonus || 0}
                  onChange={(e) => setSettings({ ...settings, referral_bonus: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Referral Bonus (New Customer)</Label>
                <Input
                  type="number"
                  value={settings?.referee_bonus || 0}
                  onChange={(e) => setSettings({ ...settings, referee_bonus: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsModal(false)}>Cancel</Button>
            <Button onClick={() => { updateSettings(settings); setShowSettingsModal(false); }}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
