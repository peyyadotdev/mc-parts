import { z } from "zod";
export const NyProductSchema = z.object({
  id: z.number().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  name: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  slug: z.string().optional(),
  external_reference: z.null().optional(),
  short_description: z.string().optional(),
  description: z.string().optional(),
  hs_code: z.null().optional(),
  country_of_origin: z.null().optional(),
  filterTags: z.array(z.null()).or(z.null()).optional(),
  variants: z.array(z.object({
  id: z.number().optional(),
  product_id: z.number().optional(),
  sku: z.string().optional(),
  gtin: z.string().optional(),
  brand_id: z.null().optional(),
  stock: z.string().optional(),
  weight: z.number().optional(),
  purchase_price: z.number().optional(),
  stock_price: z.number().optional(),
  price: z.number().optional(),
  prices: z.array(z.object({
  customer_group_id: z.null().optional(),
  currency_id: z.number().optional(),
  price: z.number().optional(),
  compare_price: z.number().optional(),
  tier: z.number().optional()
})).optional(),
  options: z.array(z.null()).optional(),
  compare_price: z.number().optional(),
  auto_pricing: z.number().optional(),
  auto_pricing_min_price: z.number().optional(),
  package_size: z.number().optional(),
  storage_space: z.null().or(z.string()).optional(),
  supplier_sku: z.null().optional(),
  external_reference: z.null().optional(),
  always_orderable: z.boolean().optional(),
  positive_inventory_status: z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  orderable: z.boolean().optional(),
  watchable: z.boolean().optional(),
  show_stock: z.boolean().optional()
}).optional(),
  negative_inventory_status: z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  orderable: z.boolean().optional(),
  watchable: z.boolean().optional(),
  show_stock: z.boolean().optional()
}).optional(),
  created_at: z.string().datetime().or(z.string()).optional()
})).optional(),
  categories: z.array(z.object({
  id: z.number().optional(),
  external_reference: z.null().optional(),
  name: z.string().optional()
}).or(z.null())).optional(),
  brand: z.null().optional(),
  supplier: z.null().optional(),
  specifications: z.array(z.null()).optional(),
  created_at: z.string().datetime().or(z.string()).optional(),
  images: z.array(z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  alt_tag: z.string().or(z.null()).optional(),
  url: z.string().url().or(z.string()).optional()
})).optional()
}); export type NyProduct = z.infer<typeof NyProductSchema>;
export const NyVariantSchema = z.null(); export type NyVariant = z.infer<typeof NyVariantSchema>;
export const NyCategorySchema = z.object({
  id: z.number().optional(),
  parent_id: z.number().or(z.null()).optional(),
  active: z.boolean().optional(),
  show_in_menu: z.boolean().optional(),
  external_reference: z.null().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  slug: z.string().optional(),
  image_url: z.string().url().or(z.string()).optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  created_at: z.string().datetime().or(z.string()).optional()
}); export type NyCategory = z.infer<typeof NyCategorySchema>;
