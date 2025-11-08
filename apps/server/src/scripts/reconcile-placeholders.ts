import "dotenv/config";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index";
import { externalRef } from "../db/schema/tables/external_ref";
import { product } from "../db/schema/tables/product";
import { productVariant } from "../db/schema/tables/product_variant";

async function getCanonicalProductIdForSourceProduct(sourceProductId: string) {
	const found = await db
		.select({ id: externalRef.internalId })
		.from(externalRef)
		.where(
			and(
				eq(externalRef.provider, "nyehandel"),
				eq(
					externalRef.storeIdentifier,
					process.env.NYE_IDENTIFIER || "default",
				),
				eq(externalRef.externalType, "product"),
				eq(externalRef.externalId, sourceProductId),
			),
		)
		.limit(1);
	return found[0]?.id;
}

async function findPlaceholderProducts(): Promise<string[]> {
	// Heuristic: placeholders have names starting with 'Imported ' and are not referenced by external_ref as canonical
	const rows = await db.execute(sql`select p.id
			from product p
			left join external_ref er on er.internal_id = p.id and er.internal_table = 'product'
			where p.name like 'Imported %' and er.id is null`);
	return (rows as unknown as { rows: Array<{ id: string }> }).rows.map(
		(r) => r.id,
	);
}

async function moveVariantsToCanonical() {
	// We need a mapping from SKU -> source product_id to know the correct canonical
	const root =
		"/Users/danadalis/PeyyaDotDev/b2b-commerce/mc-parts/data/nyehandel";
	const exportPath = `${root}/full-export-2025-09-15T19-18-57-164Z/all-variants.json`;
	const fs = await import("node:fs/promises");
	const raw = await fs.readFile(exportPath, "utf8");
	const all = JSON.parse(raw) as Array<{ sku: string; product_id: number }>;
	const skuToProductId = new Map<string, number>();
	for (const v of all) skuToProductId.set(String(v.sku), v.product_id);

	// Load all variants currently attached to placeholder products
	const placeholderIds = await findPlaceholderProducts();
	if (placeholderIds.length === 0) return { moved: 0, deletedProducts: 0 };
	const variants = await db
		.select({
			id: productVariant.id,
			sku: productVariant.sku,
			productId: productVariant.productId,
		})
		.from(productVariant)
		.where(inArray(productVariant.productId, placeholderIds));

	let moved = 0;
	for (const v of variants) {
		const sourcePid = skuToProductId.get(String(v.sku));
		if (!sourcePid) continue;
		const canonicalId = await getCanonicalProductIdForSourceProduct(
			String(sourcePid),
		);
		if (!canonicalId || canonicalId === v.productId) continue;
		await db
			.update(productVariant)
			.set({ productId: canonicalId })
			.where(eq(productVariant.id, v.id));
		moved++;
	}

	// Delete placeholder products that now have zero variants
	const empty = await db.execute(sql`select p.id from product p
			left join product_variant pv on pv.product_id = p.id
			where p.id in (${sql.join(placeholderIds, sql`,`)})
			group by p.id having count(pv.id) = 0`);
	const emptyIds: string[] = (
		empty as unknown as { rows: Array<{ id: string }> }
	).rows.map((r) => r.id);
	if (emptyIds.length) {
		await db.delete(product).where(inArray(product.id, emptyIds));
	}
	return { moved, deletedProducts: emptyIds.length };
}

async function main() {
	const res = await moveVariantsToCanonical();
	console.log(JSON.stringify(res));
}

await main();
