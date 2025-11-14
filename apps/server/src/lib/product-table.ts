import {
	and,
	asc,
	desc,
	eq,
	gt,
	gte,
	inArray,
	isNotNull,
	lt,
	lte,
	type SQL,
	sql,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { brand } from "@/db/schema/tables/brand";
import { category } from "@/db/schema/tables/category";
import { product } from "@/db/schema/tables/product";
import { productCategory } from "@/db/schema/tables/product_category";
import { productFitment } from "@/db/schema/tables/product_fitment";
import { productVariant } from "@/db/schema/tables/product_variant";

const sortFields = ["updatedAt", "createdAt", "name"] as const;
const sortDirections = ["asc", "desc"] as const;

export const productTableSearchSchema = z.object({
	status: z.array(z.string()).optional(),
	brand: z.array(z.string()).optional(),
	category: z.array(z.string()).optional(),
	updatedFrom: z.date().optional(),
	updatedTo: z.date().optional(),
	cursor: z.date().default(() => new Date()),
	direction: z.enum(["next", "prev"]).default("next"),
	size: z.number().int().min(1).max(100).default(40),
	sortBy: z.enum(sortFields).default("updatedAt"),
	sortDir: z.enum(sortDirections).default("desc"),
});

export type ProductTableSearch = z.infer<typeof productTableSearchSchema>;

export type ProductTableRow = {
	uuid: string;
	productId: string;
	name: string;
	sku: string | null;
	status: string;
	brand: string | null;
	category: string | null;
	price: number | null;
	currency: string | null;
	variantCount: number;
	fitmentCount: number;
	createdAt: Date;
	updatedAt: Date;
	date: Date;
	enrichmentState: "missing_attributes" | "machine_generated" | "verified";
	level: "success" | "warning" | "error";
};

export type FacetMetadata = {
	rows: { value: string; total: number }[];
	total: number;
	min?: number;
	max?: number;
};

export type ProductTableResponse = {
	data: ProductTableRow[];
	meta: {
		totalRowCount: number;
		filterRowCount: number;
		chartData: Array<{
			timestamp: number;
			success: number;
			warning: number;
			error: number;
		}>;
		facets: Record<string, FacetMetadata>;
	};
	prevCursor: number | null;
	nextCursor: number | null;
};

export async function fetchProductTable(
	params: ProductTableSearch,
): Promise<ProductTableResponse> {
	const limit = params.size;
	const whereWithCursor = buildWhere(params, true);
	const whereWithoutCursor = buildWhere(params, false);

	const orderByExpr = buildOrderBy(params);

	const rows = await db
		.select({
			productId: product.id,
			name: product.name,
			status: product.status,
			createdAt: product.createdAt,
			updatedAt: product.updatedAt,
			brand: brand.name,
			sku: sql<string | null>`min(${productVariant.sku})`,
			priceCents: sql<number | null>`min(${productVariant.priceCents})`,
			currency: sql<string | null>`max(${productVariant.currency})`,
			variantCount: sql<number>`count(distinct ${productVariant.id})::int`,
			fitmentCount: sql<number>`count(distinct ${productFitment.vehicleModelId})::int`,
			categories: sql<
				string[] | null
			>`array_remove(array_agg(distinct ${category.name}), NULL)`,
			attributes: sql<string>`coalesce(json_agg(${productVariant.attributes}), '[]'::json)`,
		})
		.from(product)
		.leftJoin(brand, eq(product.brandId, brand.id))
		.leftJoin(productVariant, eq(productVariant.productId, product.id))
		.leftJoin(productFitment, eq(productFitment.variantId, productVariant.id))
		.leftJoin(productCategory, eq(productCategory.productId, product.id))
		.leftJoin(category, eq(category.id, productCategory.categoryId))
		.where(whereWithCursor)
		.groupBy(product.id, brand.name)
		.orderBy(orderByExpr)
		.limit(limit + 1);

	const hasNext = rows.length > limit;
	const trimmed = hasNext ? rows.slice(0, limit) : rows;

	const mapped = trimmed.map((row) => {
		const price =
			typeof row.priceCents === "number" ? row.priceCents / 100 : null;
		const categoryName = row.categories?.[0] ?? null;
		const enrichmentState = deriveEnrichmentState(row.attributes);
		return {
			uuid: row.productId,
			productId: row.productId,
			name: row.name,
			sku: row.sku,
			status: row.status,
			brand: row.brand ?? null,
			category: categoryName,
			price,
			currency: row.currency,
			variantCount: Number(row.variantCount),
			fitmentCount: Number(row.fitmentCount),
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			date: row.updatedAt,
			enrichmentState,
			level: mapStatusToLevel(row.status),
		};
	});

	const nextCursor = hasNext
		? (trimmed[trimmed.length - 1]?.updatedAt?.getTime() ?? null)
		: null;

	const filterRowCount = await countFilteredRows(whereWithoutCursor);
	const totalRowCount = await countFilteredRows(undefined);
	const chartData = await buildChartData(whereWithoutCursor);
	const facets = await buildFacets(whereWithoutCursor);

	return {
		data: mapped,
		meta: {
			totalRowCount,
			filterRowCount,
			chartData,
			facets,
		},
		prevCursor: null,
		nextCursor,
	};
}

function buildWhere(params: ProductTableSearch, includeCursor: boolean) {
	const clauses: SQL[] = [];
	if (params.status?.length) {
		clauses.push(inArray(product.status, params.status));
	}
	if (params.brand?.length) {
		clauses.push(inArray(brand.name, params.brand));
	}
	if (params.category?.length) {
		clauses.push(inArray(category.name, params.category));
	}
	if (params.updatedFrom) {
		clauses.push(gte(product.updatedAt, params.updatedFrom));
	}
	if (params.updatedTo) {
		clauses.push(lte(product.updatedAt, params.updatedTo));
	}
	if (includeCursor && params.cursor) {
		if (params.direction === "prev") {
			clauses.push(gt(product.updatedAt, params.cursor));
		} else {
			clauses.push(lt(product.updatedAt, params.cursor));
		}
	}
	return clauses.length ? and(...clauses) : undefined;
}

function buildOrderBy(params: ProductTableSearch) {
	let column = product.updatedAt;
	switch (params.sortBy) {
		case "name":
			column = product.name;
			break;
		case "createdAt":
			column = product.createdAt;
			break;
		case "updatedAt":
		default:
			column = product.updatedAt;
	}
	return params.sortDir === "asc" ? asc(column) : desc(column);
}

async function countFilteredRows(where?: SQL) {
	const result = await db
		.select({ count: sql<number>`count(distinct ${product.id})::int` })
		.from(product)
		.leftJoin(brand, eq(product.brandId, brand.id))
		.leftJoin(productCategory, eq(productCategory.productId, product.id))
		.leftJoin(category, eq(category.id, productCategory.categoryId))
		.where(where);
	return result[0]?.count ?? 0;
}

async function buildChartData(where?: SQL) {
	const rows = await db
		.select({
			bucket: sql<Date>`date_trunc('day', ${product.updatedAt})`,
			status: product.status,
			total: sql<number>`count(*)::int`,
		})
		.from(product)
		.leftJoin(brand, eq(product.brandId, brand.id))
		.leftJoin(productCategory, eq(productCategory.productId, product.id))
		.leftJoin(category, eq(category.id, productCategory.categoryId))
		.where(where)
		.groupBy(sql`date_trunc('day', ${product.updatedAt})`, product.status)
		.orderBy(desc(sql`date_trunc('day', ${product.updatedAt})`))
		.limit(30);

	const map = new Map<
		number,
		{ success: number; warning: number; error: number }
	>();
	for (const row of rows) {
		const ts = row.bucket.getTime();
		const level = mapStatusToLevel(row.status);
		const entry = map.get(ts) ?? { success: 0, warning: 0, error: 0 };
		entry[level] += row.total;
		map.set(ts, entry);
	}
	return Array.from(map.entries())
		.sort((a, b) => a[0] - b[0])
		.map(([timestamp, counts]) => ({ timestamp, ...counts }));
}

async function buildFacets(where?: SQL) {
	const [statusRows, brandRows, categoryRows] = await Promise.all([
		buildStatusFacet(where),
		buildBrandFacet(where),
		buildCategoryFacet(where),
	]);

	return {
		status: {
			rows: statusRows,
			total: statusRows.reduce((acc, row) => acc + row.total, 0),
		},
		brand: {
			rows: brandRows,
			total: brandRows.reduce((acc, row) => acc + row.total, 0),
		},
		category: {
			rows: categoryRows,
			total: categoryRows.reduce((acc, row) => acc + row.total, 0),
		},
	};
}

async function buildStatusFacet(where?: SQL) {
	const rows = await db
		.select({
			value: product.status,
			total: sql<number>`count(distinct ${product.id})::int`,
		})
		.from(product)
		.leftJoin(brand, eq(product.brandId, brand.id))
		.leftJoin(productCategory, eq(productCategory.productId, product.id))
		.leftJoin(category, eq(category.id, productCategory.categoryId))
		.where(where)
		.groupBy(product.status);
	return rows.filter((row) => !!row.value);
}

async function buildBrandFacet(where?: SQL) {
	const rows = await db
		.select({
			value: brand.name,
			total: sql<number>`count(distinct ${product.id})::int`,
		})
		.from(product)
		.leftJoin(brand, eq(product.brandId, brand.id))
		.leftJoin(productCategory, eq(productCategory.productId, product.id))
		.leftJoin(category, eq(category.id, productCategory.categoryId))
		.where(where)
		.groupBy(brand.name)
		.orderBy(desc(sql`count(distinct ${product.id})`))
		.limit(30);
	return rows.filter((row) => !!row.value);
}

async function buildCategoryFacet(where?: SQL) {
	const categoryClauses: SQL[] = [];
	if (where) categoryClauses.push(where);
	categoryClauses.push(isNotNull(category.name));
	const categoryWhere = categoryClauses.length
		? and(...categoryClauses)
		: undefined;
	const rows = await db
		.select({
			value: category.name,
			total: sql<number>`count(distinct ${product.id})::int`,
		})
		.from(product)
		.leftJoin(productCategory, eq(productCategory.productId, product.id))
		.leftJoin(category, eq(category.id, productCategory.categoryId))
		.where(categoryWhere)
		.groupBy(category.name)
		.orderBy(desc(sql`count(distinct ${product.id})`))
		.limit(30);
	return rows.filter((row) => !!row.value);
}

export function deriveEnrichmentState(raw: string) {
	try {
		const parsed = JSON.parse(raw) as Array<Record<string, any>>;
		const attributeEntries = parsed
			.filter(Boolean)
			.flatMap((variant) => Object.values(variant ?? {}));
		if (!attributeEntries.length) {
			return "missing_attributes" as const;
		}
		const hasManual = attributeEntries.some(
			(attr) => attr?.source === "manual",
		);
		return hasManual ? ("verified" as const) : ("machine_generated" as const);
	} catch {
		return "missing_attributes" as const;
	}
}

export function mapStatusToLevel(
	status: string | null | undefined,
): "success" | "warning" | "error" {
	if (status === "active") return "success";
	if (status === "inactive") return "warning";
	return "error";
}
