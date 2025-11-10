import { and, asc, desc, eq, like } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index";
import { attributeDefinition } from "../db/schema/tables/attribute_definition";
import { publicProcedure, router } from "../lib/trpc";

export const attributeDefinitionRouter = router({
	list: publicProcedure
		.input(
			z.object({
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(100).default(50),
				search: z.string().optional(),
				dataType: z.enum(["string", "number", "boolean", "date", "enum"]).optional(),
			}),
		)
		.query(async ({ input }) => {
			const { page, limit, search, dataType } = input;
			const offset = (page - 1) * limit;

			const whereClauses = [];
			if (search) {
				whereClauses.push(
					or(
						like(attributeDefinition.key, `%${search}%`),
						like(attributeDefinition.name, `%${search}%`),
					),
				);
			}
			if (dataType) {
				whereClauses.push(eq(attributeDefinition.dataType, dataType));
			}

			const whereExpr =
				whereClauses.length > 0 ? and(...whereClauses) : undefined;

			const definitions = await db
				.select()
				.from(attributeDefinition)
				.where(whereExpr)
				.orderBy(asc(attributeDefinition.name))
				.limit(limit)
				.offset(offset);

			const total = await db
				.select({ count: attributeDefinition.id })
				.from(attributeDefinition)
				.where(whereExpr);

			return {
				definitions,
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
			const [definition] = await db
				.select()
				.from(attributeDefinition)
				.where(eq(attributeDefinition.id, input.id))
				.limit(1);

			if (!definition) {
				throw new Error("Attribute definition not found");
			}

			return definition;
		}),

	getByKey: publicProcedure
		.input(z.object({ key: z.string() }))
		.query(async ({ input }) => {
			const [definition] = await db
				.select()
				.from(attributeDefinition)
				.where(eq(attributeDefinition.key, input.key))
				.limit(1);

			return definition;
		}),

	create: publicProcedure
		.input(
			z.object({
				key: z.string().min(1),
				name: z.string().min(1),
				dataType: z.enum(["string", "number", "boolean", "date", "enum"]),
				unit: z.string().optional(),
				defaultValue: z.string().optional(),
				enumValues: z.array(z.string()).optional(),
				description: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const { enumValues, ...rest } = input;
			const [definition] = await db
				.insert(attributeDefinition)
				.values({
					...rest,
					enumValues: enumValues ? JSON.stringify(enumValues) : undefined,
				})
				.returning();

			return definition;
		}),

	update: publicProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				key: z.string().min(1).optional(),
				name: z.string().min(1).optional(),
				dataType: z.enum(["string", "number", "boolean", "date", "enum"]).optional(),
				unit: z.string().optional(),
				defaultValue: z.string().optional(),
				enumValues: z.array(z.string()).optional(),
				description: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const { id, enumValues, ...updates } = input;

			const [definition] = await db
				.update(attributeDefinition)
				.set({
					...updates,
					enumValues: enumValues ? JSON.stringify(enumValues) : undefined,
					updatedAt: new Date(),
				})
				.where(eq(attributeDefinition.id, id))
				.returning();

			if (!definition) {
				throw new Error("Attribute definition not found");
			}

			return definition;
		}),

	delete: publicProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ input }) => {
			const [definition] = await db
				.delete(attributeDefinition)
				.where(eq(attributeDefinition.id, input.id))
				.returning();

			if (!definition) {
				throw new Error("Attribute definition not found");
			}

			return { success: true };
		}),
});
