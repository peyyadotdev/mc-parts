import { and, asc, desc, eq, like, or, type SQL, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index";
import { attributeCategory } from "../db/schema/tables/attribute_category";
import { attributeDefinition } from "../db/schema/tables/attribute_definition";
import { brand } from "../db/schema/tables/brand";
import { category as categoryTable } from "../db/schema/tables/category";
import { product } from "../db/schema/tables/product";
import { productCategory } from "../db/schema/tables/product_category";
import { productFitment } from "../db/schema/tables/product_fitment";
import { productVariant } from "../db/schema/tables/product_variant";
import { variantAttribute } from "../db/schema/tables/variant_attribute";
import { vehicleModel } from "../db/schema/tables/vehicle_model";
import { publicProcedure, router } from "../lib/trpc";
import {
	createExtractionContext,
	extractAttributes,
	persistExtractionResult,
	persistManualAttributes,
	summarizeOutcome,
} from "../services/attributeExtraction/engine";

const extractionContext = createExtractionContext();

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),

	listAttributeDefinitions: publicProcedure.query(async () => {
		const definitions = await db
			.select({
				id: attributeDefinition.id,
				slug: attributeDefinition.slug,
				label: attributeDefinition.label,
				description: attributeDefinition.description,
				scope: attributeDefinition.scope,
				dataType: attributeDefinition.dataType,
				importance: attributeDefinition.importance,
				unit: attributeDefinition.unit,
				defaultConfidence: attributeDefinition.defaultConfidence,
				sourceFields: attributeDefinition.sourceFields,
				derivedFrom: attributeDefinition.derivedFrom,
				extractionRules: attributeDefinition.extractionRules,
				enumValues: attributeDefinition.enumValues,
				validations: attributeDefinition.validations,
				metadata: attributeDefinition.metadata,
			})
			.from(attributeDefinition)
			.orderBy(asc(attributeDefinition.slug));

		const categories = await db
			.select({
				attributeDefinitionId: attributeCategory.attributeDefinitionId,
				categoryKey: attributeCategory.categoryKey,
				metadata: attributeCategory.metadata,
			})
			.from(attributeCategory);

		const categoriesByDefinition = new Map<string, string[]>();
		for (const entry of categories) {
			const label =
				(typeof entry.metadata === "object" &&
					entry.metadata &&
					"label" in entry.metadata &&
					typeof entry.metadata.label === "string"
					? entry.metadata.label
					: entry.categoryKey) ?? entry.categoryKey;

			const list = categoriesByDefinition.get(entry.attributeDefinitionId) ?? [];
			list.push(label);
			categoriesByDefinition.set(entry.attributeDefinitionId, list);
		}

		return definitions.map((definition) => ({
			...definition,
			categories: categoriesByDefinition.get(definition.id) ?? [],
		}));
	}),

	// Paginated products with variant counts
	getProducts: publicProcedure
		.input(
			z.object({
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(100).default(50),
				search: z.string().optional(),
				sortBy: z
					.enum(["name", "createdAt", "updatedAt", "variantCount"])
					.default("updatedAt"),
				sortOrder: z.enum(["asc", "desc"]).default("desc"),
				status: z.enum(["all", "active", "inactive"]).default("all"),
				brands: z.array(z.string()).optional(),
				updatedFrom: z.string().datetime().optional(),
				updatedTo: z.string().datetime().optional(),
				fitment: z
					.object({ make: z.string(), model: z.string().optional() })
					.optional(),
			}),
		)
		.query(async ({ input }) => {
			const { page, limit, search, sortBy, sortOrder, status } = input;
			const offset = (page - 1) * limit;

			const whereClauses: SQL[] = [];
			if (search && search.trim().length > 0) {
				whereClauses.push(like(product.name, `%${search}%`));
			}
			if (status !== "all") {
				whereClauses.push(eq(product.status, status));
			}
			if (input.brands && input.brands.length > 0) {
				// filter by brand name
				whereClauses.push(
					sql`coalesce(${brand.name}, '') = any(${input.brands})`,
				);
			}
			if (input.updatedFrom) {
				whereClauses.push(
					sql`${product.updatedAt} >= ${new Date(input.updatedFrom)}`,
				);
			}
			if (input.updatedTo) {
				whereClauses.push(
					sql`${product.updatedAt} <= ${new Date(input.updatedTo)}`,
				);
			}
			if (input.fitment?.make) {
				whereClauses.push(eq(vehicleModel.make, input.fitment.make));
				if (input.fitment.model) {
					whereClauses.push(
						like(vehicleModel.model, `%${input.fitment.model}%`),
					);
				}
			}
			const whereExpr =
				whereClauses.length > 0 ? and(...whereClauses) : undefined;

			// Select products with variant count
			const baseSelect = db
				.select({
					id: product.id,
					name: product.name,
					status: product.status,
					createdAt: product.createdAt,
					updatedAt: product.updatedAt,
					brandName: brand.name,
					variantCount: sql<number>`count(distinct ${productVariant.id})::int`,
					fitmentCount: sql<number>`count(distinct ${productFitment.vehicleModelId})::int`,
				})
				.from(product)
				.leftJoin(brand, eq(product.brandId, brand.id))
				.leftJoin(productVariant, eq(product.id, productVariant.productId))
				.leftJoin(
					productFitment,
					eq(productVariant.id, productFitment.variantId),
				)
				.where(whereExpr)
				.groupBy(
					product.id,
					product.name,
					product.status,
					product.createdAt,
					product.updatedAt,
					brand.name,
				);

			const products = await baseSelect
				.orderBy(
					sortBy === "variantCount"
						? sortOrder === "asc"
							? asc(sql`count(distinct ${productVariant.id})`)
							: desc(sql`count(distinct ${productVariant.id})`)
						: sortBy === "createdAt"
							? sortOrder === "asc"
								? asc(product.createdAt)
								: desc(product.createdAt)
							: sortBy === "updatedAt"
								? sortOrder === "asc"
									? asc(product.updatedAt)
									: desc(product.updatedAt)
								: sortOrder === "asc"
									? asc(product.name)
									: desc(product.name),
				)
				.limit(limit)
				.offset(offset);

			const totalRows = await db
				.select({ cnt: sql<number>`count(*)::int` })
				.from(product)
				.where(whereExpr);

			const total = totalRows[0]?.cnt ?? 0;
			const totalPages = Math.ceil(total / limit) || 1;

			return {
				products,
				pagination: {
					page,
					limit,
					total,
					totalPages,
					hasNextPage: page < totalPages,
					hasPrevPage: page > 1,
				},
			};
		}),

	// Product details with variants and fitments
	getProductDetails: publicProcedure
		.input(z.object({ productId: z.string() }))
		.query(async ({ input }) => {
			const [p] = await db
				.select()
				.from(product)
				.where(eq(product.id, input.productId))
				.limit(1);
			if (!p) throw new Error("Product not found");

			const variants = await db
				.select({
					id: productVariant.id,
					sku: productVariant.sku,
					gtin: productVariant.gtin,
					priceCents: productVariant.priceCents,
					stockQty: productVariant.stockQty,
					weightGrams: productVariant.weightGrams,
					status: productVariant.status,
					vehicleModelId: productFitment.vehicleModelId,
					vehicleMake: vehicleModel.make,
					vehicleModel: vehicleModel.model,
					vehicleType: vehicleModel.type,
				})
				.from(productVariant)
				.leftJoin(
					productFitment,
					eq(productVariant.id, productFitment.variantId),
				)
				.leftJoin(
					vehicleModel,
					eq(productFitment.vehicleModelId, vehicleModel.id),
				)
				.where(eq(productVariant.productId, input.productId))
				.orderBy(asc(productVariant.sku));

			return { product: p, variants };
		}),

	// Quick search variants (by SKU or product name)
	searchVariants: publicProcedure
		.input(
			z.object({
				query: z.string().min(2),
				limit: z.number().min(1).max(50).default(20),
			}),
		)
		.query(async ({ input }) => {
			const q = `%${input.query}%`;
			const rows = await db
				.select({
					id: productVariant.id,
					sku: productVariant.sku,
					gtin: productVariant.gtin,
					priceCents: productVariant.priceCents,
					stockQty: productVariant.stockQty,
					productId: productVariant.productId,
					productName: product.name,
				})
				.from(productVariant)
				.leftJoin(product, eq(productVariant.productId, product.id))
				.where(or(like(productVariant.sku, q), like(product.name, q)))
				.orderBy(asc(productVariant.sku))
				.limit(input.limit);
			return rows;
		}),

	// Simple DB stats for dashboard
	getStats: publicProcedure.query(async () => {
		const [p, v, f] = await Promise.all([
			db.select({ cnt: sql<number>`count(*)::int` }).from(product),
			db.select({ cnt: sql<number>`count(*)::int` }).from(productVariant),
			db.select({ cnt: sql<number>`count(*)::int` }).from(productFitment),
		]);
		return {
			products: p[0]?.cnt ?? 0,
			variants: v[0]?.cnt ?? 0,
			fitments: f[0]?.cnt ?? 0,
		};
	}),

	// Brands for filters
	listBrands: publicProcedure.query(async () => {
		const rows = await db
			.select({
				name: brand.name,
				count: sql<number>`count(${product.id})::int`,
			})
			.from(brand)
			.leftJoin(product, eq(brand.id, product.brandId))
			.groupBy(brand.name)
			.orderBy(asc(brand.name));
		return rows.filter((r) => !!r.name);
	}),

	// Get variants with their attributes for enrichment UI
	getVariantsWithAttributes: publicProcedure
		.input(
			z.object({
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(100).default(25),
				search: z.string().optional(),
				hasAttributes: z.enum(["all", "yes", "no"]).default("all"),
				extractedOnly: z.boolean().default(false),
			}),
		)
		.query(async ({ input }) => {
			const { page, limit, search, hasAttributes, extractedOnly } = input;
			const offset = (page - 1) * limit;

			const whereClauses: SQL[] = [];

			if (search && search.trim().length > 0) {
				whereClauses.push(
					or(
						like(product.name, `%${search}%`),
						like(productVariant.sku, `%${search}%`)
					)
				);
			}

			if (hasAttributes === "yes") {
				whereClauses.push(
					sql`exists (select 1 from ${variantAttribute} va where va.variant_id = ${productVariant.id})`,
				);
			} else if (hasAttributes === "no") {
				whereClauses.push(
					sql`not exists (select 1 from ${variantAttribute} va where va.variant_id = ${productVariant.id})`,
				);
			}

			if (extractedOnly) {
				whereClauses.push(
					sql`exists (select 1 from ${variantAttribute} va where va.variant_id = ${productVariant.id} and va.source = 'extracted')`,
				);
			}

			const whereExpr =
				whereClauses.length > 0 ? and(...whereClauses) : undefined;

			const variants = await db
				.select({
					variantId: productVariant.id,
					productId: product.id,
					productName: product.name,
					sku: productVariant.sku,
					gtin: productVariant.gtin,
					updatedAt: productVariant.updatedAt,
					brandName: brand.name,
					extractedCount: sql<number>`count(*) filter (where ${variantAttribute.source} = 'extracted')::int`,
					manualCount: sql<number>`count(*) filter (where ${variantAttribute.source} = 'manual')::int`,
					lastExtractedAt: sql<string | null>`max(case when ${variantAttribute.source} = 'extracted' then ${variantAttribute.extractedAt} end)`,
				})
				.from(productVariant)
				.innerJoin(product, eq(productVariant.productId, product.id))
				.leftJoin(brand, eq(product.brandId, brand.id))
				.leftJoin(
					variantAttribute,
					eq(variantAttribute.variantId, productVariant.id),
				)
				.where(whereExpr)
				.groupBy(
					productVariant.id,
					product.id,
					product.name,
					productVariant.sku,
					productVariant.gtin,
					productVariant.updatedAt,
					brand.name,
				)
				.orderBy(desc(productVariant.updatedAt))
				.limit(limit)
				.offset(offset);

			const totalRows = await db
				.select({ cnt: sql<number>`count(distinct ${productVariant.id})::int` })
				.from(productVariant)
				.innerJoin(product, eq(productVariant.productId, product.id))
				.leftJoin(
					variantAttribute,
					eq(variantAttribute.variantId, productVariant.id),
				)
				.where(whereExpr);

			const total = totalRows[0]?.cnt ?? 0;
			const totalPages = Math.ceil(total / limit) || 1;

			return {
				variants,
				pagination: {
					page,
					limit,
					total,
					totalPages,
					hasNextPage: page < totalPages,
					hasPrevPage: page > 1,
				},
			};
		}),

	// Update variant attributes
	updateVariantAttributes: publicProcedure
		.input(
			z.object({
				variantId: z.string(),
				attributes: z
					.array(
						z.object({
							slug: z.string(),
							values: z
								.array(
									z.object({
										value: z.union([z.string(), z.number(), z.boolean()]),
										unit: z.string().nullable().optional(),
										confidence: z.number().min(0).max(1).optional(),
									}),
								)
								.min(1),
						}),
					)
					.optional()
					.default([]),
				clear: z.array(z.string()).optional().default([]),
			}),
		)
		.mutation(async ({ input }) => {
			const { variantId } = input;
			const attributes = input.attributes ?? [];
			const clear = input.clear ?? [];

			const [variant] = await db
				.select({
					attributes: productVariant.attributes,
				})
				.from(productVariant)
				.where(eq(productVariant.id, variantId))
				.limit(1);

			if (!variant) {
				throw new Error("Variant not found");
			}

			await persistManualAttributes({
				db,
				variantId,
				attributes: attributes.map((attribute) => ({
					slug: attribute.slug,
					values: attribute.values.map((value) => ({
						value: value.value,
						unit: value.unit ?? null,
						confidence: value.confidence ?? 1,
					})),
				})),
				existingLegacyAttributes: (variant.attributes ?? {}) as Record<string, unknown>,
				clearSlugs: clear,
			});

			return { success: true };
		}),

	// Extract attributes for specific variant
	extractVariantAttributes: publicProcedure
		.input(z.object({ variantId: z.string() }))
		.mutation(async ({ input }) => {
			const [variant] = await db
				.select({
					id: productVariant.id,
					productId: productVariant.productId,
					name: product.name,
					description: product.description,
					attributes: productVariant.attributes,
				})
				.from(productVariant)
				.innerJoin(product, eq(productVariant.productId, product.id))
				.where(eq(productVariant.id, input.variantId))
				.limit(1);

			if (!variant) {
				throw new Error("Variant not found");
			}

			const categories = await db
				.select({ name: categoryTable.name })
				.from(productCategory)
				.innerJoin(categoryTable, eq(productCategory.categoryId, categoryTable.id))
				.where(eq(productCategory.productId, variant.productId));

			const outcome = extractAttributes(
				{
					variantId: variant.id,
					productId: variant.productId,
					name: variant.name ?? "",
					description: variant.description ?? "",
					categories: categories.map((row) => row.name ?? "").filter(Boolean),
					legacyAttributes: variant.attributes as Record<string, unknown> | null,
				},
				extractionContext,
			);

			await persistExtractionResult({
				db,
				context: extractionContext,
				variantId: variant.id,
				outcome,
				overrideLegacyAttributes: true,
				existingLegacyAttributes: variant.attributes as Record<string, unknown> | null,
			});

			return {
				success: true,
				summary: summarizeOutcome(outcome),
			};
		}),

	getVariantAttributes: publicProcedure
		.input(z.object({ variantId: z.string() }))
		.query(async ({ input }) => {
			const [variant] = await db
				.select({
					id: productVariant.id,
					productId: productVariant.productId,
					sku: productVariant.sku,
					productName: product.name,
					description: product.description,
					brandName: brand.name,
					updatedAt: productVariant.updatedAt,
				})
				.from(productVariant)
				.innerJoin(product, eq(productVariant.productId, product.id))
				.leftJoin(brand, eq(product.brandId, brand.id))
				.where(eq(productVariant.id, input.variantId))
				.limit(1);

			if (!variant) {
				throw new Error("Variant not found");
			}

			const categories = await db
				.select({ name: categoryTable.name })
				.from(productCategory)
				.innerJoin(categoryTable, eq(productCategory.categoryId, categoryTable.id))
				.where(eq(productCategory.productId, variant.productId));

			const rows = await db
				.select({
					id: variantAttribute.id,
					slug: attributeDefinition.slug,
					label: attributeDefinition.label,
					dataType: attributeDefinition.dataType,
					scope: attributeDefinition.scope,
					importance: attributeDefinition.importance,
					unit: attributeDefinition.unit,
					source: variantAttribute.source,
					valueText: variantAttribute.valueText,
					valueNumber: variantAttribute.valueNumber,
					valueBoolean: variantAttribute.valueBoolean,
					confidence: variantAttribute.confidence,
					recordUnit: variantAttribute.unit,
					sourceFields: variantAttribute.sourceFields,
					extractedAt: variantAttribute.extractedAt,
					provenance: variantAttribute.provenance,
					createdAt: variantAttribute.createdAt,
					updatedAt: variantAttribute.updatedAt,
				})
				.from(variantAttribute)
				.innerJoin(
					attributeDefinition,
					eq(variantAttribute.attributeDefinitionId, attributeDefinition.id),
				)
				.where(eq(variantAttribute.variantId, input.variantId))
				.orderBy(
					desc(variantAttribute.source),
					desc(variantAttribute.updatedAt),
				);

			const toIso = (value: Date | null | undefined) =>
				value instanceof Date ? value.toISOString() : value ?? null;

			const attributes = rows.reduce<
				Array<{
					slug: string;
					label: string;
					dataType: string;
					scope: string;
					importance: string;
					unit: string | null;
					values: Array<{
						id: string;
						source: string;
						value: string | number | boolean | null;
						unit: string | null;
						confidence: number;
						extractedAt: string | null;
						sourceFields: string[];
						provenance: Record<string, unknown>;
						createdAt: string | null;
						updatedAt: string | null;
					}>;
				}>
			>((acc, row) => {
				const existing = acc.find((attribute) => attribute.slug === row.slug);
				const value =
					row.dataType === "number"
						? row.valueNumber
						: row.dataType === "boolean"
							? row.valueBoolean
							: row.valueText;

				const item = {
					id: row.id,
					source: row.source,
					value,
					unit: row.recordUnit ?? row.unit ?? null,
					confidence: Number(row.confidence ?? 0),
					extractedAt: toIso(row.extractedAt),
					sourceFields: row.sourceFields ?? [],
					provenance: row.provenance ?? {},
					createdAt: toIso(row.createdAt),
					updatedAt: toIso(row.updatedAt),
				};

				if (existing) {
					existing.values.push(item);
				} else {
					acc.push({
						slug: row.slug,
						label: row.label,
						dataType: row.dataType,
						scope: row.scope,
						importance: row.importance,
						unit: row.unit,
						values: [item],
					});
				}

				return acc;
			}, []);

			return {
				variant: {
					...variant,
					categories: categories.map((row) => row.name ?? "").filter(Boolean),
				},
				attributes,
			};
		}),
});
export type AppRouter = typeof appRouter;
