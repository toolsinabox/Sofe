import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { Save, Upload, Globe, Mail, Phone, MapPin, Facebook, Instagram, Twitter, Youtube, Image, Hash } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantStoreSettings = () => {
  const [settings, setSettings] = useState({
    store_name: '',
    store_email: '',
    store_phone: '',
    store_url: '',
    store_logo: '',
    store_favicon: '',
    currency: 'USD',
    currency_symbol: '$',
    store_address: '',
    store_city: '',
    store_state: '',
    store_zip: '',
    store_country: 'USA',
    store_facebook: '',
    store_instagram: '',
    store_twitter: '',
    store_youtube: '',
    store_tiktok: '',
    free_shipping_threshold: 50,
    tax_rate: 0.08,
    homepage_title: 'Home',
    meta_title: '',
    meta_description: '',
    google_analytics_id: '',
    order_prefix: 'ORD',
    order_number_start: 1001
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/store/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/store/settings`, settings);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const onLogoDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    setUploadingLogo(true);
    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/upload/logos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSettings(prev => ({ ...prev, store_logo: `${BACKEND_URL}${response.data.url}` }));
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  }, []);

  const { getRootProps: getLogoRootProps, getInputProps: getLogoInputProps, isDragActive: isLogoDragActive } = useDropzone({
    onDrop: onLogoDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.svg', '.webp'] },
    maxFiles: 1
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Logo Upload */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Image className="w-5 h-5 text-blue-600" />
            Store Logo
          </h2>
          <div className="flex items-start gap-6">
            <div
              {...getLogoRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors flex-1 ${
                isLogoDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input {...getLogoInputProps()} />
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              {uploadingLogo ? (
                <p className="text-gray-500">Uploading...</p>
              ) : (
                <p className="text-gray-500">
                  {isLogoDragActive ? 'Drop logo here' : 'Drag & drop logo or click to upload'}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG up to 2MB</p>
            </div>
            {settings.store_logo && (
              <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                <img src={settings.store_logo} alt="Store Logo" className="max-w-full max-h-full object-contain" />
              </div>
            )}
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700">Store Name</Label>
              <Input
                name="store_name"
                value={settings.store_name}
                onChange={handleChange}
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">Appears in the browser tab after page title</p>
            </div>
            <div>
              <Label className="text-gray-700">Homepage Title</Label>
              <Input
                name="homepage_title"
                value={settings.homepage_title || 'Home'}
                onChange={handleChange}
                placeholder="Home"
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">Browser tab title for homepage (e.g., &quot;Welcome&quot; or &quot;Home&quot;)</p>
            </div>
            <div>
              <Label className="text-gray-700">Store URL</Label>
              <Input
                name="store_url"
                value={settings.store_url}
                onChange={handleChange}
                placeholder="https://yourstore.com"
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
            <div>
              <Label className="text-gray-700">Currency</Label>
              <Input
                name="currency"
                value={settings.currency}
                onChange={handleChange}
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
            <div>
              <Label className="text-gray-700">Currency Symbol</Label>
              <Input
                name="currency_symbol"
                value={settings.currency_symbol}
                onChange={handleChange}
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Contact Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700">Email</Label>
              <Input
                name="store_email"
                type="email"
                value={settings.store_email}
                onChange={handleChange}
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
            <div>
              <Label className="text-gray-700">Phone</Label>
              <Input
                name="store_phone"
                value={settings.store_phone}
                onChange={handleChange}
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Store Address
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="text-gray-700">Street Address</Label>
              <Input
                name="store_address"
                value={settings.store_address || ''}
                onChange={handleChange}
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
            <div>
              <Label className="text-gray-700">City</Label>
              <Input
                name="store_city"
                value={settings.store_city || ''}
                onChange={handleChange}
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
            <div>
              <Label className="text-gray-700">State/Province</Label>
              <Input
                name="store_state"
                value={settings.store_state || ''}
                onChange={handleChange}
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
            <div>
              <Label className="text-gray-700">ZIP/Postal Code</Label>
              <Input
                name="store_zip"
                value={settings.store_zip || ''}
                onChange={handleChange}
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
            <div>
              <Label className="text-gray-700">Country</Label>
              <Input
                name="store_country"
                value={settings.store_country || ''}
                onChange={handleChange}
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Social Media Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700 flex items-center gap-2">
                <Facebook className="w-4 h-4" /> Facebook
              </Label>
              <Input
                name="store_facebook"
                value={settings.store_facebook || ''}
                onChange={handleChange}
                placeholder="https://facebook.com/yourstore"
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
            <div>
              <Label className="text-gray-700 flex items-center gap-2">
                <Instagram className="w-4 h-4" /> Instagram
              </Label>
              <Input
                name="store_instagram"
                value={settings.store_instagram || ''}
                onChange={handleChange}
                placeholder="https://instagram.com/yourstore"
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
            <div>
              <Label className="text-gray-700 flex items-center gap-2">
                <Twitter className="w-4 h-4" /> Twitter
              </Label>
              <Input
                name="store_twitter"
                value={settings.store_twitter || ''}
                onChange={handleChange}
                placeholder="https://twitter.com/yourstore"
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
            <div>
              <Label className="text-gray-700 flex items-center gap-2">
                <Youtube className="w-4 h-4" /> YouTube
              </Label>
              <Input
                name="store_youtube"
                value={settings.store_youtube || ''}
                onChange={handleChange}
                placeholder="https://youtube.com/@yourstore"
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Shipping & Tax */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping & Tax</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700">Free Shipping Threshold ($)</Label>
              <Input
                name="free_shipping_threshold"
                type="number"
                value={settings.free_shipping_threshold}
                onChange={handleChange}
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
            <div>
              <Label className="text-gray-700">Tax Rate (%)</Label>
              <Input
                name="tax_rate"
                type="number"
                step="0.01"
                value={(settings.tax_rate * 100).toFixed(2)}
                onChange={(e) => setSettings(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) / 100 }))}
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Order Number Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Number Settings</h2>
          <p className="text-gray-500 text-sm mb-4">
            Configure how order numbers are generated. The order number will be: <span className="text-blue-600 font-mono">{settings.order_prefix || 'ORD'}-{settings.order_number_start || 1001}</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700">Order Prefix</Label>
              <Input
                name="order_prefix"
                value={settings.order_prefix || ''}
                onChange={handleChange}
                placeholder="ORD"
                className="bg-gray-50 border-gray-200 text-gray-900 font-mono"
              />
              <p className="text-gray-500 text-xs mt-1">e.g., ORD, INV, TOOLS, etc.</p>
            </div>
            <div>
              <Label className="text-gray-700">Starting Number</Label>
              <Input
                name="order_number_start"
                type="number"
                min="1"
                value={settings.order_number_start || 1001}
                onChange={(e) => setSettings(prev => ({ ...prev, order_number_start: parseInt(e.target.value) || 1001 }))}
                className="bg-gray-50 border-gray-200 text-gray-900 font-mono"
              />
              <p className="text-gray-500 text-xs mt-1">Order numbers will increment from this value</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-sm">
              <strong>Note:</strong> Changing these settings will only affect new orders. Existing order numbers will remain unchanged.
            </p>
          </div>
        </div>

        {/* SEO */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">SEO Settings</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700">Meta Title</Label>
              <Input
                name="meta_title"
                value={settings.meta_title || ''}
                onChange={handleChange}
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
            <div>
              <Label className="text-gray-700">Meta Description</Label>
              <textarea
                name="meta_description"
                value={settings.meta_description || ''}
                onChange={handleChange}
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-md p-2"
              />
            </div>
            <div>
              <Label className="text-gray-700">Google Analytics ID</Label>
              <Input
                name="google_analytics_id"
                value={settings.google_analytics_id || ''}
                onChange={handleChange}
                placeholder="G-XXXXXXXXXX"
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantStoreSettings;
