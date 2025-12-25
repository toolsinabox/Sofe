import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Copy, Check, Search, Code, Tag, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * TemplateTagsPanel - Shows all available template tags for a section
 * 
 * Props:
 * - section: string - The section to show tags for (products, categories, pages, etc.)
 * - onClose: function - Callback to close the panel
 * - isOpen: boolean - Whether the panel is open
 */
export default function TemplateTagsPanel({ section, onClose, isOpen }) {
  const [systemTags, setSystemTags] = useState([]);
  const [customTags, setCustomTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTag, setCopiedTag] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ system: true, custom: true });
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/template-tags/section/${section}`);
      setSystemTags(res.data.system_tags || []);
      setCustomTags(res.data.custom_tags || []);
    } catch (error) {
      console.error('Failed to fetch template tags:', error);
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    if (isOpen && section) {
      fetchTags();
    }
  }, [isOpen, section, fetchTags]);

  const copyTag = (tag) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const filterTags = (tags) => {
    if (!searchQuery) return tags;
    const query = searchQuery.toLowerCase();
    return tags.filter(t => 
      t.tag.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query) ||
      t.field?.toLowerCase().includes(query)
    );
  };

  const filteredSystemTags = filterTags(systemTags);
  const filteredCustomTags = filterTags(customTags);

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Code className="w-4 h-4" />
            Template Tags
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Tags List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading tags...</div>
          ) : (
            <>
              {/* System Tags */}
              {filteredSystemTags.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleSection('system')}
                    className="flex items-center gap-2 w-full text-left mb-2"
                  >
                    {expandedSections.system ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="font-medium text-gray-700">System Tags</span>
                    <Badge variant="outline" className="ml-auto">{filteredSystemTags.length}</Badge>
                  </button>
                  
                  {expandedSections.system && (
                    <div className="space-y-1 ml-6">
                      {filteredSystemTags.map((tag, idx) => (
                        <TagItem
                          key={idx}
                          tag={tag.tag}
                          description={tag.description}
                          copied={copiedTag === tag.tag}
                          onCopy={() => copyTag(tag.tag)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Custom Tags */}
              {filteredCustomTags.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleSection('custom')}
                    className="flex items-center gap-2 w-full text-left mb-2"
                  >
                    {expandedSections.custom ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="font-medium text-gray-700">Custom Fields</span>
                    <Badge variant="outline" className="ml-auto">{filteredCustomTags.length}</Badge>
                  </button>
                  
                  {expandedSections.custom && (
                    <div className="space-y-1 ml-6">
                      {filteredCustomTags.map((tag, idx) => (
                        <TagItem
                          key={idx}
                          tag={tag.tag}
                          description={tag.name || tag.description}
                          copied={copiedTag === tag.tag}
                          onCopy={() => copyTag(tag.tag)}
                          isCustom
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {filteredSystemTags.length === 0 && filteredCustomTags.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No tags found</p>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-white text-xs text-gray-500">
        <p>Click any tag to copy it to clipboard</p>
        <p className="mt-1">Use in HTML templates: <code className="bg-gray-100 px-1 rounded">{`{{tag_name}}`}</code></p>
      </div>
    </div>
  );
}

function TagItem({ tag, description, copied, onCopy, isCustom }) {
  return (
    <div
      onClick={onCopy}
      className={`group flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
        copied ? 'bg-green-50' : 'hover:bg-white'
      }`}
    >
      <div className="flex-1 min-w-0">
        <code className={`text-xs font-mono block truncate ${copied ? 'text-green-700' : 'text-blue-600'}`}>
          {tag}
        </code>
        <p className="text-xs text-gray-500 truncate">{description}</p>
      </div>
      <div className="flex-shrink-0">
        {copied ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <Copy className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" />
        )}
      </div>
      {isCustom && (
        <Badge variant="outline" className="text-[10px] px-1 py-0 flex-shrink-0">
          Custom
        </Badge>
      )}
    </div>
  );
}
