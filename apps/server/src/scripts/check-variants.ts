import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db/index";
import { productVariant } from "../db/schema/tables/product_variant";

async function main() {
	const skus = (process.argv[2] || "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	const total = await db.$count(productVariant);
	console.log(`Total variants: ${total}`);
	if (skus.length) {
		const rows = await db
			.select({ sku: productVariant.sku })
			.from(productVariant)
			.where(inArray(productVariant.sku, skus));
		const present = new Set(rows.map((r) => r.sku));
		const missing = skus.filter((s) => !present.has(s));
		console.log(
			JSON.stringify({ present: Array.from(present), missing }, null, 2),
		);
	}
}

await main();
