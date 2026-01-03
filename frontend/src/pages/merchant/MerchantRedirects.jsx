import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowRight, Plus, Trash2, Edit2, Search, Upload, Download, 
  RefreshCw, AlertCircle, Check, X, ExternalLink, Copy, Filter,
  ArrowUpRight, FileText, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const MerchantRedirects = () => {
  const [redirects, setRedirects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [selectedRedirect, setSelectedRedirect] = useState(null);
  const [message, setMessage] = useState(null);
  const [bulkImportText, setBulkImportText] = useState('');
  
  const [formData, setFormData] = useState({
    source_path: '',
    target_url: '',
    redirect_type: '301',
    is_active: true,
    notes: ''
  });

  const fetchRedirects = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/store/redirects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRedirects(data);
      }
    } catch (error) {
      console.error('Error fetching redirects:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRedirects();
  }, [fetchRedirects]);

  const resetForm = () => {
    setFormData({
      source_path: '',
      target_url: '',
      redirect_type: '301',
      is_active: true,
      notes: ''
    });
  };

  const handleSave = async () => {
    if (!formData.source_path || !formData.target_url) {
      setMessage({ type: 'error', text: 'Source path and target URL are required' });
      return;
    }

    // Normalize source path
    let sourcePath = formData.source_path.trim();
    if (!sourcePath.startsWith('/')) {
      sourcePath = '/' + sourcePath;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = selectedRedirect 
        ? `${API_URL}/api/store/redirects/${selectedRedirect.id}`
        : `${API_URL}/api/store/redirects`;
      
      const response = await fetch(url, {
        method: selectedRedirect ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...formData, source_path: sourcePath })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: selectedRedirect ? 'Redirect updated!' : 'Redirect created!' });
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        resetForm();
        setSelectedRedirect(null);
        fetchRedirects();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.detail || 'Failed to save redirect' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving redirect' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this redirect?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/store/redirects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Redirect deleted' });
        fetchRedirects();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error deleting redirect' });
    }
  };

  const handleToggleActive = async (redirect) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/store/redirects/${redirect.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...redirect, is_active: !redirect.is_active })
      });
      fetchRedirects();
    } catch (error) {
      console.error('Error toggling redirect:', error);
    }
  };

  const handleEdit = (redirect) => {
    setSelectedRedirect(redirect);
    setFormData({
      source_path: redirect.source_path,
      target_url: redirect.target_url,
      redirect_type: redirect.redirect_type,
      is_active: redirect.is_active,
      notes: redirect.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleBulkImport = async () => {
    if (!bulkImportText.trim()) {
      setMessage({ type: 'error', text: 'Please enter redirects to import' });
      return;
    }

    setSaving(true);
    const lines = bulkImportText.trim().split('\n');
    const redirectsToImport = [];

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        redirectsToImport.push({
          source_path: parts[0].startsWith('/') ? parts[0] : '/' + parts[0],
          target_url: parts[1],
          redirect_type: parts[2] || '301',
          is_active: true
        });
      }
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/store/redirects/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ redirects: redirectsToImport })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: `Imported ${data.imported} redirects` });
        setIsBulkImportOpen(false);
        setBulkImportText('');
        fetchRedirects();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.detail || 'Failed to import redirects' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error importing redirects' });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const csv = redirects.map(r => 
      `${r.source_path},${r.target_url},${r.redirect_type}`
    ).join('\n');
    
    const blob = new Blob([`source_path,target_url,redirect_type\n${csv}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'redirects.csv';
    a.click();
  };

  const filteredRedirects = redirects.filter(r => {
    const matchesSearch = r.source_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         r.target_url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || r.redirect_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6" data-testid="merchant-redirects">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">URL Redirects</h1>
          <p className="text-gray-400 mt-1">Manage URL redirects for SEO and broken link handling</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsBulkImportOpen(true)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={redirects.length === 0}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Redirect
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-300">
              <p className="font-medium mb-1">How Redirects Work</p>
              <ul className="list-disc list-inside space-y-1 text-blue-300/80">
                <li><strong>301 (Permanent)</strong> - Best for SEO. Tells search engines the page has permanently moved.</li>
                <li><strong>302 (Temporary)</strong> - For temporary redirects. Search engines keep the original URL indexed.</li>
                <li>Source paths are relative to your store (e.g., /old-page → /new-page)</li>
                <li>Target URLs can be relative paths or full URLs for external redirects</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search redirects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-800/50 border-gray-700 text-white pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 bg-gray-800/50 border-gray-700 text-gray-300">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1f2e] border-gray-700">
            <SelectItem value="all" className="text-gray-300">All Types</SelectItem>
            <SelectItem value="301" className="text-gray-300">301 Permanent</SelectItem>
            <SelectItem value="302" className="text-gray-300">302 Temporary</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          onClick={fetchRedirects}
          className="text-gray-400 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Redirects Table */}
      <Card className="bg-[#151b28] border-gray-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : filteredRedirects.length === 0 ? (
            <div className="text-center py-16">
              <ArrowUpRight className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No redirects found</h3>
              <p className="text-gray-400 mb-4">
                {searchQuery ? 'Try adjusting your search' : 'Create your first redirect to get started'}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                  className="bg-cyan-500 hover:bg-cyan-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Redirect
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Source Path</TableHead>
                  <TableHead className="text-gray-400">Target URL</TableHead>
                  <TableHead className="text-gray-400 w-24">Type</TableHead>
                  <TableHead className="text-gray-400 w-24">Status</TableHead>
                  <TableHead className="text-gray-400 w-24">Hits</TableHead>
                  <TableHead className="text-gray-400 w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRedirects.map((redirect) => (
                  <TableRow key={redirect.id} className="border-gray-800">
                    <TableCell className="font-mono text-cyan-400 text-sm">
                      {redirect.source_path}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-gray-300 text-sm">
                        <ArrowRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="truncate max-w-xs">{redirect.target_url}</span>
                        {redirect.target_url.startsWith('http') && (
                          <ExternalLink className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={redirect.redirect_type === '301' ? 'default' : 'secondary'} 
                             className={redirect.redirect_type === '301' 
                               ? 'bg-purple-500/20 text-purple-400' 
                               : 'bg-yellow-500/20 text-yellow-400'}>
                        {redirect.redirect_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleActive(redirect)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          redirect.is_active 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {redirect.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {redirect.hit_count || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(redirect)}
                          className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(redirect.id)}
                          className="p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedRedirect(null);
          resetForm();
        }
      }}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {selectedRedirect ? 'Edit Redirect' : 'Add New Redirect'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedRedirect 
                ? 'Update the redirect settings below'
                : 'Create a new URL redirect for your store'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Source Path *</Label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">yourstore.com</span>
                <Input
                  value={formData.source_path}
                  onChange={(e) => setFormData({ ...formData, source_path: e.target.value })}
                  placeholder="/old-page"
                  className="bg-gray-800/50 border-gray-700 text-white font-mono"
                />
              </div>
              <p className="text-xs text-gray-500">The URL path that will be redirected (e.g., /old-product)</p>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Target URL *</Label>
              <Input
                value={formData.target_url}
                onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                placeholder="/new-page or https://example.com/page"
                className="bg-gray-800/50 border-gray-700 text-white font-mono"
              />
              <p className="text-xs text-gray-500">Where visitors will be redirected to</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Redirect Type</Label>
                <Select 
                  value={formData.redirect_type} 
                  onValueChange={(v) => setFormData({ ...formData, redirect_type: v })}
                >
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1f2e] border-gray-700">
                    <SelectItem value="301" className="text-gray-300">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-500/20 text-purple-400">301</Badge>
                        Permanent
                      </div>
                    </SelectItem>
                    <SelectItem value="302" className="text-gray-300">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-500/20 text-yellow-400">302</Badge>
                        Temporary
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Status</Label>
                <Select 
                  value={formData.is_active ? 'active' : 'inactive'} 
                  onValueChange={(v) => setFormData({ ...formData, is_active: v === 'active' })}
                >
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1f2e] border-gray-700">
                    <SelectItem value="active" className="text-gray-300">Active</SelectItem>
                    <SelectItem value="inactive" className="text-gray-300">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Why this redirect was created..."
                className="bg-gray-800/50 border-gray-700 text-white resize-none"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                  setSelectedRedirect(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
              >
                {saving ? 'Saving...' : (selectedRedirect ? 'Update Redirect' : 'Create Redirect')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
        <DialogContent className="bg-[#151b28] border-gray-800 text-white max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Bulk Import Redirects</DialogTitle>
            <DialogDescription className="text-gray-400">
              Import multiple redirects at once using CSV format
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-300 mb-2">Format: <code className="text-cyan-400">source_path,target_url,type</code></p>
              <p className="text-xs text-gray-500">Example:</p>
              <pre className="text-xs text-gray-400 mt-1 font-mono">
/old-page,/new-page,301{'\n'}
/blog/old-post,/blog/new-post,301{'\n'}
/promo,https://external.com/offer,302
              </pre>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Paste redirects (one per line)</Label>
              <Textarea
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                placeholder="/old-path,/new-path,301"
                className="bg-gray-800/50 border-gray-700 text-white font-mono resize-none"
                rows={8}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => { setIsBulkImportOpen(false); setBulkImportText(''); }}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkImport}
                disabled={saving || !bulkImportText.trim()}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
              >
                {saving ? 'Importing...' : 'Import Redirects'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantRedirects;
