import { and, asc, desc, eq, like } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index";
import { brand } from "../db/schema/tables/brand";
import { brandMetadata } from "../db/schema/tables/brand_metadata";
import { publicProcedure, router } from "../lib/trpc";

export const brandMetadataRouter = router({
	list: publicProcedure
		.input(
			z.object({
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(100).default(50),
				brandId: z.string().uuid().optional(),
				search: z.string().optional(),
			}),
		)
		.query(async ({ input }) => {
			const { page, limit, brandId, search } = input;
			const offset = (page - 1) * limit;

			const whereClauses = [];
			if (brandId) {
				whereClauses.push(eq(brandMetadata.brandId, brandId));
			}
			if (search) {
				whereClauses.push(like(brand.name, `%${search}%`));
			}

			const whereExpr =
				whereClauses.length > 0 ? and(...whereClauses) : undefined;

			const metadata = await db
				.select({
					id: brandMetadata.id,
					brandId: brandMetadata.brandId,
					brandName: brand.name,
					logoUrl: brandMetadata.logoUrl,
					description: brandMetadata.description,
					websiteUrl: brandMetadata.websiteUrl,
					metadata: brandMetadata.metadata,
					createdAt: brandMetadata.createdAt,
					updatedAt: brandMetadata.updatedAt,
				})
				.from(brandMetadata)
				.leftJoin(brand, eq(brandMetadata.brandId, brand.id))
				.where(whereExpr)
				.orderBy(asc(brand.name))
				.limit(limit)
				.offset(offset);

			const total = await db
				.select({ count: brandMetadata.id })
				.from(brandMetadata)
				.where(whereExpr);

			return {
				metadata: metadata,
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
			const [meta] = await db
				.select()
				.from(brandMetadata)
				.where(eq(brandMetadata.id, input.id))
				.limit(1);

			if (!meta) {
				throw new Error("Brand metadata not found");
			}

			return meta;
		}),

	getByBrandId: publicProcedure
		.input(z.object({ brandId: z.string().uuid() }))
		.query(async ({ input }) => {
			const [meta] = await db
				.select()
				.from(brandMetadata)
				.where(eq(brandMetadata.brandId, input.brandId))
				.limit(1);

			return meta;
		}),

	create: publicProcedure
		.input(
			z.object({
				brandId: z.string().uuid(),
				logoUrl: z.string().url().optional(),
				description: z.string().optional(),
				websiteUrl: z.string().url().optional(),
				metadata: z.record(z.unknown()).optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const [meta] = await db
				.insert(brandMetadata)
				.values({
					...input,
					metadata: input.metadata as unknown,
				})
				.returning();

			return meta;
		}),

	update: publicProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				logoUrl: z.string().url().optional(),
				description: z.string().optional(),
				websiteUrl: z.string().url().optional(),
				metadata: z.record(z.unknown()).optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const { id, ...updates } = input;

			const [meta] = await db
				.update(brandMetadata)
				.set({
					...updates,
					metadata: updates.metadata as unknown,
					updatedAt: new Date(),
				})
				.where(eq(brandMetadata.id, id))
				.returning();

			if (!meta) {
				throw new Error("Brand metadata not found");
			}

			return meta;
		}),

	delete: publicProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ input }) => {
			const [meta] = await db
				.delete(brandMetadata)
				.where(eq(brandMetadata.id, input.id))
				.returning();

			if (!meta) {
				throw new Error("Brand metadata not found");
			}

			return { success: true };
		}),
});
