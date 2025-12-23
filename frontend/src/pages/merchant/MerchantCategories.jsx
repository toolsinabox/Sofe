import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { Plus, Edit, Trash2, FolderOpen, Upload, X, GripVertical, Download } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { ImportExportButtons } from '../../components/ImportExport';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    is_active: true,
    sort_order: 0
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await axios.put(`${API}/categories/${editingCategory.id}`, formData);
      } else {
        await axios.post(`${API}/categories`, formData);
      }
      fetchCategories();
      closeModal();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await axios.delete(`${API}/categories/${id}`);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  const openModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        image: category.image || '',
        is_active: category.is_active,
        sort_order: category.sort_order
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        image: '',
        is_active: true,
        sort_order: categories.length
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
  };

  const onImageDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    setUploading(true);
    const file = acceptedFiles[0];
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const response = await axios.post(`${API}/upload/products`, uploadFormData, {
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 text-sm">Manage your product categories</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportExportButtons 
            entityType="categories" 
            onImportSuccess={fetchCategories}
          />
          <Button onClick={() => openModal()} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-3 h-3 mr-1" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {categories.map((category, index) => (
          <div
            key={category.id}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all group"
          >
            <div className="aspect-square bg-gray-100 relative">
              {category.image ? (
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FolderOpen className="w-8 h-8 text-gray-300" />
                </div>
              )}
              <div className="absolute top-1.5 right-1.5">
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  category.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {category.is_active ? 'Active' : 'Off'}
                </span>
              </div>
            </div>
            <div className="p-2">
              <h3 className="font-medium text-gray-900 text-sm truncate">{category.name}</h3>
              <p className="text-xs text-gray-500">{category.product_count} products</p>
              <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openModal(category)}
                  className="flex-1 h-7 text-xs border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(category.id)}
                  className="h-7 px-2 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
          <p className="text-gray-500 mb-4">Create your first category to organize your products</p>
          <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md border border-gray-200 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <Label className="text-gray-700">Category Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
              </div>
              <div>
                <Label className="text-gray-700">Description</Label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-md p-2"
                />
              </div>
              <div>
                <Label className="text-gray-700">Category Image</Label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input {...getInputProps()} />
                  {uploading ? (
                    <p className="text-gray-500">Uploading...</p>
                  ) : formData.image ? (
                    <div className="relative">
                      <img src={formData.image} alt="Preview" className="h-24 mx-auto rounded" />
                      <p className="text-xs text-gray-500 mt-2">Click or drag to replace</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-500 text-sm">Drop image or click to upload</p>
                    </>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-gray-700">Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) }))}
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-gray-700">Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeModal} className="flex-1 border-gray-200 text-gray-700">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {editingCategory ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantCategories;
