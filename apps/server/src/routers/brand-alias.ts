import { and, asc, desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index";
import { brand } from "../db/schema/tables/brand";
import { brandAlias } from "../db/schema/tables/brand_alias";
import { publicProcedure, router } from "../lib/trpc";

export const brandAliasRouter = router({
	list: publicProcedure
		.input(
			z.object({
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(100).default(50),
				brandId: z.string().uuid().optional(),
				status: z.enum(["manual", "auto", "reviewed", "approved"]).optional(),
				search: z.string().optional(),
			}),
		)
		.query(async ({ input }) => {
			const { page, limit, brandId, status, search } = input;
			const offset = (page - 1) * limit;

			const whereClauses = [];
			if (brandId) {
				whereClauses.push(eq(brandAlias.brandId, brandId));
			}
			if (status) {
				whereClauses.push(eq(brandAlias.status, status));
			}
			if (search) {
				whereClauses.push(
					or(
						like(brandAlias.alias, `%${search}%`),
						like(brand.name, `%${search}%`),
					),
				);
			}

			const whereExpr =
				whereClauses.length > 0 ? and(...whereClauses) : undefined;

			const aliases = await db
				.select({
					id: brandAlias.id,
					brandId: brandAlias.brandId,
					brandName: brand.name,
					alias: brandAlias.alias,
					status: brandAlias.status,
					priority: brandAlias.priority,
					createdAt: brandAlias.createdAt,
					updatedAt: brandAlias.updatedAt,
				})
				.from(brandAlias)
				.leftJoin(brand, eq(brandAlias.brandId, brand.id))
				.where(whereExpr)
				.orderBy(desc(brandAlias.priority), asc(brandAlias.alias))
				.limit(limit)
				.offset(offset);

			const total = await db
				.select({ count: brandAlias.id })
				.from(brandAlias)
				.where(whereExpr);

			return {
				aliases,
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
			const [alias] = await db
				.select()
				.from(brandAlias)
				.where(eq(brandAlias.id, input.id))
				.limit(1);

			if (!alias) {
				throw new Error("Brand alias not found");
			}

			return alias;
		}),

	create: publicProcedure
		.input(
			z.object({
				brandId: z.string().uuid(),
				alias: z.string().min(1),
				status: z.enum(["manual", "auto", "reviewed", "approved"]).default("auto"),
				priority: z.string().default("0"),
			}),
		)
		.mutation(async ({ input }) => {
			const [alias] = await db.insert(brandAlias).values(input).returning();

			return alias;
		}),

	update: publicProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				brandId: z.string().uuid().optional(),
				alias: z.string().min(1).optional(),
				status: z.enum(["manual", "auto", "reviewed", "approved"]).optional(),
				priority: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const { id, ...updates } = input;

			const [alias] = await db
				.update(brandAlias)
				.set({
					...updates,
					updatedAt: new Date(),
				})
				.where(eq(brandAlias.id, id))
				.returning();

			if (!alias) {
				throw new Error("Brand alias not found");
			}

			return alias;
		}),

	delete: publicProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ input }) => {
			const [alias] = await db
				.delete(brandAlias)
				.where(eq(brandAlias.id, input.id))
				.returning();

			if (!alias) {
				throw new Error("Brand alias not found");
			}

			return { success: true };
		}),
});
