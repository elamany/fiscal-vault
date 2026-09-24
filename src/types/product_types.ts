export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  tenantId: string;
  images: { id: string; url: string; order: number }[];
  tenant?: { id: string; name: string; slug: string , ownerName: string};
}