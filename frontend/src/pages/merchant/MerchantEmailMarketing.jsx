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
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { 
  Mail, Plus, Search, Send, Eye, Edit, Trash2, Calendar,
  Users, MousePointer, BarChart3, Clock, FileText, Zap,
  RefreshCw, Copy, Check, AlertCircle, Inbox, ArrowRight
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MerchantEmailMarketing() {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [automatedEmails, setAutomatedEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    subject: '',
    preview_text: '',
    content_html: '',
    type: 'newsletter',
    recipient_type: 'all',
    scheduled_at: ''
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'marketing',
    subject: '',
    content_html: ''
  });

  const [automationForm, setAutomationForm] = useState({
    name: '',
    trigger: 'welcome',
    delay_hours: 0,
    subject: '',
    content_html: '',
    is_active: true
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [campaignsRes, templatesRes, automatedRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/marketing/email-campaigns`),
        axios.get(`${BACKEND_URL}/api/marketing/email-templates`),
        axios.get(`${BACKEND_URL}/api/marketing/automated-emails`)
      ]);
      setCampaigns(campaignsRes.data.campaigns || []);
      setTemplates(templatesRes.data.templates || []);
      setAutomatedEmails(automatedRes.data.automated_emails || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveCampaign = async () => {
    try {
      if (editingCampaign) {
        await axios.put(`${BACKEND_URL}/api/marketing/email-campaigns/${editingCampaign.id}`, campaignForm);
      } else {
        await axios.post(`${BACKEND_URL}/api/marketing/email-campaigns`, campaignForm);
      }
      setShowCampaignModal(false);
      setEditingCampaign(null);
      resetCampaignForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save campaign:', error);
      alert(error.response?.data?.detail || 'Failed to save');
    }
  };

  const saveTemplate = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/marketing/email-templates`, templateForm);
      setShowTemplateModal(false);
      setTemplateForm({ name: '', category: 'marketing', subject: '', content_html: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const saveAutomation = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/marketing/automated-emails`, automationForm);
      setShowAutomationModal(false);
      resetAutomationForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save automation:', error);
    }
  };

  const deleteCampaign = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/marketing/email-campaigns/${id}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const resetCampaignForm = () => {
    setCampaignForm({
      name: '',
      subject: '',
      preview_text: '',
      content_html: '',
      type: 'newsletter',
      recipient_type: 'all',
      scheduled_at: ''
    });
  };

  const resetAutomationForm = () => {
    setAutomationForm({
      name: '',
      trigger: 'welcome',
      delay_hours: 0,
      subject: '',
      content_html: '',
      is_active: true
    });
  };

  const openEditCampaign = (campaign) => {
    setEditingCampaign(campaign);
    setCampaignForm({
      name: campaign.name || '',
      subject: campaign.subject || '',
      preview_text: campaign.preview_text || '',
      content_html: campaign.content_html || '',
      type: campaign.type || 'newsletter',
      recipient_type: campaign.recipient_type || 'all',
      scheduled_at: campaign.scheduled_at ? campaign.scheduled_at.slice(0, 16) : ''
    });
    setShowCampaignModal(true);
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'secondary',
      scheduled: 'default',
      sending: 'warning',
      sent: 'success',
      paused: 'destructive'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getTriggerLabel = (trigger) => {
    const labels = {
      welcome: 'Welcome Email',
      abandoned_cart: 'Abandoned Cart',
      order_confirmation: 'Order Confirmation',
      shipping: 'Shipping Update',
      review_request: 'Review Request',
      birthday: 'Birthday',
      win_back: 'Win Back'
    };
    return labels[trigger] || trigger;
  };

  const emailTemplates = [
    {
      id: 'welcome',
      name: 'Welcome Email',
      preview: `<h1>Welcome to {{store_name}}!</h1><p>Thanks for joining us...</p>`
    },
    {
      id: 'abandoned_cart',
      name: 'Abandoned Cart',
      preview: `<h1>You left something behind!</h1><p>Complete your order...</p>`
    },
    {
      id: 'newsletter',
      name: 'Newsletter',
      preview: `<h1>{{headline}}</h1><p>Check out our latest updates...</p>`
    },
    {
      id: 'promotional',
      name: 'Promotional',
      preview: `<h1>{{discount}}% OFF!</h1><p>Limited time offer...</p>`
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-500" />
            Email Marketing
          </h1>
          <p className="text-muted-foreground">Create campaigns and automate customer communications</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAutomationModal(true)}>
            <Zap className="h-4 w-4 mr-2" />
            New Automation
          </Button>
          <Button onClick={() => { resetCampaignForm(); setEditingCampaign(null); setShowCampaignModal(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Campaigns</p>
                <p className="text-2xl font-bold">{campaigns.length}</p>
              </div>
              <Mail className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">
                  {campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0).toLocaleString()}
                </p>
              </div>
              <Send className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Open Rate</p>
                <p className="text-2xl font-bold">
                  {campaigns.length > 0 
                    ? Math.round(campaigns.reduce((sum, c) => {
                        const sent = c.stats?.sent || 0;
                        const opened = c.stats?.opened || 0;
                        return sum + (sent > 0 ? (opened / sent) * 100 : 0);
                      }, 0) / campaigns.length)
                    : 0}%
                </p>
              </div>
              <Eye className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Click Rate</p>
                <p className="text-2xl font-bold">
                  {campaigns.length > 0
                    ? Math.round(campaigns.reduce((sum, c) => {
                        const sent = c.stats?.sent || 0;
                        const clicked = c.stats?.clicked || 0;
                        return sum + (sent > 0 ? (clicked / sent) * 100 : 0);
                      }, 0) / campaigns.length)
                    : 0}%
                </p>
              </div>
              <MousePointer className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Automations</p>
                <p className="text-2xl font-bold">{automatedEmails.filter(a => a.is_active).length}</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : campaigns.length === 0 ? (
                <div className="p-12 text-center">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No campaigns yet</p>
                  <Button onClick={() => setShowCampaignModal(true)}>Create your first campaign</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">Campaign</th>
                        <th className="text-left p-4 font-medium">Type</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-right p-4 font-medium">Sent</th>
                        <th className="text-right p-4 font-medium">Opened</th>
                        <th className="text-right p-4 font-medium">Clicked</th>
                        <th className="text-right p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((campaign) => (
                        <tr key={campaign.id} className="border-t hover:bg-muted/30">
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{campaign.name}</p>
                              <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">{campaign.type}</Badge>
                          </td>
                          <td className="p-4">{getStatusBadge(campaign.status)}</td>
                          <td className="p-4 text-right">{campaign.stats?.sent || 0}</td>
                          <td className="p-4 text-right">
                            {campaign.stats?.opened || 0}
                            <span className="text-muted-foreground text-sm ml-1">
                              ({campaign.stats?.sent > 0 ? Math.round((campaign.stats.opened / campaign.stats.sent) * 100) : 0}%)
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {campaign.stats?.clicked || 0}
                            <span className="text-muted-foreground text-sm ml-1">
                              ({campaign.stats?.sent > 0 ? Math.round((campaign.stats.clicked / campaign.stats.sent) * 100) : 0}%)
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => openEditCampaign(campaign)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteCampaign(campaign.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automations Tab */}
        <TabsContent value="automations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Pre-built automation cards */}
            {[
              { trigger: 'welcome', title: 'Welcome Series', desc: 'Greet new subscribers', icon: Users },
              { trigger: 'abandoned_cart', title: 'Abandoned Cart', desc: 'Recover lost sales', icon: AlertCircle },
              { trigger: 'review_request', title: 'Review Request', desc: 'Ask for product reviews', icon: FileText },
              { trigger: 'birthday', title: 'Birthday Email', desc: 'Celebrate with customers', icon: Calendar },
              { trigger: 'win_back', title: 'Win Back', desc: 'Re-engage inactive customers', icon: RefreshCw },
              { trigger: 'order_confirmation', title: 'Order Confirmation', desc: 'Confirm purchases', icon: Check }
            ].map((auto) => {
              const existing = automatedEmails.find(a => a.trigger === auto.trigger);
              const Icon = auto.icon;
              return (
                <Card key={auto.trigger} className={existing?.is_active ? 'border-green-300 bg-green-50/30' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      {existing && (
                        <Badge variant={existing.is_active ? 'default' : 'secondary'}>
                          {existing.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold">{auto.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{auto.desc}</p>
                    {existing ? (
                      <div className="text-sm text-muted-foreground">
                        <p>{existing.stats?.sent || 0} sent</p>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          setAutomationForm({ ...automationForm, trigger: auto.trigger, name: auto.title });
                          setShowAutomationModal(true);
                        }}
                      >
                        Set Up <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between">
            <h3 className="text-lg font-medium">Email Templates</h3>
            <Button variant="outline" onClick={() => setShowTemplateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {emailTemplates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="aspect-video bg-muted rounded-lg mb-4 p-4 text-xs overflow-hidden">
                    <div dangerouslySetInnerHTML={{ __html: template.preview }} />
                  </div>
                  <h4 className="font-medium">{template.name}</h4>
                  <Button variant="link" size="sm" className="p-0 h-auto mt-2">
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Campaign Modal */}
      <Dialog open={showCampaignModal} onOpenChange={setShowCampaignModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? 'Edit Campaign' : 'Create Email Campaign'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input
                  placeholder="Summer Sale Announcement"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={campaignForm.type}
                  onValueChange={(val) => setCampaignForm({ ...campaignForm, type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                placeholder="🔥 Don't miss our biggest sale of the year!"
                value={campaignForm.subject}
                onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Preview Text</Label>
              <Input
                placeholder="Up to 50% off on selected items..."
                value={campaignForm.preview_text}
                onChange={(e) => setCampaignForm({ ...campaignForm, preview_text: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Email Content (HTML)</Label>
              <Textarea
                rows={10}
                placeholder="<h1>Hello {{customer_name}}</h1>..."
                value={campaignForm.content_html}
                onChange={(e) => setCampaignForm({ ...campaignForm, content_html: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Available variables: {'{{customer_name}}'}, {'{{store_name}}'}, {'{{unsubscribe_link}}'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recipients</Label>
                <Select
                  value={campaignForm.recipient_type}
                  onValueChange={(val) => setCampaignForm({ ...campaignForm, recipient_type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subscribers</SelectItem>
                    <SelectItem value="customers">Customers Only</SelectItem>
                    <SelectItem value="segment">Specific Segment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Schedule (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={campaignForm.scheduled_at}
                  onChange={(e) => setCampaignForm({ ...campaignForm, scheduled_at: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCampaignModal(false)}>Cancel</Button>
            <Button variant="outline" onClick={saveCampaign}>Save as Draft</Button>
            <Button onClick={saveCampaign}>
              {campaignForm.scheduled_at ? 'Schedule' : 'Send Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Automation Modal */}
      <Dialog open={showAutomationModal} onOpenChange={setShowAutomationModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Set Up Email Automation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Automation Name</Label>
              <Input
                value={automationForm.name}
                onChange={(e) => setAutomationForm({ ...automationForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select
                value={automationForm.trigger}
                onValueChange={(val) => setAutomationForm({ ...automationForm, trigger: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome">New Subscriber</SelectItem>
                  <SelectItem value="abandoned_cart">Abandoned Cart</SelectItem>
                  <SelectItem value="order_confirmation">Order Placed</SelectItem>
                  <SelectItem value="shipping">Order Shipped</SelectItem>
                  <SelectItem value="review_request">Order Delivered</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="win_back">Inactive (90 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Delay (hours after trigger)</Label>
              <Input
                type="number"
                value={automationForm.delay_hours}
                onChange={(e) => setAutomationForm({ ...automationForm, delay_hours: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={automationForm.subject}
                onChange={(e) => setAutomationForm({ ...automationForm, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email Content (HTML)</Label>
              <Textarea
                rows={6}
                value={automationForm.content_html}
                onChange={(e) => setAutomationForm({ ...automationForm, content_html: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={automationForm.is_active}
                onCheckedChange={(checked) => setAutomationForm({ ...automationForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAutomationModal(false)}>Cancel</Button>
            <Button onClick={saveAutomation}>Save Automation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Email Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={templateForm.category}
                  onValueChange={(val) => setTemplateForm({ ...templateForm, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="notification">Notification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Default Subject</Label>
              <Input
                value={templateForm.subject}
                onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>HTML Content</Label>
              <Textarea
                rows={8}
                value={templateForm.content_html}
                onChange={(e) => setTemplateForm({ ...templateForm, content_html: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateModal(false)}>Cancel</Button>
            <Button onClick={saveTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
