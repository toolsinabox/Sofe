import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Tags, Info } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * CustomFieldsEditor - Reusable component for editing custom fields in any section
 * 
 * Props:
 * - section: string - The section type (products, categories, pages, blog_posts, orders, customers)
 * - values: object - Current custom field values { field_key: value }
 * - onChange: function - Callback when values change (newValues) => void
 * - compact: boolean - Use compact layout (default false)
 */
export default function CustomFieldsEditor({ section, values = {}, onChange, compact = false }) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFields();
  }, [section]);

  const fetchFields = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/custom-fields/by-section/${section}`);
      setFields(res.data.fields || []);
    } catch (error) {
      console.error('Failed to fetch custom fields:', error);
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (fieldKey, value) => {
    const newValues = { ...values, [fieldKey]: value };
    onChange(newValues);
  };

  const renderField = (field) => {
    const value = values[field.field_key] ?? field.default_value ?? '';
    const fieldId = `custom-field-${field.field_key}`;

    switch (field.field_type) {
      case 'textarea':
        return (
          <div key={field.id}>
            <Label htmlFor={fieldId}>
              {field.name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-500 mb-1">{field.description}</p>
            )}
            <Textarea
              id={fieldId}
              value={value}
              onChange={(e) => handleValueChange(field.field_key, e.target.value)}
              placeholder={field.placeholder || ''}
              rows={3}
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.id}>
            <Label htmlFor={fieldId}>
              {field.name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-500 mb-1">{field.description}</p>
            )}
            <Input
              id={fieldId}
              type="number"
              value={value}
              onChange={(e) => handleValueChange(field.field_key, e.target.value)}
              placeholder={field.placeholder || ''}
              min={field.min_value}
              max={field.max_value}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.id}>
            <Label htmlFor={fieldId}>
              {field.name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-500 mb-1">{field.description}</p>
            )}
            <Select value={value || '_none'} onValueChange={(v) => handleValueChange(field.field_key, v === '_none' ? '' : v)}>
              <SelectTrigger id={fieldId}>
                <SelectValue placeholder={field.placeholder || 'Select...'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">-- Select --</SelectItem>
                {field.options?.map((opt, idx) => (
                  <SelectItem key={idx} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor={fieldId}>{field.name}</Label>
              {field.description && (
                <p className="text-xs text-gray-500">{field.description}</p>
              )}
            </div>
            <Switch
              id={fieldId}
              checked={value === true || value === 'true'}
              onCheckedChange={(v) => handleValueChange(field.field_key, v)}
            />
          </div>
        );

      case 'date':
        return (
          <div key={field.id}>
            <Label htmlFor={fieldId}>
              {field.name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-500 mb-1">{field.description}</p>
            )}
            <Input
              id={fieldId}
              type="date"
              value={value}
              onChange={(e) => handleValueChange(field.field_key, e.target.value)}
            />
          </div>
        );

      case 'color':
        return (
          <div key={field.id}>
            <Label htmlFor={fieldId}>
              {field.name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-500 mb-1">{field.description}</p>
            )}
            <div className="flex gap-2">
              <Input
                id={fieldId}
                type="color"
                value={value || '#000000'}
                onChange={(e) => handleValueChange(field.field_key, e.target.value)}
                className="w-16 h-10 p-1"
              />
              <Input
                value={value || ''}
                onChange={(e) => handleValueChange(field.field_key, e.target.value)}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>
        );

      case 'url':
      case 'image':
        return (
          <div key={field.id}>
            <Label htmlFor={fieldId}>
              {field.name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-500 mb-1">{field.description}</p>
            )}
            <Input
              id={fieldId}
              type="url"
              value={value}
              onChange={(e) => handleValueChange(field.field_key, e.target.value)}
              placeholder={field.placeholder || 'https://...'}
            />
            {field.field_type === 'image' && value && (
              <img 
                src={value} 
                alt="Preview" 
                className="mt-2 max-h-32 rounded border"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
          </div>
        );

      case 'email':
        return (
          <div key={field.id}>
            <Label htmlFor={fieldId}>
              {field.name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-500 mb-1">{field.description}</p>
            )}
            <Input
              id={fieldId}
              type="email"
              value={value}
              onChange={(e) => handleValueChange(field.field_key, e.target.value)}
              placeholder={field.placeholder || 'email@example.com'}
            />
          </div>
        );

      case 'text':
      default:
        return (
          <div key={field.id}>
            <Label htmlFor={fieldId}>
              {field.name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-500 mb-1">{field.description}</p>
            )}
            <Input
              id={fieldId}
              type="text"
              value={value}
              onChange={(e) => handleValueChange(field.field_key, e.target.value)}
              placeholder={field.placeholder || ''}
            />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-gray-500">
          Loading custom fields...
        </CardContent>
      </Card>
    );
  }

  if (fields.length === 0) {
    return null; // Don't render anything if no custom fields
  }

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Tags className="w-4 h-4" />
          <span>Custom Fields</span>
          <Badge variant="outline" className="text-xs">{fields.length}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(renderField)}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Tags className="w-5 h-5" />
          Custom Fields
          <Badge variant="outline" className="ml-auto">{fields.length} fields</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map(renderField)}
        <div className="pt-2 border-t">
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Use tags like <code className="bg-gray-100 px-1 rounded">{`{{custom_field_key}}`}</code> in templates
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
