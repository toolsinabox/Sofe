import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import {
  Star, Check, X, Trash2, Eye, ThumbsUp, Filter, Search,
  Plus, Edit, MessageSquare, Image as ImageIcon, Upload,
  ChevronDown, BarChart3, Clock, CheckCircle, XCircle,
  AlertCircle, Sparkles, Package, User, Mail, Calendar,
  Loader2, ExternalLink
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Create/Edit form state
  const [formData, setFormData] = useState({
    product_sku: '',
    customer_name: '',
    customer_email: '',
    rating: 5,
    title: '',
    content: '',
    images: [],
    verified_purchase: false,
    status: 'approved'
  });
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    fetchReviews();
    fetchProducts();
    fetchStats();
  }, [filter, ratingFilter]);

  const fetchReviews = async () => {
    try {
      let params = [];
      if (filter !== 'all') params.push(`status=${filter}`);
      if (ratingFilter !== 'all') params.push(`rating=${ratingFilter}`);
      const queryString = params.length > 0 ? `?${params.join('&')}` : '';
      
      const response = await axios.get(`${API}/reviews${queryString}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products?limit=500`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/reviews/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateReviewStatus = async (reviewId, status) => {
    try {
      await axios.put(`${API}/reviews/${reviewId}`, { status });
      fetchReviews();
      fetchStats();
    } catch (error) {
      console.error('Error updating review:', error);
    }
  };

  const toggleFeatured = async (reviewId, currentFeatured) => {
    try {
      await axios.put(`${API}/reviews/${reviewId}`, { is_featured: !currentFeatured });
      fetchReviews();
    } catch (error) {
      console.error('Error updating review:', error);
    }
  };

  const submitReply = async () => {
    if (!selectedReview || !replyText.trim()) return;
    setSubmitting(true);
    try {
      await axios.put(`${API}/reviews/${selectedReview.id}`, { admin_reply: replyText });
      fetchReviews();
      setReplyText('');
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await axios.delete(`${API}/reviews/${reviewId}`);
      fetchReviews();
      fetchStats();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  // Image upload for new reviews
  const onDrop = useCallback(async (acceptedFiles) => {
    setUploadingImages(true);
    const newImages = [];
    
    for (const file of acceptedFiles) {
      try {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        const response = await axios.post(`${API}/reviews/upload-image`, formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        newImages.push(response.data.url);
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
    
    setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
    setUploadingImages(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 5
  });

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleCreateReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await axios.post(`${API}/reviews`, formData);
      fetchReviews();
      fetchStats();
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating review:', error);
      alert(error.response?.data?.detail || 'Failed to create review');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      product_sku: '',
      customer_name: '',
      customer_email: '',
      rating: 5,
      title: '',
      content: '',
      images: [],
      verified_purchase: false,
      status: 'approved'
    });
  };

  const openDetailModal = (review) => {
    setSelectedReview(review);
    setReplyText(review.admin_reply || '');
    setShowDetailModal(true);
  };

  const renderStarRating = (rating, size = 16, interactive = false, onChange = null) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={`${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          onClick={interactive ? () => onChange?.(star) : undefined}
        />
      ))}
    </div>
  );

  const filteredReviews = reviews.filter(r =>
    r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.product_sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-AU', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Reviews</h1>
          <p className="text-gray-500 text-sm">Manage, moderate, and respond to customer reviews</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Review
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-xs text-gray-500">Avg Rating</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.average_rating}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-gray-500">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">Approved</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-500">Rejected</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-gray-500">5-Star</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.rating_distribution?.[5] || 0}</p>
          </div>
        </div>
      )}

      {/* Rating Distribution Bar */}
      {stats && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Rating Distribution</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = stats.rating_distribution?.[rating] || 0;
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-12 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search reviews..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="1">1 Star</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No reviews found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredReviews.map((review) => (
              <div key={review.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {review.images?.[0] ? (
                      <img src={review.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {renderStarRating(review.rating)}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            review.status === 'approved' ? 'bg-green-100 text-green-700' :
                            review.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {review.status}
                          </span>
                          {review.verified_purchase && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" /> Verified
                            </span>
                          )}
                          {review.is_featured && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Featured
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900">{review.title}</h4>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{review.content}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {review.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:bg-green-50"
                              onClick={() => updateReviewStatus(review.id, 'approved')}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => updateReviewStatus(review.id, 'rejected')}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDetailModal(review)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {review.customer_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {review.product_name || review.product_sku || 'Unknown Product'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(review.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {review.helpful_votes || 0} helpful
                      </span>
                      {review.images?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {review.images.length} images
                        </span>
                      )}
                      {review.admin_reply && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <MessageSquare className="w-3 h-3" />
                          Replied
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
          </DialogHeader>
          
          {selectedReview && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {renderStarRating(selectedReview.rating, 20)}
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      selectedReview.status === 'approved' ? 'bg-green-100 text-green-700' :
                      selectedReview.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selectedReview.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{selectedReview.title}</h3>
                </div>
              </div>

              {/* Customer & Product Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Customer</p>
                  <p className="font-medium">{selectedReview.customer_name}</p>
                  <p className="text-sm text-gray-500">{selectedReview.customer_email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Product</p>
                  <p className="font-medium">{selectedReview.product_name || 'Unknown'}</p>
                  <p className="text-sm text-gray-500 font-mono">{selectedReview.product_sku}</p>
                </div>
              </div>

              {/* Review Content */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Review Content</p>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedReview.content}</p>
              </div>

              {/* Images */}
              {selectedReview.images?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Customer Images</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedReview.images.map((img, idx) => (
                      <a 
                        key={idx}
                        href={img}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 hover:border-gray-400 transition-colors"
                      >
                        <img src={img} alt={`Review ${idx + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Reply */}
              <div className="border-t pt-4">
                <Label className="text-sm font-medium">Admin Reply</Label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a response to this review..."
                  rows={3}
                  className="mt-2"
                />
                <Button
                  onClick={submitReply}
                  disabled={submitting || !replyText.trim()}
                  className="mt-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {selectedReview.admin_reply ? 'Update Reply' : 'Post Reply'}
                </Button>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-2">
                  {selectedReview.status !== 'approved' && (
                    <Button
                      variant="outline"
                      className="text-green-600"
                      onClick={() => {
                        updateReviewStatus(selectedReview.id, 'approved');
                        setShowDetailModal(false);
                      }}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  )}
                  {selectedReview.status !== 'rejected' && (
                    <Button
                      variant="outline"
                      className="text-red-600"
                      onClick={() => {
                        updateReviewStatus(selectedReview.id, 'rejected');
                        setShowDetailModal(false);
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => toggleFeatured(selectedReview.id, selectedReview.is_featured)}
                  >
                    <Sparkles className={`w-4 h-4 mr-2 ${selectedReview.is_featured ? 'text-purple-500' : ''}`} />
                    {selectedReview.is_featured ? 'Unfeature' : 'Feature'}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => deleteReview(selectedReview.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Review Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => { setShowCreateModal(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Review</DialogTitle>
            <DialogDescription>
              Manually create a review for a product (e.g., importing from another platform)
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateReview} className="space-y-4">
            {/* Product Selection */}
            <div>
              <Label>Product (by SKU) *</Label>
              <Select
                value={formData.product_sku}
                onValueChange={(value) => setFormData(prev => ({ ...prev, product_sku: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.sku}>
                      {product.sku} - {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer Name *</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  placeholder="John Doe"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Customer Email *</Label>
                <Input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                  placeholder="john@example.com"
                  required
                  className="mt-1"
                />
              </div>
            </div>

            {/* Rating */}
            <div>
              <Label>Rating *</Label>
              <div className="mt-2">
                {renderStarRating(
                  formData.rating,
                  28,
                  true,
                  (rating) => setFormData(prev => ({ ...prev, rating }))
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <Label>Review Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Great product!"
                required
                className="mt-1"
              />
            </div>

            {/* Content */}
            <div>
              <Label>Review Content *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write the review content..."
                rows={4}
                required
                className="mt-1"
              />
            </div>

            {/* Images */}
            <div>
              <Label>Images (optional)</Label>
              <div
                {...getRootProps()}
                className={`mt-2 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                {uploadingImages ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Drop images here or click to upload</p>
                  </>
                )}
              </div>
              {formData.images.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img src={img} alt="" className="w-16 h-16 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Options */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.verified_purchase}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, verified_purchase: checked }))}
                />
                <Label>Verified Purchase</Label>
              </div>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Create Review
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantReviews;
