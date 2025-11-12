import "dotenv/config";
import { readFile } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index";
import { productFitment } from "../db/schema/tables/product_fitment";
import { productVariant } from "../db/schema/tables/product_variant";
import { vehicleModel } from "../db/schema/tables/vehicle_model";

async function ensureVehicleModel(make: string, modelName: string) {
	const existing = await db
		.select({ id: vehicleModel.id })
		.from(vehicleModel)
		.where(and(eq(vehicleModel.make, make), eq(vehicleModel.model, modelName)))
		.limit(1);
	if (existing[0]) return existing[0].id;
	const inserted = await db
		.insert(vehicleModel)
		.values({ make: make, model: modelName, type: "moped" })
		.returning({ id: vehicleModel.id });
	return inserted[0].id;
}

async function findVariantIdBySku(sku: string) {
	const found = await db
		.select({ id: productVariant.id })
		.from(productVariant)
		.where(eq(productVariant.sku, sku))
		.limit(1);
	return found[0]?.id;
}

async function upsertFitments(
	mappingPath: string,
	make: string,
	modelName: string,
) {
	const raw = await readFile(mappingPath, "utf8");
	const json = JSON.parse(raw) as { mappings: Array<{ sku: string }> };
	const vmId = await ensureVehicleModel(make, modelName);
	let linked = 0;
	let missing = 0;
	for (const m of json.mappings) {
		const sku = String(m.sku);
		const variantId = await findVariantIdBySku(sku);
		if (!variantId) {
			missing++;
			continue;
		}
		try {
			await db
				.insert(productFitment)
				.values({ variantId, vehicleModelId: vmId });
			linked++;
		} catch {
			// ignore duplicate primary key
		}
	}
	return { vmId, linked, missing, total: json.mappings.length };
}

async function main() {
	const mappingPath = process.argv[2];
	const make = process.argv[3];
	const modelName = process.argv[4];
	if (!mappingPath || !make || !modelName) {
		console.error(
			"Usage: bun src/scripts/upsert-fitment.ts <mapping.json> <make> <model>",
		);
		process.exit(1);
	}
	const res = await upsertFitments(mappingPath, make, modelName);
	console.log(JSON.stringify({ make, model: modelName, ...res }, null, 2));
}

await main();
