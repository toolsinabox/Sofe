import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { 
  Upload, Download, FileText, Package, Users, Tag, ShoppingCart,
  CheckCircle, AlertTriangle, Loader2, FileJson, Table, Info
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MerchantImportExport() {
  const [activeTab, setActiveTab] = useState('export');
  const [loading, setLoading] = useState(false);
  const [importData, setImportData] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [selectedResource, setSelectedResource] = useState('products');
  const [template, setTemplate] = useState(null);

  const resources = [
    { id: 'products', name: 'Products', icon: Package, description: 'Export/import product catalog' },
    { id: 'customers', name: 'Customers', icon: Users, description: 'Export/import customer data' },
    { id: 'orders', name: 'Orders', icon: ShoppingCart, description: 'Export order history (read-only)' },
    { id: 'coupons', name: 'Coupons', icon: Tag, description: 'Export/import discount codes' },
    { id: 'reviews', name: 'Reviews', icon: FileText, description: 'Export product reviews' }
  ];

  const fetchTemplate = async (resource) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/import/template/${resource}`);
      setTemplate(res.data);
    } catch (error) {
      console.error('Failed to fetch template:', error);
      setTemplate(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'import' && selectedResource) {
      fetchTemplate(selectedResource);
    }
  }, [activeTab, selectedResource]);

  const handleExport = async (resource, format) => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/export/${resource}`, {
        params: { format },
        responseType: format === 'csv' ? 'blob' : 'json'
      });
      
      if (format === 'csv') {
        const blob = new Blob([res.data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${resource}_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const dataStr = JSON.stringify(res.data.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${resource}_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      setImportResult(null);
      
      let data;
      try {
        data = JSON.parse(importData);
      } catch (e) {
        alert('Invalid JSON format');
        setLoading(false);
        return;
      }
      
      if (!Array.isArray(data)) {
        data = [data];
      }
      
      const res = await axios.post(`${BACKEND_URL}/api/import/${selectedResource}`, data);
      setImportResult(res.data);
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        imported: 0,
        errors: [{ error: error.response?.data?.detail || 'Import failed' }],
        total: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        // Try to parse as JSON
        JSON.parse(content);
        setImportData(content);
      } catch {
        // If not JSON, try CSV
        alert('Please upload a JSON file');
      }
    };
    reader.readAsText(file);
  };

  const useTemplate = () => {
    if (template?.sample) {
      setImportData(JSON.stringify(template.sample, null, 2));
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import / Export Center</h1>
        <p className="text-gray-500">Bulk import and export your store data</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="export">
            <Download className="w-4 h-4 mr-2" /> Export Data
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="w-4 h-4 mr-2" /> Import Data
          </TabsTrigger>
        </TabsList>

        {/* Export Tab */}
        <TabsContent value="export">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resources.map(resource => (
              <Card key={resource.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <resource.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{resource.name}</CardTitle>
                      <CardDescription>{resource.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => handleExport(resource.id, 'csv')}
                      disabled={loading}
                    >
                      <Table className="w-4 h-4 mr-1" /> CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => handleExport(resource.id, 'json')}
                      disabled={loading}
                    >
                      <FileJson className="w-4 h-4 mr-1" /> JSON
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Resource Selection */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Select Data Type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {resources.filter(r => r.id !== 'orders' && r.id !== 'reviews').map(resource => (
                    <div
                      key={resource.id}
                      className={`p-3 rounded-lg cursor-pointer border-2 transition-colors ${
                        selectedResource === resource.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-transparent bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedResource(resource.id)}
                    >
                      <div className="flex items-center gap-3">
                        <resource.icon className={`w-5 h-5 ${selectedResource === resource.id ? 'text-blue-600' : 'text-gray-500'}`} />
                        <div>
                          <div className="font-medium">{resource.name}</div>
                          <div className="text-xs text-gray-500">{resource.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              
              {template && (
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Info className="w-4 h-4" /> Field Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-2">
                      <div>
                        <span className="text-gray-500">Required fields:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {template.required?.map(field => (
                            <Badge key={field} variant="outline" className="text-xs">{field}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">All fields:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {template.fields?.map(field => (
                            <Badge key={field} variant="outline" className="text-xs bg-gray-100">{field}</Badge>
                          ))}
                        </div>
                      </div>
                      <Button variant="link" size="sm" className="p-0 h-auto" onClick={useTemplate}>
                        Load sample data
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Import Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Import {resources.find(r => r.id === selectedResource)?.name}</CardTitle>
                  <CardDescription>
                    Paste JSON data or upload a file
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Upload File</Label>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  
                  <div>
                    <Label>Or paste JSON data</Label>
                    <Textarea
                      value={importData}
                      onChange={(e) => setImportData(e.target.value)}
                      placeholder={`[\n  {\n    "sku": "PROD-001",\n    "name": "Product Name",\n    "price": 99.99\n  }\n]`}
                      rows={12}
                      className="font-mono text-sm mt-1"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleImport} 
                    disabled={loading || !importData.trim()}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" /> Import Data
                      </>
                    )}
                  </Button>
                  
                  {importResult && (
                    <div className={`p-4 rounded-lg ${importResult.errors?.length > 0 ? 'bg-yellow-50' : 'bg-green-50'}`}>
                      <div className="flex items-start gap-3">
                        {importResult.errors?.length > 0 ? (
                          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-medium">
                            {importResult.imported} of {importResult.total} records imported
                          </div>
                          {importResult.errors?.length > 0 && (
                            <div className="mt-2 text-sm text-red-600">
                              <div className="font-medium">Errors:</div>
                              <ul className="list-disc list-inside">
                                {importResult.errors.slice(0, 5).map((err, idx) => (
                                  <li key={idx}>
                                    {err.row !== undefined ? `Row ${err.row}: ` : ''}{err.error}
                                  </li>
                                ))}
                                {importResult.errors.length > 5 && (
                                  <li>...and {importResult.errors.length - 5} more errors</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
