import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * CopyTag - A clickable tag that copies its content to clipboard
 * Used for displaying copyable values like tokens, IPs, codes, etc.
 */
const CopyTag = ({ 
  value, 
  label,
  variant = 'default', // 'default' | 'success' | 'warning' | 'info'
  size = 'md', // 'sm' | 'md' | 'lg'
  className = ''
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const variants = {
    default: 'bg-gray-100 text-blue-700 border-gray-300 hover:bg-gray-200 hover:border-blue-400',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400',
    warning: 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 hover:border-amber-400',
    info: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 hover:border-blue-400',
  };

  const sizes = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <button
      onClick={handleCopy}
      className={`
        inline-flex items-center gap-2 font-mono rounded-lg border transition-all duration-200
        cursor-pointer select-all
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      title={copied ? 'Copied!' : 'Click to copy'}
    >
      <span className="break-all">{value || label || 'No value'}</span>
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
      ) : (
        <Copy className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
      )}
    </button>
  );
};

export default CopyTag;
