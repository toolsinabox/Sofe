import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import {
  Upload, Download, FileText, CheckCircle2, XCircle, AlertCircle,
  ChevronDown, ChevronRight, ArrowRight, Loader2, FileSpreadsheet,
  Filter, Check, X, RefreshCw, Eye, Settings, HelpCircle, Info
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// ==================== IMPORT COMPONENT ====================

export const ImportDialog = ({ 
  open, 
  onClose, 
  entityType, // 'categories' or 'products'
  onSuccess 
}) => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Map Fields, 3: Preview, 4: Import, 5: Results
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [availableFields, setAvailableFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [skipErrors, setSkipErrors] = useState(true);
  const [progress, setProgress] = useState(0);

  // Fetch available fields on mount
  useEffect(() => {
    if (open) {
      fetchFields();
      resetState();
    }
  }, [open, entityType]);

  const resetState = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setMappings([]);
    setImportResult(null);
    setProgress(0);
  };

  const fetchFields = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/import-export/${entityType}/fields`);
      setAvailableFields(response.data.fields);
    } catch (error) {
      console.error('Error fetching fields:', error);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const response = await axios.post(
        `${BACKEND_URL}/api/import-export/${entityType}/preview`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setPreview(response.data);
      setMappings(response.data.detected_mappings || []);
      setStep(2);
    } catch (error) {
      console.error('Error previewing file:', error);
      alert('Error parsing CSV file. Please check the format.');
    } finally {
      setLoading(false);
    }
  }, [entityType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1
  });

  const downloadTemplate = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/import-export/${entityType}/template`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${entityType}_template.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  };

  const updateMapping = (csvColumn, dbField) => {
    setMappings(prev => prev.map(m => 
      m.csv_column === csvColumn 
        ? { ...m, db_field: dbField }
        : m
    ));
  };

  const executeImport = async () => {
    setImporting(true);
    setStep(4);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const validMappings = mappings.filter(m => m.db_field);
      
      setProgress(30);

      const response = await axios.post(
        `${BACKEND_URL}/api/import-export/${entityType}/import`,
        formData,
        {
          params: {
            mappings: JSON.stringify(validMappings),
            update_existing: updateExisting,
            skip_errors: skipErrors
          },
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      setProgress(100);
      setImportResult(response.data);
      setStep(5);
      
      if (response.data.created > 0 || response.data.updated > 0) {
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error importing:', error);
      setImportResult({
        success: false,
        error: error.response?.data?.detail || 'Import failed'
      });
      setStep(5);
    } finally {
      setImporting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Download Template */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Need a template?</h4>
            <p className="text-sm text-blue-700 mt-1">
              Download our CSV template with all available fields and sample data.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 text-blue-700 border-blue-300 hover:bg-blue-100"
              onClick={downloadTemplate}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive 
            ? 'border-yellow-500 bg-yellow-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
            <p className="text-gray-600">Processing file...</p>
          </div>
        ) : (
          <>
            <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700">
              {isDragActive ? 'Drop your CSV file here' : 'Drag & drop your CSV file here'}
            </p>
            <p className="text-sm text-gray-500 mt-2">or click to browse files</p>
            <p className="text-xs text-gray-400 mt-4">Supports: CSV files up to 10MB</p>
          </>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* File Info */}
      <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-green-500" />
          <div>
            <p className="font-medium text-gray-900">{file?.name}</p>
            <p className="text-sm text-gray-500">{preview?.total_rows} rows detected</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={resetState}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Field Mapping */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Map CSV Columns to Fields
        </h4>
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 grid grid-cols-2 gap-4 text-sm font-medium text-gray-600">
            <span>CSV Column</span>
            <span>Map to Field</span>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {mappings.map((mapping, idx) => (
              <div key={idx} className="px-4 py-3 grid grid-cols-2 gap-4 items-center hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-800">{mapping.csv_column}</span>
                  {mapping.auto_detected && (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Auto</span>
                  )}
                </div>
                <Select
                  value={mapping.db_field || '_none_'}
                  onValueChange={(value) => updateMapping(mapping.csv_column, value === '_none_' ? '' : value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select field..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">-- Skip this column --</SelectItem>
                    {availableFields.map(field => (
                      <SelectItem key={field.field} value={field.field}>
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Import Options */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Import Options
        </h4>
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Update existing records</Label>
            <p className="text-sm text-gray-500">
              {entityType === 'products' 
                ? 'Match by SKU and update if exists' 
                : 'Match by name and update if exists'}
            </p>
          </div>
          <Switch checked={updateExisting} onCheckedChange={setUpdateExisting} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Skip errors and continue</Label>
            <p className="text-sm text-gray-500">Continue importing even if some rows have errors</p>
          </div>
          <Switch checked={skipErrors} onCheckedChange={setSkipErrors} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(1)}>
          Back
        </Button>
        <Button onClick={() => setStep(3)} className="bg-yellow-500 hover:bg-yellow-600">
          Preview Data
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{preview?.total_rows}</p>
          <p className="text-sm text-blue-700">Total Rows</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {mappings.filter(m => m.db_field).length}
          </p>
          <p className="text-sm text-green-700">Mapped Fields</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-600">
            {mappings.filter(m => !m.db_field).length}
          </p>
          <p className="text-sm text-gray-700">Skipped</p>
        </div>
      </div>

      {/* Data Preview */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Data Preview (First 10 rows)
        </h4>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">#</th>
                  {mappings.filter(m => m.db_field).slice(0, 6).map((m, idx) => (
                    <th key={idx} className="px-3 py-2 text-left font-medium text-gray-600">
                      {availableFields.find(f => f.field === m.db_field)?.label || m.db_field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview?.sample_data?.slice(0, 5).map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                    {mappings.filter(m => m.db_field).slice(0, 6).map((m, cidx) => (
                      <td key={cidx} className="px-3 py-2 text-gray-800 truncate max-w-32">
                        {row[m.csv_column] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(2)}>
          Back
        </Button>
        <Button onClick={executeImport} className="bg-green-500 hover:bg-green-600">
          <Upload className="w-4 h-4 mr-2" />
          Start Import
        </Button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 text-center py-8">
      <Loader2 className="w-16 h-16 mx-auto text-yellow-500 animate-spin" />
      <div>
        <h4 className="text-xl font-semibold text-gray-900">Importing Data...</h4>
        <p className="text-gray-500 mt-2">Please wait while we process your file</p>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 max-w-md mx-auto">
        <div 
          className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-gray-500">{progress}% complete</p>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      {importResult?.success !== false ? (
        <>
          <div className="text-center py-6">
            <CheckCircle2 className="w-20 h-20 mx-auto text-green-500 mb-4" />
            <h4 className="text-2xl font-semibold text-gray-900">Import Complete!</h4>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{importResult?.created || 0}</p>
              <p className="text-sm text-green-700">Created</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{importResult?.updated || 0}</p>
              <p className="text-sm text-blue-700">Updated</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{importResult?.errors || 0}</p>
              <p className="text-sm text-red-700">Errors</p>
            </div>
          </div>

          {importResult?.error_details?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h5 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Error Details
              </h5>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {importResult.error_details.slice(0, 10).map((err, idx) => (
                  <div key={idx} className="text-sm text-red-700 bg-red-100 px-3 py-2 rounded">
                    <strong>Row {err.row}:</strong> {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-6">
          <XCircle className="w-20 h-20 mx-auto text-red-500 mb-4" />
          <h4 className="text-2xl font-semibold text-gray-900">Import Failed</h4>
          <p className="text-gray-500 mt-2">{importResult?.error || 'An error occurred'}</p>
        </div>
      )}

      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={resetState}>
          Import Another File
        </Button>
        <Button onClick={onClose} className="bg-gray-900 hover:bg-gray-800">
          Done
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-yellow-500" />
            Import {entityType === 'categories' ? 'Categories' : 'Products'}
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import {entityType}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        {step < 5 && (
          <div className="flex items-center justify-center gap-2 py-4">
            {[1, 2, 3, 4].map((s) => (
              <React.Fragment key={s}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 4 && (
                  <div className={`w-12 h-1 ${step > s ? 'bg-yellow-500' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="py-4">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
        </div>
      </DialogContent>
    </Dialog>
  );
};


// ==================== EXPORT COMPONENT ====================

export const ExportDialog = ({ 
  open, 
  onClose, 
  entityType,
  categories = [] // For product category filter
}) => {
  const [fields, setFields] = useState([]);
  const [availableFields, setAvailableFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [filters, setFilters] = useState({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchFields();
    }
  }, [open, entityType]);

  const fetchFields = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/import-export/${entityType}/fields`);
      setAvailableFields(response.data.fields);
      // Select all by default
      setSelectedFields(response.data.fields.map(f => f.field));
    } catch (error) {
      console.error('Error fetching fields:', error);
    }
  };

  const toggleField = (field) => {
    setSelectedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const selectAll = () => {
    setSelectedFields(availableFields.map(f => f.field));
  };

  const selectNone = () => {
    setSelectedFields([]);
  };

  const exportData = async () => {
    if (selectedFields.length === 0) {
      alert('Please select at least one field to export');
      return;
    }

    setExporting(true);

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/import-export/${entityType}/export`,
        {
          fields: selectedFields,
          filters: Object.keys(filters).length > 0 ? filters : null
        },
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${entityType}_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      onClose();
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-green-500" />
            Export {entityType === 'categories' ? 'Categories' : 'Products'}
          </DialogTitle>
          <DialogDescription>
            Select fields and filters for your export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Filters */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters (Optional)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Status</Label>
                <Select
                  value={filters.status || '_all_'}
                  onValueChange={(value) => setFilters(prev => ({
                    ...prev, 
                    status: value === '_all_' ? undefined : value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all_">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {entityType === 'products' && (
                <>
                  <div>
                    <Label className="text-sm text-gray-600">Category</Label>
                    <Select
                      value={filters.category_id || '_all_'}
                      onValueChange={(value) => setFilters(prev => ({
                        ...prev, 
                        category_id: value === '_all_' ? undefined : value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all_">All Categories</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Stock Status</Label>
                    <Select
                      value={filters.stock_status || '_all_'}
                      onValueChange={(value) => setFilters(prev => ({
                        ...prev, 
                        stock_status: value === '_all_' ? undefined : value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All stock" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all_">All Stock</SelectItem>
                        <SelectItem value="in_stock">In Stock</SelectItem>
                        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Field Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Select Fields to Export
              </h4>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={selectNone}>
                  Clear
                </Button>
              </div>
            </div>
            
            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {availableFields.map(field => (
                  <label 
                    key={field.field}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.field)}
                      onChange={() => toggleField(field.field)}
                      className="w-4 h-4 text-yellow-500 rounded border-gray-300 focus:ring-yellow-500"
                    />
                    <span className="text-sm text-gray-700">{field.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {selectedFields.length} of {availableFields.length} fields selected
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={exportData} 
            disabled={exporting || selectedFields.length === 0}
            className="bg-green-500 hover:bg-green-600"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export CSV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


// ==================== IMPORT/EXPORT BUTTONS COMPONENT ====================

export const ImportExportButtons = ({ 
  entityType, 
  onImportSuccess,
  categories = [],
  className = ''
}) => {
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <>
      <div className={`flex gap-2 ${className}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setImportOpen(true)}
          className="gap-1"
        >
          <Upload className="w-4 h-4" />
          Import
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExportOpen(true)}
          className="gap-1"
        >
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityType={entityType}
        onSuccess={onImportSuccess}
      />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        entityType={entityType}
        categories={categories}
      />
    </>
  );
};

export default ImportExportButtons;
