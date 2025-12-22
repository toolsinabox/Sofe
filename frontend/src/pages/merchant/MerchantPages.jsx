import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, X, Save, FileText, Home, Eye, EyeOff, Lock, Search, Globe } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantPages = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    is_active: true,
    seo_title: '',
    seo_keywords: '',
    seo_description: '',
    seo_heading: '',
    canonical_url: '',
    content: '',
    template: 'default'
  });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const response = await axios.get(`${API}/pages`);
      setPages(response.data);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (page = null) => {
    if (page) {
      setEditingPage(page);
      setFormData({
        name: page.name || '',
        slug: page.slug || '',
        is_active: page.is_active !== false,
        seo_title: page.seo_title || '',
        seo_keywords: page.seo_keywords || '',
        seo_description: page.seo_description || '',
        seo_heading: page.seo_heading || '',
        canonical_url: page.canonical_url || '',
        content: page.content || '',
        template: page.template || 'default'
      });
    } else {
      setEditingPage(null);
      setFormData({
        name: '',
        slug: '',
        is_active: true,
        seo_title: '',
        seo_keywords: '',
        seo_description: '',
        seo_heading: '',
        canonical_url: '',
        content: '',
        template: 'default'
      });
    }
    setActiveTab('general');
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingPage) {
        await axios.put(`${API}/pages/${editingPage.id}`, formData);
      } else {
        await axios.post(`${API}/pages`, formData);
      }
      fetchPages();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving page:', error);
      alert(error.response?.data?.detail || 'Error saving page');
    }
  };

  const deletePage = async (pageId) => {
    if (!window.confirm('Are you sure you want to delete this page?')) return;
    try {
      await axios.delete(`${API}/pages/${pageId}`);
      fetchPages();
    } catch (error) {
      console.error('Error deleting page:', error);
      alert(error.response?.data?.detail || 'Cannot delete this page');
    }
  };

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pages</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your store pages and SEO settings</p>
        </div>
        <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700">
          <Plus size={16} className="mr-2" /> Add Page
        </Button>
      </div>

      {/* Pages List */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-900">
              <th className="text-left p-4 text-gray-400 font-medium">Page Name</th>
              <th className="text-left p-4 text-gray-400 font-medium">URL Slug</th>
              <th className="text-left p-4 text-gray-400 font-medium">SEO Title</th>
              <th className="text-left p-4 text-gray-400 font-medium">Status</th>
              <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="border-t border-gray-700 hover:bg-gray-750">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {page.is_homepage ? (
                      <Home size={18} className="text-yellow-400" />
                    ) : (
                      <FileText size={18} className="text-gray-500" />
                    )}
                    <div>
                      <p className="text-white font-medium flex items-center gap-2">
                        {page.name}
                        {page.is_system && (
                          <Lock size={12} className="text-gray-500" title="System page - cannot be deleted" />
                        )}
                      </p>
                      {page.is_homepage && (
                        <span className="text-xs text-yellow-400">Default Homepage</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <code className="text-cyan-400 bg-gray-900 px-2 py-1 rounded text-sm">
                    /{page.slug}
                  </code>
                </td>
                <td className="p-4">
                  <p className="text-gray-300 text-sm truncate max-w-xs">
                    {page.seo_title || <span className="text-gray-600 italic">Not set</span>}
                  </p>
                </td>
                <td className="p-4">
                  {page.is_active ? (
                    <span className="flex items-center gap-1 text-green-400 text-sm">
                      <Eye size={14} /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-500 text-sm">
                      <EyeOff size={14} /> Inactive
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openModal(page)}
                      className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    {!page.is_system && (
                      <button
                        onClick={() => deletePage(page.id)}
                        className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-gray-800 rounded-lg w-full max-w-3xl mx-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">
                {editingPage ? `Edit: ${editingPage.name}` : 'Create New Page'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700 px-6">
              {['general', 'seo', 'content'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'text-blue-400 border-blue-400'
                      : 'text-gray-400 border-transparent hover:text-white'
                  }`}
                >
                  {tab === 'seo' ? 'SEO Settings' : tab}
                </button>
              ))}
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* General Tab */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Page Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setFormData({ 
                          ...formData, 
                          name,
                          slug: editingPage?.is_system ? formData.slug : generateSlug(name)
                        });
                      }}
                      placeholder="e.g., About Us, Contact, FAQ"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-gray-300">URL Slug</Label>
                    <div className="flex items-center mt-1">
                      <span className="bg-gray-900 text-gray-500 px-3 py-2 rounded-l border border-r-0 border-gray-600">
                        /live/page/
                      </span>
                      <Input
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="about-us"
                        disabled={editingPage?.is_system}
                        className="bg-gray-700 border-gray-600 text-white rounded-l-none"
                      />
                    </div>
                    {editingPage?.is_system && (
                      <p className="text-xs text-yellow-400 mt-1">System page slug cannot be changed</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-gray-300">Template</Label>
                    <select
                      value={formData.template}
                      onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                      className="w-full h-10 px-3 bg-gray-700 border border-gray-600 rounded-md text-white mt-1"
                    >
                      <option value="default">Default</option>
                      <option value="full-width">Full Width</option>
                      <option value="sidebar">With Sidebar</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <p className="text-gray-300">Page Active</p>
                      <p className="text-sm text-gray-500">Show this page on the website</p>
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>
              )}

              {/* SEO Tab */}
              {activeTab === 'seo' && (
                <div className="space-y-4">
                  <div className="bg-gray-900 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Search size={16} />
                      <span className="text-sm">Search Engine Preview</span>
                    </div>
                    <p className="text-blue-400 text-lg hover:underline cursor-pointer">
                      {formData.seo_title || formData.name || 'Page Title'}
                    </p>
                    <p className="text-green-400 text-sm">
                      {BACKEND_URL}/live/page/{formData.slug || 'page-slug'}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      {formData.seo_description || 'No description set. Add a meta description to improve SEO.'}
                    </p>
                  </div>

                  <div>
                    <Label className="text-gray-300">SEO Page Title</Label>
                    <Input
                      value={formData.seo_title}
                      onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                      placeholder="Title that appears in browser tab and search results"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.seo_title.length}/60 characters</p>
                  </div>

                  <div>
                    <Label className="text-gray-300">SEO Meta Keywords</Label>
                    <Input
                      value={formData.seo_keywords}
                      onChange={(e) => setFormData({ ...formData, seo_keywords: e.target.value })}
                      placeholder="keyword1, keyword2, keyword3"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">SEO Meta Description</Label>
                    <Textarea
                      value={formData.seo_description}
                      onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                      placeholder="A brief description of this page for search engines"
                      className="bg-gray-700 border-gray-600 text-white mt-1 h-24"
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.seo_description.length}/160 characters</p>
                  </div>

                  <div>
                    <Label className="text-gray-300">SEO Page Heading (H1)</Label>
                    <Input
                      value={formData.seo_heading}
                      onChange={(e) => setFormData({ ...formData, seo_heading: e.target.value })}
                      placeholder="Main heading that appears on the page"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Canonical URL</Label>
                    <Input
                      value={formData.canonical_url}
                      onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })}
                      placeholder="https://yoursite.com/page (leave empty for default)"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Only set if this page has duplicate content elsewhere</p>
                  </div>
                </div>
              )}

              {/* Content Tab */}
              {activeTab === 'content' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Page Content (HTML)</Label>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="<div class='container'>&#10;  <h1>Page Title</h1>&#10;  <p>Your content here...</p>&#10;</div>"
                      className="bg-gray-700 border-gray-600 text-white mt-1 h-64 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">You can use HTML and template tags like [@store_name@]</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
              <Button variant="outline" onClick={() => setShowModal(false)} className="border-gray-600">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                <Save size={16} className="mr-2" /> {editingPage ? 'Update Page' : 'Create Page'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantPages;
