import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { 
  Upload, Download, FileText, Package, FolderTree, Tag, ShoppingCart,
  CheckCircle, AlertTriangle, Loader2, Table, Info, FileDown, RefreshCw,
  ArrowRight, X, Check
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MerchantImportExport() {
  const [activeTab, setActiveTab] = useState('export');
  const [loading, setLoading] = useState(false);
  const [selectedResource, setSelectedResource] = useState('products');
  
  // Export state
  const [exportFields, setExportFields] = useState([]);
  const [availableFields, setAvailableFields] = useState([]);
  const [exportFilters, setExportFilters] = useState({});
  
  // Import state
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [fieldMappings, setFieldMappings] = useState([]);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [skipErrors, setSkipErrors] = useState(true);
  const [importResult, setImportResult] = useState(null);
  const [importStep, setImportStep] = useState('upload'); // upload, mapping, importing
  
  const fileInputRef = useRef(null);

  const resources = [
    { id: 'products', name: 'Products', icon: Package, description: 'Export/import product catalog with all details' },
    { id: 'categories', name: 'Categories', icon: FolderTree, description: 'Export/import category hierarchy' },
  ];

  // Fetch available fields when resource changes
  useEffect(() => {
    fetchFields();
  }, [selectedResource]);

  const fetchFields = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/import-export/${selectedResource}/fields`);
      setAvailableFields(res.data.fields || []);
      // Select all fields by default for export
      setExportFields(res.data.fields?.map(f => f.field) || []);
    } catch (error) {
      console.error('Failed to fetch fields:', error);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${BACKEND_URL}/api/import-export/${selectedResource}/export`,
        {
          fields: exportFields,
          filters: exportFilters
        },
        { responseType: 'blob' }
      );
      
      // Download the file
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedResource}_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${BACKEND_URL}/api/import-export/${selectedResource}/template`,
        { responseType: 'blob' }
      );
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedResource}_template.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download template:', error);
      alert('Failed to download template');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }
    
    setImportFile(file);
    setImportResult(null);
    
    // Preview the file
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await axios.post(
        `${BACKEND_URL}/api/import-export/${selectedResource}/preview`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      setImportPreview(res.data);
      setFieldMappings(res.data.detected_mappings || []);
      setImportStep('mapping');
    } catch (error) {
      console.error('Failed to preview file:', error);
      alert('Failed to parse CSV file. Please check the format.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    
    try {
      setLoading(true);
      setImportStep('importing');
      
      const formData = new FormData();
      formData.append('file', importFile);
      
      // Filter only mapped fields
      const mappedFields = fieldMappings.filter(m => m.db_field);
      
      const res = await axios.post(
        `${BACKEND_URL}/api/import-export/${selectedResource}/import`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          params: {
            mappings: JSON.stringify(mappedFields),
            update_existing: updateExisting,
            skip_errors: skipErrors
          }
        }
      );
      
      setImportResult(res.data);
      setImportStep('upload');
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        success: false,
        total_processed: 0,
        created: 0,
        updated: 0,
        errors: 1,
        error_details: [{ error: error.response?.data?.detail || 'Import failed' }]
      });
      setImportStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const updateFieldMapping = (csvColumn, dbField) => {
    setFieldMappings(prev => prev.map(m => 
      m.csv_column === csvColumn ? { ...m, db_field: dbField } : m
    ));
  };

  const resetImport = () => {
    setImportFile(null);
    setImportPreview(null);
    setFieldMappings([]);
    setImportResult(null);
    setImportStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleExportField = (field) => {
    setExportFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const selectAllFields = () => {
    setExportFields(availableFields.map(f => f.field));
  };

  const deselectAllFields = () => {
    // Keep required fields selected
    const required = availableFields.filter(f => f.required).map(f => f.field);
    setExportFields(required);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import / Export Center</h1>
        <p className="text-gray-500">Bulk import and export your store data using CSV files</p>
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
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Resource Selection */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Select Data Type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {resources.map(resource => (
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
            </div>

            {/* Field Selection */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Select Fields to Export</CardTitle>
                      <CardDescription>Choose which fields to include in the export</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={selectAllFields}>Select All</Button>
                      <Button variant="outline" size="sm" onClick={deselectAllFields}>Deselect All</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                    {availableFields.map(field => (
                      <label
                        key={field.field}
                        className={`flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-gray-50 ${
                          exportFields.includes(field.field) ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <Checkbox
                          checked={exportFields.includes(field.field)}
                          onCheckedChange={() => toggleExportField(field.field)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{field.label}</div>
                          <div className="text-xs text-gray-400">{field.field}</div>
                        </div>
                        {field.required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </label>
                    ))}
                  </div>
                  
                  <div className="flex gap-3 mt-6 pt-4 border-t">
                    <Button onClick={handleExport} disabled={loading || exportFields.length === 0}>
                      {loading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exporting...</>
                      ) : (
                        <><Download className="w-4 h-4 mr-2" /> Export as CSV</>
                      )}
                    </Button>
                    <Button variant="outline" onClick={downloadTemplate} disabled={loading}>
                      <FileDown className="w-4 h-4 mr-2" /> Download Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Resource Selection & Options */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Select Data Type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {resources.map(resource => (
                    <div
                      key={resource.id}
                      className={`p-3 rounded-lg cursor-pointer border-2 transition-colors ${
                        selectedResource === resource.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-transparent bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => {
                        setSelectedResource(resource.id);
                        resetImport();
                      }}
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
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Import Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="flex items-center gap-3">
                    <Checkbox
                      checked={updateExisting}
                      onCheckedChange={setUpdateExisting}
                    />
                    <div>
                      <div className="text-sm font-medium">Update existing records</div>
                      <div className="text-xs text-gray-500">Match by SKU/name and update</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3">
                    <Checkbox
                      checked={skipErrors}
                      onCheckedChange={setSkipErrors}
                    />
                    <div>
                      <div className="text-sm font-medium">Skip errors</div>
                      <div className="text-xs text-gray-500">Continue importing if errors occur</div>
                    </div>
                  </label>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="w-4 h-4" /> Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-2">
                  <p>• Download the template first for correct format</p>
                  <p>• Required fields: SKU, Name, Price (for products)</p>
                  <p>• Use UTF-8 encoding for special characters</p>
                  <p>• Maximum 50,000 rows per import</p>
                </CardContent>
              </Card>
            </div>

            {/* Import Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Import {resources.find(r => r.id === selectedResource)?.name}</CardTitle>
                      <CardDescription>Upload a CSV file to import data</CardDescription>
                    </div>
                    {importFile && (
                      <Button variant="ghost" size="sm" onClick={resetImport}>
                        <X className="w-4 h-4 mr-1" /> Reset
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Step indicator */}
                  <div className="flex items-center gap-2 text-sm mb-4">
                    <Badge variant={importStep === 'upload' ? 'default' : 'outline'}>1. Upload</Badge>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <Badge variant={importStep === 'mapping' ? 'default' : 'outline'}>2. Map Fields</Badge>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <Badge variant={importStep === 'importing' ? 'default' : 'outline'}>3. Import</Badge>
                  </div>

                  {/* Upload step */}
                  {importStep === 'upload' && (
                    <>
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                        <p className="text-sm text-gray-400">CSV files only</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </div>
                      
                      <div className="flex justify-center">
                        <Button variant="outline" onClick={downloadTemplate} disabled={loading}>
                          <FileDown className="w-4 h-4 mr-2" /> Download CSV Template
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Mapping step */}
                  {importStep === 'mapping' && importPreview && (
                    <>
                      <div className="bg-blue-50 rounded-lg p-3 text-sm">
                        <div className="font-medium text-blue-800">
                          Found {importPreview.total_rows} rows in your file
                        </div>
                        <div className="text-blue-600">
                          Map your CSV columns to database fields below
                        </div>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b font-medium text-sm flex">
                          <div className="w-1/2">CSV Column</div>
                          <div className="w-1/2">Maps To</div>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                          {fieldMappings.map((mapping, idx) => (
                            <div key={idx} className="flex items-center px-4 py-2 border-b last:border-b-0 hover:bg-gray-50">
                              <div className="w-1/2 flex items-center gap-2">
                                <span className="font-medium">{mapping.csv_column}</span>
                                {mapping.auto_detected && (
                                  <Check className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                              <div className="w-1/2">
                                <Select
                                  value={mapping.db_field || '_skip'}
                                  onValueChange={(v) => updateFieldMapping(mapping.csv_column, v === '_skip' ? '' : v)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select field..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_skip">-- Skip this column --</SelectItem>
                                    {availableFields.map(f => (
                                      <SelectItem key={f.field} value={f.field}>
                                        {f.label} {f.required && '*'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Preview data */}
                      {importPreview.sample_data?.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2 border-b font-medium text-sm">
                            Data Preview (first {importPreview.sample_data.length} rows)
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  {importPreview.columns?.slice(0, 5).map((col, i) => (
                                    <th key={i} className="px-3 py-2 text-left font-medium">{col}</th>
                                  ))}
                                  {importPreview.columns?.length > 5 && (
                                    <th className="px-3 py-2 text-left font-medium text-gray-400">
                                      +{importPreview.columns.length - 5} more
                                    </th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {importPreview.sample_data.slice(0, 3).map((row, i) => (
                                  <tr key={i} className="border-t">
                                    {importPreview.columns?.slice(0, 5).map((col, j) => (
                                      <td key={j} className="px-3 py-2 truncate max-w-[200px]">{row[col]}</td>
                                    ))}
                                    {importPreview.columns?.length > 5 && (
                                      <td className="px-3 py-2 text-gray-400">...</td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button onClick={handleImport} disabled={loading}>
                          {loading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
                          ) : (
                            <><Upload className="w-4 h-4 mr-2" /> Start Import</>
                          )}
                        </Button>
                        <Button variant="outline" onClick={resetImport}>Cancel</Button>
                      </div>
                    </>
                  )}

                  {/* Importing step */}
                  {importStep === 'importing' && (
                    <div className="text-center py-8">
                      <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
                      <p className="text-gray-600">Importing your data...</p>
                      <p className="text-sm text-gray-400">This may take a few minutes for large files</p>
                    </div>
                  )}

                  {/* Import result */}
                  {importResult && (
                    <div className={`p-4 rounded-lg ${importResult.errors > 0 ? 'bg-yellow-50' : 'bg-green-50'}`}>
                      <div className="flex items-start gap-3">
                        {importResult.errors > 0 ? (
                          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">
                            Import Complete
                          </div>
                          <div className="text-sm mt-1 space-y-1">
                            <p>Total processed: {importResult.total_processed}</p>
                            <p className="text-green-600">Created: {importResult.created}</p>
                            {importResult.updated > 0 && (
                              <p className="text-blue-600">Updated: {importResult.updated}</p>
                            )}
                            {importResult.errors > 0 && (
                              <p className="text-red-600">Errors: {importResult.errors}</p>
                            )}
                          </div>
                          
                          {importResult.error_details?.length > 0 && (
                            <div className="mt-3 border-t pt-3">
                              <div className="font-medium text-red-800 text-sm mb-2">Error Details:</div>
                              <div className="max-h-[150px] overflow-y-auto text-sm">
                                {importResult.error_details.slice(0, 10).map((err, idx) => (
                                  <div key={idx} className="text-red-600 py-1 border-b last:border-b-0">
                                    {err.row !== undefined ? `Row ${err.row}: ` : ''}{err.error}
                                  </div>
                                ))}
                                {importResult.error_details.length > 10 && (
                                  <div className="text-gray-500 py-1">
                                    ...and {importResult.error_details.length - 10} more errors
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <Button variant="outline" size="sm" className="mt-3" onClick={resetImport}>
                            <RefreshCw className="w-4 h-4 mr-1" /> Import Another File
                          </Button>
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
