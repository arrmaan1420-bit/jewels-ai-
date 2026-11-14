import { supabase } from '@/lib/supabase';
import { PRODUCT_CATEGORIES, type Product, type ProductFormValues } from '@/types/product';

const PRODUCT_IMAGE_BUCKET = 'product-images';
const PRODUCT_COLUMNS = 'id, user_id, name, category, description, price, material, gemstone, image_path, created_at, updated_at';
const ACCEPTED_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = Object.keys(ACCEPTED_MIME_EXTENSIONS);

interface ProductRow extends Omit<Product, 'price' | 'category'> {
  price: number | string | null;
  category: string;
}

function toProduct(row: ProductRow): Product {
  const category = PRODUCT_CATEGORIES.find((c) => c === row.category) ?? 'Other';
  return {
    ...row,
    category,
    price: row.price === null ? null : Number(row.price),
  };
}

export function getProductImageUrl(imagePath: string): string {
  return supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(imagePath).data.publicUrl;
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error('Unexpected response while loading products.');
  return (data as ProductRow[]).map(toProduct);
}

export async function fetchRecentProducts(limit: number): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error('Unexpected response while loading products.');
  return (data as ProductRow[]).map(toProduct);
}

export async function fetchProductCount(): Promise<number> {
  const { count, error } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function uploadProductImage(userId: string, file: File): Promise<string> {
  const extension = ACCEPTED_MIME_EXTENSIONS[file.type];
  if (!extension) throw new Error('Only JPG, PNG and WEBP images are supported.');

  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '3600' });
  if (error) throw new Error(error.message);
  return path;
}

export async function removeProductImage(imagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([imagePath]);
  if (error) throw new Error(error.message);
}

function toPayload(values: ProductFormValues) {
  return {
    name: values.name.trim(),
    category: values.category,
    description: values.description.trim(),
    price: values.price.trim() === '' ? null : Number(values.price),
    material: values.material.trim(),
    gemstone: values.gemstone.trim(),
  };
}

export async function createProduct(values: ProductFormValues, imagePath: string): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({ ...toPayload(values), image_path: imagePath })
    .select(PRODUCT_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('The product could not be saved.');
  return toProduct(data as ProductRow);
}

export async function updateProduct(id: string, values: ProductFormValues): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update({ ...toPayload(values), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(PRODUCT_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('The product could not be saved.');
  return toProduct(data as ProductRow);
}

export async function deleteProduct(product: Product): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', product.id);
  if (error) throw new Error(error.message);
  await removeProductImage(product.image_path);
}
