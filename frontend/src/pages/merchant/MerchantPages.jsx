import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { 
  Plus, Edit, Trash2, X, Save, FileText, Home, Eye, EyeOff, Lock, Search, Globe, 
  Image, Upload, Bold, Italic, Underline, List, ListOrdered, Link, Heading1, Heading2, 
  AlignLeft, AlignCenter, AlignRight, Code, Quote, Undo, Redo, Type, GripVertical,
  Menu, Map
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Simple HTML formatting toolbar component
const EditorToolbar = ({ onFormat }) => {
  const tools = [
    { icon: Bold, action: 'bold', title: 'Bold', tag: '<strong>|</strong>' },
    { icon: Italic, action: 'italic', title: 'Italic', tag: '<em>|</em>' },
    { icon: Underline, action: 'underline', title: 'Underline', tag: '<u>|</u>' },
    { divider: true },
    { icon: Heading1, action: 'h1', title: 'Heading 1', tag: '<h1>|</h1>' },
    { icon: Heading2, action: 'h2', title: 'Heading 2', tag: '<h2>|</h2>' },
    { icon: Type, action: 'p', title: 'Paragraph', tag: '<p>|</p>' },
    { divider: true },
    { icon: List, action: 'ul', title: 'Bullet List', tag: '<ul>\n  <li>|</li>\n</ul>' },
    { icon: ListOrdered, action: 'ol', title: 'Numbered List', tag: '<ol>\n  <li>|</li>\n</ol>' },
    { divider: true },
    { icon: Link, action: 'link', title: 'Link', tag: '<a href="#">|</a>' },
    { icon: Image, action: 'img', title: 'Image', tag: '<img src="|" alt="" class="w-full" />' },
    { divider: true },
    { icon: Quote, action: 'quote', title: 'Blockquote', tag: '<blockquote>|</blockquote>' },
    { icon: Code, action: 'code', title: 'Code', tag: '<code>|</code>' },
    { divider: true },
    { icon: AlignLeft, action: 'left', title: 'Align Left', tag: '<div class="text-left">|</div>' },
    { icon: AlignCenter, action: 'center', title: 'Align Center', tag: '<div class="text-center">|</div>' },
    { icon: AlignRight, action: 'right', title: 'Align Right', tag: '<div class="text-right">|</div>' },
  ];

  return (
    <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border border-gray-200 rounded-t-lg">
      {tools.map((tool, i) => 
        tool.divider ? (
          <div key={i} className="w-px h-6 bg-gray-700 mx-1" />
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onFormat(tool.tag)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            title={tool.title}
          >
            <tool.icon size={16} />
          </button>
        )
      )}
    </div>
  );
};

// Image upload dropzone component
const ImageUploader = ({ label, value, onChange, uploading, onUpload }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onUpload,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'] },
    maxFiles: 1
  });

  return (
    <div>
      <Label className="text-gray-700">{label}</Label>
      <div className="mt-1 grid grid-cols-2 gap-4">
        {/* Preview */}
        <div className="aspect-video bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center">
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-gray-500">
              <Image size={32} className="mx-auto mb-2" />
              <p className="text-sm">No image</p>
            </div>
          )}
        </div>
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-200 hover:border-gray-500'
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          ) : (
            <>
              <Upload size={24} className="text-gray-500 mb-2" />
              <p className="text-gray-500 text-sm text-center px-4">
                {isDragActive ? 'Drop image here' : 'Click or drag to upload'}
              </p>
            </>
          )}
        </div>
      </div>
      {value && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Image URL"
            className="bg-gray-50 border-gray-200 text-gray-900 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange('')}
            className="text-red-600 border-gray-200 hover:bg-red-500/10"
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  );
};

const MerchantPages = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [uploadingMainImage, setUploadingMainImage] = useState(false);
  const [uploadingAltImage, setUploadingAltImage] = useState(false);
  const contentRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    is_active: true,
    visible_on_menu: false,
    visible_on_sitemap: true,
    seo_title: '',
    seo_keywords: '',
    seo_description: '',
    seo_heading: '',
    canonical_url: '',
    content: '',
    template: 'default',
    main_image: '',
    alt_image: '',
    sort_order: 0
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
        visible_on_menu: page.visible_on_menu || false,
        visible_on_sitemap: page.visible_on_sitemap !== false,
        seo_title: page.seo_title || '',
        seo_keywords: page.seo_keywords || '',
        seo_description: page.seo_description || '',
        seo_heading: page.seo_heading || '',
        canonical_url: page.canonical_url || '',
        content: page.content || '',
        template: page.template || 'default',
        main_image: page.main_image || '',
        alt_image: page.alt_image || '',
        sort_order: page.sort_order || 0
      });
    } else {
      setEditingPage(null);
      setFormData({
        name: '',
        slug: '',
        is_active: true,
        visible_on_menu: false,
        visible_on_sitemap: true,
        seo_title: '',
        seo_keywords: '',
        seo_description: '',
        seo_heading: '',
        canonical_url: '',
        content: '',
        template: 'default',
        main_image: '',
        alt_image: '',
        sort_order: 0
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

  const uploadImage = async (file, setUploading, fieldName) => {
    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    
    try {
      const response = await axios.post(`${API}/upload/pages`, uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const imageUrl = `${BACKEND_URL}${response.data.url}`;
      setFormData(prev => ({ ...prev, [fieldName]: imageUrl }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleMainImageUpload = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      uploadImage(acceptedFiles[0], setUploadingMainImage, 'main_image');
    }
  }, []);

  const handleAltImageUpload = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      uploadImage(acceptedFiles[0], setUploadingAltImage, 'alt_image');
    }
  }, []);

  const handleFormat = (tag) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.content.substring(start, end) || 'text';
    const beforeCursor = formData.content.substring(0, start);
    const afterCursor = formData.content.substring(end);
    
    const [before, after] = tag.split('|');
    const newContent = beforeCursor + before + selectedText + after + afterCursor;
    
    setFormData(prev => ({ ...prev, content: newContent }));
    
    // Set cursor position after the inserted content
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + before.length + selectedText.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your store pages, content, and SEO settings</p>
        </div>
        <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700">
          <Plus size={16} className="mr-2" /> Add Page
        </Button>
      </div>

      {/* Pages List */}
      <div className="bg-white rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-4 text-gray-500 font-medium w-12"></th>
              <th className="text-left p-4 text-gray-500 font-medium">Page Name</th>
              <th className="text-left p-4 text-gray-500 font-medium">URL Slug</th>
              <th className="text-left p-4 text-gray-500 font-medium">Image</th>
              <th className="text-left p-4 text-gray-500 font-medium">Visibility</th>
              <th className="text-left p-4 text-gray-500 font-medium">Status</th>
              <th className="text-right p-4 text-gray-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="border-t border-gray-200 hover:bg-gray-100">
                <td className="p-4 text-gray-500">
                  <GripVertical size={16} />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {page.is_homepage ? (
                      <Home size={18} className="text-yellow-600" />
                    ) : (
                      <FileText size={18} className="text-gray-500" />
                    )}
                    <div>
                      <p className="text-gray-900 font-medium flex items-center gap-2">
                        {page.name}
                        {page.is_system && (
                          <Lock size={12} className="text-gray-500" title="System page - cannot be deleted" />
                        )}
                      </p>
                      {page.is_homepage && (
                        <span className="text-xs text-yellow-600">Default Homepage</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <code className="text-blue-600 bg-gray-50 px-2 py-1 rounded text-sm">
                    /{page.slug}
                  </code>
                </td>
                <td className="p-4">
                  {page.main_image ? (
                    <img 
                      src={page.main_image} 
                      alt={page.name}
                      className="w-16 h-10 object-cover rounded border border-gray-200"
                    />
                  ) : (
                    <span className="text-gray-500 text-sm">—</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {page.visible_on_menu && (
                      <span className="flex items-center gap-1 text-blue-600 text-xs bg-blue-500/10 px-2 py-0.5 rounded">
                        <Menu size={10} /> Menu
                      </span>
                    )}
                    {page.visible_on_sitemap && (
                      <span className="flex items-center gap-1 text-green-600 text-xs bg-green-500/10 px-2 py-0.5 rounded">
                        <Map size={10} /> Sitemap
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  {page.is_active ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
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
                      className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    {!page.is_system && (
                      <button
                        onClick={() => deletePage(page.id)}
                        className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {pages.length === 0 && !loading && (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500">
                  No pages found. Click "Add Page" to create your first page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPage ? `Edit: ${editingPage.name}` : 'Create New Page'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-6">
              {['general', 'content', 'images', 'seo', 'visibility'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'text-blue-600 border-blue-400'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  {tab === 'seo' ? 'SEO Settings' : tab}
                </button>
              ))}
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* General Tab */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-700">Page Name *</Label>
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
                      className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-gray-700">URL Slug *</Label>
                    <div className="flex items-center mt-1">
                      <span className="bg-gray-50 text-gray-500 px-3 py-2 rounded-l border border-r-0 border-gray-200">
                        /live/page/
                      </span>
                      <Input
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="about-us"
                        disabled={editingPage?.is_system}
                        className="bg-gray-50 border-gray-200 text-gray-900 rounded-l-none"
                      />
                    </div>
                    {editingPage?.is_system && (
                      <p className="text-xs text-yellow-600 mt-1">System page slug cannot be changed</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700">Template</Label>
                      <select
                        value={formData.template}
                        onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                        className="w-full h-10 px-3 bg-gray-700 border border-gray-200 rounded-md text-gray-900 mt-1"
                      >
                        <option value="default">Default</option>
                        <option value="full-width">Full Width</option>
                        <option value="sidebar">With Sidebar</option>
                        <option value="landing">Landing Page</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-gray-700">Sort Order</Label>
                      <Input
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                        className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <div>
                      <p className="text-gray-700">Page Active</p>
                      <p className="text-sm text-gray-500">Show this page on the website</p>
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>
              )}

              {/* Content Tab */}
              {activeTab === 'content' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-700 mb-2 block">Page Content (HTML)</Label>
                    <EditorToolbar onFormat={handleFormat} />
                    <Textarea
                      ref={contentRef}
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="<div class='container mx-auto py-8'>&#10;  <h1 class='text-3xl font-bold mb-4'>Page Title</h1>&#10;  <p class='text-gray-600'>Your content here...</p>&#10;</div>"
                      className="bg-gray-50 border-gray-200 text-gray-900 h-80 font-mono text-sm rounded-t-none border-t-0"
                    />
                    <div className="bg-gray-50 border border-t-0 border-gray-200 rounded-b-lg p-3">
                      <p className="text-xs text-gray-500">
                        <strong>Template Tags:</strong> You can use tags like <code className="text-blue-600">[@store_name@]</code>, <code className="text-blue-600">[@store_email@]</code>, <code className="text-blue-600">[@page_title@]</code>
                      </p>
                    </div>
                  </div>

                  {/* Content Preview */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <span className="text-sm text-gray-500">Preview</span>
                    </div>
                    <div 
                      className="p-4 bg-white text-black min-h-[200px] prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: formData.content || '<p class="text-gray-500 italic">No content yet...</p>' }}
                    />
                  </div>
                </div>
              )}

              {/* Images Tab */}
              {activeTab === 'images' && (
                <div className="space-y-6">
                  <ImageUploader
                    label="Main Image"
                    value={formData.main_image}
                    onChange={(val) => setFormData({ ...formData, main_image: val })}
                    uploading={uploadingMainImage}
                    onUpload={handleMainImageUpload}
                  />
                  
                  <ImageUploader
                    label="Alternative Image (Optional)"
                    value={formData.alt_image}
                    onChange={(val) => setFormData({ ...formData, alt_image: val })}
                    uploading={uploadingAltImage}
                    onUpload={handleAltImageUpload}
                  />
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">
                      <strong>Tip:</strong> Use images to represent your page visually. The main image can be displayed as a hero banner or featured image on the page. Images are accessible via template tags:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-500">
                      <li><code className="text-blue-600">[@page_image@]</code> - Main image URL</li>
                      <li><code className="text-blue-600">[@page_alt_image@]</code> - Alternative image URL</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* SEO Tab */}
              {activeTab === 'seo' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <Search size={16} />
                      <span className="text-sm">Search Engine Preview</span>
                    </div>
                    <p className="text-blue-600 text-lg hover:underline cursor-pointer">
                      {formData.seo_title || formData.name || 'Page Title'}
                    </p>
                    <p className="text-green-600 text-sm">
                      {BACKEND_URL}/live/page/{formData.slug || 'page-slug'}
                    </p>
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                      {formData.seo_description || 'No description set. Add a meta description to improve SEO.'}
                    </p>
                  </div>

                  <div>
                    <Label className="text-gray-700">SEO Page Title</Label>
                    <Input
                      value={formData.seo_title}
                      onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                      placeholder="Title that appears in browser tab and search results"
                      className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.seo_title.length}/60 characters</p>
                  </div>

                  <div>
                    <Label className="text-gray-700">SEO Meta Keywords</Label>
                    <Input
                      value={formData.seo_keywords}
                      onChange={(e) => setFormData({ ...formData, seo_keywords: e.target.value })}
                      placeholder="keyword1, keyword2, keyword3"
                      className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-700">SEO Meta Description</Label>
                    <Textarea
                      value={formData.seo_description}
                      onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                      placeholder="A brief description of this page for search engines"
                      className="bg-gray-50 border-gray-200 text-gray-900 mt-1 h-24"
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.seo_description.length}/160 characters</p>
                  </div>

                  <div>
                    <Label className="text-gray-700">SEO Page Heading (H1)</Label>
                    <Input
                      value={formData.seo_heading}
                      onChange={(e) => setFormData({ ...formData, seo_heading: e.target.value })}
                      placeholder="Main heading that appears on the page"
                      className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-700">Canonical URL</Label>
                    <Input
                      value={formData.canonical_url}
                      onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })}
                      placeholder="https://yoursite.com/page (leave empty for default)"
                      className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Only set if this page has duplicate content elsewhere</p>
                  </div>
                </div>
              )}

              {/* Visibility Tab */}
              {activeTab === 'visibility' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-gray-900 font-medium flex items-center gap-2">
                        <Menu size={18} /> Show in Navigation Menu
                      </p>
                      <p className="text-sm text-gray-500 mt-1">Display this page in the main navigation menu</p>
                    </div>
                    <Switch
                      checked={formData.visible_on_menu}
                      onCheckedChange={(checked) => setFormData({ ...formData, visible_on_menu: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-gray-900 font-medium flex items-center gap-2">
                        <Map size={18} /> Include in Sitemap
                      </p>
                      <p className="text-sm text-gray-500 mt-1">Include this page in the XML sitemap for search engines</p>
                    </div>
                    <Switch
                      checked={formData.visible_on_sitemap}
                      onCheckedChange={(checked) => setFormData({ ...formData, visible_on_sitemap: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-gray-900 font-medium flex items-center gap-2">
                        <Globe size={18} /> Page Active
                      </p>
                      <p className="text-sm text-gray-500 mt-1">Make this page publicly accessible</p>
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <Button variant="outline" onClick={() => setShowModal(false)} className="border-gray-200">
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
