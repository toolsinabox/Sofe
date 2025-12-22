import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus, Edit, Trash2, X, Save, GripVertical, Eye, EyeOff,
  Layout, Type, Image, Video, Box, Grid, Minus, Code,
  Monitor, Tablet, Smartphone, ChevronDown, ChevronUp, Copy, Check,
  Tag, HelpCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Template Tags Reference for HTML blocks
const TEMPLATE_TAGS = {
  store: {
    title: 'Store & Global',
    tags: [
      { tag: '[@store_name@]', desc: 'Store name' },
      { tag: '[@store_email@]', desc: 'Store email' },
      { tag: '[@store_phone@]', desc: 'Store phone' },
      { tag: '[@store_url@]', desc: 'Store URL' },
      { tag: '[@store_logo@]', desc: 'Logo URL' },
      { tag: '[@currency_symbol@]', desc: 'Currency ($)' },
      { tag: '[@current_year@]', desc: 'Current year' },
    ]
  },
  products: {
    title: 'Product Loops',
    tags: [
      { tag: "[%thumb_list type:'products' limit:'8'%]", desc: 'Product list start' },
      { tag: '[%param *body%]', desc: 'Loop body start' },
      { tag: '[%/param%]', desc: 'Loop body end' },
      { tag: '[%/thumb_list%]', desc: 'Product list end' },
      { tag: "[%new_arrivals limit:'4'%]...[%/new_arrivals%]", desc: 'New arrivals' },
      { tag: "[%top_sellers limit:'4'%]...[%/top_sellers%]", desc: 'Top sellers' },
    ]
  },
  product: {
    title: 'Product Tags (in loops)',
    tags: [
      { tag: '[@name@]', desc: 'Product name' },
      { tag: '[@price_formatted@]', desc: 'Price ($XX.XX)' },
      { tag: '[@rrp_formatted@]', desc: 'Compare price' },
      { tag: '[@image@]', desc: 'Product image' },
      { tag: '[@url@]', desc: 'Product URL' },
      { tag: '[@SKU@]', desc: 'Product SKU' },
      { tag: '[@description@]', desc: 'Description' },
      { tag: '[@brand@]', desc: 'Brand name' },
      { tag: '[@qty@]', desc: 'Stock quantity' },
      { tag: '[@on_sale@]', desc: '"y" if on sale' },
      { tag: '[@in_stock@]', desc: '"y" if in stock' },
    ]
  },
  conditionals: {
    title: 'Conditionals',
    tags: [
      { tag: "[%if [@on_sale@] eq 'y'%]", desc: 'If on sale' },
      { tag: "[%if [@in_stock@] eq 'y'%]", desc: 'If in stock' },
      { tag: '[%else%]', desc: 'Else clause' },
      { tag: '[%/if%]', desc: 'End if' },
    ]
  },
  categories: {
    title: 'Categories',
    tags: [
      { tag: "[%content_menu type:'categories' limit:'10'%]", desc: 'Category menu' },
      { tag: '[@content_name@]', desc: 'Category name' },
      { tag: '[@content_url@]', desc: 'Category URL' },
      { tag: '[@content_image@]', desc: 'Category image' },
    ]
  },
  zones: {
    title: 'Content Zones',
    tags: [
      { tag: "[%content_zone name:'zone_name'%][%/content_zone%]", desc: 'Render zone' },
    ]
  }
};

// Copyable Tag Component
const CopyableTag = ({ tag, desc }) => {
  const [copied, setCopied] = useState(false);
  
  const copyTag = () => {
    navigator.clipboard.writeText(tag);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  
  return (
    <div 
      onClick={copyTag}
      className="flex items-start gap-2 p-1.5 rounded hover:bg-gray-700 cursor-pointer group"
    >
      <code className="text-xs text-cyan-400 bg-gray-900 px-1.5 py-0.5 rounded flex-shrink-0 max-w-[160px] truncate">
        {tag}
      </code>
      <span className="text-xs text-gray-500 flex-1">{desc}</span>
      {copied ? <Check size={12} className="text-green-400 flex-shrink-0" /> : <Copy size={12} className="text-gray-600 group-hover:text-gray-400 flex-shrink-0" />}
    </div>
  );
};

// Template Tags Panel Component
const TemplateTagsPanel = ({ isOpen, onClose }) => {
  const [expandedSection, setExpandedSection] = useState('products');
  
  if (!isOpen) return null;
  
  return (
    <div className="absolute right-0 top-0 w-72 h-full bg-gray-900 border-l border-gray-700 overflow-y-auto z-10">
      <div className="sticky top-0 bg-gray-900 p-3 border-b border-gray-700 flex items-center justify-between">
        <h4 className="text-sm font-medium text-white flex items-center gap-2">
          <Tag size={14} className="text-cyan-400" />
          Template Tags
        </h4>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X size={16} />
        </button>
      </div>
      <p className="text-xs text-gray-500 px-3 py-2 border-b border-gray-800">
        Click any tag to copy. Use these in your HTML content.
      </p>
      <div className="p-2">
        {Object.entries(TEMPLATE_TAGS).map(([key, section]) => (
          <div key={key} className="mb-2">
            <button
              onClick={() => setExpandedSection(expandedSection === key ? '' : key)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded bg-gray-800 hover:bg-gray-750 text-gray-300 text-xs font-medium"
            >
              {section.title}
              {expandedSection === key ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expandedSection === key && (
              <div className="mt-1 space-y-0.5">
                {section.tags.map((t, i) => (
                  <CopyableTag key={i} tag={t.tag} desc={t.desc} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Block type definitions
const BLOCK_TYPES = [
  { id: 'html', label: 'HTML', icon: Code, description: 'Custom HTML content with template tags' },
  { id: 'text', label: 'Text', icon: Type, description: 'Simple text paragraph' },
  { id: 'image', label: 'Image', icon: Image, description: 'Image with optional link' },
  { id: 'video', label: 'Video', icon: Video, description: 'YouTube or video embed' },
  { id: 'product_grid', label: 'Product Grid', icon: Grid, description: 'Display products' },
  { id: 'category_grid', label: 'Category Grid', icon: Layout, description: 'Display categories' },
  { id: 'spacer', label: 'Spacer', icon: Box, description: 'Vertical space' },
  { id: 'divider', label: 'Divider', icon: Minus, description: 'Horizontal line' },
];

// Block Editor Component
const BlockEditor = ({ block, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showTagsPanel, setShowTagsPanel] = useState(false);
  const blockType = BLOCK_TYPES.find(t => t.id === block.type) || BLOCK_TYPES[0];
  const Icon = blockType.icon;

  const updateSetting = (key, value) => {
    onUpdate({
      ...block,
      settings: { ...block.settings, [key]: value }
    });
  };

  return (
    <div className={`bg-gray-800 rounded-lg border ${block.is_active ? 'border-gray-700' : 'border-gray-700/50 opacity-60'}`}>
      {/* Block Header */}
      <div className="flex items-center gap-3 p-3 border-b border-gray-700">
        <div className="flex flex-col gap-1">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30"
          >
            <ChevronDown size={14} />
          </button>
        </div>
        
        <div className="p-2 bg-gray-700 rounded">
          <Icon size={16} className="text-cyan-400" />
        </div>
        
        <div className="flex-1">
          <input
            type="text"
            value={block.title || ''}
            onChange={(e) => onUpdate({ ...block, title: e.target.value })}
            placeholder={`${blockType.label} Block`}
            className="bg-transparent text-white text-sm font-medium w-full focus:outline-none"
          />
          <p className="text-xs text-gray-500">{blockType.description}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdate({ ...block, is_active: !block.is_active })}
            className={`p-2 rounded ${block.is_active ? 'text-green-400' : 'text-gray-500'}`}
            title={block.is_active ? 'Active' : 'Inactive'}
          >
            {block.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-white"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          <button
            onClick={onDelete}
            className="p-2 text-red-400 hover:text-red-300"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      {/* Block Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 relative">
          {/* HTML Block */}
          {block.type === 'html' && (
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-300">HTML Content</Label>
                <button
                  onClick={() => setShowTagsPanel(!showTagsPanel)}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
                    showTagsPanel 
                      ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/40' 
                      : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'
                  }`}
                >
                  <Tag size={12} />
                  {showTagsPanel ? 'Hide Tags' : 'Show Tags'}
                </button>
              </div>
              <div className="flex gap-0 relative">
                <Textarea
                  value={block.content || ''}
                  onChange={(e) => onUpdate({ ...block, content: e.target.value })}
                  placeholder="<div>Your HTML here...</div>&#10;&#10;Use template tags like [@store_name@] or [%thumb_list%] for dynamic content."
                  className={`bg-gray-700 border-gray-600 text-white font-mono text-sm min-h-48 ${showTagsPanel ? 'pr-72' : ''}`}
                />
                <TemplateTagsPanel isOpen={showTagsPanel} onClose={() => setShowTagsPanel(false)} />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Use Maropost-style template tags for dynamic content. Click "Show Tags" to see available tags.
              </p>
            </div>
          )}}
          
          {/* Text Block */}
          {block.type === 'text' && (
            <div>
              <Label className="text-gray-300 mb-2 block">Text Content</Label>
              <Textarea
                value={block.content || ''}
                onChange={(e) => onUpdate({ ...block, content: e.target.value })}
                placeholder="Enter your text content..."
                className="bg-gray-700 border-gray-600 text-white min-h-24"
              />
            </div>
          )}
          
          {/* Image Block */}
          {block.type === 'image' && (
            <div className="space-y-3">
              <div>
                <Label className="text-gray-300 mb-1 block">Image URL</Label>
                <Input
                  value={block.settings?.src || ''}
                  onChange={(e) => updateSetting('src', e.target.value)}
                  placeholder="https://..."
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-300 mb-1 block">Alt Text</Label>
                  <Input
                    value={block.settings?.alt || ''}
                    onChange={(e) => updateSetting('alt', e.target.value)}
                    placeholder="Image description"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 mb-1 block">Link URL</Label>
                  <Input
                    value={block.settings?.link || ''}
                    onChange={(e) => updateSetting('link', e.target.value)}
                    placeholder="/page or https://..."
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-300 mb-1 block">Max Width</Label>
                  <Input
                    value={block.settings?.width || '100%'}
                    onChange={(e) => updateSetting('width', e.target.value)}
                    placeholder="100% or 500px"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 mb-1 block">Alignment</Label>
                  <Select value={block.settings?.alignment || 'center'} onValueChange={(v) => updateSetting('alignment', v)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="left" className="text-gray-300">Left</SelectItem>
                      <SelectItem value="center" className="text-gray-300">Center</SelectItem>
                      <SelectItem value="right" className="text-gray-300">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {block.settings?.src && (
                <div className="mt-2 p-2 bg-gray-900 rounded">
                  <img src={block.settings.src} alt="Preview" className="max-h-32 mx-auto" />
                </div>
              )}
            </div>
          )}
          
          {/* Video Block */}
          {block.type === 'video' && (
            <div>
              <Label className="text-gray-300 mb-1 block">Video URL</Label>
              <Input
                value={block.settings?.src || ''}
                onChange={(e) => updateSetting('src', e.target.value)}
                placeholder="YouTube URL or embed URL"
                className="bg-gray-700 border-gray-600 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Supports YouTube links (youtube.com/watch?v=... or youtu.be/...)</p>
            </div>
          )}
          
          {/* Product Grid Block */}
          {block.type === 'product_grid' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300 mb-1 block">Number of Products</Label>
                <Input
                  type="number"
                  value={block.settings?.limit || 4}
                  onChange={(e) => updateSetting('limit', parseInt(e.target.value) || 4)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300 mb-1 block">Columns</Label>
                <Select value={String(block.settings?.columns || 4)} onValueChange={(v) => updateSetting('columns', parseInt(v))}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="2" className="text-gray-300">2 Columns</SelectItem>
                    <SelectItem value="3" className="text-gray-300">3 Columns</SelectItem>
                    <SelectItem value="4" className="text-gray-300">4 Columns</SelectItem>
                    <SelectItem value="5" className="text-gray-300">5 Columns</SelectItem>
                    <SelectItem value="6" className="text-gray-300">6 Columns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch
                  checked={block.settings?.show_price !== false}
                  onCheckedChange={(v) => updateSetting('show_price', v)}
                />
                <Label className="text-gray-300">Show Price</Label>
              </div>
            </div>
          )}
          
          {/* Category Grid Block */}
          {block.type === 'category_grid' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300 mb-1 block">Number of Categories</Label>
                <Input
                  type="number"
                  value={block.settings?.limit || 6}
                  onChange={(e) => updateSetting('limit', parseInt(e.target.value) || 6)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300 mb-1 block">Columns</Label>
                <Select value={String(block.settings?.columns || 3)} onValueChange={(v) => updateSetting('columns', parseInt(v))}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="2" className="text-gray-300">2 Columns</SelectItem>
                    <SelectItem value="3" className="text-gray-300">3 Columns</SelectItem>
                    <SelectItem value="4" className="text-gray-300">4 Columns</SelectItem>
                    <SelectItem value="6" className="text-gray-300">6 Columns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {/* Spacer Block */}
          {block.type === 'spacer' && (
            <div>
              <Label className="text-gray-300 mb-1 block">Height</Label>
              <Input
                value={block.settings?.height || '50px'}
                onChange={(e) => updateSetting('height', e.target.value)}
                placeholder="50px or 2rem"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          )}
          
          {/* Divider Block */}
          {block.type === 'divider' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-gray-300 mb-1 block">Style</Label>
                <Select value={block.settings?.style || 'solid'} onValueChange={(v) => updateSetting('style', v)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="solid" className="text-gray-300">Solid</SelectItem>
                    <SelectItem value="dashed" className="text-gray-300">Dashed</SelectItem>
                    <SelectItem value="dotted" className="text-gray-300">Dotted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300 mb-1 block">Color</Label>
                <Input
                  type="color"
                  value={block.settings?.color || '#e5e7eb'}
                  onChange={(e) => updateSetting('color', e.target.value)}
                  className="bg-gray-700 border-gray-600 h-10"
                />
              </div>
              <div>
                <Label className="text-gray-300 mb-1 block">Width</Label>
                <Input
                  value={block.settings?.width || '100%'}
                  onChange={(e) => updateSetting('width', e.target.value)}
                  placeholder="100% or 50%"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Zone Editor Modal
const ZoneEditor = ({ zone, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    description: '',
    page: 'home',
    blocks: [],
    is_active: true,
    show_on_desktop: true,
    show_on_tablet: true,
    show_on_mobile: true,
    ...zone
  });
  const [saving, setSaving] = useState(false);

  const addBlock = (type) => {
    const newBlock = {
      id: `block_${Date.now()}`,
      type,
      title: '',
      content: '',
      settings: {},
      is_active: true,
      sort_order: formData.blocks.length
    };
    setFormData(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock]
    }));
  };

  const updateBlock = (index, updatedBlock) => {
    const newBlocks = [...formData.blocks];
    newBlocks[index] = updatedBlock;
    setFormData(prev => ({ ...prev, blocks: newBlocks }));
  };

  const deleteBlock = (index) => {
    if (!window.confirm('Delete this block?')) return;
    const newBlocks = formData.blocks.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, blocks: newBlocks }));
  };

  const moveBlock = (index, direction) => {
    const newBlocks = [...formData.blocks];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newBlocks.length) return;
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    // Update sort_order
    newBlocks.forEach((b, i) => b.sort_order = i);
    setFormData(prev => ({ ...prev, blocks: newBlocks }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.label) {
      alert('Name and Label are required');
      return;
    }
    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      alert('Failed to save zone');
    } finally {
      setSaving(false);
    }
  };

  const copyTemplateTag = () => {
    navigator.clipboard.writeText(`[%content_zone name:'${formData.name}'%][%/content_zone%]`);
    alert('Template tag copied!');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl border border-gray-700 my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {zone?.id ? 'Edit Content Zone' : 'Create Content Zone'}
            </h2>
            {formData.name && (
              <button
                onClick={copyTemplateTag}
                className="flex items-center gap-1 mt-1 text-xs text-cyan-400 hover:text-cyan-300"
              >
                <Copy size={12} />
                <code>[%content_zone name:'{formData.name}'%]</code>
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Zone Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300 mb-1 block">Zone Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                placeholder="homepage_promo"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Used in templates: [%content_zone name:'...'%]</p>
            </div>
            <div>
              <Label className="text-gray-300 mb-1 block">Display Label *</Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Homepage Promotional Area"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300 mb-1 block">Page</Label>
              <Select value={formData.page} onValueChange={(v) => setFormData(prev => ({ ...prev, page: v }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="home" className="text-gray-300">Homepage</SelectItem>
                  <SelectItem value="product" className="text-gray-300">Product Page</SelectItem>
                  <SelectItem value="category" className="text-gray-300">Category Page</SelectItem>
                  <SelectItem value="cart" className="text-gray-300">Cart Page</SelectItem>
                  <SelectItem value="global" className="text-gray-300">Global (All Pages)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300 mb-1 block">Description</Label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          {/* Device Visibility */}
          <div className="bg-gray-800 rounded-lg p-4">
            <Label className="text-gray-300 mb-3 block">Display On</Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={formData.show_on_desktop}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, show_on_desktop: v }))}
                />
                <Monitor size={18} className="text-blue-400" />
                <span className="text-gray-300">Desktop</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={formData.show_on_tablet}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, show_on_tablet: v }))}
                />
                <Tablet size={18} className="text-purple-400" />
                <span className="text-gray-300">Tablet</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={formData.show_on_mobile}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, show_on_mobile: v }))}
                />
                <Smartphone size={18} className="text-green-400" />
                <span className="text-gray-300">Mobile</span>
              </label>
            </div>
          </div>

          {/* Content Blocks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-gray-300">Content Blocks</Label>
              <span className="text-sm text-gray-500">{formData.blocks.length} block(s)</span>
            </div>

            {/* Add Block Buttons */}
            <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-400 mr-2">Add:</span>
              {BLOCK_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => addBlock(type.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
                >
                  <type.icon size={14} />
                  {type.label}
                </button>
              ))}
            </div>

            {/* Blocks List */}
            <div className="space-y-3">
              {formData.blocks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-800 rounded-lg border border-dashed border-gray-700">
                  <Layout className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No blocks yet. Add your first content block above.</p>
                </div>
              ) : (
                formData.blocks.map((block, index) => (
                  <BlockEditor
                    key={block.id}
                    block={block}
                    onUpdate={(updated) => updateBlock(index, updated)}
                    onDelete={() => deleteBlock(index)}
                    onMoveUp={() => moveBlock(index, -1)}
                    onMoveDown={() => moveBlock(index, 1)}
                    isFirst={index === 0}
                    isLast={index === formData.blocks.length - 1}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700 sticky bottom-0 bg-gray-900">
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_active: v }))}
            />
            <span className="text-gray-300">Zone Active</span>
          </label>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="border-gray-700 text-gray-300">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
              <Save size={16} className="mr-2" />
              {saving ? 'Saving...' : 'Save Zone'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Content Zones Page
const MerchantContentZones = () => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingZone, setEditingZone] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [filterPage, setFilterPage] = useState('all');

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const res = await axios.get(`${API}/content-zones?include_inactive=true`);
      setZones(res.data);
    } catch (error) {
      console.error('Error fetching zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveZone = async (zoneData) => {
    try {
      if (editingZone?.id) {
        await axios.put(`${API}/content-zones/${editingZone.id}`, zoneData);
      } else {
        await axios.post(`${API}/content-zones`, zoneData);
      }
      fetchZones();
      setShowEditor(false);
      setEditingZone(null);
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm('Delete this content zone? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/content-zones/${zoneId}`);
      fetchZones();
    } catch (error) {
      console.error('Error deleting zone:', error);
    }
  };

  const toggleZoneActive = async (zone) => {
    try {
      await axios.put(`${API}/content-zones/${zone.id}`, { is_active: !zone.is_active });
      fetchZones();
    } catch (error) {
      console.error('Error toggling zone:', error);
    }
  };

  const filteredZones = filterPage === 'all' 
    ? zones 
    : zones.filter(z => z.page === filterPage);

  const copyTag = (zoneName) => {
    navigator.clipboard.writeText(`[%content_zone name:'${zoneName}'%][%/content_zone%]`);
  };

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
          <h1 className="text-2xl font-bold text-white">Content Zones</h1>
          <p className="text-gray-400">Manage customizable content areas for your pages</p>
        </div>
        <Button onClick={() => { setEditingZone(null); setShowEditor(true); }} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus size={18} className="mr-2" />
          Create Zone
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-6">
        <Label className="text-gray-400">Filter by page:</Label>
        <Select value={filterPage} onValueChange={setFilterPage}>
          <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all" className="text-gray-300">All Pages</SelectItem>
            <SelectItem value="home" className="text-gray-300">Homepage</SelectItem>
            <SelectItem value="product" className="text-gray-300">Product</SelectItem>
            <SelectItem value="category" className="text-gray-300">Category</SelectItem>
            <SelectItem value="cart" className="text-gray-300">Cart</SelectItem>
            <SelectItem value="global" className="text-gray-300">Global</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Zones List */}
      <div className="space-y-4">
        {filteredZones.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
            <Layout className="w-12 h-12 mx-auto text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Content Zones</h3>
            <p className="text-gray-400 mb-4">Create your first content zone to add customizable content areas</p>
            <Button onClick={() => { setEditingZone(null); setShowEditor(true); }} className="bg-cyan-600 hover:bg-cyan-700">
              <Plus size={18} className="mr-2" />
              Create Zone
            </Button>
          </div>
        ) : (
          filteredZones.map(zone => (
            <div
              key={zone.id}
              className={`bg-gray-800 rounded-lg border p-4 ${zone.is_active ? 'border-gray-700' : 'border-gray-700/50 opacity-60'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{zone.label}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${zone.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {zone.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-400">
                      {zone.page}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => copyTag(zone.name)}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-700 rounded text-xs text-cyan-400 hover:bg-gray-600"
                    >
                      <Copy size={12} />
                      <code>[%content_zone name:'{zone.name}'%]</code>
                    </button>
                  </div>
                  
                  {zone.description && (
                    <p className="text-sm text-gray-500 mb-2">{zone.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{zone.blocks?.length || 0} block(s)</span>
                    <div className="flex items-center gap-1">
                      {zone.show_on_desktop && <Monitor size={14} className="text-blue-400" />}
                      {zone.show_on_tablet && <Tablet size={14} className="text-purple-400" />}
                      {zone.show_on_mobile && <Smartphone size={14} className="text-green-400" />}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleZoneActive(zone)}
                    className="border-gray-700 text-gray-300"
                  >
                    {zone.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingZone(zone); setShowEditor(true); }}
                    className="border-gray-700 text-gray-300"
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteZone(zone.id)}
                    className="border-red-600 text-red-400 hover:bg-red-600/20"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Zone Editor Modal */}
      {showEditor && (
        <ZoneEditor
          zone={editingZone}
          onSave={handleSaveZone}
          onClose={() => { setShowEditor(false); setEditingZone(null); }}
        />
      )}
    </div>
  );
};

export default MerchantContentZones;
