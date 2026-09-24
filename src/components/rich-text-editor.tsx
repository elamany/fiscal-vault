// src/components/rich-text-editor.tsx
'use client';

import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

// Dynamically import Quill at the MODULE LEVEL to avoid creating components during render
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write something amazing...',
  label,
  required,
  error,
}: RichTextEditorProps) {
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }], // Toolbar uses these to trigger the 'list' format
      [{ align: [] }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean'],
    ],
  };

  // ✅ FIXED: Removed 'bullet'. 'list' handles both ordered and bullet lists.
  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 
    'align',
    'blockquote', 'code-block',
    'link', 'image',
  ];

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className={`rounded-xl border ${error ? 'border-red-300' : 'border-gray-200'} overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all`}>
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          modules={modules}
          formats={formats}
          className="bg-white"
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>
      )}
      <style jsx global>{`
        .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 1px solid #e5e7eb !important;
          background-color: #f9fafb;
          padding: 0.75rem !important;
        }
        .ql-container.ql-snow {
          border: none !important;
          font-family: inherit;
          font-size: 0.95rem;
          min-height: 200px;
        }
        .ql-editor {
          min-height: 200px;
          padding: 1rem !important;
          line-height: 1.6;
        }
        .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }
        .ql-snow .ql-stroke {
          stroke: #4b5563;
        }
        .ql-snow .ql-fill {
          fill: #4b5563;
        }
        .ql-snow .ql-picker-label {
          color: #4b5563;
        }
        .ql-snow .ql-picker-options {
          border-color: #e5e7eb;
          background-color: white;
          border-radius: 0.5rem;
        }
        .ql-snow.ql-toolbar button:hover .ql-stroke,
        .ql-snow.ql-toolbar button.ql-active .ql-stroke {
          stroke: #2563eb;
        }
        .ql-snow.ql-toolbar button:hover .ql-fill,
        .ql-snow.ql-toolbar button.ql-active .ql-fill {
          fill: #2563eb;
        }
        .ql-editor h1 { font-size: 2em; font-weight: 700; }
        .ql-editor h2 { font-size: 1.5em; font-weight: 700; }
        .ql-editor h3 { font-size: 1.17em; font-weight: 600; }
        .ql-editor blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          color: #6b7280;
          font-style: italic;
        }
        .ql-editor pre.ql-syntax {
          background-color: #1f2937;
          color: #e5e7eb;
          padding: 1rem;
          border-radius: 0.5rem;
          font-family: monospace;
        }
      `}</style>
    </div>
  );
}