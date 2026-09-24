// src/lib/sanitize-client.ts
import createDOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'strong', 'em', 'u', 's', 'sub', 'sup',
  'ul', 'ol', 'li',
  'blockquote', 'code', 'pre',
  'a', 'img',
  'span', 'div',
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'class', 'target', 'rel'];

export function sanitizeHtmlClient(html: string): string {
  // 'window' is natively available in the browser. No 'fs' required.
  const DOMPurify = createDOMPurify(window);
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}