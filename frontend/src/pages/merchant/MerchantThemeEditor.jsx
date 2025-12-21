import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { 
  Save, Plus, Trash2, File, FileCode, FolderOpen, Eye, 
  ChevronRight, ChevronDown, Code, Layout, X, Copy, Check,
  RefreshCw, Book, Search
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantThemeEditor = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showTagsPanel, setShowTagsPanel] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [tagDocs, setTagDocs] = useState(null);
  const [searchTag, setSearchTag] = useState('');
  const [copiedTag, setCopiedTag] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    display_name: '',
    template_type: 'partial',
    content: ''
  });

  // File tree state
  const [expandedFolders, setExpandedFolders] = useState({
    partials: true,
    pages: true,
    layouts: true
  });

  useEffect(() => {
    fetchTemplates();
    fetchTagDocs();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/templates`);
      setTemplates(response.data);
      if (response.data.length > 0 && !selectedTemplate) {
        selectTemplate(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTagDocs = async () => {
    try {
      const response = await axios.get(`${API}/template-tags`);
      setTagDocs(response.data);
    } catch (error) {
      console.error('Error fetching tag docs:', error);
    }
  };

  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    setEditorContent(template.content);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    
    setSaving(true);
    try {
      await axios.put(`${API}/templates/${selectedTemplate.id}`, {
        content: editorContent
      });
      
      // Update local state
      setTemplates(prev => prev.map(t => 
        t.id === selectedTemplate.id ? { ...t, content: editorContent } : t
      ));
      setSelectedTemplate(prev => ({ ...prev, content: editorContent }));
      
      alert('Template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/templates`, newTemplate);
      setTemplates(prev => [...prev, response.data]);
      selectTemplate(response.data);
      setShowNewModal(false);
      setNewTemplate({ name: '', display_name: '', template_type: 'partial', content: '' });
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Failed to create template');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await axios.delete(`${API}/templates/${templateId}`);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
        setEditorContent('');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const handlePreview = async () => {
    try {
      const formData = new FormData();
      formData.append('template_content', editorContent);
      formData.append('context', JSON.stringify({}));
      
      const response = await axios.post(`${API}/render-template`, formData);
      setPreviewContent(response.data.rendered);
      setShowPreview(true);
    } catch (error) {
      console.error('Error previewing template:', error);
      alert('Failed to preview template');
    }
  };

  const copyTag = (tag) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const insertTag = (tag) => {
    // This would insert at cursor position in a real implementation
    setEditorContent(prev => prev + tag);
  };

  const toggleFolder = (folder) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  // Group templates by type
  const groupedTemplates = {
    partials: templates.filter(t => t.template_type === 'partial'),
    pages: templates.filter(t => t.template_type === 'page'),
    layouts: templates.filter(t => t.template_type === 'layout')
  };

  const filteredTags = useCallback(() => {
    if (!tagDocs || !searchTag) return tagDocs;
    
    const search = searchTag.toLowerCase();
    const filtered = { data_tags: {}, function_tags: {} };
    
    Object.entries(tagDocs.data_tags || {}).forEach(([category, tags]) => {
      const matchingTags = tags.filter(t => 
        t.tag.toLowerCase().includes(search) || 
        t.description.toLowerCase().includes(search)
      );
      if (matchingTags.length > 0) {
        filtered.data_tags[category] = matchingTags;
      }
    });
    
    Object.entries(tagDocs.function_tags || {}).forEach(([category, tags]) => {
      const matchingTags = tags.filter(t => 
        t.tag.toLowerCase().includes(search) || 
        t.description.toLowerCase().includes(search)
      );
      if (matchingTags.length > 0) {
        filtered.function_tags[category] = matchingTags;
      }
    });
    
    return filtered;
  }, [tagDocs, searchTag]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Code className="w-5 h-5 text-cyan-500" />
            Theme Editor
          </h1>
          {selectedTemplate && (
            <span className="text-gray-400">
              Editing: <span className="text-cyan-400">{selectedTemplate.display_name}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTagsPanel(!showTagsPanel)}
            className={`border-gray-600 ${showTagsPanel ? 'bg-cyan-600 text-white' : 'text-gray-300'}`}
          >
            <Book className="w-4 h-4 mr-1" /> Tags Reference
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={!selectedTemplate}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Eye className="w-4 h-4 mr-1" /> Preview
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedTemplate || saving}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Sidebar */}
        <div className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col">
          <div className="p-3 border-b border-gray-700">
            <Button
              onClick={() => setShowNewModal(true)}
              size="sm"
              className="w-full bg-gray-700 hover:bg-gray-600 text-white"
            >
              <Plus className="w-4 h-4 mr-1" /> New Template
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {/* Partials */}
            <div className="mb-2">
              <button
                onClick={() => toggleFolder('partials')}
                className="flex items-center gap-1 w-full p-2 text-left text-gray-300 hover:bg-gray-800 rounded"
              >
                {expandedFolders.partials ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <FolderOpen className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">Partials</span>
                <span className="text-xs text-gray-500 ml-auto">{groupedTemplates.partials.length}</span>
              </button>
              {expandedFolders.partials && (
                <div className="ml-4 space-y-1">
                  {groupedTemplates.partials.map(template => (
                    <div
                      key={template.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer group ${
                        selectedTemplate?.id === template.id ? 'bg-cyan-600/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-800'
                      }`}
                      onClick={() => selectTemplate(template)}
                    >
                      <FileCode className="w-4 h-4" />
                      <span className="text-sm flex-1 truncate">{template.display_name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pages */}
            <div className="mb-2">
              <button
                onClick={() => toggleFolder('pages')}
                className="flex items-center gap-1 w-full p-2 text-left text-gray-300 hover:bg-gray-800 rounded"
              >
                {expandedFolders.pages ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <FolderOpen className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Pages</span>
                <span className="text-xs text-gray-500 ml-auto">{groupedTemplates.pages.length}</span>
              </button>
              {expandedFolders.pages && (
                <div className="ml-4 space-y-1">
                  {groupedTemplates.pages.map(template => (
                    <div
                      key={template.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer group ${
                        selectedTemplate?.id === template.id ? 'bg-cyan-600/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-800'
                      }`}
                      onClick={() => selectTemplate(template)}
                    >
                      <File className="w-4 h-4" />
                      <span className="text-sm flex-1 truncate">{template.display_name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Layouts */}
            <div className="mb-2">
              <button
                onClick={() => toggleFolder('layouts')}
                className="flex items-center gap-1 w-full p-2 text-left text-gray-300 hover:bg-gray-800 rounded"
              >
                {expandedFolders.layouts ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <FolderOpen className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Layouts</span>
                <span className="text-xs text-gray-500 ml-auto">{groupedTemplates.layouts.length}</span>
              </button>
              {expandedFolders.layouts && (
                <div className="ml-4 space-y-1">
                  {groupedTemplates.layouts.map(template => (
                    <div
                      key={template.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer group ${
                        selectedTemplate?.id === template.id ? 'bg-cyan-600/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-800'
                      }`}
                      onClick={() => selectTemplate(template)}
                    >
                      <Layout className="w-4 h-4" />
                      <span className="text-sm flex-1 truncate">{template.display_name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col">
          {selectedTemplate ? (
            <Editor
              height="100%"
              defaultLanguage="html"
              theme="vs-dark"
              value={editorContent}
              onChange={(value) => setEditorContent(value || '')}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                tabSize: 2,
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <FileCode className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-400">No template selected</h3>
                <p className="text-gray-500 mt-2">Select a template from the sidebar or create a new one</p>
              </div>
            </div>
          )}
        </div>

        {/* Tags Reference Panel */}
        {showTagsPanel && (
          <div className="w-80 bg-gray-900 border-l border-gray-700 flex flex-col">
            <div className="p-3 border-b border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">Maropost Tags</h3>
                <button onClick={() => setShowTagsPanel(false)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchTag}
                  onChange={(e) => setSearchTag(e.target.value)}
                  placeholder="Search tags..."
                  className="pl-8 bg-gray-800 border-gray-600 text-white text-sm"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Data Tags */}
              <div>
                <h4 className="text-xs font-semibold text-cyan-400 uppercase mb-2">Data Tags [@tag@]</h4>
                {Object.entries(filteredTags()?.data_tags || {}).map(([category, tags]) => (
                  <div key={category} className="mb-3">
                    <h5 className="text-xs font-medium text-gray-400 capitalize mb-1">{category}</h5>
                    <div className="space-y-1">
                      {tags.slice(0, 10).map((tag, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-1.5 bg-gray-800 rounded text-xs group hover:bg-gray-700 cursor-pointer"
                          onClick={() => insertTag(tag.tag)}
                        >
                          <div className="flex-1 min-w-0">
                            <code className="text-cyan-300">{tag.tag}</code>
                            <p className="text-gray-500 truncate">{tag.description}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); copyTag(tag.tag); }}
                            className="opacity-0 group-hover:opacity-100 ml-2"
                          >
                            {copiedTag === tag.tag ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-gray-400" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Function Tags */}
              <div>
                <h4 className="text-xs font-semibold text-purple-400 uppercase mb-2">Function Tags [%tag%]</h4>
                {Object.entries(filteredTags()?.function_tags || {}).map(([category, tags]) => (
                  <div key={category} className="mb-3">
                    <h5 className="text-xs font-medium text-gray-400 capitalize mb-1">{category}</h5>
                    <div className="space-y-1">
                      {tags.map((tag, idx) => (
                        <div
                          key={idx}
                          className="p-1.5 bg-gray-800 rounded text-xs group hover:bg-gray-700 cursor-pointer"
                          onClick={() => insertTag(tag.tag)}
                        >
                          <div className="flex items-center justify-between">
                            <code className="text-purple-300 text-xs break-all">{tag.tag.substring(0, 40)}...</code>
                            <button
                              onClick={(e) => { e.stopPropagation(); copyTag(tag.tag); }}
                              className="opacity-0 group-hover:opacity-100 ml-2"
                            >
                              {copiedTag === tag.tag ? (
                                <Check className="w-3 h-3 text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3 text-gray-400" />
                              )}
                            </button>
                          </div>
                          <p className="text-gray-500 mt-1">{tag.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Template Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">New Template</h2>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTemplate} className="p-4 space-y-4">
              <div>
                <Label className="text-gray-300">Template Name (slug)</Label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                  placeholder="e.g., product-card"
                  required
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Display Name</Label>
                <Input
                  value={newTemplate.display_name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="e.g., Product Card"
                  required
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Template Type</Label>
                <select
                  value={newTemplate.template_type}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, template_type: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2"
                >
                  <option value="partial">Partial (reusable component)</option>
                  <option value="page">Page (full page template)</option>
                  <option value="layout">Layout (page wrapper)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowNewModal(false)} className="flex-1 border-gray-600 text-gray-300">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-700">
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Template Preview</h2>
              <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(80vh-60px)]">
              <div dangerouslySetInnerHTML={{ __html: previewContent }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantThemeEditor;
