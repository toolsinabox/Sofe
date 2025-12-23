import React from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Tag, Loader2, Save } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Stable input component to prevent focus loss
const StableInput = React.memo(({ name, defaultValue, onBlur, className, ...props }) => {
  return (
    <input
      name={name}
      defaultValue={defaultValue || ''}
      onBlur={onBlur}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
      {...props}
    />
  );
});
StableInput.displayName = 'StableInput';

const CategoriesTab = ({
  categories,
  categoryForm,
  setCategoryForm,
  editingItem,
  setEditingItem,
  showCategoryModal,
  setShowCategoryModal,
  saving,
  setSaving,
  fetchAllData
}) => {
  const openCategoryModal = (category = null) => {
    if (category) {
      setEditingItem(category);
      setCategoryForm({
        code: category.code || '',
        name: category.name || '',
        description: category.description || '',
        is_default: category.is_default || false,
        is_active: category.is_active !== false
      });
    } else {
      setEditingItem(null);
      setCategoryForm({
        code: '',
        name: '',
        description: '',
        is_default: false,
        is_active: true
      });
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    setSaving(true);
    try {
      if (editingItem) {
        await axios.put(`${API}/shipping/categories/${editingItem.id}`, categoryForm);
      } else {
        await axios.post(`${API}/shipping/categories`, categoryForm);
      }
      await fetchAllData();
      setShowCategoryModal(false);
    } catch (error) {
      console.error('Error saving category:', error);
      alert(error.response?.data?.detail || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await axios.delete(`${API}/shipping/categories/${categoryId}`);
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Shipping Categories</h2>
          <p className="text-gray-500 text-sm">Categorize products for different shipping rules</p>
        </div>
        <Button onClick={() => openCategoryModal()} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl p-8 text-center border border-gray-200">
            <Tag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No shipping categories configured</p>
            <Button onClick={() => openCategoryModal()}>Create Your First Category</Button>
          </div>
        ) : (
          categories.map(category => (
            <div 
              key={category.id} 
              className={`bg-white rounded-xl p-5 border ${category.is_active ? 'border-gray-200' : 'border-gray-200/50 opacity-60'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-purple-400" />
                  <h3 className="text-gray-900 font-semibold">{category.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openCategoryModal(category)}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-gray-500 text-sm mb-3">{category.description || 'No description'}</p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-gray-700 text-gray-700 text-xs rounded font-mono">{category.code}</span>
                {category.is_default && (
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">Default</span>
                )}
                {!category.is_active && (
                  <span className="px-2 py-0.5 bg-gray-700 text-gray-500 text-xs rounded">Inactive</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent key={editingItem?.id || 'new-category'} className="bg-white border-gray-200 text-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Category' : 'Create Category'}</DialogTitle>
            <DialogDescription className="text-gray-500">
              Categorize products for specific shipping rules
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-700">Category Code</Label>
              <StableInput
                key={`cat-code-${editingItem?.id || 'new'}`}
                name="code"
                defaultValue={categoryForm.code}
                onBlur={(e) => setCategoryForm(prev => ({...prev, code: e.target.value.toLowerCase()}))}
                placeholder="e.g., bulky"
                className="bg-gray-700 border-gray-200 text-gray-900 mt-1"
                style={{textTransform: 'lowercase'}}
              />
            </div>
            <div>
              <Label className="text-gray-700">Category Name</Label>
              <StableInput
                key={`cat-name-${editingItem?.id || 'new'}`}
                name="name"
                defaultValue={categoryForm.name}
                onBlur={(e) => setCategoryForm(prev => ({...prev, name: e.target.value}))}
                placeholder="e.g., Bulky Items"
                className="bg-gray-700 border-gray-200 text-gray-900 mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Description</Label>
              <textarea
                key={`cat-desc-${editingItem?.id || 'new'}`}
                defaultValue={categoryForm.description}
                onBlur={(e) => setCategoryForm(prev => ({...prev, description: e.target.value}))}
                placeholder="Optional description..."
                rows={2}
                className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-200 rounded-md text-gray-900 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-700">Default Category</Label>
              <Switch
                checked={categoryForm.is_default}
                onCheckedChange={(checked) => setCategoryForm(prev => ({...prev, is_default: checked}))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-gray-700">Category Active</Label>
              <Switch
                checked={categoryForm.is_active}
                onCheckedChange={(checked) => setCategoryForm(prev => ({...prev, is_active: checked}))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryModal(false)} className="border-gray-200">
              Cancel
            </Button>
            <Button onClick={handleSaveCategory} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoriesTab;
