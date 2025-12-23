import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Save, Eye, RefreshCw, FileText, Image, Type, Palette, Layout, Settings, Download,
  ChevronDown, Plus, Trash2, Move, AlignLeft, AlignCenter, AlignRight, Bold, Italic
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantInvoiceSettings = () => {
  const [activeTab, setActiveTab] = useState('editor');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Invoice template settings
  const [template, setTemplate] = useState({
    // Header
    logo: '',
    companyName: 'TOOLS IN A BOX',
    tagline: 'Your trusted tool supplier',
    abn: 'XX XXX XXX XXX',
    
    // Contact Info
    email: 'support@toolsinabox.com.au',
    phone: '1300 123 456',
    website: 'www.toolsinabox.com.au',
    address: '123 Industrial Ave\nMelbourne VIC 3000',
    
    // Styling
    primaryColor: '#10b981',
    secondaryColor: '#1e293b',
    fontFamily: 'Inter',
    fontSize: '14px',
    
    // Layout
    showLogo: true,
    showTagline: true,
    logoPosition: 'left',
    
    // Header Columns
    headerColumns: [
      { label: 'Invoice Number', value: '[@invoice_number@]' },
      { label: 'Date', value: '[@date@]' },
      { label: 'Due Date', value: '[@due_date@]' }
    ],
    
    // Item Table Columns
    tableColumns: [
      { id: 'product', label: 'Product', width: '40%', show: true },
      { id: 'sku', label: 'SKU', width: '15%', show: true },
      { id: 'quantity', label: 'Qty', width: '10%', show: true },
      { id: 'price', label: 'Unit Price', width: '15%', show: true },
      { id: 'total', label: 'Total', width: '20%', show: true }
    ],
    
    // Footer
    footerText: 'Thank you for your business!',
    paymentTerms: 'Payment due within 14 days',
    bankDetails: 'BSB: XXX-XXX | Account: XXXXXXXX | Account Name: Tools In A Box',
    showBankDetails: true,
    
    // Notes
    defaultNotes: 'For questions regarding this invoice, please contact accounts@toolsinabox.com.au'
  });

  // Sample order data for preview
  const sampleOrder = {
    order_number: 'ORD-20251222-SAMPLE',
    invoice_number: 'INV-20251222-001',
    created_at: new Date().toISOString(),
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    customer_name: 'John Smith',
    company_name: 'Smith Industries Pty Ltd',
    customer_email: 'john@smithindustries.com.au',
    shipping_address: '456 Business Park\nSydney NSW 2000\nAustralia',
    purchase_order: 'PO-2024-001',
    items: [
      { product_name: 'DeWalt 18V Cordless Drill', sku: 'DW-18V-DRILL', quantity: 2, price: 299.99 },
      { product_name: 'Milwaukee M18 Impact Driver', sku: 'MW-M18-IMP', quantity: 1, price: 349.99 },
      { product_name: 'Makita 5Ah Battery Pack', sku: 'MK-5AH-BATT', quantity: 4, price: 149.99 }
    ],
    subtotal: 1549.93,
    discount: 50,
    shipping: 0,
    tax: 149.99,
    total: 1649.92
  };

  useEffect(() => {
    fetchTemplate();
  }, []);

  const fetchTemplate = async () => {
    try {
      const response = await axios.get(`${API}/settings/invoice-template`);
      if (response.data) {
        setTemplate(prev => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      console.log('Using default template');
    }
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/invoice-template`, template);
      alert('Invoice template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const InvoicePreview = ({ order, settings }) => (
    <div className="bg-white text-gray-900 p-8" style={{ fontFamily: settings.fontFamily, fontSize: settings.fontSize }}>
      {/* Header */}
      <div className={`flex ${settings.logoPosition === 'center' ? 'justify-center' : settings.logoPosition === 'right' ? 'justify-between flex-row-reverse' : 'justify-between'} items-start mb-8`}>
        <div className={settings.logoPosition === 'center' ? 'text-center' : ''}>
          {settings.showLogo && settings.logo ? (
            <img src={settings.logo} alt="Logo" className="h-16 mb-2" />
          ) : (
            <div className="w-16 h-16 rounded-lg flex items-center justify-center text-gray-900 font-bold text-2xl mb-2" style={{ backgroundColor: settings.primaryColor }}>
              TIB
            </div>
          )}
          <h1 className="text-2xl font-bold" style={{ color: settings.secondaryColor }}>{settings.companyName}</h1>
          {settings.showTagline && <p className="text-gray-500 text-sm">{settings.tagline}</p>}
        </div>
        <div className={`text-${settings.logoPosition === 'right' ? 'left' : 'right'}`}>
          <h2 className="text-3xl font-bold" style={{ color: settings.primaryColor }}>INVOICE</h2>
          <p className="text-gray-500">#{order.invoice_number || order.order_number}</p>
        </div>
      </div>

      {/* Info Row */}
      <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
        {settings.headerColumns.map((col, idx) => (
          <div key={idx}>
            <p className="text-gray-500 font-medium">{col.label}</p>
            <p className="font-semibold">
              {col.value.includes('invoice_number') ? order.invoice_number || order.order_number :
               col.value.includes('date') && !col.value.includes('due') ? formatDate(order.created_at) :
               col.value.includes('due_date') ? formatDate(order.due_date || order.created_at) :
               col.value}
            </p>
          </div>
        ))}
      </div>

      {/* Bill To / Ship To */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-semibold text-gray-500 text-sm mb-2 uppercase">Bill To</h3>
          <p className="font-semibold">{order.customer_name}</p>
          {order.company_name && <p>{order.company_name}</p>}
          <p className="text-gray-600 whitespace-pre-line text-sm">{order.shipping_address}</p>
          <p className="text-gray-600 text-sm">{order.customer_email}</p>
        </div>
        <div className="text-right">
          <h3 className="font-semibold text-gray-500 text-sm mb-2 uppercase">Company Details</h3>
          <p className="text-sm">ABN: {settings.abn}</p>
          <p className="text-sm">{settings.email}</p>
          <p className="text-sm">{settings.phone}</p>
          <p className="text-sm whitespace-pre-line">{settings.address}</p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-8">
        <thead>
          <tr style={{ backgroundColor: settings.primaryColor + '20' }}>
            {settings.tableColumns.filter(c => c.show).map((col, idx) => (
              <th key={col.id} className={`py-3 px-4 text-${idx === 0 ? 'left' : 'right'} font-semibold text-sm`} style={{ width: col.width }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-100">
              {settings.tableColumns.filter(c => c.show).map((col, colIdx) => (
                <td key={col.id} className={`py-3 px-4 text-${colIdx === 0 ? 'left' : 'right'}`}>
                  {col.id === 'product' && item.product_name}
                  {col.id === 'sku' && <span className="font-mono text-sm text-gray-500">{item.sku}</span>}
                  {col.id === 'quantity' && item.quantity}
                  {col.id === 'price' && formatCurrency(item.price)}
                  {col.id === 'total' && <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-72 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Shipping</span>
            <span>{order.shipping > 0 ? formatCurrency(order.shipping) : 'FREE'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">GST (10%)</span>
            <span>{formatCurrency(order.tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t-2" style={{ borderColor: settings.primaryColor }}>
            <span>Total Due</span>
            <span style={{ color: settings.primaryColor }}>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Bank Details */}
      {settings.showBankDetails && (
        <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: settings.primaryColor + '10' }}>
          <h4 className="font-semibold mb-2">Payment Details</h4>
          <p className="text-sm text-gray-600">{settings.bankDetails}</p>
          <p className="text-sm text-gray-500 mt-1">{settings.paymentTerms}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center border-t pt-6">
        <p className="font-semibold" style={{ color: settings.primaryColor }}>{settings.footerText}</p>
        <p className="text-gray-500 text-sm mt-2">{settings.defaultNotes}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice Settings</h1>
          <p className="text-gray-500">Customize your invoice template and appearance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(true)} className="border-gray-200 text-gray-700 hover:bg-white">
            <Eye size={16} className="mr-2" />
            Preview
          </Button>
          <Button onClick={saveTemplate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/50 border border-gray-200">
              <TabsTrigger value="editor" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-600">
                <Layout size={14} className="mr-2" /> Layout
              </TabsTrigger>
              <TabsTrigger value="branding" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-600">
                <Image size={14} className="mr-2" /> Branding
              </TabsTrigger>
              <TabsTrigger value="styling" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-600">
                <Palette size={14} className="mr-2" /> Styling
              </TabsTrigger>
              <TabsTrigger value="content" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-600">
                <Type size={14} className="mr-2" /> Content
              </TabsTrigger>
            </TabsList>

            {/* Layout Tab */}
            <TabsContent value="editor" className="space-y-4">
              <Card className="bg-white border-gray-200">
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-gray-900 text-base">Header Layout</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showLogo"
                      checked={template.showLogo}
                      onChange={(e) => setTemplate({...template, showLogo: e.target.checked})}
                      className="rounded"
                    />
                    <label htmlFor="showLogo" className="text-gray-700 text-sm">Show Logo</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showTagline"
                      checked={template.showTagline}
                      onChange={(e) => setTemplate({...template, showTagline: e.target.checked})}
                      className="rounded"
                    />
                    <label htmlFor="showTagline" className="text-gray-700 text-sm">Show Tagline</label>
                  </div>
                  <div>
                    <label className="text-gray-500 text-sm block mb-2">Logo Position</label>
                    <div className="flex gap-2">
                      {['left', 'center', 'right'].map(pos => (
                        <button
                          key={pos}
                          onClick={() => setTemplate({...template, logoPosition: pos})}
                          className={`px-4 py-2 rounded border ${template.logoPosition === pos ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-white border-gray-200 text-gray-500'}`}
                        >
                          {pos === 'left' && <AlignLeft size={16} />}
                          {pos === 'center' && <AlignCenter size={16} />}
                          {pos === 'right' && <AlignRight size={16} />}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200">
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-gray-900 text-base">Table Columns</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {template.tableColumns.map((col, idx) => (
                    <div key={col.id} className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                      <input
                        type="checkbox"
                        checked={col.show}
                        onChange={(e) => {
                          const updated = [...template.tableColumns];
                          updated[idx].show = e.target.checked;
                          setTemplate({...template, tableColumns: updated});
                        }}
                        className="rounded"
                      />
                      <span className="text-gray-900 flex-1">{col.label}</span>
                      <input
                        type="text"
                        value={col.width}
                        onChange={(e) => {
                          const updated = [...template.tableColumns];
                          updated[idx].width = e.target.value;
                          setTemplate({...template, tableColumns: updated});
                        }}
                        className="w-20 bg-gray-700 border border-gray-200 rounded px-2 py-1 text-gray-900 text-sm text-center"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-4">
              <Card className="bg-white border-gray-200">
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-gray-900 text-base">Company Branding</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <label className="text-gray-500 text-sm block mb-2">Logo URL</label>
                    <input
                      type="url"
                      value={template.logo}
                      onChange={(e) => setTemplate({...template, logo: e.target.value})}
                      placeholder="https://..."
                      className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-sm block mb-2">Company Name</label>
                    <input
                      type="text"
                      value={template.companyName}
                      onChange={(e) => setTemplate({...template, companyName: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-sm block mb-2">Tagline</label>
                    <input
                      type="text"
                      value={template.tagline}
                      onChange={(e) => setTemplate({...template, tagline: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-sm block mb-2">ABN</label>
                    <input
                      type="text"
                      value={template.abn}
                      onChange={(e) => setTemplate({...template, abn: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200">
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-gray-900 text-base">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-500 text-sm block mb-2">Email</label>
                      <input
                        type="email"
                        value={template.email}
                        onChange={(e) => setTemplate({...template, email: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 text-sm block mb-2">Phone</label>
                      <input
                        type="tel"
                        value={template.phone}
                        onChange={(e) => setTemplate({...template, phone: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-500 text-sm block mb-2">Website</label>
                    <input
                      type="url"
                      value={template.website}
                      onChange={(e) => setTemplate({...template, website: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-sm block mb-2">Address</label>
                    <textarea
                      value={template.address}
                      onChange={(e) => setTemplate({...template, address: e.target.value})}
                      rows={3}
                      className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900 resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Styling Tab */}
            <TabsContent value="styling" className="space-y-4">
              <Card className="bg-white border-gray-200">
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-gray-900 text-base">Colors & Typography</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-500 text-sm block mb-2">Primary Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={template.primaryColor}
                          onChange={(e) => setTemplate({...template, primaryColor: e.target.value})}
                          className="w-12 h-10 rounded border border-gray-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={template.primaryColor}
                          onChange={(e) => setTemplate({...template, primaryColor: e.target.value})}
                          className="flex-1 bg-white border border-gray-200 rounded px-3 py-2 text-gray-900 font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-500 text-sm block mb-2">Secondary Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={template.secondaryColor}
                          onChange={(e) => setTemplate({...template, secondaryColor: e.target.value})}
                          className="w-12 h-10 rounded border border-gray-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={template.secondaryColor}
                          onChange={(e) => setTemplate({...template, secondaryColor: e.target.value})}
                          className="flex-1 bg-white border border-gray-200 rounded px-3 py-2 text-gray-900 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-500 text-sm block mb-2">Font Family</label>
                    <Select value={template.fontFamily} onValueChange={(v) => setTemplate({...template, fontFamily: v})}>
                      <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1f2e] border-gray-200">
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-gray-500 text-sm block mb-2">Base Font Size</label>
                    <Select value={template.fontSize} onValueChange={(v) => setTemplate({...template, fontSize: v})}>
                      <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1f2e] border-gray-200">
                        <SelectItem value="12px">Small (12px)</SelectItem>
                        <SelectItem value="14px">Medium (14px)</SelectItem>
                        <SelectItem value="16px">Large (16px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-4">
              <Card className="bg-white border-gray-200">
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-gray-900 text-base">Payment Details</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showBankDetails"
                      checked={template.showBankDetails}
                      onChange={(e) => setTemplate({...template, showBankDetails: e.target.checked})}
                      className="rounded"
                    />
                    <label htmlFor="showBankDetails" className="text-gray-700 text-sm">Show Bank Details</label>
                  </div>
                  <div>
                    <label className="text-gray-500 text-sm block mb-2">Bank Details</label>
                    <input
                      type="text"
                      value={template.bankDetails}
                      onChange={(e) => setTemplate({...template, bankDetails: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-sm block mb-2">Payment Terms</label>
                    <input
                      type="text"
                      value={template.paymentTerms}
                      onChange={(e) => setTemplate({...template, paymentTerms: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200">
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-gray-900 text-base">Footer Content</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <label className="text-gray-500 text-sm block mb-2">Footer Text</label>
                    <input
                      type="text"
                      value={template.footerText}
                      onChange={(e) => setTemplate({...template, footerText: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-sm block mb-2">Default Notes</label>
                    <textarea
                      value={template.defaultNotes}
                      onChange={(e) => setTemplate({...template, defaultNotes: e.target.value})}
                      rows={3}
                      className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-gray-900 resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-1">
          <Card className="bg-white border-gray-200 sticky top-4">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 text-base flex items-center gap-2">
                <Eye size={18} />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="bg-white rounded-lg overflow-hidden shadow-lg transform scale-[0.4] origin-top-left" style={{ width: '250%', height: '600px' }}>
                <InvoicePreview order={sampleOrder} settings={template} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="bg-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <InvoicePreview order={sampleOrder} settings={template} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantInvoiceSettings;
