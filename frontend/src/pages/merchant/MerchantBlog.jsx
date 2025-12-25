import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileText, Plus, Search, Edit, Trash2, Eye, Calendar, Clock, Tag,
  MessageCircle, Heart, MoreVertical, Filter, ArrowUpDown, ChevronDown,
  Image, Globe, Lock, Star, Send, Save
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import CustomFieldsEditor from '../../components/common/CustomFieldsEditor';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const MerchantBlog = () => {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('posts');

  const [postForm, setPostForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    featured_image: '',
    category_id: '',
    tags: '',
    author_name: 'Admin',
    status: 'draft',
    visibility: 'public',
    allow_comments: true,
    featured: false,
    seo_title: '',
    seo_description: '',
    custom_fields: {}
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [postsRes, categoriesRes, statsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/blog/posts`, {
          params: { status: statusFilter || undefined, category_id: categoryFilter || undefined }
        }),
        axios.get(`${BACKEND_URL}/api/blog/categories`),
        axios.get(`${BACKEND_URL}/api/blog/stats`)
      ]);
      setPosts(postsRes.data.posts || []);
      setCategories(categoriesRes.data.categories || []);
      setStats(statsRes.data || {});
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter]);

  const handleCreatePost = async () => {
    try {
      const payload = {
        ...postForm,
        tags: postForm.tags ? postForm.tags.split(',').map(t => t.trim().toLowerCase()) : []
      };
      
      if (editingPost) {
        await axios.put(`${BACKEND_URL}/api/blog/posts/${editingPost.id}`, payload);
      } else {
        await axios.post(`${BACKEND_URL}/api/blog/posts`, payload);
      }
      setIsPostModalOpen(false);
      resetPostForm();
      fetchData();
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Error saving post');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/blog/posts/${postId}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleCreateCategory = async () => {
    try {
      if (editingCategory) {
        await axios.put(`${BACKEND_URL}/api/blog/categories/${editingCategory.id}`, categoryForm);
      } else {
        await axios.post(`${BACKEND_URL}/api/blog/categories`, null, { params: categoryForm });
      }
      setIsCategoryModalOpen(false);
      setCategoryForm({ name: '', description: '' });
      setEditingCategory(null);
      fetchData();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Delete this category? Posts will be moved to uncategorized.')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/blog/categories/${categoryId}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const openEditPost = (post) => {
    setEditingPost(post);
    setPostForm({
      title: post.title || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      featured_image: post.featured_image || '',
      category_id: post.category_id || '',
      tags: (post.tags || []).join(', '),
      author_name: post.author_name || 'Admin',
      status: post.status || 'draft',
      visibility: post.visibility || 'public',
      allow_comments: post.allow_comments ?? true,
      featured: post.featured || false,
      seo_title: post.seo_title || '',
      seo_description: post.seo_description || '',
      custom_fields: post.custom_fields || {}
    });
    setIsPostModalOpen(true);
  };

  const resetPostForm = () => {
    setEditingPost(null);
    setPostForm({
      title: '',
      excerpt: '',
      content: '',
      featured_image: '',
      category_id: '',
      tags: '',
      author_name: 'Admin',
      status: 'draft',
      visibility: 'public',
      allow_comments: true,
      featured: false,
      seo_title: '',
      seo_description: '',
      custom_fields: {}
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      published: 'bg-green-100 text-green-800',
      draft: 'bg-yellow-100 text-yellow-800',
      scheduled: 'bg-blue-100 text-blue-800',
      archived: 'bg-gray-100 text-gray-800'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  const filteredPosts = posts.filter(post =>
    post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog & News</h1>
          <p className="text-gray-500">Manage your blog posts and content</p>
        </div>
        <Button onClick={() => { resetPostForm(); setIsPostModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Post
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_posts || 0}</p>
                <p className="text-sm text-gray-500">Total Posts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.published_posts || 0}</p>
                <p className="text-sm text-gray-500">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_views?.toLocaleString() || 0}</p>
                <p className="text-sm text-gray-500">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <MessageCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending_comments || 0}</p>
                <p className="text-sm text-gray-500">Pending Comments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="space-y-4" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* Posts Tab */}
        <TabsContent value="posts">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Posts List */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : filteredPosts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No blog posts yet</p>
                  <Button variant="link" onClick={() => setIsPostModalOpen(true)}>
                    Create your first post
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredPosts.map(post => (
                    <div key={post.id} className="p-4 hover:bg-gray-50 flex items-start gap-4">
                      {/* Thumbnail */}
                      <div className="w-24 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {post.featured_image ? (
                          <img src={post.featured_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">{post.title}</h3>
                          {post.featured && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-1 mb-2">{post.excerpt}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                          {getStatusBadge(post.status)}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {post.views || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" /> {post.likes || 0}
                          </span>
                          {post.category_name && (
                            <Badge variant="outline" className="text-xs">{post.category_name}</Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditPost(post)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" /> Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <div className="flex justify-end mb-4">
            <Button 
              variant="outline" 
              onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '' }); setIsCategoryModalOpen(true); }}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Category
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              {categories.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No categories yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {categories.map(cat => (
                    <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <h3 className="font-medium text-gray-900">{cat.name}</h3>
                        <p className="text-sm text-gray-500">{cat.description || 'No description'}</p>
                        <p className="text-xs text-gray-400 mt-1">{cat.post_count || 0} posts</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryForm({ name: cat.name, description: cat.description || '' });
                            setIsCategoryModalOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteCategory(cat.id)}
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
        </TabsContent>
      </Tabs>

      {/* Post Modal */}
      <Dialog open={isPostModalOpen} onOpenChange={setIsPostModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Edit Post' : 'Create New Post'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={postForm.title}
                  onChange={(e) => setPostForm({...postForm, title: e.target.value})}
                  placeholder="Enter post title"
                />
              </div>

              <div>
                <Label>Excerpt</Label>
                <Textarea
                  value={postForm.excerpt}
                  onChange={(e) => setPostForm({...postForm, excerpt: e.target.value})}
                  placeholder="Brief summary of the post"
                  rows={2}
                />
              </div>

              <div>
                <Label>Content</Label>
                <Textarea
                  value={postForm.content}
                  onChange={(e) => setPostForm({...postForm, content: e.target.value})}
                  placeholder="Write your post content here... (HTML supported)"
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label>Featured Image URL</Label>
                <Input
                  value={postForm.featured_image}
                  onChange={(e) => setPostForm({...postForm, featured_image: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Publish</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Status</Label>
                    <Select 
                      value={postForm.status} 
                      onValueChange={(v) => setPostForm({...postForm, status: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Visibility</Label>
                    <Select 
                      value={postForm.visibility} 
                      onValueChange={(v) => setPostForm({...postForm, visibility: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Featured Post</Label>
                    <Switch
                      checked={postForm.featured}
                      onCheckedChange={(v) => setPostForm({...postForm, featured: v})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Allow Comments</Label>
                    <Switch
                      checked={postForm.allow_comments}
                      onCheckedChange={(v) => setPostForm({...postForm, allow_comments: v})}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Categories & Tags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Category</Label>
                    <Select 
                      value={postForm.category_id || "uncategorized"} 
                      onValueChange={(v) => setPostForm({...postForm, category_id: v === "uncategorized" ? "" : v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uncategorized">Uncategorized</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tags (comma separated)</Label>
                    <Input
                      value={postForm.tags}
                      onChange={(e) => setPostForm({...postForm, tags: e.target.value})}
                      placeholder="news, updates, tips"
                    />
                  </div>

                  <div>
                    <Label>Author</Label>
                    <Input
                      value={postForm.author_name}
                      onChange={(e) => setPostForm({...postForm, author_name: e.target.value})}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">SEO</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>SEO Title</Label>
                    <Input
                      value={postForm.seo_title}
                      onChange={(e) => setPostForm({...postForm, seo_title: e.target.value})}
                      placeholder="Custom title for search engines"
                    />
                  </div>
                  <div>
                    <Label>SEO Description</Label>
                    <Textarea
                      value={postForm.seo_description}
                      onChange={(e) => setPostForm({...postForm, seo_description: e.target.value})}
                      placeholder="Meta description"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Custom Fields */}
              <CustomFieldsEditor
                section="blog_posts"
                values={postForm.custom_fields}
                onChange={(values) => setPostForm({...postForm, custom_fields: values})}
                compact={false}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsPostModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => { setPostForm({...postForm, status: 'draft'}); handleCreatePost(); }}>
              <Save className="w-4 h-4 mr-2" /> Save Draft
            </Button>
            <Button onClick={() => { setPostForm({...postForm, status: 'published'}); handleCreatePost(); }}>
              <Send className="w-4 h-4 mr-2" /> Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                placeholder="Category name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCategory}>
              {editingCategory ? 'Update' : 'Create'} Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantBlog;
