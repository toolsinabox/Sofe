import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, X, Save, Menu, Image, Link, GripVertical, ChevronDown, Wand2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantMegaMenu = () => {
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    columns: [],
    featured_image: '',
    featured_title: '',
    featured_link: '',
    is_active: true,
    sort_order: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [menusRes, catsRes] = await Promise.all([
        axios.get(`${API}/mega-menu`),
        axios.get(`${API}/categories`)
      ]);
      setMenus(menusRes.data);
      setCategories(catsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (menu = null) => {
    if (menu) {
      setEditingMenu(menu);
      setFormData(menu);
    } else {
      setEditingMenu(null);
      setFormData({
        title: '',
        category_id: '',
        columns: [{ id: Date.now().toString(), title: 'Column 1', items: [], width: 'auto' }],
        featured_image: '',
        featured_title: '',
        featured_link: '',
        is_active: true,
        sort_order: menus.length
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingMenu) {
        await axios.put(`${API}/mega-menu/${editingMenu.id}`, formData);
      } else {
        await axios.post(`${API}/mega-menu`, formData);
      }
      fetchData();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving menu:', error);
    }
  };

  const deleteMenu = async (menuId) => {
    if (!window.confirm('Delete this mega menu?')) return;
    try {
      await axios.delete(`${API}/mega-menu/${menuId}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting menu:', error);
    }
  };

  const autoGenerate = async () => {
    try {
      await axios.post(`${API}/mega-menu/generate-from-categories`);
      fetchData();
    } catch (error) {
      console.error('Error generating menus:', error);
    }
  };

  const addColumn = () => {
    setFormData({
      ...formData,
      columns: [...formData.columns, {
        id: Date.now().toString(),
        title: `Column ${formData.columns.length + 1}`,
        items: [],
        width: 'auto'
      }]
    });
  };

  const updateColumn = (index, field, value) => {
    const newColumns = [...formData.columns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    setFormData({ ...formData, columns: newColumns });
  };

  const removeColumn = (index) => {
    setFormData({
      ...formData,
      columns: formData.columns.filter((_, i) => i !== index)
    });
  };

  const addItemToColumn = (colIndex) => {
    const newColumns = [...formData.columns];
    newColumns[colIndex].items = [...(newColumns[colIndex].items || []), {
      id: Date.now().toString(),
      title: 'New Link',
      url: '#',
      type: 'link'
    }];
    setFormData({ ...formData, columns: newColumns });
  };

  const updateColumnItem = (colIndex, itemIndex, field, value) => {
    const newColumns = [...formData.columns];
    newColumns[colIndex].items[itemIndex] = { ...newColumns[colIndex].items[itemIndex], [field]: value };
    setFormData({ ...formData, columns: newColumns });
  };

  const removeColumnItem = (colIndex, itemIndex) => {
    const newColumns = [...formData.columns];
    newColumns[colIndex].items = newColumns[colIndex].items.filter((_, i) => i !== itemIndex);
    setFormData({ ...formData, columns: newColumns });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mega Menu</h1>
          <p className="text-gray-500 text-sm mt-1">Create rich dropdown menus for your navigation</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={autoGenerate} variant="outline" className="border-gray-200">
            <Wand2 size={16} className="mr-2" /> Auto-Generate
          </Button>
          <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700">
            <Plus size={16} className="mr-2" /> Add Menu
          </Button>
        </div>
      </div>

      {/* Menus Grid */}
      <div className="space-y-4">
        {menus.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <Menu size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-500 mb-4">No mega menus configured</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={autoGenerate} variant="outline" className="border-gray-200">
                <Wand2 size={16} className="mr-2" /> Generate from Categories
              </Button>
              <Button onClick={() => openModal()}>
                <Plus size={16} className="mr-2" /> Create Custom Menu
              </Button>
            </div>
          </div>
        ) : (
          menus.map((menu) => (
            <div key={menu.id} className={`bg-white rounded-lg p-6 border ${
              menu.is_active ? 'border-gray-200' : 'border-gray-200/50 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <GripVertical size={18} className="text-gray-600 cursor-grab" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{menu.title}</h3>
                    <p className="text-sm text-gray-500">
                      {menu.columns?.length || 0} columns • 
                      {menu.columns?.reduce((sum, c) => sum + (c.items?.length || 0), 0) || 0} links
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={menu.is_active}
                    onCheckedChange={async (checked) => {
                      await axios.put(`${API}/mega-menu/${menu.id}`, { is_active: checked });
                      fetchData();
                    }}
                  />
                  <button
                    onClick={() => openModal(menu)}
                    className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => deleteMenu(menu.id)}
                    className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex gap-6">
                  {menu.columns?.map((col, i) => (
                    <div key={i} className="flex-1">
                      {col.title && <p className="text-gray-500 text-xs font-medium mb-2">{col.title}</p>}
                      <div className="space-y-1">
                        {col.items?.slice(0, 4).map((item, j) => (
                          <p key={j} className="text-sm text-gray-500">{item.title}</p>
                        ))}
                        {col.items?.length > 4 && (
                          <p className="text-xs text-gray-600">+{col.items.length - 4} more</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {menu.featured_image && (
                    <div className="w-40 h-24 bg-white rounded overflow-hidden">
                      <img src={menu.featured_image} alt="Featured" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingMenu ? 'Edit Mega Menu' : 'Create Mega Menu'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">Menu Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Shop by Category"
                    className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Link to Category (Optional)</Label>
                  <select
                    value={formData.category_id || ''}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full h-10 px-3 bg-gray-700 border border-gray-200 rounded-md text-gray-900 mt-1"
                  >
                    <option value="">None</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Columns */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-gray-700">Menu Columns</Label>
                  <Button variant="outline" size="sm" onClick={addColumn} className="border-gray-200">
                    <Plus size={14} className="mr-1" /> Add Column
                  </Button>
                </div>
                <div className="space-y-4">
                  {formData.columns?.map((col, colIndex) => (
                    <div key={col.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Input
                          value={col.title || ''}
                          onChange={(e) => updateColumn(colIndex, 'title', e.target.value)}
                          placeholder="Column Title"
                          className="bg-gray-50 border-gray-200 text-gray-900 flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addItemToColumn(colIndex)}
                          className="border-gray-200"
                        >
                          <Plus size={14} className="mr-1" /> Link
                        </Button>
                        <button
                          onClick={() => removeColumn(colIndex)}
                          className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {col.items?.map((item, itemIndex) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <Input
                              value={item.title}
                              onChange={(e) => updateColumnItem(colIndex, itemIndex, 'title', e.target.value)}
                              placeholder="Link text"
                              className="bg-gray-50 border-gray-200 text-gray-900 text-sm flex-1"
                            />
                            <Input
                              value={item.url}
                              onChange={(e) => updateColumnItem(colIndex, itemIndex, 'url', e.target.value)}
                              placeholder="URL"
                              className="bg-gray-50 border-gray-200 text-gray-900 text-sm flex-1"
                            />
                            <button
                              onClick={() => removeColumnItem(colIndex, itemIndex)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Featured Section */}
              <div>
                <Label className="text-gray-700 mb-3 block">Featured Section (Optional)</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Input
                      value={formData.featured_title || ''}
                      onChange={(e) => setFormData({ ...formData, featured_title: e.target.value })}
                      placeholder="Featured Title"
                      className="bg-gray-50 border-gray-200 text-gray-900"
                    />
                  </div>
                  <div>
                    <Input
                      value={formData.featured_image || ''}
                      onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                      placeholder="Image URL"
                      className="bg-gray-50 border-gray-200 text-gray-900"
                    />
                  </div>
                  <div>
                    <Input
                      value={formData.featured_link || ''}
                      onChange={(e) => setFormData({ ...formData, featured_link: e.target.value })}
                      placeholder="Link URL"
                      className="bg-gray-50 border-gray-200 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Active */}
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Menu Active</span>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <Button variant="outline" onClick={() => setShowModal(false)} className="border-gray-200">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                <Save size={16} className="mr-2" /> {editingMenu ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantMegaMenu;
