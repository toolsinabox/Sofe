import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { Plus, Edit, Trash2, Image, Upload, X, Eye, EyeOff, GripVertical } from 'lucide-react';
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
    image: '',
    link: '',
    button_text: 'Shop Now',
    text_color: '#FFFFFF',
    overlay_color: 'rgba(0,0,0,0.3)',
    is_active: true,
    sort_order: 0
  });
  const [uploading, setUploading] = useState(false);

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
      if (editingBanner) {
        await axios.put(`${API}/banners/${editingBanner.id}`, formData);
      } else {
        await axios.post(`${API}/banners`, formData);
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
        image: banner.image,
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
        image: '',
        link: '',
        button_text: 'Shop Now',
        text_color: '#FFFFFF',
        overlay_color: 'rgba(0,0,0,0.3)',
        is_active: true,
        sort_order: banners.length
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBanner(null);
  };

  const onImageDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    setUploading(true);
    const file = acceptedFiles[0];
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const response = await axios.post(`${API}/upload/banners`, uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, image: `${BACKEND_URL}${response.data.url}` }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onImageDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1
  });

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
          <p className="text-gray-400">Manage your storefront carousel banners</p>
        </div>
        <Button onClick={() => openModal()} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Banner
        </Button>
      </div>

      {/* Banners List */}
      <div className="space-y-4">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`bg-gray-800 rounded-lg border overflow-hidden transition-colors ${
              banner.is_active ? 'border-gray-700' : 'border-gray-700/50 opacity-60'
            }`}
          >
            <div className="flex">
              {/* Preview */}
              <div className="w-64 h-36 bg-gray-700 relative flex-shrink-0">
                {banner.image ? (
                  <img
                    src={banner.image}
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
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{banner.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        banner.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {banner.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {banner.subtitle && (
                      <p className="text-sm text-gray-400 mt-1">{banner.subtitle}</p>
                    )}
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
          <p className="text-gray-400 mb-4">Create your first hero banner for the storefront</p>
          <Button onClick={() => openModal()} className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Banner
          </Button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-lg w-full max-w-lg border border-gray-700 my-8">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">
                {editingBanner ? 'Edit Banner' : 'Add Banner'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <Label className="text-gray-300">Banner Image</Label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <input {...getInputProps()} />
                  {uploading ? (
                    <p className="text-gray-400">Uploading...</p>
                  ) : formData.image ? (
                    <div className="relative">
                      <img src={formData.image} alt="Preview" className="h-32 mx-auto rounded" />
                      <p className="text-xs text-gray-400 mt-2">Click or drag to replace</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-400">Drop banner image or click to upload</p>
                      <p className="text-xs text-gray-500">Recommended: 1920x600px</p>
                    </>
                  )}
                </div>
              </div>
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
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeModal} className="flex-1 border-gray-600 text-gray-300">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-700">
                  {editingBanner ? 'Update' : 'Create'}
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
