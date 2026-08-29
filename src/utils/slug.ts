
/**
 * Converts a string into a URL-friendly slug.
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars (except hyphens and spaces)
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple hyphens with a single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generates the full SEO-friendly URL path for a product.
 */
export function getProductPath(name: string, id: string): string {
  const slug = generateSlug(name);
  return `/products/${slug}-${id}`;
}

/**
 * Extracts the product ID from an SEO-friendly slug.
 */
export function extractProductIdFromSlug(slugWithId: string): string | null {
  // Split by hyphen and get the last part (which should be the CUID)
  const parts = slugWithId.split('-');
  const potentialId = parts[parts.length - 1];
  
  // Basic validation: CUIDs are typically 25-30 chars and start with 'c'
  if (potentialId && potentialId.length >= 20 && potentialId.startsWith('c')) {
    return potentialId;
  }
  
  return null;
}