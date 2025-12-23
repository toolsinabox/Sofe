import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, Check, X, Trash2, Eye, ThumbsUp, Filter, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MerchantReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, [filter]);

  const fetchReviews = async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const response = await axios.get(`${API}/reviews${params}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReviewStatus = async (reviewId, status) => {
    try {
      await axios.put(`${API}/reviews/${reviewId}`, { status });
      fetchReviews();
    } catch (error) {
      console.error('Error updating review:', error);
    }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await axios.delete(`${API}/reviews/${reviewId}`);
      fetchReviews();
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  const StarRating = ({ rating }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
        />
      ))}
    </div>
  );

  const filteredReviews = reviews.filter(r =>
    r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
    avgRating: reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Reviews</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and moderate customer reviews</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-gray-500 text-sm">Total Reviews</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-gray-500 text-sm">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-gray-500 text-sm">Approved</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-gray-500 text-sm">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-gray-500 text-sm">Avg Rating</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-900">{stats.avgRating}</p>
            <Star size={20} className="fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search reviews..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-gray-200 text-gray-900"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg capitalize text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left p-4 text-gray-600 font-medium">Customer</th>
              <th className="text-left p-4 text-gray-600 font-medium">Rating</th>
              <th className="text-left p-4 text-gray-600 font-medium">Review</th>
              <th className="text-left p-4 text-gray-600 font-medium">Status</th>
              <th className="text-left p-4 text-gray-600 font-medium">Date</th>
              <th className="text-right p-4 text-gray-600 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReviews.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-500">
                  No reviews found
                </td>
              </tr>
            ) : (
              filteredReviews.map((review) => (
                <tr key={review.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <p className="text-gray-900 font-medium">{review.customer_name}</p>
                    <p className="text-sm text-gray-500">{review.customer_email}</p>
                  </td>
                  <td className="p-4">
                    <StarRating rating={review.rating} />
                  </td>
                  <td className="p-4 max-w-md">
                    <p className="text-gray-900 font-medium truncate">{review.title}</p>
                    <p className="text-sm text-gray-500 truncate">{review.content}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      review.status === 'approved' ? 'bg-green-100 text-green-700' :
                      review.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {review.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500 text-sm">
                    {new Date(review.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      {review.status !== 'approved' && (
                        <button
                          onClick={() => updateReviewStatus(review.id, 'approved')}
                          className="p-2 rounded hover:bg-gray-100 text-green-600"
                          title="Approve"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      {review.status !== 'rejected' && (
                        <button
                          onClick={() => updateReviewStatus(review.id, 'rejected')}
                          className="p-2 rounded hover:bg-gray-100 text-red-600"
                          title="Reject"
                        >
                          <X size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteReview(review.id)}
                        className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MerchantReviews;
