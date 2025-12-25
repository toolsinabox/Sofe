import React, { useState } from 'react';
import { Copy, Check, Code } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

/**
 * TemplateTagButton - A button that shows and copies the template tag for a field
 * 
 * Props:
 * - tag: string - The template tag (e.g., "{{product_name}}")
 * - fieldName: string - Display name of the field (optional, for tooltip)
 * - size: 'sm' | 'md' - Button size
 * - variant: 'icon' | 'text' - Show just icon or with text
 */
export function TemplateTagButton({ tag, fieldName, size = 'sm', variant = 'icon' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(tag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === 'text') {
    return (
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={handleCopy}
        className="font-mono text-xs"
      >
        {copied ? (
          <><Check className="w-3 h-3 mr-1 text-green-600" /> Copied!</>
        ) : (
          <><Code className="w-3 h-3 mr-1" /> {tag}</>
        )}
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">{fieldName || 'Copy Tag'}</p>
          <code className="text-xs bg-gray-100 px-1 rounded block mt-1">{tag}</code>
          <p className="text-xs text-gray-400 mt-1">Click to copy</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * FieldWithTag - Wrapper that adds a template tag button to any field
 * 
 * Props:
 * - tag: string - The template tag
 * - label: string - Field label
 * - children: ReactNode - The actual field input
 * - description: string - Optional helper text
 */
export function FieldWithTag({ tag, label, children, description, required }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <TemplateTagButton tag={tag} fieldName={label} />
      </div>
      {children}
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}

export default TemplateTagButton;
