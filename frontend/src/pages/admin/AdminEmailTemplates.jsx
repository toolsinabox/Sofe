import React, { useState, useEffect } from 'react';
import {
  Mail, Plus, Edit, Trash2, Eye, Save, RefreshCw, Copy, Check,
  FileText, Send, AlertTriangle, CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
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

const defaultTemplates = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome to {{store_name}}!',
    description: 'Sent when a new customer registers',
    category: 'customer',
    body: `Hi {{customer_name}},

Welcome to {{store_name}}! We're thrilled to have you as part of our community.

Start exploring our products and find something special for you.

Best regards,
The {{store_name}} Team`
  },
  {
    id: 'order_confirmation',
    name: 'Order Confirmation',
    subject: 'Your Order #{{order_number}} has been confirmed',
    description: 'Sent when an order is placed',
    category: 'order',
    body: `Hi {{customer_name}},

Thank you for your order! Here's a summary:

Order Number: {{order_number}}
Total: {{order_total}}

We'll notify you when your order ships.

Best regards,
The {{store_name}} Team`
  },
  {
    id: 'order_shipped',
    name: 'Order Shipped',
    subject: 'Your Order #{{order_number}} has been shipped!',
    description: 'Sent when an order is shipped',
    category: 'order',
    body: `Hi {{customer_name}},

Great news! Your order #{{order_number}} has been shipped.

Tracking Number: {{tracking_number}}
Carrier: {{carrier}}

Best regards,
The {{store_name}} Team`
  },
  {
    id: 'password_reset',
    name: 'Password Reset',
    subject: 'Reset your password for {{store_name}}',
    description: 'Sent when password reset is requested',
    category: 'account',
    body: `Hi {{customer_name}},

You requested to reset your password. Click the link below:

{{reset_link}}

If you didn't request this, please ignore this email.

Best regards,
The {{store_name}} Team`
  },
  {
    id: 'abandoned_cart',
    name: 'Abandoned Cart Reminder',
    subject: "Don't forget your items at {{store_name}}!",
    description: 'Sent to remind customers about abandoned carts',
    category: 'marketing',
    body: `Hi {{customer_name}},

You left some items in your cart. Don't miss out!

{{cart_items}}

Complete your purchase now and get {{discount_code}} for 10% off!

Best regards,
The {{store_name}} Team`
  }
];

const AdminEmailTemplates = () => {
  const { token } = useAuth();
  const [templates, setTemplates] = useState(defaultTemplates);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const [editForm, setEditForm] = useState({
    name: '',
    subject: '',
    body: '',
    category: 'customer'
  });

  const categories = [
    { id: 'customer', label: 'Customer', color: 'bg-blue-500' },
    { id: 'order', label: 'Order', color: 'bg-green-500' },
    { id: 'account', label: 'Account', color: 'bg-purple-500' },
    { id: 'marketing', label: 'Marketing', color: 'bg-orange-500' }
  ];

  const filteredTemplates = categoryFilter === 'all'
    ? templates
    : templates.filter(t => t.category === categoryFilter);

  const handleEdit = (template) => {
    setSelectedTemplate(template);
    setEditForm({
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category
    });
    setEditMode(true);
  };

  const handlePreview = (template) => {
    setSelectedTemplate(template);
    setPreviewMode(true);
  };

  const handleSave = () => {
    setSaving(true);
    
    // Update template in local state (in production, save to backend)
    setTimeout(() => {
      setTemplates(prev => prev.map(t => 
        t.id === selectedTemplate.id
          ? { ...t, ...editForm }
          : t
      ));
      setSaving(false);
      setEditMode(false);
      setSuccess('Template saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    }, 500);
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const getCategoryColor = (category) => {
    return categories.find(c => c.id === category)?.color || 'bg-gray-500';
  };

  // Parse template with sample data for preview
  const parseTemplate = (template) => {
    const sampleData = {
      store_name: 'My Awesome Store',
      customer_name: 'John Smith',
      order_number: 'ORD-12345',
      order_total: '$149.99',
      tracking_number: 'TRK123456789',
      carrier: 'FedEx',
      reset_link: 'https://example.com/reset/abc123',
      cart_items: '• Product 1 - $49.99\n• Product 2 - $79.99',
      discount_code: 'SAVE10'
    };
    
    let result = template;
    Object.entries(sampleData).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Email Templates</h1>
          <p className="text-gray-400">Customize email templates for your platform</p>
        </div>
        <Button className="bg-cyan-600 hover:bg-cyan-700">
          <Plus size={16} className="mr-2" />
          New Template
        </Button>
      </div>

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            categoryFilter === 'all'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          All Templates
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              categoryFilter === cat.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map(template => (
          <Card key={template.id} className="bg-[#151b28] border-gray-800 hover:border-gray-700 transition-all">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${getCategoryColor(template.category)}/20 flex items-center justify-center`}>
                    <Mail size={20} className={`${getCategoryColor(template.category).replace('bg-', 'text-').replace('-500', '-400')}`} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{template.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${getCategoryColor(template.category)}/20 ${getCategoryColor(template.category).replace('bg-', 'text-').replace('-500', '-400')}`}>
                      {template.category}
                    </span>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-400 text-sm mb-3">{template.description}</p>
              
              <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                <p className="text-gray-500 text-xs mb-1">Subject:</p>
                <p className="text-gray-300 text-sm font-mono truncate">{template.subject}</p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePreview(template)}
                  className="flex-1 border-gray-700 text-gray-400 hover:text-white"
                >
                  <Eye size={14} className="mr-1" />
                  Preview
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => handleEdit(template)}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                >
                  <Edit size={14} className="mr-1" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Variables Reference */}
      <Card className="bg-[#151b28] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            Template Variables
          </CardTitle>
          <CardDescription className="text-gray-400">
            Use these variables in your templates - they'll be replaced with actual values
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              '{{store_name}}',
              '{{customer_name}}',
              '{{customer_email}}',
              '{{order_number}}',
              '{{order_total}}',
              '{{tracking_number}}',
              '{{carrier}}',
              '{{reset_link}}'
            ].map(variable => (
              <button
                key={variable}
                onClick={() => handleCopyToClipboard(variable)}
                className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
              >
                <code className="text-cyan-400 text-sm">{variable}</code>
                <Copy size={14} className="text-gray-600 group-hover:text-gray-400" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={editMode} onOpenChange={setEditMode}>
        <DialogContent className="bg-[#151b28] border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit className="w-5 h-5 text-cyan-400" />
              Edit Template: {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-400">Template Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Category</Label>
                <Select
                  value={editForm.category}
                  onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Subject Line</Label>
              <Input
                value={editForm.subject}
                onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Email Body</Label>
              <Textarea
                value={editForm.body}
                onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white font-mono min-h-[250px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {saving ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={previewMode} onOpenChange={setPreviewMode}>
        <DialogContent className="bg-[#151b28] border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-400" />
              Preview: {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-500 text-xs mb-1">Subject:</p>
                <p className="text-white font-medium">{parseTemplate(selectedTemplate.subject)}</p>
              </div>
              <div className="bg-white text-gray-900 rounded-lg p-6 font-sans">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                  {parseTemplate(selectedTemplate.body)}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewMode(false)}>Close</Button>
            <Button 
              onClick={() => {
                setPreviewMode(false);
                handleEdit(selectedTemplate);
              }}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <Edit size={16} className="mr-2" />
              Edit Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmailTemplates;
