import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  Code, Copy, Check, Search, Package, FolderTree, FileText, Newspaper, 
  ShoppingCart, Users, Store, Tag, Info, ExternalLink
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Section icons
const sectionIcons = {
  products: Package,
  categories: FolderTree,
  pages: FileText,
  blog_posts: Newspaper,
  orders: ShoppingCart,
  customers: Users,
  store: Store
};

export default function MerchantTemplateTags() {
  const [allTags, setAllTags] = useState({ system_tags: {}, custom_tags: {} });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTag, setCopiedTag] = useState(null);
  const [activeSection, setActiveSection] = useState('products');

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/template-tags`);
      setAllTags(res.data);
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
      t.description?.toLowerCase().includes(query) ||
      t.field?.toLowerCase().includes(query)
    );
  };

  const sections = Object.keys(allTags.system_tags || {});
  const currentSystemTags = filterTags(allTags.system_tags[activeSection]?.tags || []);
  const currentCustomTags = filterTags(allTags.custom_tags[activeSection]?.tags || []);

  // Count total tags
  const totalSystemTags = Object.values(allTags.system_tags || {}).reduce((sum, s) => sum + (s.tags?.length || 0), 0);
  const totalCustomTags = Object.values(allTags.custom_tags || {}).reduce((sum, s) => sum + (s.tags?.length || 0), 0);

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
                <p className="text-2xl font-bold">{totalSystemTags}</p>
                <p className="text-sm text-gray-500">System Tags</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Tag className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCustomTags}</p>
                <p className="text-sm text-gray-500">Custom Tags</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sections.length}</p>
                <p className="text-sm text-gray-500">Sections</p>
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
                <p className="text-2xl font-bold">{totalSystemTags + totalCustomTags}</p>
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
                Copy any tag and paste it into your theme HTML templates. The tag will be replaced with actual data when the page renders.
              </p>
              <div className="flex gap-4 mt-2">
                <code className="bg-blue-100 px-2 py-1 rounded text-xs">{`{{product_name}}`} → Product Title</code>
                <code className="bg-blue-100 px-2 py-1 rounded text-xs">{`{{product_price}}`} → $99.99</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs by Section */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          {sections.map(section => {
            const SectionIcon = sectionIcons[section] || Tag;
            const sectionData = allTags.system_tags[section];
            return (
              <TabsTrigger key={section} value={section} className="gap-2">
                <SectionIcon className="w-4 h-4" />
                {sectionData?.title?.replace(' Tags', '') || section}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {sections.map(section => {
          const sectionData = allTags.system_tags[section];
          const customData = allTags.custom_tags[section];
          const SectionIcon = sectionIcons[section] || Tag;

          return (
            <TabsContent key={section} value={section}>
              <div className="space-y-6">
                {/* System Tags */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <SectionIcon className="w-5 h-5" />
                      {sectionData?.title || `${section} Tags`}
                    </CardTitle>
                    <CardDescription>{sectionData?.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : currentSystemTags.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No tags found</div>
                    ) : (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {currentSystemTags.map((tag, idx) => (
                          <TagCard
                            key={idx}
                            tag={tag.tag}
                            description={tag.description}
                            field={tag.field}
                            copied={copiedTag === tag.tag}
                            onCopy={() => copyTag(tag.tag)}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Custom Tags for this section */}
                {customData?.tags?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-purple-600" />
                        Custom Fields
                        <Badge variant="outline" className="ml-2">{customData.tags.length}</Badge>
                      </CardTitle>
                      <CardDescription>Custom fields you&apos;ve created for {section.replace('_', ' ')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {filterTags(customData.tags).map((tag, idx) => (
                          <TagCard
                            key={idx}
                            tag={tag.tag}
                            description={tag.name || tag.description}
                            field={tag.field}
                            copied={copiedTag === tag.tag}
                            onCopy={() => copyTag(tag.tag)}
                            isCustom
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Link to Custom Fields */}
      <Card className="mt-6">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">Need more tags?</p>
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

function TagCard({ tag, description, field, copied, onCopy, isCustom }) {
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
        <code className={`text-sm font-mono ${copied ? 'text-green-700' : 'text-blue-600'}`}>
          {tag}
        </code>
        <div className="flex items-center gap-1">
          {isCustom && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-purple-50 text-purple-700 border-purple-200">
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
      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{description}</p>
    </div>
  );
}
