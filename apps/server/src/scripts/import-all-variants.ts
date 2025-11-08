import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index";
import { externalRef } from "../db/schema/tables/external_ref";
import { product } from "../db/schema/tables/product";
import { productVariant } from "../db/schema/tables/product_variant";

type ExportVariant = {
	id: number;
	product_id: number;
	sku: string;
	gtin?: string | null;
	price?: number | null;
	stock?: string | number | null;
	weight?: number | null;
	product_name?: string | null;
};

async function latestDir(root: string, prefix: string) {
	const items = await readdir(root, { withFileTypes: true });
	const dirs = items
		.filter((d) => d.isDirectory() && d.name.startsWith(prefix))
		.map((d) => d.name)
		.sort();
	if (!dirs.length) throw new Error(`No ${prefix} directory under ${root}`);
	const latest = dirs.at(-1);
	if (!latest)
		throw new Error(`No directories under ${root} with prefix ${prefix}`);
	return join(root, latest);
}

function parseStock(stock: unknown): number | undefined {
	if (typeof stock === "number") return stock;
	if (typeof stock === "string") {
		const n = Number.parseInt(stock, 10);
		return Number.isFinite(n) ? n : undefined;
	}
	return undefined;
}

const PROVIDER = "nyehandel";
const STORE_IDENTIFIER = process.env.NYE_IDENTIFIER || "default";

async function ensureCanonicalProductForSourceProductId(
	sourceProductId: number,
	nameHint?: string | null,
) {
	// Try to find existing external_ref mapping
	const found = await db
		.select({ internalId: externalRef.internalId })
		.from(externalRef)
		.where(
			and(
				eq(externalRef.provider, PROVIDER),
				eq(externalRef.storeIdentifier, STORE_IDENTIFIER),
				eq(externalRef.externalType, "product"),
				eq(externalRef.externalId, String(sourceProductId)),
			),
		)
		.limit(1);
	if (found[0]) return found[0].internalId;

	// Create product
	const [p] = await db
		.insert(product)
		.values({
			name: nameHint || `Imported product ${sourceProductId}`,
			status: "active",
		})
		.returning({ id: product.id });

	// Record mapping (idempotent)
	await db
		.insert(externalRef)
		.values({
			provider: PROVIDER,
			storeIdentifier: STORE_IDENTIFIER,
			externalType: "product",
			externalId: String(sourceProductId),
			internalTable: "product",
			internalId: p.id,
		})
		.onConflictDoNothing();

	return p.id;
}

async function upsertVariantUnderProduct(
	variant: ExportVariant,
	canonicalProductId: string,
) {
	const sku = String(variant.sku);
	// Try find existing by SKU
	const existing = await db
		.select({ id: productVariant.id, productId: productVariant.productId })
		.from(productVariant)
		.where(eq(productVariant.sku, sku))
		.limit(1);
	const gtin =
		variant.gtin && variant.gtin.trim().length > 0 ? variant.gtin : undefined;
	const stockQty = parseStock(variant.stock);
	const priceCents =
		typeof variant.price === "number" ? variant.price : undefined;
	const weightGrams = variant.weight ?? undefined;

	if (!existing[0]) {
		// Insert new variant; handle possible GTIN uniqueness by retrying without GTIN
		try {
			await db
				.insert(productVariant)
				.values({
					productId: canonicalProductId,
					sku,
					gtin,
					priceCents,
					stockQty,
					weightGrams,
				})
				.onConflictDoNothing({ target: productVariant.sku });
		} catch (e: unknown) {
			// Fallback: retry without GTIN regardless of error classification to ensure idempotency
			try {
				await db
					.insert(productVariant)
					.values({
						productId: canonicalProductId,
						sku,
						priceCents,
						stockQty,
						weightGrams,
					})
					.onConflictDoNothing({ target: productVariant.sku });
			} catch {
				throw e;
			}
		}
		return { action: "inserted" as const };
	}

	// If exists but attached to another product, move it safely
	if (existing[0].productId !== canonicalProductId) {
		await db
			.update(productVariant)
			.set({ productId: canonicalProductId })
			.where(eq(productVariant.id, existing[0].id));
	}
	// Optionally refresh fields
	await db
		.update(productVariant)
		.set({ gtin, priceCents, stockQty, weightGrams })
		.where(eq(productVariant.sku, sku));
	return { action: "updated" as const };
}

async function main() {
	const root =
		"/Users/danadalis/PeyyaDotDev/b2b-commerce/mc-parts/data/nyehandel";
	const exportDir = await latestDir(root, "full-export-");
	const variantsPath = join(exportDir, "all-variants.json");
	const raw = await readFile(variantsPath, "utf8");
	const variants: ExportVariant[] = JSON.parse(raw);

	// Index by product_id for grouping (and for logging)
	const byProductId = new Map<number, ExportVariant[]>();
	for (const v of variants) {
		const pid = v.product_id;
		const existing = byProductId.get(pid);
		if (existing) existing.push(v);
		else byProductId.set(pid, [v]);
	}

	let insertedVariants = 0;
	let updatedVariants = 0;
	let processedProducts = 0;

	for (const [pid, groupRaw] of byProductId) {
		const group = groupRaw ?? [];
		const nameHint = group[0]?.product_name ?? null;
		const canonicalId = await ensureCanonicalProductForSourceProductId(
			pid,
			nameHint,
		);
		if (group[0]?.product_name && nameHint) {
			// If product is newly created, bump the counter (best-effort: check existence via external_ref again)
			// We won't add an extra read; just approximate via updated count from external_ref would require extra query.
		}
		for (const v of group) {
			const res = await upsertVariantUnderProduct(v, canonicalId);
			if (res.action === "inserted") insertedVariants++;
			else updatedVariants++;
		}
		processedProducts++;
		if (processedProducts % 250 === 0) {
			console.log(
				JSON.stringify({
					processedProducts,
					insertedVariants,
					updatedVariants,
				}),
			);
		}
	}

	console.log(
		JSON.stringify({ processedProducts, insertedVariants, updatedVariants }),
	);
}

await main();
