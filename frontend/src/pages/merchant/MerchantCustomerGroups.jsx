import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { 
  Users2, Plus, Search, Edit, Trash2, UserPlus, DollarSign,
  Truck, Percent, Star, Shield, Crown, Tag
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MerchantCustomerGroups() {
  const [groups, setGroups] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_percentage: 0,
    free_shipping: false,
    free_shipping_threshold: '',
    tax_exempt: false,
    wholesale_pricing: false,
    priority_support: false,
    color: '#6B7280'
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [groupsRes, customersRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/customer-management/groups`),
        axios.get(`${BACKEND_URL}/api/customers`)
      ]);
      setGroups(groupsRes.data.groups || []);
      setCustomers(customersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveGroup = async () => {
    try {
      if (editingGroup) {
        await axios.put(`${BACKEND_URL}/api/customer-management/groups/${editingGroup.id}`, formData);
      } else {
        await axios.post(`${BACKEND_URL}/api/customer-management/groups`, formData);
      }
      setShowModal(false);
      setEditingGroup(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save group:', error);
      alert(error.response?.data?.detail || 'Failed to save');
    }
  };

  const deleteGroup = async (id) => {
    if (!window.confirm('Delete this group? Members will be removed from the group.')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/customer-management/groups/${id}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const assignCustomers = async (customerIds) => {
    try {
      await axios.post(`${BACKEND_URL}/api/customer-management/groups/${selectedGroup.id}/members`, customerIds);
      fetchData();
      setShowAssignModal(false);
    } catch (error) {
      console.error('Failed to assign:', error);
    }
  };

  const removeFromGroup = async (groupId, customerId) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/customer-management/groups/${groupId}/members/${customerId}`);
      fetchData();
    } catch (error) {
      console.error('Failed to remove:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      discount_percentage: 0,
      free_shipping: false,
      free_shipping_threshold: '',
      tax_exempt: false,
      wholesale_pricing: false,
      priority_support: false,
      color: '#6B7280'
    });
  };

  const openEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name || '',
      description: group.description || '',
      discount_percentage: group.discount_percentage || 0,
      free_shipping: group.free_shipping || false,
      free_shipping_threshold: group.free_shipping_threshold || '',
      tax_exempt: group.tax_exempt || false,
      wholesale_pricing: group.wholesale_pricing || false,
      priority_support: group.priority_support || false,
      color: group.color || '#6B7280'
    });
    setShowModal(true);
  };

  const openAssign = (group) => {
    setSelectedGroup(group);
    setShowAssignModal(true);
  };

  const getGroupBenefits = (group) => {
    const benefits = [];
    if (group.discount_percentage > 0) benefits.push(`${group.discount_percentage}% discount`);
    if (group.free_shipping) benefits.push('Free shipping');
    if (group.tax_exempt) benefits.push('Tax exempt');
    if (group.wholesale_pricing) benefits.push('Wholesale pricing');
    if (group.priority_support) benefits.push('Priority support');
    return benefits;
  };

  const presetGroups = [
    { name: 'VIP Customers', color: '#F59E0B', icon: Crown, discount: 15, freeShipping: true },
    { name: 'Wholesale', color: '#3B82F6', icon: Tag, discount: 20, wholesale: true },
    { name: 'Premium Members', color: '#8B5CF6', icon: Star, discount: 10, priority: true },
    { name: 'Tax Exempt', color: '#10B981', icon: Shield, discount: 0, taxExempt: true }
  ];

  const unassignedCustomers = customers.filter(c => 
    !c.group_id && c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users2 className="h-6 w-6 text-purple-500" />
            Customer Groups
          </h1>
          <p className="text-muted-foreground">Segment customers and offer group-specific pricing</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingGroup(null); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Groups</p>
                <p className="text-2xl font-bold">{groups.length}</p>
              </div>
              <Users2 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold">{groups.reduce((sum, g) => sum + (g.member_count || 0), 0)}</p>
              </div>
              <UserPlus className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Groups with Discount</p>
                <p className="text-2xl font-bold">{groups.filter(g => g.discount_percentage > 0).length}</p>
              </div>
              <Percent className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Free Shipping Groups</p>
                <p className="text-2xl font-bold">{groups.filter(g => g.free_shipping).length}</p>
              </div>
              <Truck className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Create */}
      {groups.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>Create a customer group from these presets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {presetGroups.map((preset) => {
                const Icon = preset.icon;
                return (
                  <div
                    key={preset.name}
                    className="p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setFormData({
                        name: preset.name,
                        description: '',
                        discount_percentage: preset.discount,
                        free_shipping: preset.freeShipping || false,
                        free_shipping_threshold: '',
                        tax_exempt: preset.taxExempt || false,
                        wholesale_pricing: preset.wholesale || false,
                        priority_support: preset.priority || false,
                        color: preset.color
                      });
                      setShowModal(true);
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: preset.color + '20' }}>
                        <Icon className="h-5 w-5" style={{ color: preset.color }} />
                      </div>
                      <span className="font-medium">{preset.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {preset.discount > 0 && `${preset.discount}% off`}
                      {preset.freeShipping && 'Free shipping'}
                      {preset.wholesale && 'Wholesale pricing'}
                      {preset.taxExempt && 'Tax exempt'}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Groups Grid */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : groups.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => {
            const benefits = getGroupBenefits(group);
            return (
              <Card key={group.id} className="overflow-hidden">
                <div className="h-2" style={{ backgroundColor: group.color }} />
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{group.name}</h3>
                      {group.description && (
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      )}
                    </div>
                    <Badge variant="outline">{group.member_count || 0} members</Badge>
                  </div>

                  {benefits.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {benefits.map((benefit, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                          {benefit}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openAssign(group)}>
                      <UserPlus className="h-4 w-4 mr-1" /> Add Members
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(group)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteGroup(group.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit Group' : 'Create Customer Group'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Group Name</Label>
                <Input
                  placeholder="e.g., VIP Customers"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Automatic Discount (%)</Label>
              <Input
                type="number"
                value={formData.discount_percentage}
                onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">Applied automatically at checkout</p>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Free Shipping</Label>
                  <p className="text-sm text-muted-foreground">No shipping charges for this group</p>
                </div>
                <Switch
                  checked={formData.free_shipping}
                  onCheckedChange={(checked) => setFormData({ ...formData, free_shipping: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Tax Exempt</Label>
                  <p className="text-sm text-muted-foreground">No tax charged at checkout</p>
                </div>
                <Switch
                  checked={formData.tax_exempt}
                  onCheckedChange={(checked) => setFormData({ ...formData, tax_exempt: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Wholesale Pricing</Label>
                  <p className="text-sm text-muted-foreground">Show wholesale prices to this group</p>
                </div>
                <Switch
                  checked={formData.wholesale_pricing}
                  onCheckedChange={(checked) => setFormData({ ...formData, wholesale_pricing: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Priority Support</Label>
                  <p className="text-sm text-muted-foreground">Mark as priority in support queue</p>
                </div>
                <Switch
                  checked={formData.priority_support}
                  onCheckedChange={(checked) => setFormData({ ...formData, priority_support: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={saveGroup}>{editingGroup ? 'Update' : 'Create'} Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Members Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Members to {selectedGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {unassignedCustomers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No unassigned customers found</p>
              ) : (
                unassignedCustomers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{customer.name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{customer.email}</p>
                    </div>
                    <Button size="sm" onClick={() => assignCustomers([customer.id])}>
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
