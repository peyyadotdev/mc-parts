import { and, asc, desc, eq, like } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index";
import { attributeTemplate } from "../db/schema/tables/attribute_template";
import { category } from "../db/schema/tables/category";
import { publicProcedure, router } from "../lib/trpc";

export const attributeTemplateRouter = router({
	list: publicProcedure
		.input(
			z.object({
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(100).default(50),
				search: z.string().optional(),
				categoryId: z.string().uuid().optional(),
				isActive: z.boolean().optional(),
			}),
		)
		.query(async ({ input }) => {
			const { page, limit, search, categoryId, isActive } = input;
			const offset = (page - 1) * limit;

			const whereClauses = [];
			if (search) {
				whereClauses.push(like(attributeTemplate.name, `%${search}%`));
			}
			if (categoryId) {
				whereClauses.push(eq(attributeTemplate.categoryId, categoryId));
			}
			if (isActive !== undefined) {
				whereClauses.push(
					eq(attributeTemplate.isActive, isActive ? "true" : "false"),
				);
			}

			const whereExpr =
				whereClauses.length > 0 ? and(...whereClauses) : undefined;

			const templates = await db
				.select({
					id: attributeTemplate.id,
					name: attributeTemplate.name,
					description: attributeTemplate.description,
					categoryId: attributeTemplate.categoryId,
					categoryName: category.name,
					requiredAttributeIds: attributeTemplate.requiredAttributeIds,
					optionalAttributeIds: attributeTemplate.optionalAttributeIds,
					isActive: attributeTemplate.isActive,
					createdAt: attributeTemplate.createdAt,
					updatedAt: attributeTemplate.updatedAt,
				})
				.from(attributeTemplate)
				.leftJoin(category, eq(attributeTemplate.categoryId, category.id))
				.where(whereExpr)
				.orderBy(desc(attributeTemplate.updatedAt))
				.limit(limit)
				.offset(offset);

			const total = await db
				.select({ count: attributeTemplate.id })
				.from(attributeTemplate)
				.where(whereExpr);

			return {
				templates,
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
			const [template] = await db
				.select()
				.from(attributeTemplate)
				.where(eq(attributeTemplate.id, input.id))
				.limit(1);

			if (!template) {
				throw new Error("Attribute template not found");
			}

			return template;
		}),

	create: publicProcedure
		.input(
			z.object({
				name: z.string().min(1),
				description: z.string().optional(),
				categoryId: z.string().uuid().optional(),
				requiredAttributeIds: z.array(z.string().uuid()),
				optionalAttributeIds: z.array(z.string().uuid()).optional(),
				isActive: z.boolean().default(true),
			}),
		)
		.mutation(async ({ input }) => {
			const { requiredAttributeIds, optionalAttributeIds, isActive, ...rest } =
				input;
			const [template] = await db
				.insert(attributeTemplate)
				.values({
					...rest,
					requiredAttributeIds: JSON.stringify(requiredAttributeIds),
					optionalAttributeIds: optionalAttributeIds
						? JSON.stringify(optionalAttributeIds)
						: undefined,
					isActive: isActive ? "true" : "false",
				})
				.returning();

			return template;
		}),

	update: publicProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				name: z.string().min(1).optional(),
				description: z.string().optional(),
				categoryId: z.string().uuid().optional(),
				requiredAttributeIds: z.array(z.string().uuid()).optional(),
				optionalAttributeIds: z.array(z.string().uuid()).optional(),
				isActive: z.boolean().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const {
				id,
				requiredAttributeIds,
				optionalAttributeIds,
				isActive,
				...updates
			} = input;

			const updateData: Record<string, unknown> = {
				...updates,
				updatedAt: new Date(),
			};

			if (requiredAttributeIds !== undefined) {
				updateData.requiredAttributeIds = JSON.stringify(requiredAttributeIds);
			}
			if (optionalAttributeIds !== undefined) {
				updateData.optionalAttributeIds = JSON.stringify(optionalAttributeIds);
			}
			if (isActive !== undefined) {
				updateData.isActive = isActive ? "true" : "false";
			}

			const [template] = await db
				.update(attributeTemplate)
				.set(updateData)
				.where(eq(attributeTemplate.id, id))
				.returning();

			if (!template) {
				throw new Error("Attribute template not found");
			}

			return template;
		}),

	delete: publicProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ input }) => {
			const [template] = await db
				.delete(attributeTemplate)
				.where(eq(attributeTemplate.id, input.id))
				.returning();

			if (!template) {
				throw new Error("Attribute template not found");
			}

			return { success: true };
		}),
});
