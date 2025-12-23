import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Grid,
  List,
  X,
  Save,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Package,
  DollarSign,
  Barcode,
  Tag,
  Image as ImageIcon,
  Box,
  Truck,
  Globe,
  Eye,
  Star,
  Info,
  Upload,
  Code,
  Layers,
  Bookmark,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ListOrdered,
  Link2,
  Type,
  Heading1,
  Heading2,
  Quote,
  Minus,
  Undo,
  Redo
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import { useDropzone } from 'react-dropzone';
import { HelpCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Image Slot Component with Drag & Drop
const ImageSlot = ({ index, image, onImageChange, onImageRemove, onDragStart, onDragOver, onDrop, isDragging }) => {
  const slotNumber = index + 1;
  const [uploading, setUploading] = useState(false);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'] },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', acceptedFiles[0]);
        try {
          const response = await axios.post(`${API}/upload/products`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          const imageUrl = `${BACKEND_URL}${response.data.url}`;
          onImageChange(index, imageUrl);
        } catch (error) {
          console.error('Upload failed:', error);
          alert('Failed to upload image');
        }
        setUploading(false);
      }
    }
  });
  
  return (
    <div
      draggable={!!image}
      onDragStart={(e) => image && onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      className={`relative aspect-square rounded-lg border-2 transition-all ${
        isDragging ? 'border-blue-500 bg-blue-500/10' : 
        image ? 'border-gray-300 bg-gray-100' : 'border-dashed border-gray-200 bg-gray-50'
      } ${image ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {/* Slot Number Badge */}
      <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono text-gray-500">
        {slotNumber}
      </div>
      
      {/* Template Tag Badge */}
      <div className="absolute top-1 right-1 z-10 px-1.5 py-0.5 bg-emerald-500/20 rounded text-[10px] font-mono text-emerald-400">
        [@image{slotNumber}@]
      </div>
      
      {image ? (
        <>
          <img 
            src={image} 
            alt={`Product image ${slotNumber}`} 
            className="w-full h-full object-cover rounded-lg"
            onError={(e) => {
              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23374151" width="100" height="100"/%3E%3Ctext x="50" y="55" fill="%236b7280" font-size="12" text-anchor="middle"%3EError%3C/text%3E%3C/svg%3E';
            }}
          />
          {/* Overlay with actions */}
          <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onImageRemove(index); }}
              className="p-2 bg-red-500 rounded-full text-gray-900 hover:bg-red-600 transition-colors"
              title="Remove image"
            >
              <Trash2 size={16} />
            </button>
          </div>
          {/* Primary badge */}
          {index === 0 && (
            <span className="absolute bottom-1 left-1 px-2 py-0.5 bg-emerald-500 text-gray-900 text-[10px] font-medium rounded">
              Primary
            </span>
          )}
          {/* Drag handle indicator */}
          <div className="absolute bottom-1 right-1 p-1 bg-gray-100 rounded text-gray-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="5" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="19" cy="5" r="2"/>
              <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
              <circle cx="5" cy="19" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
            </svg>
          </div>
        </>
      ) : (
        <div {...getRootProps()} className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
          <input {...getInputProps()} />
          {uploading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          ) : (
            <>
              <Upload size={20} className={`mb-1 ${isDragActive ? 'text-blue-400' : 'text-gray-500'}`} />
              <span className="text-[10px] text-gray-500 text-center px-1">
                {isDragActive ? 'Drop here' : 'Drop or click'}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Template Tag Display Component
const TemplateTag = ({ tag, description }) => {
  const [copied, setCopied] = useState(false);
  
  const copyTag = () => {
    navigator.clipboard.writeText(tag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="flex items-center gap-2 py-1 group">
      <button
        onClick={copyTag}
        className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-100 rounded text-xs font-mono text-emerald-400 transition-colors"
        title="Click to copy"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        <span>{tag}</span>
      </button>
      <span className="text-gray-500 text-xs">{description}</span>
    </div>
  );
};

// Base Tags - Pre-defined system tags for product classification
const BASE_TAGS = [
  { id: 'new', label: 'New Arrival', color: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'bestseller', label: 'Best Seller', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'clearance', label: 'Clearance', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'limited', label: 'Limited Edition', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'exclusive', label: 'Exclusive', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'eco', label: 'Eco-Friendly', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'handmade', label: 'Handmade', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'imported', label: 'Imported', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'australian', label: 'Australian Made', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { id: 'warranty', label: 'Extended Warranty', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { id: 'gift', label: 'Gift Ready', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { id: 'bundle', label: 'Bundle Deal', color: 'bg-orange-100 text-orange-700 border-orange-200' },
];

// Product Editor Modal
const ProductEditor = ({ product, categories, onSave, onClose, templateTags }) => {
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    subtitle: '',
    description: '',
    short_description: '',
    // Pricing
    price: '',
    compare_price: '',
    cost_price: '',
    tax_class: 'standard',
    // Identification
    sku: '',
    barcode: '',
    mpn: '',
    // Categorization
    category_id: '', // Keep for backward compatibility
    category_ids: [], // New: Multiple categories
    brand: '',
    manufacturer: '',
    tags: [],
    base_tags: [], // Pre-defined system tags
    // Images - 12 slots (can be sparse, e.g., slot 12 filled but not 11)
    images: Array(12).fill(null),
    thumbnail: '',
    // Inventory
    stock: '',
    low_stock_threshold: '10',
    track_inventory: true,
    allow_backorder: false,
    // Pre-Order
    preorder_enabled: false,
    preorder_qty: '',
    preorder_arrival_date: '',
    preorder_message: '',
    // Shipping
    weight: '',
    length: '',
    width: '',
    height: '',
    shipping_class: '',
    requires_shipping: true,
    // SEO
    meta_title: '',
    meta_description: '',
    url_slug: '',
    // Visibility
    is_active: true,
    is_featured: false,
    visibility: 'visible',
    // Specifics/Attributes
    specifics: [],
    // Custom
    custom_fields: {},
    ...product
  });
  
  const [activeTab, setActiveTab] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newTag, setNewTag] = useState('');
  const [showTagsPanel, setShowTagsPanel] = useState(false);
  const [newSpecName, setNewSpecName] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  
  // Description Editor State
  const [descriptionEditorMode, setDescriptionEditorMode] = useState('wysiwyg'); // 'wysiwyg' or 'source'
  const wysiwygRef = useRef(null);
  
  useEffect(() => {
    if (product) {
      setFormData(prev => ({
        ...prev,
        ...product,
        price: product.price?.toString() || '',
        compare_price: product.compare_price?.toString() || '',
        cost_price: product.cost_price?.toString() || '',
        stock: product.stock?.toString() || '',
        low_stock_threshold: product.low_stock_threshold?.toString() || '10',
        weight: product.weight?.toString() || '',
        length: product.length?.toString() || '',
        width: product.width?.toString() || '',
        height: product.height?.toString() || '',
        tags: product.tags || [],
        base_tags: product.base_tags || [],
        specifics: product.specifics || [],
        // Handle multiple categories - convert from category_id if needed
        category_ids: product.category_ids || (product.category_id ? [product.category_id] : []),
        // Convert images array to 12-slot format
        images: (() => {
          const slots = Array(12).fill(null);
          const productImages = product.images || [];
          productImages.forEach((img, idx) => {
            if (idx < 12 && img) slots[idx] = img;
          });
          return slots;
        })(),
      }));
    }
  }, [product]);
  
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // Image slot management
  const handleImageChange = (index, url) => {
    setFormData(prev => {
      const newImages = [...prev.images];
      newImages[index] = url;
      return { ...prev, images: newImages };
    });
  };
  
  const handleImageRemove = (index) => {
    setFormData(prev => {
      const newImages = [...prev.images];
      newImages[index] = null;
      return { ...prev, images: newImages };
    });
  };
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }
    
    setFormData(prev => {
      const newImages = [...prev.images];
      // Swap images
      const temp = newImages[draggedIndex];
      newImages[draggedIndex] = newImages[targetIndex];
      newImages[targetIndex] = temp;
      return { ...prev, images: newImages };
    });
    setDraggedIndex(null);
  };
  
  const addImage = () => {
    if (newImageUrl.trim()) {
      // Find first empty slot
      const emptyIndex = formData.images.findIndex(img => !img);
      if (emptyIndex !== -1) {
        handleImageChange(emptyIndex, newImageUrl.trim());
      } else {
        alert('All 12 image slots are filled');
      }
      setNewImageUrl('');
    }
  };
  
  const removeImage = (index) => {
    handleImageRemove(index);
  };
  
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };
  
  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };
  
  // Base tags management
  const toggleBaseTag = (tagId) => {
    setFormData(prev => ({
      ...prev,
      base_tags: prev.base_tags.includes(tagId)
        ? prev.base_tags.filter(t => t !== tagId)
        : [...prev.base_tags, tagId]
    }));
  };
  
  // Specifics/Attributes management
  const addSpecific = () => {
    if (newSpecName.trim() && newSpecValue.trim()) {
      setFormData(prev => ({
        ...prev,
        specifics: [...prev.specifics, { name: newSpecName.trim(), value: newSpecValue.trim() }]
      }));
      setNewSpecName('');
      setNewSpecValue('');
    }
  };
  
  const removeSpecific = (index) => {
    setFormData(prev => ({
      ...prev,
      specifics: prev.specifics.filter((_, i) => i !== index)
    }));
  };
  
  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        compare_price: formData.compare_price ? parseFloat(formData.compare_price) : null,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        stock: parseInt(formData.stock) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 10,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        length: formData.length ? parseFloat(formData.length) : null,
        width: formData.width ? parseFloat(formData.width) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        // Keep all 12 image slots (preserves positions, nulls become empty strings for API)
        images: formData.images.map(img => img || ''),
      };
      await onSave(dataToSave);
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Package },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'identification', label: 'SKU & Codes', icon: Barcode },
    { id: 'categorization', label: 'Categories', icon: Tag },
    { id: 'specifics', label: 'Specifics', icon: Layers },
    { id: 'images', label: 'Images', icon: ImageIcon },
    { id: 'inventory', label: 'Inventory', icon: Box },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'seo', label: 'SEO', icon: Globe },
    { id: 'visibility', label: 'Visibility', icon: Eye },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">
              {product?.id ? 'Edit Product' : 'Add New Product'}
            </h2>
            {product?.sku && (
              <span className="px-2 py-1 bg-gray-100 rounded text-gray-500 text-sm">
                SKU: {product.sku}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTagsPanel(!showTagsPanel)}
              className={`text-gray-500 hover:text-gray-900 ${showTagsPanel ? 'bg-gray-100' : ''}`}
            >
              <Code size={16} className="mr-2" />
              Template Tags
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-500 hover:text-gray-900">
              <X size={20} />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-4 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-emerald-400 border-emerald-400'
                      : 'text-gray-500 border-transparent hover:text-gray-900'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Basic Info Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-6 max-w-3xl">
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      Product Name *
                      <span className="text-xs text-gray-500 font-mono">[@product_name@]</span>
                    </Label>
                    <Input
                      className="bg-gray-50 border-gray-200 text-gray-900"
                      placeholder="Enter product name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      Subtitle
                      <span className="text-xs text-gray-500 font-mono">[@product_subtitle@]</span>
                    </Label>
                    <Input
                      className="bg-gray-50 border-gray-200 text-gray-900"
                      placeholder="Product tagline or subtitle"
                      value={formData.subtitle || ''}
                      onChange={(e) => handleChange('subtitle', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      Short Description
                      <span className="text-xs text-gray-500 font-mono">[@product_short_description@]</span>
                    </Label>
                    <Textarea
                      className="bg-gray-50 border-gray-200 text-gray-900 min-h-20"
                      placeholder="Brief product summary (displayed in listings)"
                      value={formData.short_description || ''}
                      onChange={(e) => handleChange('short_description', e.target.value)}
                    />
                  </div>
                  
                  {/* Full Description with WYSIWYG/Source Editor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-700 flex items-center gap-2">
                        Full Description
                        <span className="text-xs text-gray-500 font-mono">[@product_description@]</span>
                      </Label>
                      {/* Editor Mode Toggle */}
                      <div className="flex bg-gray-100 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => setDescriptionEditorMode('wysiwyg')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            descriptionEditorMode === 'wysiwyg' 
                              ? 'bg-white text-gray-900 shadow-sm' 
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <Type className="w-3.5 h-3.5" />
                          WYSIWYG
                        </button>
                        <button
                          type="button"
                          onClick={() => setDescriptionEditorMode('source')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            descriptionEditorMode === 'source' 
                              ? 'bg-white text-gray-900 shadow-sm' 
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <Code className="w-3.5 h-3.5" />
                          Source Code
                        </button>
                      </div>
                    </div>

                    {/* WYSIWYG Editor */}
                    {descriptionEditorMode === 'wysiwyg' && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                        {/* Toolbar */}
                        <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 flex-wrap">
                          {/* Text Formatting */}
                          <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200">
                            <button
                              type="button"
                              onClick={() => document.execCommand('bold')}
                              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                              title="Bold (Ctrl+B)"
                            >
                              <Bold className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => document.execCommand('italic')}
                              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                              title="Italic (Ctrl+I)"
                            >
                              <Italic className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => document.execCommand('underline')}
                              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                              title="Underline (Ctrl+U)"
                            >
                              <Underline className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>

                          {/* Headings */}
                          <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
                            <button
                              type="button"
                              onClick={() => document.execCommand('formatBlock', false, 'h2')}
                              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                              title="Heading 1"
                            >
                              <Heading1 className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => document.execCommand('formatBlock', false, 'h3')}
                              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                              title="Heading 2"
                            >
                              <Heading2 className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => document.execCommand('formatBlock', false, 'p')}
                              className="p-1.5 rounded hover:bg-gray-200 transition-colors text-xs font-medium text-gray-600"
                              title="Paragraph"
                            >
                              ¶
                            </button>
                          </div>

                          {/* Alignment */}
                          <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
                            <button
                              type="button"
                              onClick={() => document.execCommand('justifyLeft')}
                              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                              title="Align Left"
                            >
                              <AlignLeft className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => document.execCommand('justifyCenter')}
                              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                              title="Align Center"
                            >
                              <AlignCenter className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => document.execCommand('justifyRight')}
                              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                              title="Align Right"
                            >
                              <AlignRight className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>

                          {/* Lists */}
                          <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
                            <button
                              type="button"
                              onClick={() => document.execCommand('insertUnorderedList')}
                              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                              title="Bullet List"
                            >
                              <List className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => document.execCommand('insertOrderedList')}
                              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                              title="Numbered List"
                            >
                              <ListOrdered className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>

                          {/* Insert */}
                          <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
                            <button
                              type="button"
                              onClick={() => {
                                const url = prompt('Enter URL:');
                                if (url) document.execCommand('createLink', false, url);
                              }}
                              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                              title="Insert Link"
                            >
                              <Link2 className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const url = prompt('Enter image URL:');
                                if (url) document.execCommand('insertImage', false, url);
                              }}
                              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                              title="Insert Image"
                            >
                              <ImageIcon className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => document.execCommand('formatBlock', false, 'blockquote')}
                              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                              title="Quote"
                            >
                              <Quote className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => document.execCommand('insertHorizontalRule')}
                              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                              title="Horizontal Line"
                            >
                              <Minus className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>

                          {/* Undo/Redo */}
                          <div className="flex items-center gap-0.5 pl-2">
                            <button
                              type="button"
                              onClick={() => document.execCommand('undo')}
                              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                              title="Undo (Ctrl+Z)"
                            >
                              <Undo className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => document.execCommand('redo')}
                              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                              title="Redo (Ctrl+Y)"
                            >
                              <Redo className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </div>

                        {/* Editable Content Area */}
                        <div
                          ref={wysiwygRef}
                          contentEditable
                          className="min-h-48 p-4 text-gray-900 focus:outline-none prose prose-sm max-w-none"
                          style={{ minHeight: '200px' }}
                          dangerouslySetInnerHTML={{ __html: formData.description || '' }}
                          onBlur={(e) => handleChange('description', e.currentTarget.innerHTML)}
                          onInput={(e) => handleChange('description', e.currentTarget.innerHTML)}
                        />

                        {/* Status Bar */}
                        <div className="px-3 py-1.5 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                          <span>Visual Editor • Click to edit</span>
                          <span>{(formData.description || '').replace(/<[^>]*>/g, '').length} characters</span>
                        </div>
                      </div>
                    )}

                    {/* Source Code Editor */}
                    {descriptionEditorMode === 'source' && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Source Code Header */}
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-800 text-gray-300">
                          <div className="flex items-center gap-2">
                            <Code className="w-4 h-4" />
                            <span className="text-xs font-medium">HTML Source</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">UTF-8</span>
                            <span className="text-gray-500">•</span>
                            <span>{(formData.description || '').length} chars</span>
                          </div>
                        </div>

                        {/* Code Editor with Line Numbers */}
                        <div className="relative flex bg-gray-900">
                          {/* Line Numbers */}
                          <div className="w-10 bg-gray-800 text-right pr-2 pt-3 text-xs text-gray-500 font-mono select-none border-r border-gray-700">
                            {Array.from({ length: Math.max((formData.description || '').split('\n').length, 10) }, (_, i) => (
                              <div key={i} className="h-5 leading-5">{i + 1}</div>
                            ))}
                          </div>
                          
                          {/* Code Area */}
                          <textarea
                            className="flex-1 min-h-48 p-3 font-mono text-sm bg-gray-900 text-green-400 resize-none focus:outline-none"
                            style={{ lineHeight: '1.25rem', tabSize: 2 }}
                            value={formData.description || ''}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="<p>Enter your HTML content here...</p>"
                            spellCheck={false}
                          />
                        </div>

                        {/* Quick HTML Tags */}
                        <div className="px-3 py-2 border-t border-gray-700 bg-gray-800 flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-400">Quick Insert:</span>
                          {[
                            { tag: '<p></p>', label: 'P' },
                            { tag: '<h2></h2>', label: 'H2' },
                            { tag: '<h3></h3>', label: 'H3' },
                            { tag: '<strong></strong>', label: 'B' },
                            { tag: '<em></em>', label: 'I' },
                            { tag: '<ul><li></li></ul>', label: 'UL' },
                            { tag: '<ol><li></li></ol>', label: 'OL' },
                            { tag: '<a href=""></a>', label: 'Link' },
                            { tag: '<img src="" alt="" />', label: 'Img' },
                            { tag: '<br />', label: 'BR' },
                            { tag: '<hr />', label: 'HR' },
                            { tag: '<div class=""></div>', label: 'Div' },
                          ].map(item => (
                            <button
                              key={item.tag}
                              type="button"
                              onClick={() => {
                                const currentVal = formData.description || '';
                                handleChange('description', currentVal + item.tag);
                              }}
                              className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors font-mono"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preview Toggle */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {descriptionEditorMode === 'wysiwyg' 
                          ? 'Format text visually • Switch to Source Code for HTML editing' 
                          : 'Edit raw HTML • Switch to WYSIWYG for visual editing'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const preview = document.getElementById('description-preview');
                          if (preview) {
                            preview.classList.toggle('hidden');
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        Toggle Preview
                      </button>
                    </div>

                    {/* Live Preview */}
                    <div id="description-preview" className="hidden border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="text-xs text-gray-500 mb-2 font-medium">Preview:</div>
                      <div 
                        className="prose prose-sm max-w-none text-gray-900"
                        dangerouslySetInnerHTML={{ __html: formData.description || '<em>No content yet...</em>' }}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Pricing Tab */}
              {activeTab === 'pricing' && (
                <div className="space-y-6 max-w-3xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-700 flex items-center gap-2">
                        Selling Price *
                        <span className="text-xs text-gray-500 font-mono">[@product_price@]</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="bg-gray-50 border-gray-200 text-gray-900 pl-7"
                          placeholder="0.00"
                          value={formData.price}
                          onChange={(e) => handleChange('price', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-gray-700 flex items-center gap-2">
                        Compare Price (RRP)
                        <span className="text-xs text-gray-500 font-mono">[@product_rrp@]</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="bg-gray-50 border-gray-200 text-gray-900 pl-7"
                          placeholder="0.00"
                          value={formData.compare_price || ''}
                          onChange={(e) => handleChange('compare_price', e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-gray-500">If higher than selling price, product shows as &quot;On Sale&quot;</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-700 flex items-center gap-2">
                        Cost Price
                        <span className="text-xs text-gray-500 font-mono">[@product_cost@]</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="bg-gray-50 border-gray-200 text-gray-900 pl-7"
                          placeholder="0.00"
                          value={formData.cost_price || ''}
                          onChange={(e) => handleChange('cost_price', e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-gray-500">Your cost (not shown to customers)</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-gray-700 flex items-center gap-2">
                        Tax Class
                        <span className="text-xs text-gray-500 font-mono">[@product_tax_class@]</span>
                      </Label>
                      <Select value={formData.tax_class} onValueChange={(v) => handleChange('tax_class', v)}>
                        <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          <SelectItem value="standard" className="text-gray-700">Standard Rate</SelectItem>
                          <SelectItem value="reduced" className="text-gray-700">Reduced Rate</SelectItem>
                          <SelectItem value="zero" className="text-gray-700">Zero Rate</SelectItem>
                          <SelectItem value="exempt" className="text-gray-700">Tax Exempt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {formData.price && formData.compare_price && parseFloat(formData.compare_price) > parseFloat(formData.price) && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <p className="text-emerald-400 text-sm flex items-center gap-2">
                        <Tag size={16} />
                        This product will display as &quot;On Sale&quot; with {Math.round((1 - parseFloat(formData.price) / parseFloat(formData.compare_price)) * 100)}% off
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Identification Tab */}
              {activeTab === 'identification' && (
                <div className="space-y-6 max-w-3xl">
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      SKU (Stock Keeping Unit) *
                      <span className="text-xs text-gray-500 font-mono">[@product_sku@]</span>
                    </Label>
                    <Input
                      className="bg-gray-50 border-gray-200 text-gray-900"
                      placeholder="e.g., PROD-001"
                      value={formData.sku}
                      onChange={(e) => handleChange('sku', e.target.value)}
                    />
                    <p className="text-xs text-gray-500">Unique identifier for your inventory system</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      Barcode / UPC / EAN
                      <span className="text-xs text-gray-500 font-mono">[@product_barcode@]</span>
                    </Label>
                    <Input
                      className="bg-gray-50 border-gray-200 text-gray-900"
                      placeholder="e.g., 012345678901"
                      value={formData.barcode || ''}
                      onChange={(e) => handleChange('barcode', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      MPN (Manufacturer Part Number)
                      <span className="text-xs text-gray-500 font-mono">[@product_mpn@]</span>
                    </Label>
                    <Input
                      className="bg-gray-50 border-gray-200 text-gray-900"
                      placeholder="Manufacturer's product code"
                      value={formData.mpn || ''}
                      onChange={(e) => handleChange('mpn', e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              {/* Categorization Tab */}
              {activeTab === 'categorization' && (
                <div className="space-y-6 max-w-3xl">
                  {/* Multiple Categories Selection */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      Categories
                      <span className="text-xs text-gray-500 font-mono">[@product_category@]</span>
                    </Label>
                    <p className="text-xs text-gray-500">Select one or more categories for this product</p>
                    
                    {/* Selected Categories Pills */}
                    {formData.category_ids && formData.category_ids.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        {formData.category_ids.map(catId => {
                          const category = categories.find(c => c.id === catId);
                          return category ? (
                            <span 
                              key={catId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-sm border border-yellow-200"
                            >
                              {category.name}
                              <button
                                type="button"
                                onClick={() => {
                                  const newIds = formData.category_ids.filter(id => id !== catId);
                                  handleChange('category_ids', newIds);
                                  // Also update category_id for backward compatibility
                                  handleChange('category_id', newIds[0] || '');
                                }}
                                className="hover:bg-yellow-200 rounded-full p-0.5 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}

                    {/* Category Checkboxes */}
                    <div className="border border-gray-200 rounded-lg bg-white max-h-64 overflow-y-auto">
                      {categories.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No categories available. Create categories first.
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {categories.map(cat => {
                            const isSelected = formData.category_ids?.includes(cat.id);
                            return (
                              <label
                                key={cat.id}
                                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                                  isSelected ? 'bg-yellow-50' : ''
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    let newIds;
                                    if (e.target.checked) {
                                      newIds = [...(formData.category_ids || []), cat.id];
                                    } else {
                                      newIds = (formData.category_ids || []).filter(id => id !== cat.id);
                                    }
                                    handleChange('category_ids', newIds);
                                    // Also update category_id for backward compatibility (use first selected)
                                    handleChange('category_id', newIds[0] || '');
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                                />
                                <div className="flex-1">
                                  <span className="text-gray-900 text-sm font-medium">{cat.name}</span>
                                  {cat.description && (
                                    <p className="text-xs text-gray-500">{cat.description}</p>
                                  )}
                                </div>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-yellow-500" />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleChange('category_ids', categories.map(c => c.id));
                          handleChange('category_id', categories[0]?.id || '');
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          handleChange('category_ids', []);
                          handleChange('category_id', '');
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Clear All
                      </button>
                      <span className="flex-1"></span>
                      <span className="text-xs text-gray-500">
                        {formData.category_ids?.length || 0} selected
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      Brand
                      <span className="text-xs text-gray-500 font-mono">[@product_brand@]</span>
                    </Label>
                    <Input
                      className="bg-gray-50 border-gray-200 text-gray-900"
                      placeholder="Brand name"
                      value={formData.brand || ''}
                      onChange={(e) => handleChange('brand', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      Manufacturer
                      <span className="text-xs text-gray-500 font-mono">[@product_manufacturer@]</span>
                    </Label>
                    <Input
                      className="bg-gray-50 border-gray-200 text-gray-900"
                      placeholder="Manufacturer name"
                      value={formData.manufacturer || ''}
                      onChange={(e) => handleChange('manufacturer', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      Tags
                      <span className="text-xs text-gray-500 font-mono">[@product_tags@]</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        className="bg-gray-50 border-gray-200 text-gray-900 flex-1"
                        placeholder="Add a tag"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <Button onClick={addTag} variant="outline" className="border-gray-200 text-gray-700">
                        Add
                      </Button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.tags.map(tag => (
                          <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="hover:text-red-400">
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Base Tags Section */}
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <Label className="text-gray-700 flex items-center gap-2">
                      <Bookmark size={16} className="text-blue-500" />
                      Base Tags
                      <span className="text-xs text-gray-500 font-mono">[@product_base_tags@]</span>
                    </Label>
                    <p className="text-xs text-gray-500">
                      Select pre-defined tags to highlight special product attributes. These appear as badges on product listings.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {BASE_TAGS.map(baseTag => (
                        <button
                          key={baseTag.id}
                          type="button"
                          onClick={() => toggleBaseTag(baseTag.id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                            formData.base_tags?.includes(baseTag.id)
                              ? `${baseTag.color} ring-2 ring-offset-1 ring-blue-400`
                              : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {formData.base_tags?.includes(baseTag.id) && (
                            <Check size={12} className="inline mr-1" />
                          )}
                          {baseTag.label}
                        </button>
                      ))}
                    </div>
                    {formData.base_tags?.length > 0 && (
                      <p className="text-xs text-emerald-600">
                        {formData.base_tags.length} base tag{formData.base_tags.length > 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Specifics Tab */}
              {activeTab === 'specifics' && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <Label className="text-gray-700 text-lg flex items-center gap-2">
                      <Layers size={18} className="text-blue-500" />
                      Product Specifications
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Add custom attributes like Color, Size, Material, etc. These appear in the product details section.
                    </p>
                  </div>
                  
                  {/* Add new spec */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-gray-600 text-xs">Attribute Name</Label>
                        <Input
                          className="bg-white border-gray-200 text-gray-900"
                          placeholder="e.g., Color, Size, Material"
                          value={newSpecName}
                          onChange={(e) => setNewSpecName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecific())}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-gray-600 text-xs">Value</Label>
                        <div className="flex gap-2">
                          <Input
                            className="bg-white border-gray-200 text-gray-900 flex-1"
                            placeholder="e.g., Red, Large, Cotton"
                            value={newSpecValue}
                            onChange={(e) => setNewSpecValue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecific())}
                          />
                          <Button onClick={addSpecific} variant="outline" className="border-gray-200 text-gray-700">
                            <Plus size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Specs list */}
                  {formData.specifics?.length > 0 ? (
                    <div className="space-y-2">
                      <Label className="text-gray-600 text-sm">Added Specifications ({formData.specifics.length})</Label>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left px-4 py-2 text-xs font-medium text-gray-600 w-1/3">Attribute</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-gray-600">Value</th>
                              <th className="w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {formData.specifics.map((spec, idx) => (
                              <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm font-medium text-gray-700">{spec.name}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{spec.value}</td>
                                <td className="px-2">
                                  <button
                                    onClick={() => removeSpecific(idx)}
                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                      <Layers size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No specifications added yet</p>
                      <p className="text-xs">Add attributes like Color, Size, Weight to provide more product details</p>
                    </div>
                  )}
                  
                  {/* Common specifications suggestions */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm font-medium text-blue-700 mb-2">Common Specifications</p>
                    <div className="flex flex-wrap gap-2">
                      {['Color', 'Size', 'Material', 'Weight', 'Dimensions', 'Warranty', 'Model', 'Capacity', 'Power', 'Voltage'].map(suggestion => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setNewSpecName(suggestion)}
                          className="px-2 py-1 text-xs bg-white rounded border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          + {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Images Tab */}
              {activeTab === 'images' && (
                <div className="space-y-6">
                  {/* Header with info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-gray-700 text-lg">Product Images</Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Drag images to reorder. Each slot has its own template tag ([@image1@] to [@image12@])
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formData.images.filter(Boolean).length} / 12 images
                    </div>
                  </div>
                  
                  {/* URL Input for quick add */}
                  <div className="flex gap-2">
                    <Input
                      className="bg-gray-50 border-gray-200 text-gray-900 flex-1"
                      placeholder="Enter image URL and press Enter or click Add"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
                    />
                    <Button onClick={addImage} variant="outline" className="border-gray-200 text-gray-700">
                      <Plus size={16} className="mr-2" /> Add to Next Slot
                    </Button>
                  </div>
                  
                  {/* 12-Slot Image Grid */}
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                    {formData.images.map((image, index) => (
                      <ImageSlot
                        key={index}
                        index={index}
                        image={image}
                        onImageChange={handleImageChange}
                        onImageRemove={handleImageRemove}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        isDragging={draggedIndex === index}
                      />
                    ))}
                  </div>
                  
                  {/* Template Tags Reference */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Code size={16} className="text-emerald-400" />
                      <span className="text-sm font-medium text-gray-700">Image Template Tags</span>
                    </div>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2 text-xs">
                      {Array(12).fill(null).map((_, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <span className={`font-mono px-1.5 py-0.5 rounded ${formData.images[i] ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-100 text-gray-500'}`}>
                            [@image{i + 1}@]
                          </span>
                          {formData.images[i] && <Check size={12} className="text-emerald-400" />}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      <strong>[@product_image@]</strong> returns the first available image. 
                      Use specific tags like <strong>[@image1@]</strong> to <strong>[@image12@]</strong> for precise control.
                    </p>
                  </div>
                  
                  {/* Thumbnail Override */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      Custom Thumbnail URL
                      <span className="text-xs text-gray-500 font-mono">[@product_thumbnail@]</span>
                    </Label>
                    <Input
                      className="bg-gray-50 border-gray-200 text-gray-900"
                      placeholder="Custom thumbnail URL (optional - defaults to image 1)"
                      value={formData.thumbnail || ''}
                      onChange={(e) => handleChange('thumbnail', e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              {/* Inventory Tab */}
              {activeTab === 'inventory' && (
                <div className="space-y-6 max-w-3xl">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-gray-700">Track Inventory</Label>
                      <p className="text-xs text-gray-500">Enable stock tracking for this product</p>
                    </div>
                    <Switch
                      checked={formData.track_inventory}
                      onCheckedChange={(v) => handleChange('track_inventory', v)}
                    />
                  </div>
                  
                  {formData.track_inventory && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-700 flex items-center gap-2">
                            Stock Quantity
                            <span className="text-xs text-gray-500 font-mono">[@product_stock@]</span>
                          </Label>
                          <Input
                            type="number"
                            className="bg-gray-50 border-gray-200 text-gray-900"
                            placeholder="0"
                            value={formData.stock}
                            onChange={(e) => handleChange('stock', e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-gray-700 flex items-center gap-2">
                            Low Stock Alert
                            <span className="text-xs text-gray-500 font-mono">[@product_low_stock@]</span>
                          </Label>
                          <Input
                            type="number"
                            className="bg-gray-50 border-gray-200 text-gray-900"
                            placeholder="10"
                            value={formData.low_stock_threshold}
                            onChange={(e) => handleChange('low_stock_threshold', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <Label className="text-gray-700">Allow Backorders</Label>
                          <p className="text-xs text-gray-500">Allow orders when out of stock</p>
                        </div>
                        <Switch
                          checked={formData.allow_backorder}
                          onCheckedChange={(v) => handleChange('allow_backorder', v)}
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Pre-Order Section */}
                  <div className="border-t border-gray-200 pt-6 mt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        <Package size={20} className="text-blue-400" />
                        Pre-Order Settings
                      </h3>
                      <TooltipProvider>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-blue-400 hover:text-blue-300 transition-colors">
                              <HelpCircle size={18} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-sm bg-gray-100 border border-gray-200 p-4 text-left">
                            <div className="space-y-3 text-sm">
                              <p className="font-semibold text-blue-400">How Pre-Order Works</p>
                              <div className="space-y-2 text-gray-700">
                                <p><strong>1. When to use:</strong> Enable pre-order when your stock is 0 or low, but you have new inventory arriving soon.</p>
                                <p><strong>2. Customer experience:</strong> Customers see a &quot;Pre-Order&quot; button instead of &quot;Add to Cart&quot; when stock is 0.</p>
                                <p><strong>3. Pre-Order Qty:</strong> This is the quantity you&apos;re expecting to receive. It does NOT add to current stock until arrival date.</p>
                                <p><strong>4. Auto-conversion:</strong> When the arrival date passes, the system automatically:</p>
                                <ul className="list-disc list-inside pl-2 text-gray-500">
                                  <li>Disables pre-order mode</li>
                                  <li>Adds pre-order qty to stock</li>
                                </ul>
                                <p className="text-yellow-400 mt-2"><strong>Note:</strong> Stock can go negative if more pre-orders are placed than expected. Monitor your pre-order quantities!</p>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    {/* Pre-Order Info Card - Always Visible */}
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                      <div className="flex items-start gap-3">
                        <Info size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-500">
                          <p className="mb-2">Pre-order allows customers to purchase products before they&apos;re in stock. Use this when:</p>
                          <ul className="list-disc list-inside space-y-1 text-gray-500">
                            <li>You have a new shipment arriving on a specific date</li>
                            <li>A product is temporarily out of stock</li>
                            <li>You want to gauge demand before restocking</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg mb-4">
                      <div>
                        <Label className="text-gray-700">Enable Pre-Order</Label>
                        <p className="text-xs text-gray-500">Allow customers to pre-order when out of stock</p>
                      </div>
                      <Switch
                        checked={formData.preorder_enabled}
                        onCheckedChange={(v) => handleChange('preorder_enabled', v)}
                      />
                    </div>
                    
                    {formData.preorder_enabled && (
                      <div className="space-y-4 pl-4 border-l-2 border-blue-600">
                        {/* Current Stock vs Pre-Order Display */}
                        <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                          <div className="text-sm">
                            <span className="text-gray-500">Current Stock:</span>
                            <span className={`ml-2 font-medium ${parseInt(formData.stock) <= 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {formData.stock || 0} units
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500">Expected Arrival:</span>
                            <span className="ml-2 font-medium text-blue-400">
                              +{formData.preorder_qty || 0} units
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500">After Arrival:</span>
                            <span className="ml-2 font-medium text-green-400">
                              {(parseInt(formData.stock) || 0) + (parseInt(formData.preorder_qty) || 0)} units
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-gray-700 flex items-center gap-2">
                              Pre-Order Quantity
                              <span className="text-xs text-gray-500 font-mono">[@preorder_qty@]</span>
                              <TooltipProvider>
                                <Tooltip delayDuration={0}>
                                  <TooltipTrigger asChild>
                                    <HelpCircle size={14} className="text-gray-500 hover:text-gray-500 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-gray-100 border border-gray-200 max-w-xs">
                                    <p className="text-sm">Number of units arriving. This will be added to your current stock when the arrival date passes.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              className="bg-gray-50 border-gray-200 text-gray-900"
                              placeholder="Qty arriving"
                              value={formData.preorder_qty}
                              onChange={(e) => handleChange('preorder_qty', e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-gray-700 flex items-center gap-2">
                              Arrival Date
                              <span className="text-xs text-gray-500 font-mono">[@preorder_date@]</span>
                              <TooltipProvider>
                                <Tooltip delayDuration={0}>
                                  <TooltipTrigger asChild>
                                    <HelpCircle size={14} className="text-gray-500 hover:text-gray-500 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-gray-100 border border-gray-200 max-w-xs">
                                    <p className="text-sm">When this date passes, pre-order automatically disables and the pre-order quantity is added to stock.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </Label>
                            <Input
                              type="date"
                              className="bg-gray-50 border-gray-200 text-gray-900"
                              value={formData.preorder_arrival_date || ''}
                              onChange={(e) => handleChange('preorder_arrival_date', e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-gray-700 flex items-center gap-2">
                            Pre-Order Message
                            <span className="text-xs text-gray-500 font-mono">[@preorder_message@]</span>
                          </Label>
                          <Input
                            className="bg-gray-50 border-gray-200 text-gray-900"
                            placeholder="e.g., Expected to ship by December 2025"
                            value={formData.preorder_message || ''}
                            onChange={(e) => handleChange('preorder_message', e.target.value)}
                          />
                          <p className="text-xs text-gray-500">This message is shown to customers on the product page</p>
                        </div>
                        
                        {/* Warning for negative stock potential */}
                        {parseInt(formData.stock) < 0 && (
                          <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-300 flex items-start gap-2">
                            <Info size={16} className="mt-0.5 flex-shrink-0" />
                            <div>
                              <strong>Warning:</strong> Stock is currently negative ({formData.stock}). This means more pre-orders were placed than expected. Consider increasing pre-order quantity or contacting affected customers.
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Shipping Tab */}
              {activeTab === 'shipping' && (
                <div className="space-y-6 max-w-3xl">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-gray-700">Requires Shipping</Label>
                      <p className="text-xs text-gray-500">This is a physical product that needs to be shipped</p>
                    </div>
                    <Switch
                      checked={formData.requires_shipping}
                      onCheckedChange={(v) => handleChange('requires_shipping', v)}
                    />
                  </div>
                  
                  {formData.requires_shipping && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-gray-700 flex items-center gap-2">
                          Weight (kg)
                          <span className="text-xs text-gray-500 font-mono">[@product_weight@]</span>
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          className="bg-gray-50 border-gray-200 text-gray-900"
                          placeholder="0.00"
                          value={formData.weight || ''}
                          onChange={(e) => handleChange('weight', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-gray-700">Product Dimensions</Label>
                          {formData.length && formData.width && formData.height && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-500">Cubic:</span>
                              <span className="font-mono text-emerald-400">
                                {((parseFloat(formData.length) || 0) * (parseFloat(formData.width) || 0) * (parseFloat(formData.height) || 0)).toFixed(0)} mm³
                              </span>
                              <span className="text-gray-600">|</span>
                              <span className="font-mono text-blue-400">
                                {(((parseFloat(formData.length) || 0) * (parseFloat(formData.width) || 0) * (parseFloat(formData.height) || 0)) / 1000000000).toFixed(4)} m³
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-gray-700 flex items-center gap-2">
                              Length (mm)
                              <span className="text-xs text-gray-500 font-mono">[@product_length@]</span>
                            </Label>
                            <Input
                              type="number"
                              step="1"
                              className="bg-gray-50 border-gray-200 text-gray-900"
                              placeholder="0"
                              value={formData.length || ''}
                              onChange={(e) => handleChange('length', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-700 flex items-center gap-2">
                              Width (mm)
                              <span className="text-xs text-gray-500 font-mono">[@product_width@]</span>
                            </Label>
                            <Input
                              type="number"
                              step="1"
                              className="bg-gray-50 border-gray-200 text-gray-900"
                              placeholder="0"
                              value={formData.width || ''}
                              onChange={(e) => handleChange('width', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-700 flex items-center gap-2">
                              Height (mm)
                              <span className="text-xs text-gray-500 font-mono">[@product_height@]</span>
                            </Label>
                            <Input
                              type="number"
                              step="1"
                              className="bg-gray-50 border-gray-200 text-gray-900"
                              placeholder="0"
                              value={formData.height || ''}
                              onChange={(e) => handleChange('height', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Shipping Box Dimensions - for cubic weight calculation */}
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-gray-700 text-sm flex items-center gap-2">
                            <Box className="w-4 h-4 text-blue-400" />
                            Shipping Box Dimensions (for cubic weight calculation)
                          </Label>
                          {formData.shipping_length && formData.shipping_width && formData.shipping_height && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-500">Cubic:</span>
                              <span className="font-mono text-emerald-400">
                                {((parseFloat(formData.shipping_length) || 0) * (parseFloat(formData.shipping_width) || 0) * (parseFloat(formData.shipping_height) || 0)).toFixed(0)} mm³
                              </span>
                              <span className="text-gray-600">|</span>
                              <span className="font-mono text-blue-400">
                                {(((parseFloat(formData.shipping_length) || 0) * (parseFloat(formData.shipping_width) || 0) * (parseFloat(formData.shipping_height) || 0)) / 1000000000).toFixed(4)} m³
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-gray-500 text-xs">
                              Shipping Length (mm)
                            </Label>
                            <Input
                              type="number"
                              step="1"
                              className="bg-gray-50 border-gray-200 text-gray-900"
                              placeholder="0"
                              value={formData.shipping_length || ''}
                              onChange={(e) => handleChange('shipping_length', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-500 text-xs">
                              Shipping Width (mm)
                            </Label>
                            <Input
                              type="number"
                              step="1"
                              className="bg-gray-50 border-gray-200 text-gray-900"
                              placeholder="0"
                              value={formData.shipping_width || ''}
                              onChange={(e) => handleChange('shipping_width', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-500 text-xs">
                              Shipping Height (mm)
                            </Label>
                            <Input
                              type="number"
                              step="1"
                              className="bg-gray-50 border-gray-200 text-gray-900"
                              placeholder="0"
                              value={formData.shipping_height || ''}
                              onChange={(e) => handleChange('shipping_height', e.target.value)}
                            />
                          </div>
                        </div>
                        <p className="text-gray-500 text-xs mt-2">
                          Cubic Weight = (L × W × H in mm) / 1,000,000,000 × Modifier (250 or 333). Used when larger than actual weight.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-gray-700 flex items-center gap-2">
                          Shipping Class
                          <span className="text-xs text-gray-500 font-mono">[@product_shipping_class@]</span>
                        </Label>
                        <Select value={formData.shipping_class || '_default'} onValueChange={(v) => handleChange('shipping_class', v === '_default' ? '' : v)}>
                          <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-700">
                            <SelectValue placeholder="Select shipping class" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            <SelectItem value="_default" className="text-gray-700">Default</SelectItem>
                            <SelectItem value="standard" className="text-gray-700">Standard Shipping</SelectItem>
                            <SelectItem value="express" className="text-gray-700">Express Shipping</SelectItem>
                            <SelectItem value="freight" className="text-gray-700">Freight / Heavy Items</SelectItem>
                            <SelectItem value="free" className="text-gray-700">Free Shipping</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* SEO Tab */}
              {activeTab === 'seo' && (
                <div className="space-y-6 max-w-3xl">
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      URL Slug
                      <span className="text-xs text-gray-500 font-mono">[@product_url@]</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">/live/product/</span>
                      <Input
                        className="bg-gray-50 border-gray-200 text-gray-900 flex-1"
                        placeholder="product-url-slug"
                        value={formData.url_slug || ''}
                        onChange={(e) => handleChange('url_slug', e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-gray-500">Leave empty to auto-generate from product name</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      Meta Title
                      <span className="text-xs text-gray-500 font-mono">[@product_meta_title@]</span>
                    </Label>
                    <Input
                      className="bg-gray-50 border-gray-200 text-gray-900"
                      placeholder="SEO page title (defaults to product name)"
                      value={formData.meta_title || ''}
                      onChange={(e) => handleChange('meta_title', e.target.value)}
                    />
                    <p className="text-xs text-gray-500">{formData.meta_title?.length || 0}/60 characters recommended</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      Meta Description
                      <span className="text-xs text-gray-500 font-mono">[@product_meta_description@]</span>
                    </Label>
                    <Textarea
                      className="bg-gray-50 border-gray-200 text-gray-900 min-h-24"
                      placeholder="SEO description for search engines"
                      value={formData.meta_description || ''}
                      onChange={(e) => handleChange('meta_description', e.target.value)}
                    />
                    <p className="text-xs text-gray-500">{formData.meta_description?.length || 0}/160 characters recommended</p>
                  </div>
                  
                  {/* SEO Preview */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-2">Search Engine Preview</p>
                    <p className="text-blue-400 text-lg hover:underline cursor-pointer">
                      {formData.meta_title || formData.name || 'Product Title'}
                    </p>
                    <p className="text-emerald-500 text-sm">
                      yourstore.com/live/product/{formData.url_slug || formData.name?.toLowerCase().replace(/\s+/g, '-') || 'product-slug'}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      {formData.meta_description || formData.short_description || 'Product description will appear here...'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Visibility Tab */}
              {activeTab === 'visibility' && (
                <div className="space-y-6 max-w-3xl">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-gray-700 flex items-center gap-2">
                        Active
                        <span className="text-xs text-gray-500 font-mono">[@product_active@]</span>
                      </Label>
                      <p className="text-xs text-gray-500">Product is available for purchase</p>
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(v) => handleChange('is_active', v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-gray-700 flex items-center gap-2">
                        Featured
                        <span className="text-xs text-gray-500 font-mono">[@product_featured@]</span>
                      </Label>
                      <p className="text-xs text-gray-500">Show in featured products section</p>
                    </div>
                    <Switch
                      checked={formData.is_featured}
                      onCheckedChange={(v) => handleChange('is_featured', v)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      Visibility
                      <span className="text-xs text-gray-500 font-mono">[@product_visibility@]</span>
                    </Label>
                    <Select value={formData.visibility} onValueChange={(v) => handleChange('visibility', v)}>
                      <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="visible" className="text-gray-700">Visible - Show everywhere</SelectItem>
                        <SelectItem value="hidden" className="text-gray-700">Hidden - Only accessible via direct link</SelectItem>
                        <SelectItem value="search_only" className="text-gray-700">Search Only - Show in search results only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Template Tags Panel */}
          {showTagsPanel && (
            <div className="w-80 border-l border-gray-200 overflow-y-auto bg-gray-50/50">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-gray-900 font-medium flex items-center gap-2">
                  <Code size={16} />
                  Template Tags Reference
                </h3>
                <p className="text-xs text-gray-500 mt-1">Click any tag to copy it to clipboard</p>
              </div>
              <div className="p-4 space-y-4">
                {templateTags && Object.entries(templateTags).map(([key, section]) => (
                  <div key={key} className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">{section.title}</h4>
                    <div className="space-y-1">
                      {section.tags.map((tag, idx) => (
                        <TemplateTag key={idx} tag={tag.tag} description={tag.description} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {product?.id && (
              <>Last updated: {new Date(product.updated_at).toLocaleString()}</>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose} className="text-gray-500 hover:text-gray-900">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name || !formData.price || !formData.sku || saving}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-gray-900"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  {product?.id ? 'Update Product' : 'Create Product'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Products Page
const MerchantProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [templateTags, setTemplateTags] = useState(null);

  useEffect(() => {
    fetchData();
    fetchTemplateTags();
  }, [categoryFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let productsUrl = `${API}/products?limit=100`;
      if (categoryFilter !== 'all') {
        productsUrl += `&category_id=${categoryFilter}`;
      }
      const [productsRes, categoriesRes] = await Promise.all([
        axios.get(productsUrl),
        axios.get(`${API}/categories`)
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateTags = async () => {
    try {
      const res = await axios.get(`${API}/products/template-tags`);
      setTemplateTags(res.data);
    } catch (error) {
      console.error('Error fetching template tags:', error);
    }
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct?.id) {
        await axios.put(`${API}/products/${editingProduct.id}`, productData);
      } else {
        await axios.post(`${API}/products`, productData);
      }
      setIsEditorOpen(false);
      setEditingProduct(null);
      fetchData();
    } catch (error) {
      console.error('Error saving product:', error);
      throw error;
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setIsEditorOpen(true);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsEditorOpen(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`${API}/products/${productId}`);
        fetchData();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getStatusColor = (product) => {
    if (product.stock === 0) return 'bg-red-500/20 text-red-400';
    if (product.stock <= (product.low_stock_threshold || 10)) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-emerald-500/20 text-emerald-400';
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44 bg-gray-50 border-gray-200 text-gray-700">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all" className="text-gray-700">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id} className="text-gray-700">{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <List size={18} />
            </button>
          </div>
          <Button 
            onClick={handleAddProduct}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-gray-900"
          >
            <Plus size={18} className="mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-white border-gray-200 rounded-lg animate-pulse">
              <div className="aspect-square bg-gray-100" />
              <div className="p-3">
                <div className="h-3 bg-gray-100 rounded mb-2" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group overflow-hidden">
              <div className="relative aspect-square bg-gray-50">
                <img
                  src={product.images?.[0] || 'https://via.placeholder.com/400'}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-md bg-white/90 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm">
                        <MoreVertical size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border-gray-200">
                      <DropdownMenuItem 
                        className="text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 cursor-pointer text-sm"
                        onClick={() => handleEditProduct(product)}
                      >
                        <Edit size={14} className="mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 cursor-pointer text-sm"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        <Trash2 size={14} className="mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {product.compare_price && product.compare_price > product.price && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-500 text-white text-xs font-medium rounded">
                    Sale
                  </span>
                )}
                {product.is_featured && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-yellow-500 text-black text-xs font-medium rounded flex items-center gap-1">
                    <Star size={10} /> Featured
                  </span>
                )}
              </div>
              <CardContent className="p-3">
                <p className="text-gray-400 text-xs mb-0.5 font-mono">{product.sku}</p>
                <h3 className="text-gray-900 font-medium text-sm line-clamp-1 mb-1">{product.name}</h3>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-emerald-600 font-semibold text-sm">{formatCurrency(product.price)}</span>
                  {product.compare_price && product.compare_price > product.price && (
                    <span className="text-gray-400 text-xs line-through">{formatCurrency(product.compare_price)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(product)}`}>
                    {product.stock > 0 ? `${product.stock}` : 'Out'}
                  </span>
                  <span className="text-gray-400 text-xs">{product.sales_count || 0} sold</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-white border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-6 text-gray-500 font-medium text-sm">Product</th>
                    <th className="text-left py-4 px-6 text-gray-500 font-medium text-sm">Category</th>
                    <th className="text-left py-4 px-6 text-gray-500 font-medium text-sm">Price</th>
                    <th className="text-left py-4 px-6 text-gray-500 font-medium text-sm">Stock</th>
                    <th className="text-left py-4 px-6 text-gray-500 font-medium text-sm">Sales</th>
                    <th className="text-right py-4 px-6 text-gray-500 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-gray-200/50 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.images?.[0] || 'https://via.placeholder.com/40'}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div>
                            <p className="text-gray-900 font-medium">{product.name}</p>
                            <p className="text-gray-500 text-sm">{product.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-700">
                        {categories.find(c => c.id === product.category_id)?.name || '-'}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-gray-900 font-medium">{formatCurrency(product.price)}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(product)}`}>
                          {product.stock > 0 ? `${product.stock} units` : 'Out of stock'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-700">{product.sales_count || 0}</td>
                      <td className="py-4 px-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors">
                              <MoreVertical size={18} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border-gray-200">
                            <DropdownMenuItem 
                              className="text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 cursor-pointer"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Edit size={16} className="mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 size={16} className="mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && filteredProducts.length === 0 && (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <Package className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-500 text-lg">No products found</p>
          <Button 
            onClick={handleAddProduct}
            className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-gray-900"
          >
            <Plus size={18} className="mr-2" />
            Add Your First Product
          </Button>
        </div>
      )}

      {/* Product Editor Modal */}
      {isEditorOpen && (
        <ProductEditor
          product={editingProduct}
          categories={categories}
          templateTags={templateTags}
          onSave={handleSaveProduct}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
};

export default MerchantProducts;
