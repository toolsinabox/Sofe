import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { 
  Save, Plus, Trash2, File, FileCode, FolderOpen, Eye, 
  ChevronRight, ChevronDown, Code, X, Copy, Check,
  RefreshCw, Book, Search, Download, Upload, Image, FileText,
  Folder, FileJson, FileCog, AlertCircle, Star, MoreVertical,
  Globe, Palette
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { useAuth } from '../../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// File type icons and language mappings
const getFileInfo = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  const mappings = {
    html: { icon: FileCode, color: 'text-orange-400', language: 'html' },
    htm: { icon: FileCode, color: 'text-orange-400', language: 'html' },
    css: { icon: FileText, color: 'text-blue-400', language: 'css' },
    scss: { icon: FileText, color: 'text-pink-400', language: 'scss' },
    sass: { icon: FileText, color: 'text-pink-400', language: 'scss' },
    js: { icon: FileCog, color: 'text-yellow-400', language: 'javascript' },
    json: { icon: FileJson, color: 'text-green-400', language: 'json' },
    txt: { icon: FileText, color: 'text-gray-400', language: 'plaintext' },
    md: { icon: FileText, color: 'text-gray-400', language: 'markdown' },
    png: { icon: Image, color: 'text-purple-400', language: null, isImage: true },
    jpg: { icon: Image, color: 'text-purple-400', language: null, isImage: true },
    jpeg: { icon: Image, color: 'text-purple-400', language: null, isImage: true },
    gif: { icon: Image, color: 'text-purple-400', language: null, isImage: true },
    webp: { icon: Image, color: 'text-purple-400', language: null, isImage: true },
    svg: { icon: Image, color: 'text-purple-400', language: 'xml', isImage: true },
    woff: { icon: File, color: 'text-gray-500', language: null, isBinary: true },
    woff2: { icon: File, color: 'text-gray-500', language: null, isBinary: true },
    ttf: { icon: File, color: 'text-gray-500', language: null, isBinary: true },
    eot: { icon: File, color: 'text-gray-500', language: null, isBinary: true },
  };
  return mappings[ext] || { icon: File, color: 'text-gray-400', language: 'plaintext' };
};

// Build tree structure from flat file list
const buildFileTree = (files) => {
  const tree = {};
  
  files.forEach(file => {
    const parts = file.path.split('/').filter(Boolean);
    let current = tree;
    
    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = index === parts.length - 1 
          ? { _file: file }
          : { _children: {} };
      }
      if (index < parts.length - 1) {
        if (!current[part]._children) {
          current[part]._children = {};
        }
        current = current[part]._children;
      }
    });
  });
  
  return tree;
};

// Recursive tree node component
const TreeNode = ({ name, node, path, selectedFile, onSelect, onDelete, expandedPaths, toggleExpand, depth = 0 }) => {
  const isFile = node._file;
  const isExpanded = expandedPaths.has(path);
  const fileInfo = isFile ? getFileInfo(name) : null;
  const Icon = isFile ? fileInfo.icon : (isExpanded ? FolderOpen : Folder);
  
  if (isFile) {
    return (
      <div
        className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer group hover:bg-gray-800 ${
          selectedFile?.path === node._file.path && selectedFile?.theme === node._file.theme 
            ? 'bg-cyan-600/20 text-cyan-400' : 'text-gray-400'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelect(node._file)}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${fileInfo.color}`} />
        <span className="text-xs flex-1 truncate">{name}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(node._file); }}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-0.5"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    );
  }
  
  // Folder
  const children = node._children || {};
  const sortedChildren = Object.entries(children).sort(([a, nodeA], [b, nodeB]) => {
    const aIsFile = !!nodeA._file;
    const bIsFile = !!nodeB._file;
    if (aIsFile !== bIsFile) return aIsFile ? 1 : -1;
    return a.localeCompare(b);
  });
  
  return (
    <div>
      <div
        className="flex items-center gap-1 py-1 px-2 rounded cursor-pointer hover:bg-gray-800 text-gray-300"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => toggleExpand(path)}
      >
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Icon className="w-4 h-4 text-yellow-500" />
        <span className="text-xs font-medium">{name}</span>
        <span className="text-xs text-gray-600 ml-auto">{sortedChildren.length}</span>
      </div>
      {isExpanded && (
        <div>
          {sortedChildren.map(([childName, childNode]) => (
            <TreeNode
              key={childName}
              name={childName}
              node={childNode}
              path={`${path}/${childName}`}
              selectedFile={selectedFile}
              onSelect={onSelect}
              onDelete={onDelete}
              expandedPaths={expandedPaths}
              toggleExpand={toggleExpand}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const MerchantThemeEditor = () => {
  const { token } = useAuth();
  const fileInputRef = useRef(null);
  
  // Themes state
  const [themes, setThemes] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [themeFiles, setThemeFiles] = useState([]);
  
  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedPaths, setExpandedPaths] = useState(new Set());
  const [expandedThemes, setExpandedThemes] = useState(new Set());
  
  // Modals
  const [showNewThemeModal, setShowNewThemeModal] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [showTagsPanel, setShowTagsPanel] = useState(false);
  const [tagDocs, setTagDocs] = useState(null);
  const [searchTag, setSearchTag] = useState('');
  const [searchFile, setSearchFile] = useState('');
  const [copiedTag, setCopiedTag] = useState(null);
  
  const [newThemeName, setNewThemeName] = useState('');
  const [newFile, setNewFile] = useState({ path: '', content: '' });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchThemes();
    fetchTagDocs();
  }, []);

  const fetchThemes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/themes`, { headers });
      setThemes(response.data);
      
      // Auto-expand active theme
      const activeTheme = response.data.find(t => t.is_active);
      if (activeTheme) {
        setExpandedThemes(new Set([activeTheme.name]));
        setSelectedTheme(activeTheme.name);
        await fetchThemeFiles(activeTheme.name);
      }
    } catch (err) {
      console.error('Error fetching themes:', err);
      setError('Failed to load themes');
    } finally {
      setLoading(false);
    }
  };

  const fetchThemeFiles = async (themeName) => {
    try {
      const response = await axios.get(`${API}/themes/${themeName}/files`, { headers });
      setThemeFiles(response.data);
      
      // Auto-expand first level folders
      const paths = new Set();
      response.data.forEach(file => {
        const parts = file.path.split('/');
        if (parts.length > 1) {
          paths.add(parts[0]);
        }
      });
      setExpandedPaths(paths);
    } catch (err) {
      console.error('Error fetching theme files:', err);
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

  const selectTheme = async (themeName) => {
    setSelectedTheme(themeName);
    setSelectedFile(null);
    setEditorContent('');
    await fetchThemeFiles(themeName);
  };

  const toggleThemeExpand = (themeName) => {
    setExpandedThemes(prev => {
      const next = new Set(prev);
      if (next.has(themeName)) {
        next.delete(themeName);
      } else {
        next.add(themeName);
        selectTheme(themeName);
      }
      return next;
    });
  };

  const selectFile = async (file) => {
    const fileInfo = getFileInfo(file.path);
    
    if (fileInfo.isBinary) {
      setSelectedFile(file);
      setEditorContent('// Binary file - cannot be edited');
      setOriginalContent('');
      return;
    }
    
    if (fileInfo.isImage && !file.path.endsWith('.svg')) {
      setSelectedFile(file);
      setEditorContent('');
      setOriginalContent('');
      return;
    }
    
    try {
      const response = await axios.get(
        `${API}/themes/${file.theme}/files/${encodeURIComponent(file.path)}`, 
        { headers }
      );
      setSelectedFile(file);
      setEditorContent(response.data.content);
      setOriginalContent(response.data.content);
    } catch (err) {
      console.error('Error loading file:', err);
      setError('Failed to load file content');
    }
  };

  const handleSave = async () => {
    if (!selectedFile || !selectedTheme) return;
    
    setSaving(true);
    setError(null);
    try {
      await axios.put(
        `${API}/themes/${selectedTheme}/files/${encodeURIComponent(selectedFile.path)}`,
        { content: editorContent },
        { headers }
      );
      setOriginalContent(editorContent);
    } catch (err) {
      console.error('Error saving file:', err);
      setError('Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTheme = async () => {
    if (!newThemeName.trim()) return;
    
    setError(null);
    try {
      await axios.post(`${API}/themes?name=${encodeURIComponent(newThemeName)}`, {}, { headers });
      setShowNewThemeModal(false);
      setNewThemeName('');
      await fetchThemes();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create theme');
    }
  };

  const handleDeleteTheme = async (themeName) => {
    if (!window.confirm(`Delete theme "${themeName}"? This cannot be undone.`)) return;
    
    try {
      await axios.delete(`${API}/themes/${themeName}`, { headers });
      if (selectedTheme === themeName) {
        setSelectedTheme(null);
        setThemeFiles([]);
        setSelectedFile(null);
      }
      await fetchThemes();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete theme');
    }
  };

  const handleActivateTheme = async (themeName) => {
    try {
      await axios.put(`${API}/themes/${themeName}/activate`, {}, { headers });
      await fetchThemes();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to activate theme');
    }
  };

  const handleCreateFile = async (e) => {
    e.preventDefault();
    if (!selectedTheme) return;
    
    setError(null);
    try {
      await axios.post(`${API}/themes/${selectedTheme}/files`, newFile, { headers });
      await fetchThemeFiles(selectedTheme);
      setShowNewFileModal(false);
      setNewFile({ path: '', content: '' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create file');
    }
  };

  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Delete ${file.path}?`)) return;
    
    try {
      await axios.delete(`${API}/themes/${file.theme}/files/${encodeURIComponent(file.path)}`, { headers });
      await fetchThemeFiles(file.theme);
      if (selectedFile?.path === file.path) {
        setSelectedFile(null);
        setEditorContent('');
      }
    } catch (err) {
      setError('Failed to delete file');
    }
  };

  const handleDownloadTheme = async (themeName) => {
    try {
      const response = await axios.get(`${API}/themes/${themeName}/download`, {
        headers,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${themeName}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to download theme');
    }
  };

  const handleUploadTheme = async (e, themeName) => {
    const file = e.target.files?.[0];
    if (!file || !themeName) return;
    
    setUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await axios.post(`${API}/themes/${themeName}/upload`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      
      await fetchThemeFiles(themeName);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const toggleExpand = (path) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const copyTag = (tag) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const insertTag = (tag) => {
    setEditorContent(prev => prev + tag);
  };

  const filteredTags = useCallback(() => {
    if (!tagDocs || !searchTag) return tagDocs;
    const search = searchTag.toLowerCase();
    const filtered = { data_tags: {}, function_tags: {} };
    
    Object.entries(tagDocs.data_tags || {}).forEach(([cat, tags]) => {
      const m = tags.filter(t => t.tag.toLowerCase().includes(search) || t.description.toLowerCase().includes(search));
      if (m.length) filtered.data_tags[cat] = m;
    });
    
    Object.entries(tagDocs.function_tags || {}).forEach(([cat, tags]) => {
      const m = tags.filter(t => t.tag.toLowerCase().includes(search) || t.description.toLowerCase().includes(search));
      if (m.length) filtered.function_tags[cat] = m;
    });
    
    return filtered;
  }, [tagDocs, searchTag]);

  const filteredFiles = searchFile 
    ? themeFiles.filter(f => f.path.toLowerCase().includes(searchFile.toLowerCase()))
    : themeFiles;

  const fileTree = buildFileTree(filteredFiles);
  const fileInfo = selectedFile ? getFileInfo(selectedFile.path) : null;
  const hasUnsavedChanges = editorContent !== originalContent;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-cyan-500" />
            Theme Editor
          </h1>
          {selectedFile && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">/</span>
              <span className="text-cyan-400 text-sm">{selectedTheme}/{selectedFile.path}</span>
              {hasUnsavedChanges && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Unsaved</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTagsPanel(!showTagsPanel)}
            className={`border-gray-600 ${showTagsPanel ? 'bg-cyan-600 text-white' : 'text-gray-300'}`}
          >
            <Book className="w-4 h-4 mr-1" /> Tags
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedFile || saving || !hasUnsavedChanges}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-2 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Web Themes */}
        <div className="w-72 bg-gray-900 border-r border-gray-700 flex flex-col">
          <div className="p-2 border-b border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase">Web Themes</span>
              <Button
                onClick={() => setShowNewThemeModal(true)}
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-cyan-400 hover:text-cyan-300 hover:bg-gray-800"
              >
                <Plus className="w-3 h-3 mr-1" /> New
              </Button>
            </div>
            {selectedTheme && (
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                <Input
                  value={searchFile}
                  onChange={(e) => setSearchFile(e.target.value)}
                  placeholder="Search files..."
                  className="pl-7 bg-gray-800 border-gray-700 text-white text-xs h-7"
                />
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto py-1">
            {themes.map(theme => (
              <div key={theme.name}>
                {/* Theme header */}
                <div className="flex items-center group">
                  <div
                    className={`flex-1 flex items-center gap-1 py-1.5 px-2 cursor-pointer hover:bg-gray-800 ${
                      selectedTheme === theme.name ? 'text-cyan-400' : 'text-gray-300'
                    }`}
                    onClick={() => toggleThemeExpand(theme.name)}
                  >
                    {expandedThemes.has(theme.name) ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <Globe className={`w-4 h-4 ${theme.is_active ? 'text-green-400' : 'text-gray-500'}`} />
                    <span className="text-sm font-medium flex-1">{theme.name}</span>
                    {theme.is_active && (
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    )}
                    <span className="text-xs text-gray-600">{theme.file_count}</span>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-700 rounded">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-gray-700">
                      {!theme.is_active && (
                        <DropdownMenuItem 
                          onClick={() => handleActivateTheme(theme.name)}
                          className="text-gray-300 hover:bg-gray-700"
                        >
                          <Star className="w-4 h-4 mr-2" /> Set as Active
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => handleDownloadTheme(theme.name)}
                        className="text-gray-300 hover:bg-gray-700"
                      >
                        <Download className="w-4 h-4 mr-2" /> Download ZIP
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          setSelectedTheme(theme.name);
                          fileInputRef.current?.click();
                        }}
                        className="text-gray-300 hover:bg-gray-700"
                      >
                        <Upload className="w-4 h-4 mr-2" /> Upload ZIP
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          setSelectedTheme(theme.name);
                          setShowNewFileModal(true);
                        }}
                        className="text-gray-300 hover:bg-gray-700"
                      >
                        <Plus className="w-4 h-4 mr-2" /> New File
                      </DropdownMenuItem>
                      {!theme.is_active && (
                        <DropdownMenuItem 
                          onClick={() => handleDeleteTheme(theme.name)}
                          className="text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Theme files */}
                {expandedThemes.has(theme.name) && selectedTheme === theme.name && (
                  <div className="ml-2">
                    {Object.entries(fileTree).map(([name, node]) => (
                      <TreeNode
                        key={name}
                        name={name}
                        node={node}
                        path={name}
                        selectedFile={selectedFile}
                        onSelect={selectFile}
                        onDelete={handleDeleteFile}
                        expandedPaths={expandedPaths}
                        toggleExpand={toggleExpand}
                      />
                    ))}
                    {themeFiles.length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-xs">
                        Empty theme - upload files or create new
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {themes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Globe className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No themes yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          {selectedFile ? (
            fileInfo?.isImage && !selectedFile.path.endsWith('.svg') ? (
              <div className="flex-1 flex items-center justify-center bg-gray-950 p-8">
                <div className="text-center">
                  <img 
                    src={`${API}/themes/${selectedTheme}/assets/${selectedFile.path}`}
                    alt={selectedFile.path}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                  />
                  <p className="text-gray-400 mt-4 text-sm">{selectedFile.path}</p>
                </div>
              </div>
            ) : fileInfo?.isBinary ? (
              <div className="flex-1 flex items-center justify-center bg-gray-950">
                <div className="text-center">
                  <File className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-400">Binary File</h3>
                  <p className="text-gray-500 mt-2 text-sm">Cannot be edited</p>
                </div>
              </div>
            ) : (
              <Editor
                height="100%"
                language={fileInfo?.language || 'plaintext'}
                theme="vs-dark"
                value={editorContent}
                onChange={(value) => setEditorContent(value || '')}
                options={{
                  minimap: { enabled: true },
                  fontSize: 13,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                }}
              />
            )
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-950">
              <div className="text-center">
                <FileCode className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-400">No file selected</h3>
                <p className="text-gray-500 mt-2 text-sm">Select a theme and file from the sidebar</p>
              </div>
            </div>
          )}
        </div>

        {/* Tags Panel */}
        {showTagsPanel && (
          <div className="w-72 bg-gray-900 border-l border-gray-700 flex flex-col">
            <div className="p-2 border-b border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white">Maropost Tags</h3>
                <button onClick={() => setShowTagsPanel(false)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <Input
                  value={searchTag}
                  onChange={(e) => setSearchTag(e.target.value)}
                  placeholder="Search tags..."
                  className="pl-7 bg-gray-800 border-gray-600 text-white text-xs h-7"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-cyan-400 uppercase mb-1">Data Tags [@tag@]</h4>
                {Object.entries(filteredTags()?.data_tags || {}).map(([category, tags]) => (
                  <div key={category} className="mb-2">
                    <h5 className="text-xs text-gray-500 capitalize mb-1">{category}</h5>
                    {tags.slice(0, 8).map((tag, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-1 bg-gray-800 rounded text-xs group hover:bg-gray-700 cursor-pointer mb-0.5"
                        onClick={() => insertTag(tag.tag)}
                      >
                        <code className="text-cyan-300 truncate">{tag.tag}</code>
                        <button onClick={(e) => { e.stopPropagation(); copyTag(tag.tag); }} className="opacity-0 group-hover:opacity-100">
                          {copiedTag === tag.tag ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-purple-400 uppercase mb-1">Function Tags [%tag%]</h4>
                {Object.entries(filteredTags()?.function_tags || {}).map(([category, tags]) => (
                  <div key={category} className="mb-2">
                    <h5 className="text-xs text-gray-500 capitalize mb-1">{category}</h5>
                    {tags.map((tag, idx) => (
                      <div
                        key={idx}
                        className="p-1 bg-gray-800 rounded text-xs group hover:bg-gray-700 cursor-pointer mb-0.5"
                        onClick={() => insertTag(tag.tag)}
                      >
                        <code className="text-purple-300 text-xs block truncate">{tag.tag.substring(0, 35)}...</code>
                        <p className="text-gray-500 text-xs truncate">{tag.description}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleUploadTheme(e, selectedTheme)}
        accept=".zip"
        className="hidden"
      />

      {/* New Theme Modal */}
      <Dialog open={showNewThemeModal} onOpenChange={setShowNewThemeModal}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Theme</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-gray-300">Theme Name</Label>
              <Input
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                placeholder="e.g., mytheme"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Lowercase, no spaces</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowNewThemeModal(false)} className="flex-1 text-gray-400">
                Cancel
              </Button>
              <Button onClick={handleCreateTheme} className="flex-1 bg-cyan-600 hover:bg-cyan-700">
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New File Modal */}
      <Dialog open={showNewFileModal} onOpenChange={setShowNewFileModal}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>New File in {selectedTheme}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateFile} className="space-y-4 mt-4">
            <div>
              <Label className="text-gray-300">File Path</Label>
              <Input
                value={newFile.path}
                onChange={(e) => setNewFile(prev => ({ ...prev, path: e.target.value }))}
                placeholder="e.g., templates/custom/page.html"
                required
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Initial Content</Label>
              <textarea
                value={newFile.content}
                onChange={(e) => setNewFile(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Optional..."
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md p-2 text-sm font-mono"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowNewFileModal(false)} className="flex-1 text-gray-400">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-700">
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantThemeEditor;
