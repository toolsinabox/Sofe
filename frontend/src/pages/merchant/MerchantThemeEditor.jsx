import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { 
  Save, Plus, Trash2, File, FileCode, FolderOpen, Eye, 
  ChevronRight, ChevronDown, Code, Layout, X, Copy, Check,
  RefreshCw, Book, Search, Download, Upload, Image, FileText,
  Folder, FileJson, FileCog, AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
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
        className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer group hover:bg-gray-800 ${
          selectedFile?.path === node._file.path ? 'bg-cyan-600/20 text-cyan-400' : 'text-gray-400'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelect(node._file)}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${fileInfo.color}`} />
        <span className="text-sm flex-1 truncate">{name}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(node._file); }}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-1"
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
        className="flex items-center gap-1 py-1.5 px-2 rounded cursor-pointer hover:bg-gray-800 text-gray-300"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => toggleExpand(path)}
      >
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Icon className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-medium">{name}</span>
        <span className="text-xs text-gray-500 ml-auto">{sortedChildren.length}</span>
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
  
  const [themeFiles, setThemeFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  
  const [expandedPaths, setExpandedPaths] = useState(new Set(['theme']));
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [showTagsPanel, setShowTagsPanel] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [tagDocs, setTagDocs] = useState(null);
  const [searchTag, setSearchTag] = useState('');
  const [searchFile, setSearchFile] = useState('');
  const [copiedTag, setCopiedTag] = useState(null);
  
  const [newFile, setNewFile] = useState({
    path: '',
    content: ''
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchThemeFiles();
    fetchTagDocs();
  }, []);

  const fetchThemeFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/theme/files`, { headers });
      setThemeFiles(response.data);
      
      // Auto-expand first level folders
      const firstLevelFolders = new Set(['theme']);
      response.data.forEach(file => {
        const parts = file.path.split('/');
        if (parts.length > 1) {
          firstLevelFolders.add(`theme/${parts[0]}`);
        }
      });
      setExpandedPaths(firstLevelFolders);
      
    } catch (err) {
      console.error('Error fetching theme files:', err);
      setError('Failed to load theme files');
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
      const response = await axios.get(`${API}/theme/files/${encodeURIComponent(file.path)}`, { headers });
      setSelectedFile(file);
      setEditorContent(response.data.content);
      setOriginalContent(response.data.content);
    } catch (err) {
      console.error('Error loading file:', err);
      setError('Failed to load file content');
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    
    setSaving(true);
    setError(null);
    try {
      await axios.put(
        `${API}/theme/files/${encodeURIComponent(selectedFile.path)}`,
        { content: editorContent },
        { headers }
      );
      setOriginalContent(editorContent);
      setThemeFiles(prev => prev.map(f => 
        f.path === selectedFile.path ? { ...f, content: editorContent } : f
      ));
    } catch (err) {
      console.error('Error saving file:', err);
      setError('Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFile = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      await axios.post(`${API}/theme/files`, newFile, { headers });
      await fetchThemeFiles();
      setShowNewFileModal(false);
      setNewFile({ path: '', content: '' });
    } catch (err) {
      console.error('Error creating file:', err);
      setError(err.response?.data?.detail || 'Failed to create file');
    }
  };

  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Are you sure you want to delete ${file.path}?`)) return;
    
    try {
      await axios.delete(`${API}/theme/files/${encodeURIComponent(file.path)}`, { headers });
      setThemeFiles(prev => prev.filter(f => f.path !== file.path));
      if (selectedFile?.path === file.path) {
        setSelectedFile(null);
        setEditorContent('');
      }
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file');
    }
  };

  const handleDownloadTheme = async () => {
    setDownloading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/theme/download`, {
        headers,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'theme.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading theme:', err);
      setError('Failed to download theme');
    } finally {
      setDownloading(false);
    }
  };

  const handleUploadTheme = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.zip')) {
      setError('Please upload a ZIP file');
      return;
    }
    
    if (!window.confirm('This will replace ALL current theme files. Are you sure?')) {
      e.target.value = '';
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await axios.post(`${API}/theme/upload`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      await fetchThemeFiles();
      setSelectedFile(null);
      setEditorContent('');
    } catch (err) {
      console.error('Error uploading theme:', err);
      setError(err.response?.data?.detail || 'Failed to upload theme');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handlePreview = async () => {
    try {
      const response = await axios.post(`${API}/theme/preview`, {
        path: selectedFile?.path,
        content: editorContent
      }, { headers });
      setPreviewContent(response.data.rendered);
      setShowPreview(true);
    } catch (err) {
      console.error('Error previewing:', err);
      setError('Failed to preview template');
    }
  };

  const toggleExpand = (path) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
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

  // Filter files by search
  const filteredFiles = searchFile 
    ? themeFiles.filter(f => f.path.toLowerCase().includes(searchFile.toLowerCase()))
    : themeFiles;

  const fileTree = buildFileTree(filteredFiles);
  const fileInfo = selectedFile ? getFileInfo(selectedFile.path) : null;
  const hasUnsavedChanges = editorContent !== originalContent;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading theme files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Code className="w-5 h-5 text-cyan-500" />
            Theme Editor
          </h1>
          {selectedFile && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">/</span>
              <span className="text-cyan-400 text-sm">{selectedFile.path}</span>
              {hasUnsavedChanges && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Unsaved</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUploadTheme}
            accept=".zip"
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Upload className="w-4 h-4 mr-1" />
            {uploading ? 'Uploading...' : 'Upload Theme'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTheme}
            disabled={downloading}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Download className="w-4 h-4 mr-1" />
            {downloading ? 'Downloading...' : 'Download Theme'}
          </Button>
          <div className="w-px h-6 bg-gray-700 mx-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTagsPanel(!showTagsPanel)}
            className={`border-gray-600 ${showTagsPanel ? 'bg-cyan-600 text-white' : 'text-gray-300'}`}
          >
            <Book className="w-4 h-4 mr-1" /> Tags
          </Button>
          {selectedFile && fileInfo?.language === 'html' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Eye className="w-4 h-4 mr-1" /> Preview
            </Button>
          )}
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
        <div className="mx-4 mt-2 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Sidebar */}
        <div className="w-72 bg-gray-900 border-r border-gray-700 flex flex-col">
          <div className="p-2 border-b border-gray-700 space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={searchFile}
                onChange={(e) => setSearchFile(e.target.value)}
                placeholder="Search files..."
                className="pl-8 bg-gray-800 border-gray-700 text-white text-sm h-8"
              />
            </div>
            <Button
              onClick={() => setShowNewFileModal(true)}
              size="sm"
              className="w-full bg-gray-700 hover:bg-gray-600 text-white h-8"
            >
              <Plus className="w-4 h-4 mr-1" /> New File
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-2">
            <div className="px-2 mb-2">
              <div className="text-xs text-gray-500 uppercase font-medium mb-1">
                Theme Files ({themeFiles.length})
              </div>
            </div>
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
              <div className="text-center py-8 text-gray-500">
                <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No theme files yet</p>
                <p className="text-xs mt-1">Upload a theme or create files</p>
              </div>
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          {selectedFile ? (
            fileInfo?.isImage && !selectedFile.path.endsWith('.svg') ? (
              // Image preview
              <div className="flex-1 flex items-center justify-center bg-gray-950 p-8">
                <div className="text-center">
                  <img 
                    src={`${API}/theme/files/${encodeURIComponent(selectedFile.path)}/raw`}
                    alt={selectedFile.path}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                  />
                  <p className="text-gray-400 mt-4">{selectedFile.path}</p>
                </div>
              </div>
            ) : fileInfo?.isBinary ? (
              // Binary file
              <div className="flex-1 flex items-center justify-center bg-gray-950">
                <div className="text-center">
                  <File className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-400">Binary File</h3>
                  <p className="text-gray-500 mt-2">This file type cannot be edited in the browser</p>
                  <p className="text-gray-600 text-sm mt-1">{selectedFile.path}</p>
                </div>
              </div>
            ) : (
              // Code editor
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
                  renderWhitespace: 'selection',
                }}
              />
            )
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-950">
              <div className="text-center">
                <FileCode className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-400">No file selected</h3>
                <p className="text-gray-500 mt-2">Select a file from the sidebar to edit</p>
                <p className="text-gray-600 text-sm mt-4">
                  Or upload a theme ZIP file to get started
                </p>
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

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">New File</h2>
              <button onClick={() => setShowNewFileModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFile} className="p-4 space-y-4">
              <div>
                <Label className="text-gray-300">File Path</Label>
                <Input
                  value={newFile.path}
                  onChange={(e) => setNewFile(prev => ({ ...prev, path: e.target.value }))}
                  placeholder="e.g., templates/headers/custom.template.html"
                  required
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include folders in path, e.g., css/custom.css or templates/cart/item.html
                </p>
              </div>
              <div>
                <Label className="text-gray-300">Initial Content (optional)</Label>
                <textarea
                  value={newFile.content}
                  onChange={(e) => setNewFile(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter initial file content..."
                  rows={5}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm font-mono"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowNewFileModal(false)} className="flex-1 border-gray-600 text-gray-300">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-700">
                  Create File
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
