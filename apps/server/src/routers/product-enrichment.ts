import { and, asc, desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index";
import { productEnrichment } from "../db/schema/tables/product_enrichment";
import { product } from "../db/schema/tables/product";
import { publicProcedure, router } from "../lib/trpc";

const contentSchema = z.object({
	frontMatter: z.record(z.unknown()).optional(),
	markdown: z.string(),
	renderedHtml: z.string().optional(),
});

export const productEnrichmentRouter = router({
	list: publicProcedure
		.input(
			z.object({
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(100).default(50),
				productId: z.string().uuid().optional(),
				status: z.enum(["draft", "valid", "invalid", "published"]).optional(),
				language: z.string().optional(),
				search: z.string().optional(),
			}),
		)
		.query(async ({ input }) => {
			const { page, limit, productId, status, language, search } = input;
			const offset = (page - 1) * limit;

			const whereClauses = [];
			if (productId) {
				whereClauses.push(eq(productEnrichment.productId, productId));
			}
			if (status) {
				whereClauses.push(eq(productEnrichment.status, status));
			}
			if (language) {
				whereClauses.push(eq(productEnrichment.language, language));
			}
			if (search) {
				// Search in product name via join
				whereClauses.push(like(product.name, `%${search}%`));
			}

			const whereExpr =
				whereClauses.length > 0 ? and(...whereClauses) : undefined;

			const enrichments = await db
				.select({
					id: productEnrichment.id,
					productId: productEnrichment.productId,
					productName: product.name,
					content: productEnrichment.content,
					status: productEnrichment.status,
					language: productEnrichment.language,
					createdAt: productEnrichment.createdAt,
					updatedAt: productEnrichment.updatedAt,
				})
				.from(productEnrichment)
				.leftJoin(product, eq(productEnrichment.productId, product.id))
				.where(whereExpr)
				.orderBy(desc(productEnrichment.updatedAt))
				.limit(limit)
				.offset(offset);

			const total = await db
				.select({ count: productEnrichment.id })
				.from(productEnrichment)
				.leftJoin(product, eq(productEnrichment.productId, product.id))
				.where(whereExpr);

			return {
				enrichments,
				pagination: {
					page,
					limit,
					total: total.length,
					totalPages: Math.ceil(total.length / limit) || 1,
					hasNextPage: page < Math.ceil(total.length / limit),
					hasPrevPage: page > 1,
				},
			};
		}),

	getById: publicProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ input }) => {
			const [enrichment] = await db
				.select()
				.from(productEnrichment)
				.where(eq(productEnrichment.id, input.id))
				.limit(1);

			if (!enrichment) {
				throw new Error("Product enrichment not found");
			}

			return enrichment;
		}),

	create: publicProcedure
		.input(
			z.object({
				productId: z.string().uuid(),
				content: contentSchema,
				status: z.enum(["draft", "valid", "invalid", "published"]).default("draft"),
				language: z.string().default("en"),
			}),
		)
		.mutation(async ({ input }) => {
			const [enrichment] = await db
				.insert(productEnrichment)
				.values({
					productId: input.productId,
					content: input.content as unknown,
					status: input.status,
					language: input.language,
				})
				.returning();

			return enrichment;
		}),

	update: publicProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				content: contentSchema.optional(),
				status: z.enum(["draft", "valid", "invalid", "published"]).optional(),
				language: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const { id, ...updates } = input;

			const [enrichment] = await db
				.update(productEnrichment)
				.set({
					...updates,
					content: updates.content as unknown,
					updatedAt: new Date(),
				})
				.where(eq(productEnrichment.id, id))
				.returning();

			if (!enrichment) {
				throw new Error("Product enrichment not found");
			}

			return enrichment;
		}),

	delete: publicProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ input }) => {
			const [enrichment] = await db
				.delete(productEnrichment)
				.where(eq(productEnrichment.id, input.id))
				.returning();

			if (!enrichment) {
				throw new Error("Product enrichment not found");
			}

			return { success: true };
		}),
});
