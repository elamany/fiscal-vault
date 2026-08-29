import { useInfiniteQuery } from '@tanstack/react-query';
import { API_PATHS } from '@/constants/api_paths';
import { safeFetch } from '@/lib/api-error';
import type { Product } from '@/types/product_types';

interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

export function useProducts(tenantSlug?: string) {
  return useInfiniteQuery({
    queryKey: ['products', tenantSlug || 'all'],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      if (tenantSlug) params.append('tenant', tenantSlug);
      params.append('page', String(pageParam));
      params.append('limit', '12'); // 12 items per page
      
      const url = `${API_PATHS.products.all}?${params.toString()}`;
      return await safeFetch<ProductsResponse>(url);
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
  });
}