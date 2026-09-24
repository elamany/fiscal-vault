// src/lib/sanitize-server.ts
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'strong', 'em', 'u', 's', 'sub', 'sup',
  'ul', 'ol', 'li',
  'blockquote', 'code', 'pre',
  'a', 'img',
  'span', 'div',
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'class', 'target', 'rel'];

// Initialize once on the server (Node.js has 'fs', so this is safe)
const { window } = new JSDOM('');
const DOMPurify = createDOMPurify(window);

export function sanitizeHtmlServer(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}