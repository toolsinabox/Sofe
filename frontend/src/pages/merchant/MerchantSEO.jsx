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
          <h1 className="text-2xl font-bold text-white">SEO Tools</h1>
          <p className="text-gray-400 text-sm mt-1">Optimize your store for search engines</p>
        </div>
        <Button
          onClick={activeTab === 'global' ? saveGlobalSettings : saveEntitySEO}
          disabled={saving || (activeTab !== 'global' && !selectedEntity)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? 'Saving...' : saved ? <><CheckCircle size={16} className="mr-2" /> Saved</> : <><Save size={16} className="mr-2" /> Save</>}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-800 p-1 rounded-lg">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedEntity(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Global Settings */}
      {activeTab === 'global' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Site-Wide SEO</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-gray-300">Title Suffix</Label>
                <Input
                  value={globalSettings.site_title_suffix}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, site_title_suffix: e.target.value })}
                  placeholder="| Your Store Name"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Appended to all page titles</p>
              </div>
              <div>
                <Label className="text-gray-300">Default Meta Description</Label>
                <Textarea
                  value={globalSettings.default_meta_description}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, default_meta_description: e.target.value })}
                  placeholder="Your store description for search engines..."
                  className="bg-gray-700 border-gray-600 text-white mt-1 h-20"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Tracking & Analytics</h2>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <Label className="text-gray-300">Google Analytics ID</Label>
                <Input
                  value={globalSettings.google_analytics_id || ''}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, google_analytics_id: e.target.value })}
                  placeholder="G-XXXXXXXXXX"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Search Console Verification</Label>
                <Input
                  value={globalSettings.google_search_console || ''}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, google_search_console: e.target.value })}
                  placeholder="Verification meta tag"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Facebook Pixel ID</Label>
                <Input
                  value={globalSettings.facebook_pixel_id || ''}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, facebook_pixel_id: e.target.value })}
                  placeholder="XXXXXXXXXXXXXXXX"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Technical SEO</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">Sitemap Generation</p>
                  <p className="text-sm text-gray-400">Auto-generate sitemap.xml</p>
                </div>
                <Switch
                  checked={globalSettings.sitemap_enabled}
                  onCheckedChange={(checked) => setGlobalSettings({ ...globalSettings, sitemap_enabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">Structured Data (JSON-LD)</p>
                  <p className="text-sm text-gray-400">Add schema.org markup</p>
                </div>
                <Switch
                  checked={globalSettings.structured_data_enabled}
                  onCheckedChange={(checked) => setGlobalSettings({ ...globalSettings, structured_data_enabled: checked })}
                />
              </div>
              <div>
                <Label className="text-gray-300">robots.txt Content</Label>
                <Textarea
                  value={globalSettings.robots_txt}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, robots_txt: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white mt-1 h-32 font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product SEO */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-4 h-fit max-h-[600px] overflow-y-auto">
            <h3 className="text-white font-medium mb-3">Select Product</h3>
            <div className="space-y-1">
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => loadEntitySEO('product', p.id, p.name)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedEntity?.id === p.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            {selectedEntity ? (
              <SEOForm seo={entitySEO} setSEO={setEntitySEO} entityName={selectedEntity.name} />
            ) : (
              <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-500">
                Select a product to edit its SEO settings
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category SEO */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-4 h-fit">
            <h3 className="text-white font-medium mb-3">Select Category</h3>
            <div className="space-y-1">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => loadEntitySEO('category', c.id, c.name)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedEntity?.id === c.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            {selectedEntity ? (
              <SEOForm seo={entitySEO} setSEO={setEntitySEO} entityName={selectedEntity.name} />
            ) : (
              <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-500">
                Select a category to edit its SEO settings
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tools */}
      {activeTab === 'tools' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Sitemap</h3>
            <p className="text-gray-400 text-sm mb-4">Your sitemap is automatically generated and updated.</p>
            <a
              href={`${BACKEND_URL}/api/sitemap.xml`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
            >
              View Sitemap <ExternalLink size={14} />
            </a>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Robots.txt</h3>
            <p className="text-gray-400 text-sm mb-4">Control how search engines crawl your site.</p>
            <a
              href={`${BACKEND_URL}/api/robots.txt`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
            >
              View robots.txt <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

// SEO Form Component
const SEOForm = ({ seo, setSEO, entityName }) => (
  <div className="bg-gray-800 rounded-lg p-6 space-y-6">
    <h3 className="text-lg font-semibold text-white">SEO for: {entityName}</h3>
    
    <div>
      <Label className="text-gray-300">Meta Title</Label>
      <Input
        value={seo.meta_title || ''}
        onChange={(e) => setSEO({ ...seo, meta_title: e.target.value })}
        placeholder="Page title for search results"
        className="bg-gray-700 border-gray-600 text-white mt-1"
      />
      <p className="text-xs text-gray-500 mt-1">{(seo.meta_title || '').length}/60 characters recommended</p>
    </div>

    <div>
      <Label className="text-gray-300">Meta Description</Label>
      <Textarea
        value={seo.meta_description || ''}
        onChange={(e) => setSEO({ ...seo, meta_description: e.target.value })}
        placeholder="Description for search results"
        className="bg-gray-700 border-gray-600 text-white mt-1 h-20"
      />
      <p className="text-xs text-gray-500 mt-1">{(seo.meta_description || '').length}/160 characters recommended</p>
    </div>

    <div>
      <Label className="text-gray-300">URL Slug</Label>
      <Input
        value={seo.url_slug || ''}
        onChange={(e) => setSEO({ ...seo, url_slug: e.target.value })}
        placeholder="custom-url-slug"
        className="bg-gray-700 border-gray-600 text-white mt-1"
      />
    </div>

    <div>
      <Label className="text-gray-300">Meta Keywords</Label>
      <Input
        value={seo.meta_keywords || ''}
        onChange={(e) => setSEO({ ...seo, meta_keywords: e.target.value })}
        placeholder="keyword1, keyword2, keyword3"
        className="bg-gray-700 border-gray-600 text-white mt-1"
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label className="text-gray-300">OG Title (Social)</Label>
        <Input
          value={seo.og_title || ''}
          onChange={(e) => setSEO({ ...seo, og_title: e.target.value })}
          placeholder="Title for social shares"
          className="bg-gray-700 border-gray-600 text-white mt-1"
        />
      </div>
      <div>
        <Label className="text-gray-300">OG Image URL</Label>
        <Input
          value={seo.og_image || ''}
          onChange={(e) => setSEO({ ...seo, og_image: e.target.value })}
          placeholder="https://..."
          className="bg-gray-700 border-gray-600 text-white mt-1"
        />
      </div>
    </div>

    <div>
      <Label className="text-gray-300">Robots Directive</Label>
      <select
        value={seo.robots || 'index,follow'}
        onChange={(e) => setSEO({ ...seo, robots: e.target.value })}
        className="w-full h-10 px-3 bg-gray-700 border border-gray-600 rounded-md text-white mt-1"
      >
        <option value="index,follow">Index, Follow (Default)</option>
        <option value="noindex,follow">No Index, Follow</option>
        <option value="index,nofollow">Index, No Follow</option>
        <option value="noindex,nofollow">No Index, No Follow</option>
      </select>
    </div>
  </div>
);

export default MerchantSEO;
