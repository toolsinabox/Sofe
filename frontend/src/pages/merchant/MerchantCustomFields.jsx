import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Checkbox } from '../../components/ui/checkbox';
import { 
  Tags, Plus, Edit, Trash2, Copy, Search, Package, FolderTree, FileText, 
  Newspaper, ShoppingCart, Users, Code, GripVertical, CheckCircle, XCircle,
  Type, Hash, List, ToggleLeft, Calendar, Link, Mail, Palette, Image, Info
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Section icons mapping
const sectionIcons = {
  products: Package,
  categories: FolderTree,
  pages: FileText,
  blog_posts: Newspaper,
  orders: ShoppingCart,
  customers: Users
};

// Field type icons mapping
const fieldTypeIcons = {
  text: Type,
  textarea: FileText,
  number: Hash,
  select: List,
  checkbox: ToggleLeft,
  date: Calendar,
  url: Link,
  email: Mail,
  color: Palette,
  image: Image
};

export default function MerchantCustomFields() {
  const [fields, setFields] = useState([]);
  const [sections, setSections] = useState([]);
  const [fieldTypes, setFieldTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [activeSection, setActiveSection] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    field_key: '',
    field_type: 'text',
    description: '',
    placeholder: '',
    default_value: '',
    is_required: false,
    assigned_to: [],
    options: [],
    min_value: '',
    max_value: '',
    sort_order: 0,
    is_active: true,
    show_in_storefront: true
  });

  const [newOption, setNewOption] = useState({ label: '', value: '' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [fieldsRes, sectionsRes, typesRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/custom-fields`),
        axios.get(`${BACKEND_URL}/api/custom-fields/sections`),
        axios.get(`${BACKEND_URL}/api/custom-fields/field-types`)
      ]);
      setFields(fieldsRes.data.fields || []);
      setSections(sectionsRes.data.sections || []);
      setFieldTypes(typesRes.data.field_types || []);
    } catch (error) {
      console.error('Failed to fetch custom fields:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormData({
      name: '',
      field_key: '',
      field_type: 'text',
      description: '',
      placeholder: '',
      default_value: '',
      is_required: false,
      assigned_to: [],
      options: [],
      min_value: '',
      max_value: '',
      sort_order: 0,
      is_active: true,
      show_in_storefront: true
    });
    setNewOption({ label: '', value: '' });
  };

  const openCreateModal = () => {
    resetForm();
    setEditingField(null);
    setShowModal(true);
  };

  const openEditModal = (field) => {
    setEditingField(field);
    setFormData({
      name: field.name || '',
      field_key: field.field_key || '',
      field_type: field.field_type || 'text',
      description: field.description || '',
      placeholder: field.placeholder || '',
      default_value: field.default_value || '',
      is_required: field.is_required || false,
      assigned_to: field.assigned_to || [],
      options: field.options || [],
      min_value: field.min_value?.toString() || '',
      max_value: field.max_value?.toString() || '',
      sort_order: field.sort_order || 0,
      is_active: field.is_active !== false,
      show_in_storefront: field.show_in_storefront !== false
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        min_value: formData.min_value ? parseFloat(formData.min_value) : null,
        max_value: formData.max_value ? parseFloat(formData.max_value) : null
      };

      if (editingField) {
        await axios.put(`${BACKEND_URL}/api/custom-fields/${editingField.id}`, payload);
      } else {
        await axios.post(`${BACKEND_URL}/api/custom-fields`, payload);
      }
      
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save custom field:', error);
      alert(error.response?.data?.detail || 'Failed to save custom field');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this custom field? This will not remove data already saved.')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/custom-fields/${id}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const toggleSection = (sectionId) => {
    setFormData(prev => ({
      ...prev,
      assigned_to: prev.assigned_to.includes(sectionId)
        ? prev.assigned_to.filter(s => s !== sectionId)
        : [...prev.assigned_to, sectionId]
    }));
  };

  const addOption = () => {
    if (!newOption.label || !newOption.value) return;
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { ...newOption }]
    }));
    setNewOption({ label: '', value: '' });
  };

  const removeOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const copyTag = (fieldKey) => {
    navigator.clipboard.writeText(`{{custom_${fieldKey}}}`);
    alert('Tag copied to clipboard!');
  };

  const generateFieldKey = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  };

  // Filter fields based on active section and search
  const filteredFields = fields.filter(field => {
    const matchesSection = activeSection === 'all' || field.assigned_to?.includes(activeSection);
    const matchesSearch = !searchTerm || 
      field.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.field_key?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSection && matchesSearch;
  });

  const getFieldTypeIcon = (type) => {
    const Icon = fieldTypeIcons[type] || Type;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Fields</h1>
          <p className="text-gray-500">Create custom fields and tags for your store content</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" /> Add Custom Field
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Tags className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fields.length}</p>
                <p className="text-sm text-gray-500">Total Fields</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fields.filter(f => f.is_active).length}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fields.filter(f => f.assigned_to?.includes('products')).length}</p>
                <p className="text-sm text-gray-500">Product Fields</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Code className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fields.filter(f => f.show_in_storefront).length}</p>
                <p className="text-sm text-gray-500">Template Tags</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={activeSection} onValueChange={setActiveSection}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sections.map(section => (
              <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Fields List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : filteredFields.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Tags className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">No custom fields yet</p>
              <p className="text-sm mt-2">Create your first custom field to get started</p>
              <Button className="mt-4" onClick={openCreateModal}>
                <Plus className="w-4 h-4 mr-2" /> Add Custom Field
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {filteredFields.map(field => (
                <div key={field.id} className="p-4 hover:bg-gray-50 flex items-center gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getFieldTypeIcon(field.field_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium">{field.name}</span>
                      {!field.is_active && <Badge variant="outline" className="text-gray-500">Inactive</Badge>}
                      {field.is_required && <Badge className="bg-red-100 text-red-800">Required</Badge>}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <code className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                        {`{{custom_${field.field_key}}}`}
                      </code>
                      <span>•</span>
                      <span className="capitalize">{field.field_type}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      {field.assigned_to?.map(section => {
                        const SectionIcon = sectionIcons[section] || Tags;
                        return (
                          <Badge key={section} variant="outline" className="text-xs">
                            <SectionIcon className="w-3 h-3 mr-1" />
                            {sections.find(s => s.id === section)?.name || section}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyTag(field.field_key)}
                      title="Copy tag"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openEditModal(field)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(field.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How to Use Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="w-5 h-5" /> How to Use Custom Fields
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-3">
          <p><strong>1. Create a field:</strong> Define the field name, type, and assign it to sections (Products, Categories, Pages, etc.)</p>
          <p><strong>2. Fill in values:</strong> Go to the respective editor (e.g., Product Editor) and you&apos;ll see your custom fields to fill out.</p>
          <p><strong>3. Display on frontend:</strong> Use the template tag (e.g., <code className="px-1 bg-gray-100 rounded">{`{{custom_warranty_info}}`}</code>) in your theme HTML to display the value.</p>
          <p><strong>Example tags:</strong></p>
          <ul className="list-disc list-inside ml-4">
            <li><code className="px-1 bg-gray-100 rounded">{`{{custom_warranty_info}}`}</code> - Display warranty info on product page</li>
            <li><code className="px-1 bg-gray-100 rounded">{`{{custom_material}}`}</code> - Display product material</li>
            <li><code className="px-1 bg-gray-100 rounded">{`{{custom_category_banner}}`}</code> - Display category banner image</li>
          </ul>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingField ? 'Edit Custom Field' : 'Create Custom Field'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Field Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      name: e.target.value,
                      field_key: prev.field_key || generateFieldKey(e.target.value)
                    }));
                  }}
                  placeholder="e.g., Warranty Information"
                />
              </div>
              <div>
                <Label>Field Key (for template) *</Label>
                <Input
                  value={formData.field_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, field_key: e.target.value }))}
                  placeholder="e.g., warranty_info"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tag: <code className="bg-gray-100 px-1 rounded">{`{{custom_${formData.field_key || 'field_key'}}}`}</code>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Field Type</Label>
                <Select value={formData.field_type} onValueChange={(v) => setFormData(prev => ({ ...prev, field_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          {getFieldTypeIcon(type.id)}
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label>Description / Help Text</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Help text shown in the editor"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Placeholder</Label>
                <Input
                  value={formData.placeholder}
                  onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
                  placeholder="Placeholder text"
                />
              </div>
              <div>
                <Label>Default Value</Label>
                <Input
                  value={formData.default_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, default_value: e.target.value }))}
                  placeholder="Default value"
                />
              </div>
            </div>

            {/* Number field options */}
            {formData.field_type === 'number' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Value</Label>
                  <Input
                    type="number"
                    value={formData.min_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_value: e.target.value }))}
                    placeholder="Minimum"
                  />
                </div>
                <div>
                  <Label>Max Value</Label>
                  <Input
                    type="number"
                    value={formData.max_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_value: e.target.value }))}
                    placeholder="Maximum"
                  />
                </div>
              </div>
            )}

            {/* Select options */}
            {formData.field_type === 'select' && (
              <div>
                <Label>Dropdown Options</Label>
                <div className="space-y-2 mt-2">
                  {formData.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <span className="flex-1">{opt.label}</span>
                      <code className="text-xs bg-gray-200 px-1 rounded">{opt.value}</code>
                      <Button variant="ghost" size="sm" onClick={() => removeOption(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Label"
                      value={newOption.label}
                      onChange={(e) => setNewOption(prev => ({ ...prev, label: e.target.value }))}
                    />
                    <Input
                      placeholder="Value"
                      value={newOption.value}
                      onChange={(e) => setNewOption(prev => ({ ...prev, value: e.target.value }))}
                    />
                    <Button variant="outline" onClick={addOption}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Assign to Sections */}
            <div>
              <Label>Assign to Sections *</Label>
              <p className="text-xs text-gray-500 mb-2">Select where this field should appear</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {sections.map(section => {
                  const SectionIcon = sectionIcons[section.id] || Tags;
                  const isSelected = formData.assigned_to.includes(section.id);
                  return (
                    <div
                      key={section.id}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleSection(section.id)}
                    >
                      <Checkbox checked={isSelected} />
                      <SectionIcon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                      <span className="text-sm font-medium">{section.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6 pt-4 border-t">
              <label className="flex items-center gap-2">
                <Switch
                  checked={formData.is_required}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_required: v }))}
                />
                <span className="text-sm">Required field</span>
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_active: v }))}
                />
                <span className="text-sm">Active</span>
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={formData.show_in_storefront}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, show_in_storefront: v }))}
                />
                <span className="text-sm">Show in storefront templates</span>
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.name || !formData.field_key || formData.assigned_to.length === 0}
            >
              {editingField ? 'Update Field' : 'Create Field'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
