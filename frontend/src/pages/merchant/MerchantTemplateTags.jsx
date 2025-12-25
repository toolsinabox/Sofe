import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  Code, Copy, Check, Search, Package, FolderTree, FileText, Newspaper, 
  ShoppingCart, Users, Store, Tag, Info, ExternalLink, Settings, Layers
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Section icons
const sectionIcons = {
  product: Package,
  category: FolderTree,
  store: Store,
  cart: ShoppingCart,
  customer: Users,
  order: Newspaper,
  listings: Layers,
  conditionals: Code,
  loops: Code,
  variables: Code,
  includes: FileText,
  formatting: Settings
};

export default function MerchantTemplateTags() {
  const [allTags, setAllTags] = useState({ data_tags: {}, function_tags: {} });
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTag, setCopiedTag] = useState(null);
  const [activeSection, setActiveSection] = useState('product');
  const [activeTab, setActiveTab] = useState('data');

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const [tagsRes, fieldsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/template-tags`),
        axios.get(`${BACKEND_URL}/api/custom-fields`)
      ]);
      setAllTags(tagsRes.data);
      setCustomFields(fieldsRes.data.fields || []);
    } catch (error) {
      console.error('Failed to fetch template tags:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const copyTag = (tag) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const filterTags = (tags) => {
    if (!searchQuery) return tags;
    const query = searchQuery.toLowerCase();
    return tags.filter(t =>
      t.tag.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    );
  };

  const dataSections = Object.keys(allTags.data_tags || {});
  const functionSections = Object.keys(allTags.function_tags || {});

  // Count total tags
  const totalDataTags = Object.values(allTags.data_tags || {}).reduce((sum, s) => sum + (s?.length || 0), 0);
  const totalFunctionTags = Object.values(allTags.function_tags || {}).reduce((sum, s) => sum + (s?.length || 0), 0);
  const totalCustomTags = customFields.length;

  // Get tags for current section
  const getCurrentTags = () => {
    if (activeTab === 'data') {
      return allTags.data_tags?.[activeSection] || [];
    } else if (activeTab === 'function') {
      return allTags.function_tags?.[activeSection] || [];
    } else {
      return customFields.map(f => ({
        tag: `[@custom_${f.field_key}@]`,
        description: f.description || f.name,
        name: f.name,
        sections: f.assigned_to
      }));
    }
  };

  const currentTags = filterTags(getCurrentTags());

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Template Tags Reference</h1>
        <p className="text-gray-500">All available tags for use in your store templates and themes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Code className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDataTags}</p>
                <p className="text-sm text-gray-500">Data Tags</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Layers className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalFunctionTags}</p>
                <p className="text-sm text-gray-500">Function Tags</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Tag className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCustomTags}</p>
                <p className="text-sm text-gray-500">Custom Fields</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Store className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDataTags + totalFunctionTags + totalCustomTags}</p>
                <p className="text-sm text-gray-500">Total Tags</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* How to Use */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">How to Use Template Tags</p>
              <p className="text-blue-700 mt-1">
                Copy any tag and paste it into your theme HTML templates. Tags use two formats:
              </p>
              <div className="flex flex-wrap gap-4 mt-2">
                <code className="bg-blue-100 px-2 py-1 rounded text-xs">[@name@] → Data tag</code>
                <code className="bg-blue-100 px-2 py-1 rounded text-xs">[%function%]...[%/function%] → Function tag</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        if (v === 'data') setActiveSection('product');
        else if (v === 'function') setActiveSection('listings');
        else setActiveSection('custom');
      }}>
        <TabsList className="mb-4">
          <TabsTrigger value="data">
            <Code className="w-4 h-4 mr-2" /> Data Tags
            <Badge variant="outline" className="ml-2">{totalDataTags}</Badge>
          </TabsTrigger>
          <TabsTrigger value="function">
            <Layers className="w-4 h-4 mr-2" /> Function Tags
            <Badge variant="outline" className="ml-2">{totalFunctionTags}</Badge>
          </TabsTrigger>
          <TabsTrigger value="custom">
            <Tag className="w-4 h-4 mr-2" /> Custom Fields
            <Badge variant="outline" className="ml-2">{totalCustomTags}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Data Tags */}
        <TabsContent value="data">
          <div className="flex gap-6">
            {/* Section sidebar */}
            <div className="w-48 flex-shrink-0">
              <div className="space-y-1">
                {dataSections.map(section => {
                  const SectionIcon = sectionIcons[section] || Tag;
                  const count = allTags.data_tags[section]?.length || 0;
                  return (
                    <button
                      key={section}
                      onClick={() => setActiveSection(section)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeSection === section 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <SectionIcon className="w-4 h-4" />
                      <span className="capitalize flex-1">{section}</span>
                      <Badge variant="outline" className="text-xs">{count}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tags list */}
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="capitalize flex items-center gap-2">
                  {React.createElement(sectionIcons[activeSection] || Tag, { className: "w-5 h-5" })}
                  {activeSection} Tags
                </CardTitle>
                <CardDescription>Click any tag to copy it to clipboard</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : currentTags.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No tags found</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-2">
                    {currentTags.map((tag, idx) => (
                      <TagCard
                        key={idx}
                        tag={tag.tag}
                        description={tag.description}
                        copied={copiedTag === tag.tag}
                        onCopy={() => copyTag(tag.tag)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Function Tags */}
        <TabsContent value="function">
          <div className="flex gap-6">
            {/* Section sidebar */}
            <div className="w-48 flex-shrink-0">
              <div className="space-y-1">
                {functionSections.map(section => {
                  const SectionIcon = sectionIcons[section] || Tag;
                  const count = allTags.function_tags[section]?.length || 0;
                  return (
                    <button
                      key={section}
                      onClick={() => setActiveSection(section)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeSection === section 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <SectionIcon className="w-4 h-4" />
                      <span className="capitalize flex-1">{section}</span>
                      <Badge variant="outline" className="text-xs">{count}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tags list */}
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="capitalize flex items-center gap-2">
                  {React.createElement(sectionIcons[activeSection] || Tag, { className: "w-5 h-5" })}
                  {activeSection}
                </CardTitle>
                <CardDescription>Click any tag to copy it to clipboard</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : currentTags.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No tags found</div>
                ) : (
                  <div className="space-y-2">
                    {currentTags.map((tag, idx) => (
                      <TagCard
                        key={idx}
                        tag={tag.tag}
                        description={tag.description}
                        copied={copiedTag === tag.tag}
                        onCopy={() => copyTag(tag.tag)}
                        isFunction
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Custom Fields */}
        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-green-600" />
                Custom Field Tags
              </CardTitle>
              <CardDescription>
                Tags generated from your custom fields. Use <code className="bg-gray-100 px-1 rounded">[@custom_fieldkey@]</code> format.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customFields.length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 mb-4">No custom fields created yet</p>
                  <Button variant="outline" asChild>
                    <a href="/merchant/custom-fields">
                      <Tag className="w-4 h-4 mr-2" />
                      Create Custom Fields
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-2">
                  {filterTags(customFields.map(f => ({
                    tag: `[@custom_${f.field_key}@]`,
                    description: f.name,
                    sections: f.assigned_to
                  }))).map((tag, idx) => (
                    <TagCard
                      key={idx}
                      tag={tag.tag}
                      description={tag.description}
                      sections={tag.sections}
                      copied={copiedTag === tag.tag}
                      onCopy={() => copyTag(tag.tag)}
                      isCustom
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Link to Custom Fields */}
      <Card className="mt-6">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">Need custom tags?</p>
            <p className="text-sm text-gray-500">Create custom fields to add your own template tags</p>
          </div>
          <Button variant="outline" asChild>
            <a href="/merchant/custom-fields">
              <Tag className="w-4 h-4 mr-2" />
              Manage Custom Fields
              <ExternalLink className="w-3 h-3 ml-2" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function TagCard({ tag, description, sections, copied, onCopy, isFunction, isCustom }) {
  return (
    <div
      onClick={onCopy}
      className={`group p-3 rounded-lg border cursor-pointer transition-all ${
        copied 
          ? 'bg-green-50 border-green-300' 
          : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-blue-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <code className={`text-sm font-mono break-all ${copied ? 'text-green-700' : isFunction ? 'text-purple-600' : 'text-blue-600'}`}>
          {tag}
        </code>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isCustom && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-200">
              Custom
            </Badge>
          )}
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
      {sections && sections.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {sections.map((s, i) => (
            <Badge key={i} variant="outline" className="text-[10px] px-1 py-0">
              {s}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
