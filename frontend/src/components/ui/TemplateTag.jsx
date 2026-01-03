import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * TemplateTag - A clickable template tag that copies its content to clipboard
 * Used for displaying copyable template tags like [@product_name@], [@store_url@], etc.
 */
const TemplateTag = ({ 
  tag,  // The template tag string e.g., "[@product_name@]"
  className = ''
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!tag) return;
    
    try {
      await navigator.clipboard.writeText(tag);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`
        inline-flex items-center gap-1 px-1.5 py-0.5 
        font-mono text-xs 
        bg-blue-50 text-blue-700 border border-blue-200 
        rounded hover:bg-blue-100 hover:border-blue-300
        transition-all duration-200 cursor-pointer
        ${className}
      `}
      title={copied ? 'Copied!' : 'Click to copy'}
    >
      <span>{tag}</span>
      {copied ? (
        <Check className="w-3 h-3 text-emerald-600" />
      ) : (
        <Copy className="w-3 h-3 opacity-50" />
      )}
    </button>
  );
};

export default TemplateTag;
