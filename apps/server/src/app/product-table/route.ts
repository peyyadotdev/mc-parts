import { fetchProductTable, productTableSearchSchema } from "@/lib/product-table";
import { NextRequest, NextResponse } from "next/server";

function parseList(param: string | null) {
	if (!param) return undefined;
	const items = param
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
	return items.length ? items : undefined;
}

function parseTimestamp(param: string | null) {
	if (!param) return undefined;
	const value = Number(param);
	if (Number.isNaN(value)) return undefined;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(req: NextRequest) {
	const { searchParams } = req.nextUrl;
	const status = parseList(searchParams.get("status"));
	const brand = parseList(searchParams.get("brand"));
	const category = parseList(searchParams.get("category"));
	const updatedFrom = parseTimestamp(searchParams.get("updatedFrom"));
	const updatedTo = parseTimestamp(searchParams.get("updatedTo"));
	const cursor = parseTimestamp(searchParams.get("cursor"));
	const directionParam = searchParams.get("direction") ?? undefined;
	const sortByParam = searchParams.get("sortBy") ?? undefined;
	const sortDirParam = searchParams.get("sortDir") ?? undefined;
	const sizeParam = searchParams.get("size");
	const parsed = productTableSearchSchema.parse({
		status,
		brand,
		category,
		updatedFrom,
		updatedTo,
		cursor,
		direction: directionParam,
		size: sizeParam ? Number(sizeParam) : undefined,
		sortBy: sortByParam,
		sortDir: sortDirParam,
	});

	const result = await fetchProductTable(parsed);
	return NextResponse.json({
		...result,
		data: result.data.map((row) => ({
			...row,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
			date: row.date.toISOString(),
		})),
	});
}
