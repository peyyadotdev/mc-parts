import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

const postOrdersOrder_id_Body = z
  .object({
    customer_id: z.number().int(),
    shipping: z
      .object({
        name: z.string(),
        price_ex_vat: z.number().int().optional(),
        price_inc_vat: z.number().int().optional(),
      })
      .passthrough(),
    payment: z
      .object({
        name: z.string(),
        price_ex_vat: z.number().int().optional(),
        price_inc_vat: z.number().int().optional(),
      })
      .passthrough(),
    currency_iso: z.string(),
    billing_address: z
      .object({
        firstname: z.string(),
        lastname: z.string(),
        company_name: z.string(),
        co_address: z.string(),
        address: z.string(),
        address2: z.string(),
        postcode: z.string(),
        city: z.string(),
        country: z.string().min(2).max(2),
        vat_number: z.string(),
        state: z.string(),
      })
      .partial()
      .passthrough(),
    shipping_address: z
      .object({
        firstname: z.string(),
        lastname: z.string(),
        company_name: z.string(),
        co_address: z.string(),
        address: z.string(),
        address2: z.string(),
        postcode: z.string(),
        city: z.string(),
        country: z.string().min(2).max(2),
        vat_number: z.string(),
        state: z.string(),
      })
      .partial()
      .passthrough(),
    items: z.array(
      z
        .object({
          type: z.enum(["product", "discount"]),
          name: z.string().optional(),
          sku: z.string(),
          price_ex_vat: z.number().int(),
          price_inc_vat: z.number().int(),
          quantity: z.number().int().gte(0),
        })
        .passthrough()
    ),
    status: z.enum([
      "open",
      "approved",
      "deliverable",
      "shipped",
      "canceled",
      "awaiting_delivery",
      "awaiting_payment",
      "backlisted",
    ]),
    checkout_message: z.string(),
    delivery_date: z
      .string()
      .min(10)
      .max(10)
      .regex(/^\d{4}-\d{2}-\d{2}$/),
    reference: z.string(),
    marking: z.string(),
    warehouse_note: z.string(),
  })
  .partial()
  .passthrough();
const postOrders_Body = z
  .object({
    currency_iso: z.string(),
    locale: z.string().regex(/^[A-Za-z]{2,2}(?:-[A-Za-z]{2,2})$/),
    delivery_date: z.string().optional(),
    warehouse_note: z.string().optional(),
    marking: z.string().optional(),
    reference: z.string().optional(),
    checkout_message: z.string().max(255).optional(),
    action: z.literal("approve").optional(),
    customer: z
      .object({
        type: z.enum(["person", "organization"]),
        email: z.string(),
        phone: z.string().optional(),
        ssn: z.string().optional(),
        organization_number: z.string().optional(),
      })
      .passthrough(),
    billing_address: z
      .object({
        company_name: z.string().optional(),
        firstname: z.string(),
        lastname: z.string(),
        address: z.string(),
        address2: z.string(),
        co_address: z.string(),
        postcode: z.string(),
        city: z.string(),
        country: z.string(),
        state: z.string(),
      })
      .passthrough(),
    shipping_address: z
      .object({
        company_name: z.string().optional(),
        firstname: z.string(),
        lastname: z.string(),
        address: z.string(),
        address2: z.string(),
        co_address: z.string(),
        postcode: z.string(),
        city: z.string(),
        country: z.string(),
        state: z.string(),
      })
      .passthrough()
      .optional(),
    shipping: z
      .object({
        name: z.string(),
        price_ex_vat: z.number().int(),
        price_inc_vat: z.number().int(),
      })
      .passthrough(),
    payment: z
      .object({
        name: z.string(),
        price_ex_vat: z.number().int(),
        price_inc_vat: z.number().int(),
      })
      .passthrough(),
    items: z.array(
      z
        .object({
          type: z.string(),
          sku: z.string(),
          quantity: z.number().int(),
          price_ex_vat: z.number().int(),
          price_inc_vat: z.number().int(),
        })
        .passthrough()
    ),
  })
  .passthrough();
const postOrdersOrder_iddeliver_Body = z
  .object({
    complete_delivery: z.boolean(),
    pdf_paths: z.array(z.string().url()),
    parcels: z.array(
      z
        .object({ tracking_id: z.string(), tracking_url: z.string() })
        .passthrough()
    ),
  })
  .passthrough();
const postProducts_Body = z
  .object({
    status: z
      .enum(["draft", "published", "inactive", "pending_retirement", "retired"])
      .optional(),
    meta_title: z.union([z.string(), z.null()]).optional(),
    meta_description: z.union([z.string(), z.null()]).optional(),
    name: z.string(),
    external_reference: z.union([z.string(), z.null()]).optional(),
    description: z.union([z.string(), z.null()]).optional(),
    short_description: z.union([z.string(), z.null()]).optional(),
    slug: z.union([z.string(), z.null()]).optional(),
    hs_code: z.union([z.string(), z.null()]).optional(),
    vat_rate: z
      .union([z.literal(2500), z.literal(1200), z.literal(600), z.literal(0)])
      .optional(),
    variants: z.array(
      z
        .object({
          sku: z.string(),
          prices: z
            .object({
              price: z.union([z.number(), z.null()]),
              compare_price: z.union([z.number(), z.null()]),
              customer_group_id: z.union([z.number(), z.null()]),
              currency_id: z.union([z.number(), z.null()]),
              tier: z.union([z.number(), z.null()]),
            })
            .partial()
            .passthrough()
            .optional(),
          stock: z.union([z.number(), z.null()]).optional(),
          weight: z.union([z.number(), z.null()]).optional(),
          purchase_price: z.union([z.number(), z.null()]).optional(),
          stock_price: z.union([z.number(), z.null()]).optional(),
          package_size: z.union([z.number(), z.null()]).optional(),
          supplier_sku: z.union([z.string(), z.null()]).optional(),
          gtin: z.string().optional(),
          storage_space: z.string().optional(),
          options: z
            .array(
              z
                .object({ type: z.string(), value: z.string() })
                .partial()
                .passthrough()
            )
            .optional(),
          always_orderable: z.boolean().optional(),
          positive_inventory_status: z.string().optional(),
          negative_inventory_status: z.string().optional(),
          vehicle_data: z
            .array(
              z
                .object({
                  tag: z.string(),
                  brand: z.string(),
                  model: z.string(),
                  year: z.string(),
                  metadata: z.object({}).partial().passthrough(),
                })
                .partial()
                .passthrough()
            )
            .optional(),
        })
        .passthrough()
    ),
    type: z.enum(["standard", "inventory_item", "pre_order_item"]),
    categories: z
      .union([
        z.array(
          z
            .object({
              name: z.string(),
              external_identifier: z.union([z.string(), z.null()]).optional(),
              update_on_exists: z.boolean().optional(),
            })
            .passthrough()
        ),
        z.null(),
      ])
      .optional(),
    brand_name: z.union([z.string(), z.null()]).optional(),
    supplier_name: z.union([z.string(), z.null()]).optional(),
    attributes: z
      .array(
        z
          .object({
            key: z.string(),
            value: z.string(),
            is_featured: z.boolean(),
            is_labeled: z.boolean(),
          })
          .partial()
          .passthrough()
      )
      .optional(),
    specifications: z
      .array(
        z
          .object({
            title: z.string(),
            specifications: z.array(
              z
                .object({
                  key: z.string(),
                  value: z.string(),
                  is_featured: z.boolean(),
                })
                .partial()
                .passthrough()
            ),
          })
          .partial()
          .passthrough()
      )
      .optional(),
    filter_tags: z
      .union([z.array(z.string().regex(/^.+_.+$/)), z.null()])
      .optional(),
    images: z
      .union([z.array(z.string().regex(/^.+_.+$/)), z.null()])
      .optional(),
  })
  .passthrough();
const putProductsbatch_Body = z
  .object({
    products: z.array(
      z
        .object({
          product_search_query: z
            .object({
              field: z.enum(["product_id", "variant_sku"]),
              value: z.string(),
            })
            .passthrough(),
          status: z
            .enum([
              "inactive",
              "published",
              "draft",
              "pedning",
              "pending_retirement",
              "retired",
            ])
            .optional(),
          meta_title: z.union([z.string(), z.null()]).optional(),
          meta_description: z.union([z.string(), z.null()]).optional(),
          name: z.string().optional(),
          external_reference: z.union([z.string(), z.null()]).optional(),
          description: z.union([z.string(), z.null()]).optional(),
          short_description: z.union([z.string(), z.null()]).optional(),
          slug: z.union([z.string(), z.null()]).optional(),
          hs_code: z.union([z.string(), z.null()]).optional(),
          country_of_origin: z.union([z.string(), z.null()]).optional(),
          vat_rate: z
            .union([
              z.literal(2500),
              z.literal(1200),
              z.literal(600),
              z.literal(0),
            ])
            .optional(),
          type: z
            .enum(["standard", "inventory_item", "pre_order_item"])
            .optional(),
          categories: z
            .object({
              name: z.string(),
              external_identifier: z.union([z.string(), z.null()]),
              update_on_exists: z.boolean(),
            })
            .partial()
            .passthrough()
            .optional(),
          brand_name: z.union([z.string(), z.null()]).optional(),
          supplier_name: z.union([z.string(), z.null()]).optional(),
          attributes: z
            .array(
              z
                .object({
                  key: z.string(),
                  value: z.string(),
                  is_featured: z.boolean(),
                  is_labeled: z.boolean(),
                })
                .partial()
                .passthrough()
            )
            .optional(),
          specifications: z
            .array(
              z
                .object({
                  section_title: z.string(),
                  specifications: z.array(
                    z
                      .object({
                        key: z.string(),
                        value: z.string(),
                        is_featured: z.boolean(),
                      })
                      .partial()
                      .passthrough()
                  ),
                })
                .partial()
                .passthrough()
            )
            .optional(),
          filter_tags: z
            .array(z.string().regex(/^[a-zA-Z]+_[a-zA-Z]+$/))
            .optional(),
          properties: z
            .array(
              z
                .object({
                  key: z.string(),
                  value: z.string(),
                  is_featured: z.boolean().optional(),
                  is_labeled: z.boolean().optional(),
                })
                .passthrough()
            )
            .optional(),
          images: z.array(z.string()).optional(),
        })
        .passthrough()
    ),
  })
  .passthrough();
const postProductsbatch_Body = z
  .object({
    products: z.array(
      z
        .object({
          status: z.enum([
            "draft",
            "published",
            "inactive",
            "pending_retirement",
            "retired",
          ]),
          meta_title: z.string().optional(),
          meta_description: z.string().optional(),
          name: z.string(),
          external_reference: z.string().optional(),
          description: z.string().optional(),
          short_description: z.string().optional(),
          slug: z.string().optional(),
          hs_code: z.string().optional(),
          country_of_origin: z.string().optional(),
          vat_rate: z
            .union([
              z.literal(2500),
              z.literal(1200),
              z.literal(600),
              z.literal(0),
            ])
            .optional(),
          variants: z.array(
            z
              .object({
                sku: z.string(),
                stock: z.number().multipleOf(0.01).optional(),
                weight: z.number().int().optional(),
                purchase_price: z
                  .number()
                  .int()
                  .gte(0)
                  .multipleOf(0.01)
                  .optional(),
                stock_price: z.number().int().multipleOf(0.01).optional(),
                package_size: z.number().int().gte(1).multipleOf(1).optional(),
                supplier_sku: z.string().optional(),
                prices: z.array(
                  z
                    .object({
                      price: z.number().int().gte(0),
                      compare_price: z.number().int().gte(0).optional(),
                      customer_group_id: z
                        .number()
                        .int()
                        .gte(1)
                        .multipleOf(1)
                        .optional(),
                      currency_id: z
                        .number()
                        .int()
                        .gte(1)
                        .multipleOf(1)
                        .optional(),
                      tier: z.number().int().gte(0).multipleOf(1).optional(),
                    })
                    .passthrough()
                ),
                gtin: z.string().optional(),
                options: z
                  .array(
                    z
                      .object({ type: z.string(), value: z.string() })
                      .partial()
                      .passthrough()
                  )
                  .optional(),
              })
              .passthrough()
          ),
          type: z.enum(["standard", "inventory_item", "pre_order_item"]),
          categories: z
            .array(
              z
                .object({
                  name: z.string(),
                  external_identifier: z.string().optional(),
                  update_on_exists: z.boolean().optional(),
                })
                .passthrough()
            )
            .optional(),
          brand_name: z.string().optional(),
          supplier_name: z.string().optional(),
          attributes: z
            .array(
              z
                .object({
                  key: z.string(),
                  value: z.string(),
                  is_featured: z.boolean(),
                  is_labeled: z.boolean(),
                })
                .partial()
                .passthrough()
            )
            .optional(),
          specifications: z
            .array(
              z
                .object({
                  section_title: z.string(),
                  specifications: z.array(
                    z
                      .object({
                        key: z.string(),
                        value: z.string(),
                        is_featured: z.boolean(),
                      })
                      .partial()
                      .passthrough()
                  ),
                })
                .partial()
                .passthrough()
            )
            .optional(),
          filter_tags: z.array(z.string().regex(/^.+_.+$/)).optional(),
          images: z.array(z.string()).optional(),
          vehicle_data: z.array(
            z
              .object({
                tag: z.union([z.string(), z.null()]),
                model: z.union([z.string(), z.null()]),
                brand: z.union([z.string(), z.null()]),
                year: z.union([z.number(), z.null()]),
                metadata: z.union([
                  z.object({}).partial().passthrough(),
                  z.null(),
                ]),
              })
              .partial()
              .passthrough()
          ),
        })
        .passthrough()
    ),
  })
  .passthrough();
const putProductsProductId_Body = z
  .object({
    status: z.enum([
      "draft",
      "published",
      "inactive",
      "pending_retirement",
      "retired",
    ]),
    meta_title: z.string(),
    meta_description: z.string(),
    name: z.string(),
    external_reference: z.string(),
    description: z.string(),
    short_description: z.string(),
    slug: z.string(),
    hs_code: z.string(),
    country_of_origin: z.string(),
    type: z.enum(["standard", "inventory_item", "pre_order_item"]),
    categories: z.array(
      z
        .object({
          name: z.string(),
          external_identifier: z.string().optional(),
          update_on_exists: z.boolean().optional(),
        })
        .passthrough()
    ),
    brand_name: z.string(),
    supplier_name: z.string(),
    attributes: z.array(
      z
        .object({
          key: z.string(),
          value: z.string(),
          is_feature: z.boolean(),
          is_labeled: z.boolean(),
        })
        .partial()
        .passthrough()
    ),
    specifications: z.array(
      z
        .object({
          title: z.string(),
          specifications: z.array(
            z
              .object({
                key: z.string(),
                value: z.string(),
                is_featured: z.boolean(),
              })
              .partial()
              .passthrough()
          ),
        })
        .partial()
        .passthrough()
    ),
    filter_tags: z.array(z.string().regex(/^.+_.+$/)),
    images: z.array(z.string().regex(/^.+_.+$/)),
  })
  .partial()
  .passthrough();
const postProductsProductIdvariants_Body = z
  .object({
    variants: z.array(
      z
        .object({
          sku: z.string(),
          stock: z.number().int(),
          weight: z.number().int(),
          purchase_price: z.string(),
          stock_price: z.number().int(),
          package_size: z.number().int(),
          supplier_sku: z.string(),
          price: z.number().int(),
          compare_price: z.string(),
          gtin: z.string(),
          options: z.array(
            z
              .object({ type: z.string(), value: z.string() })
              .partial()
              .passthrough()
          ),
        })
        .partial()
        .passthrough()
    ),
  })
  .partial()
  .passthrough();
const id = z.union([z.number(), z.null()]).optional();
const sku = z.union([z.string(), z.null()]).optional();
const postCustomers_Body = z
  .object({
    customer_type: z.enum(["person", "organization"]),
    email: z.string().max(255).email(),
    invoice_email: z.string().max(255).email().optional(),
    password: z.string().min(8).optional(),
    organization_number: z.string().optional(),
    billing_address: z
      .object({
        firstname: z.string(),
        lastname: z.string(),
        company_name: z.string().optional(),
        address: z.string().optional(),
        postcode: z.string().optional(),
        city: z.string().optional(),
        country: z.string().min(2).max(2),
      })
      .passthrough(),
    shipping_address: z
      .object({
        firstname: z.string(),
        lastname: z.string(),
        company_name: z.string().optional(),
        address: z.string().optional(),
        postcode: z.string().optional(),
        city: z.string().optional(),
        country: z.string(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
const postCategories_Body = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    meta_title: z.string().optional(),
    meta_description: z.string().optional(),
    slug: z.string().optional(),
    active: z.boolean().optional(),
    show_in_menu: z.boolean().optional(),
    parent_id: z.union([z.number(), z.null()]).optional(),
    image_url: z.string().optional(),
  })
  .passthrough();
const putVariantsbatch_Body = z
  .object({
    variants: z.array(
      z
        .object({
          sku: z.string(),
          stock: z.number().optional(),
          purchase_price: z.number().gte(0).multipleOf(0.01).optional(),
          prices: z
            .array(
              z
                .object({
                  price: z.number().gte(0).multipleOf(0.01),
                  compare_price: z.number().gte(0).multipleOf(0.01),
                  customer_group_id: z.number().int().gte(0).multipleOf(1),
                  currency_id: z.number().int().gte(0).multipleOf(1),
                  tier: z.number().gte(1).multipleOf(1),
                })
                .partial()
                .passthrough()
            )
            .optional(),
          vehicle_data: z
            .array(
              z
                .object({
                  tag: z.string(),
                  brand: z.string(),
                  model: z.string(),
                  year: z.number().int(),
                  metadata: z.object({}).partial().passthrough(),
                })
                .partial()
                .passthrough()
            )
            .optional(),
        })
        .passthrough()
    ),
  })
  .partial()
  .passthrough();
const putVariantsVariantId_Body = z
  .object({
    sku: z.string(),
    vat_rate: z.number().int(),
    stock: z.number().int(),
    weight: z.number().int(),
    purchase_price: z.string(),
    stock_price: z.number().int(),
    package_size: z.number().int(),
    supplier_sku: z.string(),
    prices: z
      .object({
        price: z.number().int(),
        compare_price: z.number().int(),
        currency_id: z.number().int(),
        customer_group_id: z.number().int(),
        tier: z.number().int(),
      })
      .partial()
      .passthrough(),
    gtin: z.string(),
    storage_space: z.string(),
    always_orderable: z.boolean(),
    positive_inventory_status: z.string(),
    negative_inventory_status: z.string(),
    vehicle_data: z.array(
      z
        .object({
          tag: z.string().optional(),
          brand: z.string().optional(),
          model: z.string().optional(),
          year: z.number().int().optional(),
          metadata: z.object({}).partial().passthrough(),
        })
        .passthrough()
    ),
  })
  .partial()
  .passthrough();

export const schemas = {
  postOrdersOrder_id_Body,
  postOrders_Body,
  postOrdersOrder_iddeliver_Body,
  postProducts_Body,
  putProductsbatch_Body,
  postProductsbatch_Body,
  putProductsProductId_Body,
  postProductsProductIdvariants_Body,
  id,
  sku,
  postCustomers_Body,
  postCategories_Body,
  putVariantsbatch_Body,
  putVariantsVariantId_Body,
};

const endpoints = makeApi([
  {
    method: "post",
    path: "/categories",
    alias: "postCategories",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: postCategories_Body,
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string().optional(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "get",
    path: "/categories",
    alias: "getCategories",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().passthrough(),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().optional().default(100),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional().default(1),
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string().optional(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "put",
    path: "/categories/:id",
    alias: "putCategoriesId",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: postCategories_Body,
      },
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string().optional(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "get",
    path: "/categories/:id",
    alias: "getCategoriesId",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().passthrough(),
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string().optional(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "delete",
    path: "/categories/:id",
    alias: "deleteCategoriesId",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().passthrough(),
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string().optional(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "get",
    path: "/currencies",
    alias: "getCurrencies",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: postProductsProductIdvariants_Body,
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string().optional(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "post",
    path: "/customers",
    alias: "postCustomers",
    description: `Create a customer`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: postCustomers_Body,
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "get",
    path: "/customers/",
    alias: "getCustomers",
    description: `Fetch customers`,
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().gte(1).optional(),
      },
      {
        name: "per_page",
        type: "Query",
        schema: z.number().gte(1).optional(),
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "get",
    path: "/customers/:customer_id",
    alias: "getCustomersCustomer_id",
    description: `Fetch a customer`,
    requestFormat: "json",
    parameters: [
      {
        name: "customer_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "get",
    path: "/headless/categories/sangklader",
    alias: "getHeadlesscategoriessangklader",
    requestFormat: "json",
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "get",
    path: "/headless/pages",
    alias: "getHeadlesspages",
    requestFormat: "json",
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "get",
    path: "/headless/pages/:slug",
    alias: "getHeadlesspagesSlug",
    requestFormat: "json",
    parameters: [
      {
        name: "slug",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "get",
    path: "/headless/pages/startpage",
    alias: "getHeadlesspagesstartpage",
    requestFormat: "json",
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "get",
    path: "/headless/system",
    alias: "getHeadlesssystem",
    requestFormat: "json",
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "get",
    path: "/orders",
    alias: "getOrders",
    description: `# Filters
## Available fields
* created_at
* updated_at
* shipped_at
* canceled_at
* status (Only supports operator &#x60;eq&#x60;)

## Available operators
* eq (&#x3D;)
* lt (&lt;)
* lte (&lt;&#x3D;)
* gt (&gt;)
* gte (&gt;&#x3D;)`,
    requestFormat: "json",
    parameters: [
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional().default(50),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).lte(0).optional().default(1),
      },
      {
        name: "filters[field][operator]",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "post",
    path: "/orders",
    alias: "postOrders",
    description: `Create an order`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: postOrders_Body,
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.literal("application/json"),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.literal("application/json"),
      },
    ],
    response: z
      .object({
        data: z
          .object({
            id: z.number().int(),
            currency_iso: z.string(),
            order_items: z.array(
              z
                .object({
                  id: z.number().int(),
                  sku: z.string(),
                  name: z.string(),
                  type: z.string(),
                  quantity: z.string(),
                  unit: z.string(),
                  vat_rate: z.number().int(),
                  unit_price: z.number().int(),
                  total_amount: z.number().int(),
                  image_url: z.string(),
                  variant_url: z.string(),
                })
                .partial()
                .passthrough()
            ),
            customer: z
              .object({
                id: z.number().int(),
                customer_type: z.string(),
                firstname: z.string(),
                lastname: z.string(),
                email: z.string(),
                phone: z.null(),
                ssn: z.null(),
                created_at: z.string(),
                updated_at: z.string(),
                billing_address: z
                  .object({
                    address: z.string(),
                    address2: z.null(),
                    co_address: z.null(),
                    postcode: z.string(),
                    city: z.string(),
                    state: z.null(),
                    country: z.string(),
                    company_name: z.null(),
                    firstname: z.string(),
                    lastname: z.string(),
                  })
                  .passthrough(),
                shipping_address: z
                  .object({
                    address: z.string(),
                    address2: z.null(),
                    co_address: z.null(),
                    postcode: z.string(),
                    city: z.string(),
                    state: z.null(),
                    country: z.string(),
                    company_name: z.null(),
                    firstname: z.string(),
                    lastname: z.string(),
                  })
                  .passthrough(),
              })
              .passthrough(),
            billing_address: z
              .object({
                address: z.string(),
                address2: z.null(),
                co_address: z.null(),
                postcode: z.string(),
                city: z.string(),
                state: z.null(),
                country: z.string(),
                company_name: z.string(),
                firstname: z.string(),
                lastname: z.string(),
              })
              .passthrough(),
            shipping_address: z
              .object({
                address: z.string(),
                address2: z.null(),
                co_address: z.null(),
                postcode: z.string(),
                city: z.string(),
                state: z.null(),
                country: z.string(),
                company_name: z.string(),
                firstname: z.string(),
                lastname: z.string(),
              })
              .passthrough(),
            shipping: z
              .object({
                name: z.string(),
                vat_rate: z.number().int(),
                total_amount: z.number().int(),
              })
              .passthrough(),
            payment: z
              .object({
                name: z.string(),
                vat_rate: z.number().int(),
                total_amount: z.number().int(),
              })
              .passthrough(),
            created_at: z.string(),
            updated_at: z.string(),
          })
          .passthrough(),
      })
      .passthrough(),
  },
  {
    method: "get",
    path: "/orders/:order_id",
    alias: "getOrdersOrder_id",
    description: `Fetch an order`,
    requestFormat: "json",
    parameters: [
      {
        name: "order_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string().optional(),
      },
    ],
    response: z
      .object({
        data: z
          .object({
            id: z.number().int(),
            currency_iso: z.string(),
            order_items: z.array(
              z
                .object({
                  id: z.number().int(),
                  sku: z.string(),
                  name: z.string(),
                  type: z.string(),
                  quantity: z.string(),
                  unit: z.string(),
                  vat_rate: z.number().int(),
                  unit_price: z.number().int(),
                  total_amount: z.number().int(),
                  image_url: z.string(),
                  variant_url: z.string(),
                })
                .partial()
                .passthrough()
            ),
            customer: z
              .object({
                id: z.number().int(),
                customer_type: z.string(),
                firstname: z.string(),
                lastname: z.string(),
                email: z.string(),
                phone: z.string(),
                ssn: z.string(),
                created_at: z.string(),
                updated_at: z.string(),
                billing_address: z
                  .object({
                    address: z.string(),
                    address2: z.null(),
                    co_address: z.null(),
                    postcode: z.string(),
                    city: z.string(),
                    state: z.null(),
                    country: z.string(),
                    company_name: z.string(),
                    firstname: z.string(),
                    lastname: z.string(),
                  })
                  .passthrough(),
                shipping_address: z
                  .object({
                    address: z.string(),
                    address2: z.null(),
                    co_address: z.null(),
                    postcode: z.string(),
                    city: z.string(),
                    state: z.null(),
                    country: z.string(),
                    company_name: z.string(),
                    firstname: z.string(),
                    lastname: z.string(),
                  })
                  .passthrough(),
              })
              .passthrough(),
            billing_address: z
              .object({
                address: z.string(),
                address2: z.null(),
                co_address: z.null(),
                postcode: z.string(),
                city: z.string(),
                state: z.null(),
                country: z.string(),
                company_name: z.string(),
                firstname: z.string(),
                lastname: z.string(),
              })
              .passthrough(),
            shipping_address: z
              .object({
                address: z.string(),
                address2: z.null(),
                co_address: z.null(),
                postcode: z.string(),
                city: z.string(),
                state: z.null(),
                country: z.string(),
                company_name: z.string(),
                firstname: z.string(),
                lastname: z.string(),
              })
              .passthrough(),
            shipping: z
              .object({
                name: z.string(),
                vat_rate: z.number().int(),
                total_amount: z.number().int(),
              })
              .passthrough(),
            payment: z
              .object({
                name: z.string(),
                vat_rate: z.number().int(),
                total_amount: z.number().int(),
              })
              .passthrough(),
            created_at: z.string(),
            updated_at: z.string(),
          })
          .passthrough(),
      })
      .passthrough(),
  },
  {
    method: "post",
    path: "/orders/:order_id",
    alias: "postOrdersOrder_id",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: postOrdersOrder_id_Body,
      },
      {
        name: "order_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z
      .object({
        customer_id: z.number().int(),
        shipping: z
          .object({
            name: z.string(),
            price_ex_vat: z.number().int(),
            price_inv_vat: z.number().int(),
          })
          .partial()
          .passthrough(),
        payment: z
          .object({
            name: z.string(),
            price_ex_vat: z.number().int(),
            price_inc_vat: z.number().int(),
          })
          .partial()
          .passthrough(),
        currency_iso: z.string().max(3),
        currency_id: z.number().int(),
        billing_address: z
          .object({
            firstname: z.string(),
            lastname: z.string(),
            company_name: z.string(),
            co_address: z.string(),
            address: z.string(),
            address2: z.string(),
            postcode: z.string(),
            city: z.string(),
            country: z.string(),
            vat_number: z.string(),
            state: z.string(),
          })
          .partial()
          .passthrough(),
        shipping_address: z
          .object({
            firstname: z.string(),
            lastname: z.string(),
            company_name: z.string(),
            co_address: z.string(),
            address: z.string(),
            address2: z.string(),
            postcode: z.string(),
            city: z.string(),
            country: z.string(),
            vat_number: z.string(),
            state: z.string(),
          })
          .partial()
          .passthrough(),
        items: z.array(
          z
            .object({
              sku: z.string(),
              price: z.number().optional(),
              quantity: z.number().optional(),
            })
            .passthrough()
        ),
        status: z.enum([
          "open",
          "approved",
          "deliverable",
          "shipped",
          "partially-delivered",
          "canceled",
          "awaiting-delivery",
          "awaiting-payment",
          "backlisted",
          "external",
        ]),
        checkout_message: z.string(),
        delivery_date: z.string(),
        reference: z.string(),
        marking: z.string(),
        warehouse_note: z.string(),
      })
      .partial()
      .passthrough(),
  },
  {
    method: "post",
    path: "/orders/:order_id/deliver",
    alias: "postOrdersOrder_iddeliver",
    description: `Can be used by external systems to send shipment booking data to Nyehandel. The order in Nyehandel will change status to &quot;shipped&quot; when deliver is triggered.

NOTE: The pdfs attached in pdf_paths will not be downloaded and copied to our filesystem, so we expect the pdf&#x27;s to remain on the path sent.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: postOrdersOrder_iddeliver_Body,
      },
      {
        name: "order_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "get",
    path: "/orders/delivery-notes",
    alias: "getOrdersdeliveryNotes",
    description: `Fetch delivery notes`,
    requestFormat: "json",
    parameters: [
      {
        name: "ids[]",
        type: "Query",
        schema: z.array(z.string()).optional(),
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string().optional(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "get",
    path: "/payment-methods",
    alias: "getPaymentMethods",
    description: `Gets the available payment methods, paginated`,
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "get",
    path: "/products",
    alias: "getProducts",
    requestFormat: "json",
    parameters: [
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional().default(50),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1),
      },
      {
        name: "status",
        type: "Query",
        schema: z
          .enum([
            "draft",
            "published",
            "inactive",
            "pending_retirement",
            "retired",
          ])
          .optional(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "post",
    path: "/products",
    alias: "postProducts",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: postProducts_Body,
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string().optional(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "put",
    path: "/products/:productId",
    alias: "putProductsProductId",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: putProductsProductId_Body,
      },
      {
        name: "productId",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string().optional(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "delete",
    path: "/products/:productId",
    alias: "deleteProductsProductId",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.string(),
      },
      {
        name: "productId",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string().optional(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "post",
    path: "/products/:productId/variants",
    alias: "postProductsProductIdvariants",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: postProductsProductIdvariants_Body,
      },
      {
        name: "productId",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string().optional(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "put",
    path: "/products/batch",
    alias: "putProductsbatch",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: putProductsbatch_Body,
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "post",
    path: "/products/batch",
    alias: "postProductsbatch",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: postProductsbatch_Body,
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string().optional(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "get",
    path: "/products/find",
    alias: "getProductsfind",
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Query",
        schema: id,
      },
      {
        name: "sku",
        type: "Query",
        schema: sku,
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string().optional(),
      },
    ],
    response: z
      .object({
        data: z
          .object({
            id: z.number().int(),
            status: z.string(),
            type: z.string(),
            name: z.string(),
            meta_title: z.string(),
            meta_description: z.string(),
            external_reference: z.string(),
            description: z.string(),
            hs_code: z.null(),
            country_of_origin: z.null(),
            filterTags: z.null(),
            variants: z.array(
              z
                .object({
                  id: z.number().int(),
                  product_id: z.number().int(),
                  sku: z.string(),
                  gtin: z.null(),
                  stock: z.string(),
                  weight: z.number().int(),
                  purchase_price: z.number().int(),
                  stock_price: z.number().int(),
                  price: z.number().int(),
                  compare_price: z.number().int(),
                  package_size: z.number().int(),
                  supplier_sku: z.null(),
                  external_reference: z.string(),
                  always_orderable: z.boolean(),
                  created_at: z.string(),
                })
                .partial()
                .passthrough()
            ),
            categories: z.array(
              z
                .object({
                  id: z.number().int(),
                  external_reference: z.null(),
                  name: z.string(),
                })
                .passthrough()
            ),
            brand: z.null(),
            supplier: z.null(),
            created_at: z.string(),
          })
          .passthrough(),
      })
      .passthrough(),
  },
  {
    method: "get",
    path: "/purchases",
    alias: "getPurchases",
    description: `# Filters
## Available fields
* created_at
* delivered_at
* ordered_at
* confirmed_at
* delivery_date
* status (Only supports operator &#x60;eq&#x60;)

## Available operators
* eq (&#x3D;)
* lt (&lt;)
* lte (&lt;&#x3D;)
* gt (&gt;)
* gte (&gt;&#x3D;)`,
    requestFormat: "json",
    parameters: [
      {
        name: "per_page",
        type: "Query",
        schema: z.number().int().gte(1).lte(100).optional().default(50),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().gte(1).lte(0).optional().default(1),
      },
      {
        name: "filters[field][operator]",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "get",
    path: "/shipping-methods",
    alias: "getShippingMethods",
    description: `Gets the available shipping methods, paginated`,
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.string(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "put",
    path: "/variants/:variantId",
    alias: "putVariantsVariantId",
    description: `### Notes about prices:
When uppdating prices, the sibling prices will be replaced as well. A sibling is defined as a price that belongs to the same currency and customer group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: putVariantsVariantId_Body,
      },
      {
        name: "variantId",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string().optional(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "delete",
    path: "/variants/:variantId",
    alias: "deleteVariantsVariantId",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: postProductsProductIdvariants_Body,
      },
      {
        name: "variantId",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string().optional(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "put",
    path: "/variants/batch",
    alias: "putVariantsbatch",
    description: `### Notes about prices:
When uppdating prices, the sibling prices will be replaced as well. A sibling is defined as a price that belongs to the same currency and customer group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: putVariantsbatch_Body,
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "get",
    path: "/variants/find",
    alias: "getVariantsfind",
    description: `ID, sku and GTIN are available as search parameters`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Query",
        schema: id,
      },
      {
        name: "sku",
        type: "Query",
        schema: sku,
      },
      {
        name: "gtin",
        type: "Query",
        schema: sku,
      },
      {
        name: "X-Identifier",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Authorization",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Accept",
        type: "Header",
        schema: z.string().optional(),
      },
      {
        name: "Content-Type",
        type: "Header",
        schema: z.string().optional(),
      },
    ],
    response: z
      .object({
        data: z
          .object({
            id: z.number().int(),
            product_id: z.number().int(),
            sku: z.string(),
            gtin: z.null(),
            stock: z.string(),
            weight: z.number().int(),
            purchase_price: z.number().int(),
            stock_price: z.number().int(),
            price: z.number().int(),
            compare_price: z.number().int(),
            package_size: z.number().int(),
            supplier_sku: z.null(),
            external_reference: z.string(),
            always_orderable: z.boolean(),
            created_at: z.string(),
          })
          .passthrough(),
      })
      .passthrough(),
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
