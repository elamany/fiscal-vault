'use client';

import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';

export function DescriptionToggle({ html }: { html: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!html || html.trim() === '' || html === '<p><br></p>') {
    return <p className="text-sm text-gray-400 italic">No description provided</p>;
  }

  return (
    <div className="w-full">
      <div
        className={`text-sm text-gray-700 transition-all duration-300 wrap-break-words overflow-hidden ${
          expanded ? '' : 'max-h-24'
        }`}
        style={{
          maskImage: expanded ? 'none' : 'linear-gradient(to bottom, black 60%, transparent 100%)',
          WebkitMaskImage: expanded ? 'none' : 'linear-gradient(to bottom, black 60%, transparent 100%)',
        }}
        dangerouslySetInnerHTML={{ __html: html }} 
      />
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mt-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1"
      >
        {expanded ? (
          <>See less <ChevronLeft className="h-3 w-3 -rotate-90" /></>
        ) : (
          <>See more <ChevronLeft className="h-3 w-3 rotate-90" /></>
        )}
      </button>
    </div>
  );
}