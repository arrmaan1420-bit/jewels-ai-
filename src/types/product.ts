export const PRODUCT_CATEGORIES = [
  'Rings',
  'Necklaces',
  'Earrings',
  'Bracelets',
  'Bangles',
  'Pendants',
  'Luxury Watches',
  'Other',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface Product {
  id: string;
  user_id: string;
  name: string;
  category: ProductCategory;
  description: string;
  price: number | null;
  material: string;
  gemstone: string;
  image_path: string;
  created_at: string;
  updated_at: string;
}

export interface ProductFormValues {
  name: string;
  category: ProductCategory;
  description: string;
  price: string;
  material: string;
  gemstone: string;
}
