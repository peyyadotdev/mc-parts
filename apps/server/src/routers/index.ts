import { and, asc, desc, eq, like, or, type SQL, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index";
import { brand } from "../db/schema/tables/brand";
import { product } from "../db/schema/tables/product";
import { productFitment } from "../db/schema/tables/product_fitment";
import { productVariant } from "../db/schema/tables/product_variant";
import { vehicleModel } from "../db/schema/tables/vehicle_model";
import { publicProcedure, router } from "../lib/trpc";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
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
				// Bug fix: vehicleModel join must exist before referencing it in where clause
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
				.leftJoin(
					vehicleModel,
					eq(productFitment.vehicleModelId, vehicleModel.id),
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

			// Bug fix: Count query must match the structure of the main query to get accurate totals
			// Use count(distinct product.id) to avoid counting duplicates from joins
			// Include all the same joins as the main query so filters work correctly
			const totalRows = await db
				.select({ cnt: sql<number>`count(distinct ${product.id})::int` })
				.from(product)
				.leftJoin(brand, eq(product.brandId, brand.id))
				.leftJoin(productVariant, eq(product.id, productVariant.productId))
				.leftJoin(
					productFitment,
					eq(productVariant.id, productFitment.variantId),
				)
				.leftJoin(
					vehicleModel,
					eq(productFitment.vehicleModelId, vehicleModel.id),
				)
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
});
export type AppRouter = typeof appRouter;
