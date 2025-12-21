import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { 
  Plus, Edit, Trash2, Image, Upload, X, Eye, EyeOff, GripVertical,
  Monitor, Tablet, Smartphone, Check
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
    title: '',
    subtitle: '',
    image_desktop: '',
    image_tablet: '',
    image_mobile: '',
    show_on_desktop: true,
    show_on_tablet: true,
    show_on_mobile: true,
    link: '',
    button_text: 'Shop Now',
    text_color: '#FFFFFF',
    overlay_color: 'rgba(0,0,0,0.3)',
    is_active: true,
    sort_order: 0
  });
  const [uploading, setUploading] = useState({ desktop: false, tablet: false, mobile: false });
  const [activeTab, setActiveTab] = useState('desktop');

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
      // Use desktop image as fallback for legacy 'image' field
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
        title: banner.title,
        subtitle: banner.subtitle || '',
        image_desktop: banner.image_desktop || banner.image || '',
        image_tablet: banner.image_tablet || '',
        image_mobile: banner.image_mobile || '',
        show_on_desktop: banner.show_on_desktop ?? true,
        show_on_tablet: banner.show_on_tablet ?? true,
        show_on_mobile: banner.show_on_mobile ?? true,
        link: banner.link || '',
        button_text: banner.button_text || 'Shop Now',
        text_color: banner.text_color || '#FFFFFF',
        overlay_color: banner.overlay_color || 'rgba(0,0,0,0.3)',
        is_active: banner.is_active,
        sort_order: banner.sort_order
      });
    } else {
      setEditingBanner(null);
      setFormData({
        title: '',
        subtitle: '',
        image_desktop: '',
        image_tablet: '',
        image_mobile: '',
        show_on_desktop: true,
        show_on_tablet: true,
        show_on_mobile: true,
        link: '',
        button_text: 'Shop Now',
        text_color: '#FFFFFF',
        overlay_color: 'rgba(0,0,0,0.3)',
        is_active: true,
        sort_order: banners.length
      });
    }
    setActiveTab('desktop');
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

  const createDropzone = (deviceType) => {
    return useDropzone({
      onDrop: (acceptedFiles) => {
        if (acceptedFiles.length > 0) {
          uploadImage(acceptedFiles[0], deviceType);
        }
      },
      accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
      maxFiles: 1
    });
  };

  const desktopDropzone = createDropzone('desktop');
  const tabletDropzone = createDropzone('tablet');
  const mobileDropzone = createDropzone('mobile');

  const getDeviceIcon = (device) => {
    switch (device) {
      case 'desktop': return Monitor;
      case 'tablet': return Tablet;
      case 'mobile': return Smartphone;
      default: return Monitor;
    }
  };

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
      {banner.show_on_desktop && (
        <span className="p-1 bg-blue-500/20 rounded" title="Desktop">
          <Monitor className="w-3 h-3 text-blue-400" />
        </span>
      )}
      {banner.show_on_tablet && (
        <span className="p-1 bg-purple-500/20 rounded" title="Tablet">
          <Tablet className="w-3 h-3 text-purple-400" />
        </span>
      )}
      {banner.show_on_mobile && (
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
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-8 h-8 text-gray-500" />
                  </div>
                )}
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ backgroundColor: banner.overlay_color }}
                >
                  <div className="text-center p-2">
                    <h4 className="font-bold text-sm" style={{ color: banner.text_color }}>{banner.title}</h4>
                    {banner.subtitle && (
                      <p className="text-xs" style={{ color: banner.text_color }}>{banner.subtitle}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white">{banner.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        banner.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {banner.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {banner.subtitle && (
                      <p className="text-sm text-gray-400 mb-2">{banner.subtitle}</p>
                    )}
                    
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

                    {banner.link && (
                      <p className="text-xs text-cyan-400 mt-2">Link: {banner.link}</p>
                    )}
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
          <div className="bg-gray-800 rounded-lg w-full max-w-2xl border border-gray-700 my-8">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">
                {editingBanner ? 'Edit Banner' : 'Add Responsive Banner'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
                <div className="flex border-b border-gray-700 mb-4">
                  {['desktop', 'tablet', 'mobile'].map((device) => {
                    const Icon = getDeviceIcon(device);
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

                {/* Desktop Upload */}
                {activeTab === 'desktop' && (
                  <div className={!formData.show_on_desktop ? 'opacity-50 pointer-events-none' : ''}>
                    <div
                      {...desktopDropzone.getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                        desktopDropzone.isDragActive ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <input {...desktopDropzone.getInputProps()} />
                      {uploading.desktop ? (
                        <p className="text-gray-400">Uploading...</p>
                      ) : formData.image_desktop ? (
                        <div className="relative">
                          <img src={formData.image_desktop} alt="Desktop Preview" className="h-32 mx-auto rounded" />
                          <p className="text-xs text-gray-400 mt-2">Click or drag to replace</p>
                        </div>
                      ) : (
                        <>
                          <Monitor className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                          <p className="text-gray-400">Drop desktop image or click to upload</p>
                          <p className="text-xs text-gray-500">Recommended: {getRecommendedSize('desktop')}</p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Tablet Upload */}
                {activeTab === 'tablet' && (
                  <div className={!formData.show_on_tablet ? 'opacity-50 pointer-events-none' : ''}>
                    <div
                      {...tabletDropzone.getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                        tabletDropzone.isDragActive ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <input {...tabletDropzone.getInputProps()} />
                      {uploading.tablet ? (
                        <p className="text-gray-400">Uploading...</p>
                      ) : formData.image_tablet ? (
                        <div className="relative">
                          <img src={formData.image_tablet} alt="Tablet Preview" className="h-32 mx-auto rounded" />
                          <p className="text-xs text-gray-400 mt-2">Click or drag to replace</p>
                        </div>
                      ) : (
                        <>
                          <Tablet className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                          <p className="text-gray-400">Drop tablet image or click to upload</p>
                          <p className="text-xs text-gray-500">Recommended: {getRecommendedSize('tablet')}</p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Mobile Upload */}
                {activeTab === 'mobile' && (
                  <div className={!formData.show_on_mobile ? 'opacity-50 pointer-events-none' : ''}>
                    <div
                      {...mobileDropzone.getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                        mobileDropzone.isDragActive ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <input {...mobileDropzone.getInputProps()} />
                      {uploading.mobile ? (
                        <p className="text-gray-400">Uploading...</p>
                      ) : formData.image_mobile ? (
                        <div className="relative">
                          <img src={formData.image_mobile} alt="Mobile Preview" className="h-32 mx-auto rounded" />
                          <p className="text-xs text-gray-400 mt-2">Click or drag to replace</p>
                        </div>
                      ) : (
                        <>
                          <Smartphone className="w-8 h-8 mx-auto mb-2 text-green-400" />
                          <p className="text-gray-400">Drop mobile image or click to upload</p>
                          <p className="text-xs text-gray-500">Recommended: {getRecommendedSize('mobile')}</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Title & Subtitle */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Subtitle</Label>
                  <Input
                    value={formData.subtitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              {/* Button & Link */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Button Text</Label>
                  <Input
                    value={formData.button_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, button_text: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Link URL</Label>
                  <Input
                    value={formData.link}
                    onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                    placeholder="/store/products"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              {/* Text Color & Sort Order */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Text Color</Label>
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
                <div>
                  <Label className="text-gray-300">Sort Order</Label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Banner Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
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
