import { z } from "zod";
import { db } from "../db/index";
import { brand } from "../db/schema/tables/brand";
import { brandAlias } from "../db/schema/tables/brand_alias";
import { product } from "../db/schema/tables/product";
import { eq, like, or } from "drizzle-orm";
import { publicProcedure, router } from "../lib/trpc";

/**
 * Match brand name against aliases and return the canonical brand
 */
export async function matchBrandName(brandName: string): Promise<{
	brandId: string | null;
	brandName: string | null;
	confidence: "high" | "medium" | "low";
	matchType: "exact" | "alias" | "fuzzy" | "none";
}> {
	// Normalize input
	const normalized = brandName.trim().toLowerCase();

	// Try exact match on brand name
	const [exactBrand] = await db
		.select()
		.from(brand)
		.where(eq(brand.name, brandName))
		.limit(1);

	if (exactBrand) {
		return {
			brandId: exactBrand.id,
			brandName: exactBrand.name,
			confidence: "high",
			matchType: "exact",
		};
	}

	// Try case-insensitive match
	const [caseInsensitiveBrand] = await db
		.select()
		.from(brand)
		.where(like(brand.name, normalized))
		.limit(1);

	if (caseInsensitiveBrand) {
		return {
			brandId: caseInsensitiveBrand.id,
			brandName: caseInsensitiveBrand.name,
			confidence: "high",
			matchType: "exact",
		};
	}

	// Try alias match (exact)
	const aliases = await db
		.select({
			brandId: brandAlias.brandId,
			brandName: brand.name,
			alias: brandAlias.alias,
			priority: brandAlias.priority,
			status: brandAlias.status,
		})
		.from(brandAlias)
		.leftJoin(brand, eq(brandAlias.brandId, brand.id))
		.where(eq(brandAlias.alias, brandName));

	if (aliases.length > 0) {
		// Sort by priority and status (approved > reviewed > auto > manual)
		const sorted = aliases.sort((a, b) => {
			const statusOrder: Record<string, number> = {
				approved: 4,
				reviewed: 3,
				auto: 2,
				manual: 1,
			};
			const statusDiff =
				(statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
			if (statusDiff !== 0) return statusDiff;
			return Number.parseInt(b.priority || "0") - Number.parseInt(a.priority || "0");
		});

		return {
			brandId: sorted[0].brandId,
			brandName: sorted[0].brandName,
			confidence: sorted[0].status === "approved" ? "high" : "medium",
			matchType: "alias",
		};
	}

	// Try fuzzy alias match (case-insensitive)
	const fuzzyAliases = await db
		.select({
			brandId: brandAlias.brandId,
			brandName: brand.name,
			alias: brandAlias.alias,
			priority: brandAlias.priority,
			status: brandAlias.status,
		})
		.from(brandAlias)
		.leftJoin(brand, eq(brandAlias.brandId, brand.id))
		.where(like(brandAlias.alias, `%${normalized}%`));

	if (fuzzyAliases.length > 0) {
		const sorted = fuzzyAliases.sort((a, b) => {
			const statusOrder: Record<string, number> = {
				approved: 4,
				reviewed: 3,
				auto: 2,
				manual: 1,
			};
			const statusDiff =
				(statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
			if (statusDiff !== 0) return statusDiff;
			return Number.parseInt(b.priority || "0") - Number.parseInt(a.priority || "0");
		});

		return {
			brandId: sorted[0].brandId,
			brandName: sorted[0].brandName,
			confidence: "low",
			matchType: "fuzzy",
		};
	}

	return {
		brandId: null,
		brandName: null,
		confidence: "low",
		matchType: "none",
	};
}

export const brandNormalizationRouter = router({
	matchBrand: publicProcedure
		.input(z.object({ brandName: z.string() }))
		.query(async ({ input }) => {
			return await matchBrandName(input.brandName);
		}),

	// Get products with potential brand mismatches
	getFlaggedProducts: publicProcedure
		.input(
			z.object({
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(100).default(50),
			}),
		)
		.query(async ({ input }) => {
			const { page, limit } = input;
			const offset = (page - 1) * limit;

			// Get all products
			const products = await db
				.select({
					id: product.id,
					name: product.name,
					brandId: product.brandId,
					brandName: brand.name,
				})
				.from(product)
				.leftJoin(brand, eq(product.brandId, brand.id))
				.limit(limit)
				.offset(offset);

			// Check each product for potential mismatches
			const flagged = [];
			for (const p of products) {
				if (!p.brandName) continue;
				const match = await matchBrandName(p.name);
				if (
					match.brandId &&
					match.brandId !== p.brandId &&
					match.confidence !== "low"
				) {
					flagged.push({
						product: p,
						suggestedBrand: {
							id: match.brandId,
							name: match.brandName,
						},
						confidence: match.confidence,
						matchType: match.matchType,
					});
				}
			}

			return {
				flagged,
				pagination: {
					page,
					limit,
					total: flagged.length,
					totalPages: Math.ceil(flagged.length / limit) || 1,
					hasNextPage: page < Math.ceil(flagged.length / limit),
					hasPrevPage: page > 1,
				},
			};
		}),
});
