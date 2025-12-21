import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { 
  Plus, Edit, Trash2, Image, Upload, X, Eye, EyeOff, GripVertical,
  Monitor, Tablet, Smartphone, Check, Type, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    subtitle: '',
    image_desktop: '',
    image_tablet: '',
    image_mobile: '',
    show_on_desktop: true,
    show_on_tablet: true,
    show_on_mobile: true,
    link: '',
    button_text: '',
    button_style: 'primary',
    show_button: false,
    show_title: true,
    show_subtitle: true,
    text_color: '#FFFFFF',
    text_position: 'left',
    overlay_color: 'rgba(0,0,0,0.3)',
    overlay_enabled: true,
    is_active: true,
    sort_order: 0
  });
  const [uploading, setUploading] = useState({ desktop: false, tablet: false, mobile: false });
  const [activeTab, setActiveTab] = useState('desktop');
  const [activeSection, setActiveSection] = useState('images');

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await axios.get(`${API}/banners?include_inactive=true`);
      setBanners(response.data);
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        image: formData.image_desktop || formData.image_tablet || formData.image_mobile
      };
      
      if (editingBanner) {
        await axios.put(`${API}/banners/${editingBanner.id}`, submitData);
      } else {
        await axios.post(`${API}/banners`, submitData);
      }
      fetchBanners();
      closeModal();
    } catch (error) {
      console.error('Error saving banner:', error);
      alert('Failed to save banner');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      await axios.delete(`${API}/banners/${id}`);
      fetchBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert('Failed to delete banner');
    }
  };

  const toggleActive = async (banner) => {
    try {
      await axios.put(`${API}/banners/${banner.id}`, { is_active: !banner.is_active });
      fetchBanners();
    } catch (error) {
      console.error('Error updating banner:', error);
    }
  };

  const openModal = (banner = null) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        name: banner.name || banner.title || '',
        title: banner.title || '',
        subtitle: banner.subtitle || '',
        image_desktop: banner.image_desktop || banner.image || '',
        image_tablet: banner.image_tablet || '',
        image_mobile: banner.image_mobile || '',
        show_on_desktop: banner.show_on_desktop ?? true,
        show_on_tablet: banner.show_on_tablet ?? true,
        show_on_mobile: banner.show_on_mobile ?? true,
        link: banner.link || '',
        button_text: banner.button_text || '',
        button_style: banner.button_style || 'primary',
        show_button: banner.show_button ?? false,
        show_title: banner.show_title ?? true,
        show_subtitle: banner.show_subtitle ?? true,
        text_color: banner.text_color || '#FFFFFF',
        text_position: banner.text_position || 'left',
        overlay_color: banner.overlay_color || 'rgba(0,0,0,0.3)',
        overlay_enabled: banner.overlay_enabled ?? true,
        is_active: banner.is_active,
        sort_order: banner.sort_order
      });
    } else {
      setEditingBanner(null);
      setFormData({
        name: '',
        title: '',
        subtitle: '',
        image_desktop: '',
        image_tablet: '',
        image_mobile: '',
        show_on_desktop: true,
        show_on_tablet: true,
        show_on_mobile: true,
        link: '',
        button_text: '',
        button_style: 'primary',
        show_button: false,
        show_title: true,
        show_subtitle: true,
        text_color: '#FFFFFF',
        text_position: 'left',
        overlay_color: 'rgba(0,0,0,0.3)',
        overlay_enabled: true,
        is_active: true,
        sort_order: banners.length
      });
    }
    setActiveTab('desktop');
    setActiveSection('images');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBanner(null);
  };

  const uploadImage = async (file, deviceType) => {
    setUploading(prev => ({ ...prev, [deviceType]: true }));
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const response = await axios.post(`${API}/upload/banners`, uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const imageUrl = `${BACKEND_URL}${response.data.url}`;
      setFormData(prev => ({ ...prev, [`image_${deviceType}`]: imageUrl }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(prev => ({ ...prev, [deviceType]: false }));
    }
  };

  const desktopDropzone = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) uploadImage(acceptedFiles[0], 'desktop');
    },
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1
  });

  const tabletDropzone = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) uploadImage(acceptedFiles[0], 'tablet');
    },
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1
  });

  const mobileDropzone = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) uploadImage(acceptedFiles[0], 'mobile');
    },
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1
  });

  const getRecommendedSize = (device) => {
    switch (device) {
      case 'desktop': return '1920 x 600px';
      case 'tablet': return '1024 x 400px';
      case 'mobile': return '640 x 400px';
      default: return '';
    }
  };

  const DeviceVisibilityBadges = ({ banner }) => (
    <div className="flex gap-1">
      {banner.show_on_desktop !== false && (
        <span className="p-1 bg-blue-500/20 rounded" title="Desktop">
          <Monitor className="w-3 h-3 text-blue-400" />
        </span>
      )}
      {banner.show_on_tablet !== false && (
        <span className="p-1 bg-purple-500/20 rounded" title="Tablet">
          <Tablet className="w-3 h-3 text-purple-400" />
        </span>
      )}
      {banner.show_on_mobile !== false && (
        <span className="p-1 bg-green-500/20 rounded" title="Mobile">
          <Smartphone className="w-3 h-3 text-green-400" />
        </span>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Hero Banners</h1>
          <p className="text-gray-400">Manage responsive banners for different devices</p>
        </div>
        <Button onClick={() => openModal()} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Banner
        </Button>
      </div>

      {/* Banners List */}
      <div className="space-y-4">
        {banners.map((banner) => (
          <div
            key={banner.id}
            className={`bg-gray-800 rounded-lg border overflow-hidden transition-colors ${
              banner.is_active ? 'border-gray-700' : 'border-gray-700/50 opacity-60'
            }`}
          >
            <div className="flex">
              {/* Preview */}
              <div className="w-72 h-40 bg-gray-700 relative flex-shrink-0">
                {(banner.image_desktop || banner.image) ? (
                  <img
                    src={banner.image_desktop || banner.image}
                    alt={banner.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-8 h-8 text-gray-500" />
                  </div>
                )}
                {banner.overlay_enabled !== false && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: banner.overlay_color || 'rgba(0,0,0,0.3)' }}
                  >
                    <div className={`text-center p-2 ${
                      banner.text_position === 'center' ? 'text-center' : 
                      banner.text_position === 'right' ? 'text-right' : 'text-left'
                    }`}>
                      {banner.show_title !== false && banner.title && (
                        <h4 className="font-bold text-sm" style={{ color: banner.text_color }}>{banner.title}</h4>
                      )}
                      {banner.show_subtitle !== false && banner.subtitle && (
                        <p className="text-xs" style={{ color: banner.text_color }}>{banner.subtitle}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{banner.name || banner.title || 'Untitled Banner'}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        banner.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {banner.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    {/* Content indicators */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      {banner.title && <span className="bg-gray-700 px-2 py-0.5 rounded">Title</span>}
                      {banner.subtitle && <span className="bg-gray-700 px-2 py-0.5 rounded">Subtitle</span>}
                      {banner.show_button && banner.button_text && <span className="bg-gray-700 px-2 py-0.5 rounded">Button</span>}
                      {banner.link && <span className="bg-gray-700 px-2 py-0.5 rounded">Link</span>}
                    </div>
                    
                    {/* Device Visibility */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500">Visible on:</span>
                      <DeviceVisibilityBadges banner={banner} />
                    </div>

                    {/* Image Status */}
                    <div className="flex items-center gap-3 text-xs">
                      <span className={`flex items-center gap-1 ${banner.image_desktop ? 'text-green-400' : 'text-gray-500'}`}>
                        <Monitor className="w-3 h-3" />
                        {banner.image_desktop ? <Check className="w-3 h-3" /> : '—'}
                      </span>
                      <span className={`flex items-center gap-1 ${banner.image_tablet ? 'text-green-400' : 'text-gray-500'}`}>
                        <Tablet className="w-3 h-3" />
                        {banner.image_tablet ? <Check className="w-3 h-3" /> : '—'}
                      </span>
                      <span className={`flex items-center gap-1 ${banner.image_mobile ? 'text-green-400' : 'text-gray-500'}`}>
                        <Smartphone className="w-3 h-3" />
                        {banner.image_mobile ? <Check className="w-3 h-3" /> : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <GripVertical className="w-4 h-4" />
                    <span className="text-xs">#{banner.sort_order + 1}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(banner)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    {banner.is_active ? (
                      <><EyeOff className="w-3 h-3 mr-1" /> Hide</>
                    ) : (
                      <><Eye className="w-3 h-3 mr-1" /> Show</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openModal(banner)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Edit className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(banner.id)}
                    className="border-red-600 text-red-400 hover:bg-red-600/20"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {banners.length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <Image className="w-12 h-12 mx-auto text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No banners yet</h3>
          <p className="text-gray-400 mb-4">Create your first responsive hero banner</p>
          <Button onClick={() => openModal()} className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Banner
          </Button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-lg w-full max-w-3xl border border-gray-700 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
              <h2 className="text-lg font-semibold text-white">
                {editingBanner ? 'Edit Banner' : 'Add Banner'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Banner Name (Required) */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <Label className="text-gray-300 mb-2 block">Banner Name <span className="text-red-400">*</span></Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Summer Sale 2025, Homepage Hero"
                  required
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Internal name for identification (not shown on storefront)</p>
              </div>

              {/* Section Tabs */}
              <div className="flex border-b border-gray-700">
                {[
                  { id: 'images', label: 'Images', icon: Image },
                  { id: 'content', label: 'Content', icon: Type },
                  { id: 'style', label: 'Style', icon: AlignCenter },
                ].map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                      activeSection === section.id
                        ? 'text-cyan-400 border-b-2 border-cyan-400'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <section.icon className="w-4 h-4" />
                    {section.label}
                  </button>
                ))}
              </div>

              {/* Images Section */}
              {activeSection === 'images' && (
                <div className="space-y-4">
                  {/* Device Visibility Toggles */}
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <Label className="text-gray-300 mb-3 block">Show banner on:</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch
                          checked={formData.show_on_desktop}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_on_desktop: checked }))}
                        />
                        <Monitor className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-gray-300">Desktop</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch
                          checked={formData.show_on_tablet}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_on_tablet: checked }))}
                        />
                        <Tablet className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-gray-300">Tablet</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch
                          checked={formData.show_on_mobile}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_on_mobile: checked }))}
                        />
                        <Smartphone className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-gray-300">Mobile</span>
                      </label>
                    </div>
                  </div>

                  {/* Device Image Tabs */}
                  <div>
                    <Label className="text-gray-300 mb-2 block">Banner Images</Label>
                    <div className="flex border-b border-gray-600 mb-4">
                      {['desktop', 'tablet', 'mobile'].map((device) => {
                        const Icon = device === 'desktop' ? Monitor : device === 'tablet' ? Tablet : Smartphone;
                        const hasImage = formData[`image_${device}`];
                        const isEnabled = formData[`show_on_${device}`];
                        return (
                          <button
                            key={device}
                            type="button"
                            onClick={() => setActiveTab(device)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                              activeTab === device
                                ? 'text-cyan-400 border-b-2 border-cyan-400'
                                : 'text-gray-400 hover:text-gray-300'
                            } ${!isEnabled ? 'opacity-50' : ''}`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="capitalize">{device}</span>
                            {hasImage && <Check className="w-3 h-3 text-green-400" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Upload Areas */}
                    {['desktop', 'tablet', 'mobile'].map((device) => {
                      const dropzone = device === 'desktop' ? desktopDropzone : device === 'tablet' ? tabletDropzone : mobileDropzone;
                      const Icon = device === 'desktop' ? Monitor : device === 'tablet' ? Tablet : Smartphone;
                      const iconColor = device === 'desktop' ? 'text-blue-400' : device === 'tablet' ? 'text-purple-400' : 'text-green-400';
                      
                      if (activeTab !== device) return null;
                      
                      return (
                        <div key={device} className={!formData[`show_on_${device}`] ? 'opacity-50 pointer-events-none' : ''}>
                          <div
                            {...dropzone.getRootProps()}
                            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                              dropzone.isDragActive ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-600 hover:border-gray-500'
                            }`}
                          >
                            <input {...dropzone.getInputProps()} />
                            {uploading[device] ? (
                              <p className="text-gray-400">Uploading...</p>
                            ) : formData[`image_${device}`] ? (
                              <div className="relative">
                                <img src={formData[`image_${device}`]} alt={`${device} Preview`} className="h-32 mx-auto rounded" />
                                <p className="text-xs text-gray-400 mt-2">Click or drag to replace</p>
                              </div>
                            ) : (
                              <>
                                <Icon className={`w-8 h-8 mx-auto mb-2 ${iconColor}`} />
                                <p className="text-gray-400">Drop {device} image or click to upload</p>
                                <p className="text-xs text-gray-500">Recommended: {getRecommendedSize(device)}</p>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Content Section */}
              {activeSection === 'content' && (
                <div className="space-y-4">
                  {/* Title */}
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-gray-300">Title</Label>
                      <label className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Show</span>
                        <Switch
                          checked={formData.show_title}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_title: checked }))}
                        />
                      </label>
                    </div>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Summer Collection 2025"
                      className={`bg-gray-700 border-gray-600 text-white ${!formData.show_title ? 'opacity-50' : ''}`}
                    />
                    <p className="text-xs text-gray-500 mt-1">Optional - Leave empty for image-only banner</p>
                  </div>

                  {/* Subtitle */}
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-gray-300">Subtitle</Label>
                      <label className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Show</span>
                        <Switch
                          checked={formData.show_subtitle}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_subtitle: checked }))}
                        />
                      </label>
                    </div>
                    <Input
                      value={formData.subtitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                      placeholder="e.g., Up to 50% off on selected items"
                      className={`bg-gray-700 border-gray-600 text-white ${!formData.show_subtitle ? 'opacity-50' : ''}`}
                    />
                  </div>

                  {/* Button */}
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-gray-300">Button</Label>
                      <label className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Show</span>
                        <Switch
                          checked={formData.show_button}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_button: checked }))}
                        />
                      </label>
                    </div>
                    <div className={`grid grid-cols-2 gap-4 ${!formData.show_button ? 'opacity-50' : ''}`}>
                      <div>
                        <Label className="text-gray-400 text-xs">Button Text</Label>
                        <Input
                          value={formData.button_text}
                          onChange={(e) => setFormData(prev => ({ ...prev, button_text: e.target.value }))}
                          placeholder="Shop Now"
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400 text-xs">Button Style</Label>
                        <select
                          value={formData.button_style}
                          onChange={(e) => setFormData(prev => ({ ...prev, button_style: e.target.value }))}
                          className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2"
                        >
                          <option value="primary">Primary (Orange)</option>
                          <option value="secondary">Secondary (White)</option>
                          <option value="outline">Outline</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Link */}
                  <div>
                    <Label className="text-gray-300">Link URL</Label>
                    <Input
                      value={formData.link}
                      onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                      placeholder="/store/products or https://..."
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">Where clicking the banner/button will navigate to</p>
                  </div>
                </div>
              )}

              {/* Style Section */}
              {activeSection === 'style' && (
                <div className="space-y-4">
                  {/* Text Position */}
                  <div>
                    <Label className="text-gray-300 mb-2 block">Text Position</Label>
                    <div className="flex gap-2">
                      {[
                        { value: 'left', icon: AlignLeft, label: 'Left' },
                        { value: 'center', icon: AlignCenter, label: 'Center' },
                        { value: 'right', icon: AlignRight, label: 'Right' },
                      ].map((pos) => (
                        <button
                          key={pos.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, text_position: pos.value }))}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                            formData.text_position === pos.value
                              ? 'bg-cyan-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          <pos.icon className="w-4 h-4" />
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Color */}
                  <div>
                    <Label className="text-gray-300 mb-2 block">Text Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.text_color}
                        onChange={(e) => setFormData(prev => ({ ...prev, text_color: e.target.value }))}
                        className="w-12 h-10 p-1 bg-gray-700 border-gray-600"
                      />
                      <Input
                        value={formData.text_color}
                        onChange={(e) => setFormData(prev => ({ ...prev, text_color: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white flex-1"
                      />
                    </div>
                  </div>

                  {/* Overlay */}
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-gray-300">Overlay</Label>
                      <label className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Enable</span>
                        <Switch
                          checked={formData.overlay_enabled}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, overlay_enabled: checked }))}
                        />
                      </label>
                    </div>
                    <div className={!formData.overlay_enabled ? 'opacity-50' : ''}>
                      <Label className="text-gray-400 text-xs mb-1 block">Overlay Color</Label>
                      <Input
                        value={formData.overlay_color}
                        onChange={(e) => setFormData(prev => ({ ...prev, overlay_color: e.target.value }))}
                        placeholder="rgba(0,0,0,0.3)"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">Use rgba() for transparency, e.g., rgba(0,0,0,0.5)</p>
                    </div>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <Label className="text-gray-300">Sort Order</Label>
                    <Input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-300">Banner Active</Label>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-gray-700">
                <Button type="button" variant="outline" onClick={closeModal} className="flex-1 border-gray-600 text-gray-300">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-700">
                  {editingBanner ? 'Update' : 'Create'} Banner
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantBanners;
