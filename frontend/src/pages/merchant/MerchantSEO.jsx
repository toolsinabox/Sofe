import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Globe, FileText, Code, Save, RefreshCw, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantSEO = () => {
  const [activeTab, setActiveTab] = useState('global');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [globalSettings, setGlobalSettings] = useState({
    site_title_suffix: '',
    default_meta_description: '',
    google_analytics_id: '',
    google_search_console: '',
    facebook_pixel_id: '',
    robots_txt: 'User-agent: *\nAllow: /',
    sitemap_enabled: true,
    structured_data_enabled: true
  });

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entitySEO, setEntitySEO] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [globalRes, productsRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/seo/global`),
        axios.get(`${API}/products?limit=100`),
        axios.get(`${API}/categories`)
      ]);
      setGlobalSettings(globalRes.data);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveGlobalSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/seo/global`, globalSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  const loadEntitySEO = async (type, id, name) => {
    try {
      const res = await axios.get(`${API}/seo/${type}/${id}`);
      setEntitySEO(res.data);
      setSelectedEntity({ type, id, name });
    } catch (error) {
      console.error('Error loading SEO:', error);
    }
  };

  const saveEntitySEO = async () => {
    if (!selectedEntity) return;
    setSaving(true);
    try {
      await axios.put(`${API}/seo/${selectedEntity.type}/${selectedEntity.id}`, entitySEO);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'global', label: 'Global Settings', icon: Globe },
    { id: 'products', label: 'Product SEO', icon: FileText },
    { id: 'categories', label: 'Category SEO', icon: FileText },
    { id: 'tools', label: 'Tools', icon: Code }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEO Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Optimize your store for search engines</p>
        </div>
        <Button 
          onClick={activeTab === 'global' ? saveGlobalSettings : saveEntitySEO}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saved ? <CheckCircle size={16} className="mr-2" /> : <Save size={16} className="mr-2" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Global Settings Tab */}
      {activeTab === 'global' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Site Metadata</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700">Site Title Suffix</Label>
                <Input
                  value={globalSettings.site_title_suffix}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, site_title_suffix: e.target.value })}
                  placeholder="| Your Store Name"
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Appended to all page titles</p>
              </div>
              <div>
                <Label className="text-gray-700">Default Meta Description</Label>
                <Textarea
                  value={globalSettings.default_meta_description}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, default_meta_description: e.target.value })}
                  rows={3}
                  className="bg-gray-50 border-gray-200 text-gray-900"
                  placeholder="Default description for pages without custom SEO"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tracking & Analytics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700">Google Analytics ID</Label>
                <Input
                  value={globalSettings.google_analytics_id}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, google_analytics_id: e.target.value })}
                  placeholder="G-XXXXXXXXXX"
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
              </div>
              <div>
                <Label className="text-gray-700">Google Search Console</Label>
                <Input
                  value={globalSettings.google_search_console}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, google_search_console: e.target.value })}
                  placeholder="Verification code"
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
              </div>
              <div>
                <Label className="text-gray-700">Facebook Pixel ID</Label>
                <Input
                  value={globalSettings.facebook_pixel_id}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, facebook_pixel_id: e.target.value })}
                  placeholder="1234567890"
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-gray-900 font-medium">Enable Sitemap</p>
                  <p className="text-sm text-gray-500">Auto-generate XML sitemap</p>
                </div>
                <Switch
                  checked={globalSettings.sitemap_enabled}
                  onCheckedChange={(checked) => setGlobalSettings({ ...globalSettings, sitemap_enabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-gray-900 font-medium">Structured Data</p>
                  <p className="text-sm text-gray-500">Add JSON-LD schema markup</p>
                </div>
                <Switch
                  checked={globalSettings.structured_data_enabled}
                  onCheckedChange={(checked) => setGlobalSettings({ ...globalSettings, structured_data_enabled: checked })}
                />
              </div>
              <div>
                <Label className="text-gray-700">robots.txt</Label>
                <Textarea
                  value={globalSettings.robots_txt}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, robots_txt: e.target.value })}
                  rows={6}
                  className="bg-gray-50 border-gray-200 text-gray-900 font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Products</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {products.map(product => (
                <button
                  key={product.id}
                  onClick={() => loadEntitySEO('products', product.id, product.name)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedEntity?.id === product.id
                      ? 'bg-blue-50 border border-blue-500'
                      : 'hover:bg-gray-50 border border-gray-100'
                  }`}
                >
                  <p className="text-gray-900 font-medium truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sku}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-6">
            {selectedEntity ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">SEO for: {selectedEntity.name}</h3>
                <div>
                  <Label className="text-gray-700">Meta Title</Label>
                  <Input
                    value={entitySEO.meta_title || ''}
                    onChange={(e) => setEntitySEO({ ...entitySEO, meta_title: e.target.value })}
                    className="bg-gray-50 border-gray-200 text-gray-900"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Meta Description</Label>
                  <Textarea
                    value={entitySEO.meta_description || ''}
                    onChange={(e) => setEntitySEO({ ...entitySEO, meta_description: e.target.value })}
                    rows={3}
                    className="bg-gray-50 border-gray-200 text-gray-900"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">URL Slug</Label>
                  <Input
                    value={entitySEO.slug || ''}
                    onChange={(e) => setEntitySEO({ ...entitySEO, slug: e.target.value })}
                    className="bg-gray-50 border-gray-200 text-gray-900"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Select a product to edit its SEO settings
              </div>
            )}
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => loadEntitySEO('categories', category.id, category.name)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedEntity?.id === category.id
                      ? 'bg-blue-50 border border-blue-500'
                      : 'hover:bg-gray-50 border border-gray-100'
                  }`}
                >
                  <p className="text-gray-900 font-medium">{category.name}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-6">
            {selectedEntity ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">SEO for: {selectedEntity.name}</h3>
                <div>
                  <Label className="text-gray-700">Meta Title</Label>
                  <Input
                    value={entitySEO.meta_title || ''}
                    onChange={(e) => setEntitySEO({ ...entitySEO, meta_title: e.target.value })}
                    className="bg-gray-50 border-gray-200 text-gray-900"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Meta Description</Label>
                  <Textarea
                    value={entitySEO.meta_description || ''}
                    onChange={(e) => setEntitySEO({ ...entitySEO, meta_description: e.target.value })}
                    rows={3}
                    className="bg-gray-50 border-gray-200 text-gray-900"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">URL Slug</Label>
                  <Input
                    value={entitySEO.slug || ''}
                    onChange={(e) => setEntitySEO({ ...entitySEO, slug: e.target.value })}
                    className="bg-gray-50 border-gray-200 text-gray-900"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Select a category to edit its SEO settings
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tools Tab */}
      {activeTab === 'tools' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sitemap</h3>
            <p className="text-gray-500 text-sm mb-4">View and regenerate your XML sitemap</p>
            <div className="flex gap-3">
              <Button variant="outline" className="border-gray-200">
                <ExternalLink size={16} className="mr-2" /> View Sitemap
              </Button>
              <Button variant="outline" className="border-gray-200">
                <RefreshCw size={16} className="mr-2" /> Regenerate
              </Button>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Audit</h3>
            <p className="text-gray-500 text-sm mb-4">Check your store for SEO issues</p>
            <Button variant="outline" className="border-gray-200">
              <Search size={16} className="mr-2" /> Run Audit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantSEO;
