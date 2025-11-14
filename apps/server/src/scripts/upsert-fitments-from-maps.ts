import "dotenv/config";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/index";
import { externalRef } from "../db/schema/tables/external_ref";
import { product } from "../db/schema/tables/product";
import { productFitment } from "../db/schema/tables/product_fitment";
import { productVariant } from "../db/schema/tables/product_variant";
import { vehicleModel } from "../db/schema/tables/vehicle_model";

interface MapFile {
	make: string;
	model: string;
	mappings: Array<{ sku: string }>;
}
interface ExportVariant {
	id?: number;
	product_id?: number;
	sku: string;
	gtin?: string | null;
	price?: number | null;
	stock?: string | number | null;
	weight?: number | null;
	product_name?: string | null;
}

async function _exists(path: string) {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

async function latestDir(root: string, prefix: string) {
	const items = await readdir(root, { withFileTypes: true });
	const dirs = items
		.filter((d) => d.isDirectory() && d.name.startsWith(prefix))
		.map((d) => d.name)
		.sort();
	if (!dirs.length) throw new Error(`No ${prefix} directory under ${root}`);
	const latest = dirs.at(-1);
	if (!latest) throw new Error(`No ${prefix} directory under ${root}`);
	return join(root, latest);
}

async function loadExportIndex(exportDir: string) {
	const raw = await readFile(join(exportDir, "all-variants.json"), "utf8");
	const arr: ExportVariant[] = JSON.parse(raw);
	const bySku = new Map<string, ExportVariant>();
	for (const v of arr) bySku.set(String(v.sku), v);
	return bySku;
}

async function ensureVehicleModelId(make: string, modelName: string) {
	const found = await db
		.select({ id: vehicleModel.id })
		.from(vehicleModel)
		.where(and(eq(vehicleModel.make, make), eq(vehicleModel.model, modelName)))
		.limit(1);
	if (found[0]) return found[0].id;
	const ins = await db
		.insert(vehicleModel)
		.values({ make: make, model: modelName, type: "moped" })
		.returning({ id: vehicleModel.id });
	return ins[0].id;
}

const PROVIDER = "nyehandel";
const STORE_IDENTIFIER = process.env.NYE_IDENTIFIER || "default";

async function ensureCanonicalProductForSourceProductId(
	sourceProductId: number | undefined,
	nameHint?: string | null,
) {
	if (!sourceProductId && !nameHint) {
		const [p] = await db
			.insert(product)
			.values({ name: "Imported", status: "active" })
			.returning({ id: product.id });
		return p.id;
	}
	if (!sourceProductId) {
		const [p] = await db
			.insert(product)
			.values({ name: nameHint || "Imported", status: "active" })
			.returning({ id: product.id });
		return p.id;
	}
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
	const [p] = await db
		.insert(product)
		.values({
			name: nameHint || `Imported product ${sourceProductId}`,
			status: "active",
		})
		.returning({ id: product.id });
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

async function minimalUpsertVariants(
	skus: string[],
	bySku: Map<string, ExportVariant>,
) {
	if (skus.length === 0) return 0;
	const existing = await db
		.select({ sku: productVariant.sku })
		.from(productVariant)
		.where(inArray(productVariant.sku, skus));
	const exists = new Set(existing.map((r) => r.sku));
	let inserted = 0;
	for (const sku of skus) {
		if (exists.has(sku)) continue;
		const src = bySku.get(sku);
		const canonicalProductId = await ensureCanonicalProductForSourceProductId(
			src?.product_id,
			src?.product_name,
		);
		const stock = src?.stock;
		const stockQty =
			typeof stock === "string"
				? Number.parseInt(stock, 10)
				: typeof stock === "number"
					? stock
					: undefined;
		const gtin =
			src?.gtin && src?.gtin.trim().length > 0 ? src?.gtin : undefined;
		try {
			await db
				.insert(productVariant)
				.values({
					productId: canonicalProductId,
					sku,
					gtin,
					priceCents: typeof src?.price === "number" ? src?.price : undefined,
					stockQty,
					weightGrams: src?.weight ?? undefined,
				})
				.onConflictDoNothing({ target: productVariant.sku });
			inserted++;
		} catch (e: unknown) {
			// Handle potential GTIN unique conflicts by retrying without GTIN
			const anyErr = e as { message?: string } | undefined;
			const msg = String(anyErr?.message || "");
			if (msg.includes("product_variant_gtin_unique")) {
				await db
					.insert(productVariant)
					.values({
						productId: canonicalProductId,
						sku,
						priceCents: typeof src?.price === "number" ? src?.price : undefined,
						stockQty,
						weightGrams: src?.weight ?? undefined,
					})
					.onConflictDoNothing({ target: productVariant.sku });
				inserted++;
			}
		}
	}
	return inserted;
}

async function linkFitments(make: string, model: string, skus: string[]) {
	const vmId = await ensureVehicleModelId(make, model);
	let linked = 0;
	for (const sku of skus) {
		const row = await db
			.select({ id: productVariant.id })
			.from(productVariant)
			.where(eq(productVariant.sku, sku))
			.limit(1);
		const vid = row[0]?.id;
		if (!vid) continue;
		try {
			await db
				.insert(productFitment)
				.values({ variantId: vid, vehicleModelId: vmId });
			linked++;
		} catch {}
	}
	return { vmId, linked };
}

async function collectMapFiles(root: string) {
	const brandDir = join(root, "brand");
	const brands = await readdir(brandDir);
	const files: Array<{ path: string; make: string; model: string }> = [];
	for (const b of brands) {
		const dir = join(brandDir, b);
		const entries = await readdir(dir);
		for (const f of entries) {
			if (!f.endsWith(".json")) continue;
			const model = decodeURIComponent(f.replace(/\.json$/, "")).replaceAll(
				"__",
				"/",
			);
			files.push({ path: join(dir, f), make: b, model });
		}
	}
	return files;
}

async function main() {
	const mapsRoot = process.argv[2];
	if (!mapsRoot) {
		console.error(
			"Usage: bun src/scripts/upsert-fitments-from-maps.ts <fitment-maps-dir>",
		);
		process.exit(1);
	}
	const exportDir = await latestDir(
		"/Users/danadalis/PeyyaDotDev/b2b-commerce/mc-parts/data/nyehandel",
		"full-export-",
	);
	const bySku = await loadExportIndex(exportDir);
	const files = await collectMapFiles(mapsRoot);
	const concurrency = Number.parseInt(process.env.CONCURRENCY || "5", 10);

	let processed = 0;
	let totalLinked = 0;
	let totalInserted = 0;
	async function worker(queue: typeof files) {
		while (true) {
			const it = queue.shift();
			if (!it) break;
			const raw = JSON.parse(await readFile(it.path, "utf8")) as MapFile;
			const skus = Array.from(new Set(raw.mappings.map((m) => String(m.sku))));
			const inserted = await minimalUpsertVariants(skus, bySku);
			const { linked } = await linkFitments(it.make, it.model, skus);
			totalInserted += inserted;
			totalLinked += linked;
			processed++;
			console.log(
				JSON.stringify({
					processed,
					make: it.make,
					model: it.model,
					skus: skus.length,
					inserted,
					linked,
				}),
			);
		}
	}

	const queue = files.slice();
	const workers = Array.from({ length: concurrency }, () => worker(queue));
	await Promise.all(workers);
	console.log(JSON.stringify({ processed, totalLinked, totalInserted }));
}

await main();
