import "dotenv/config";
import { readFile } from "node:fs/promises";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db/index";
import { product } from "../db/schema/tables/product";
import { productVariant } from "../db/schema/tables/product_variant";

interface ExportVariant {
	id: number;
	product_id: number;
	sku: string;
	gtin: string | null;
	price: number | null;
	stock: string | number | null;
	weight: number | null;
	product_name: string | null;
}

async function main() {
	const exportPath = process.argv[2];
	const skusCsv = process.argv[3] || "";
	if (!exportPath || !skusCsv) {
		console.error(
			"Usage: bun src/scripts/upsert-variants-minimal.ts <all-variants.json> <sku1,sku2,...>",
		);
		process.exit(1);
	}
	const targetSkus = skusCsv
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	const raw = await readFile(exportPath, "utf8");
	const all: ExportVariant[] = JSON.parse(raw);
	const selected = all.filter((v) => targetSkus.includes(String(v.sku)));
	const existing = await db
		.select({ sku: productVariant.sku })
		.from(productVariant)
		.where(inArray(productVariant.sku, targetSkus));
	const existingSet = new Set(existing.map((r) => r.sku));
	let inserted = 0;
	for (const v of selected) {
		if (existingSet.has(v.sku)) continue;
		const [p] = await db
			.insert(product)
			.values({ name: v.product_name || `Imported ${v.sku}`, status: "active" })
			.returning({ id: product.id });
		const gtin = v.gtin && v.gtin.trim().length > 0 ? v.gtin : undefined;
		const stockQty =
			typeof v.stock === "string"
				? Number.parseInt(v.stock)
				: typeof v.stock === "number"
					? v.stock
					: undefined;
		await db.insert(productVariant).values({
			productId: p.id,
			sku: v.sku,
			gtin,
			priceCents: typeof v.price === "number" ? v.price : undefined,
			stockQty,
			weightGrams: v.weight ?? undefined,
		});
		inserted++;
	}
	console.log(
		JSON.stringify(
			{ requested: targetSkus.length, matched: selected.length, inserted },
			null,
			2,
		),
	);
}

await main();
