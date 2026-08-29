import { useQuery } from '@tanstack/react-query';
import type { Product } from '@/types/product_types';
import { API_PATHS } from '@/constants/api_paths';
import { safeFetch } from '@/lib/api-error';

export function useProducts(tenantSlug?: string) {
  return useQuery({
    queryKey: ['products', tenantSlug || 'all'],
    queryFn: async () => {
      const url = tenantSlug 
        ? API_PATHS.products.byTenant(tenantSlug)
        : API_PATHS.products.all;
      
      const data = await safeFetch<{ products: Product[] }>(url);
      return data.products;
    },
  });
}

export function useProduct(productId: string) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const data = await safeFetch<{ product: Product }>(
        API_PATHS.products.byId(productId)
      );
      return data.product;
    },
    enabled: !!productId,
  });
}