import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { productFitment } from "../db/schema/tables/product_fitment";
import { productVariant } from "../db/schema/tables/product_variant";
import { vehicleModel } from "../db/schema/tables/vehicle_model";

interface ProductSKU {
	sku: string;
	variantId: string;
}

interface VehicleModel {
	model: string;
	products: ProductSKU[];
}

interface VehicleMake {
	make: string;
	models: VehicleModel[];
}

interface FitmentMapping {
	timestamp: string;
	totalMakes: number;
	totalModels: number;
	totalProducts: number;
	makes: VehicleMake[];
}

async function main() {
	console.log("=== Export Vehicle Fitments from Database ===\n");

	console.log("🔍 Fetching all fitments from database...");

	// Fetch all fitments with related variant and vehicle model data
	const fitments = await db
		.select({
			variantId: productFitment.variantId,
			sku: productVariant.sku,
			vehicleModelId: productFitment.vehicleModelId,
			make: vehicleModel.make,
			model: vehicleModel.model,
		})
		.from(productFitment)
		.innerJoin(productVariant, eq(productFitment.variantId, productVariant.id))
		.innerJoin(
			vehicleModel,
			eq(productFitment.vehicleModelId, vehicleModel.id),
		);

	console.log(`✓ Found ${fitments.length} fitment records\n`);

	if (fitments.length === 0) {
		console.log(
			"⚠️  No fitments found in database. The product_fitment table may be empty.",
		);
		console.log("   You may need to import fitment data first.");
		process.exit(0);
	}

	console.log("🔄 Inverting fitment data structure...");

	// Map structure: make -> model -> products[]
	const makeModelMap = new Map<string, Map<string, ProductSKU[]>>();

	for (const fitment of fitments) {
		const { make, model, sku, variantId } = fitment;

		if (!make || !model || !sku) continue;

		// Get or create make map
		let modelMap = makeModelMap.get(make);
		if (!modelMap) {
			modelMap = new Map<string, ProductSKU[]>();
			makeModelMap.set(make, modelMap);
		}

		// Get or create model products array
		let productsList = modelMap.get(model);
		if (!productsList) {
			productsList = [];
			modelMap.set(model, productsList);
		}

		// Add product if not already in list (deduplicate)
		const exists = productsList.some((p) => p.sku === sku);
		if (!exists) {
			productsList.push({
				sku,
				variantId,
			});
		}
	}

	// Convert to final structure
	const makes: VehicleMake[] = [];
	let totalModels = 0;
	let totalProducts = 0;

	for (const [make, modelMap] of makeModelMap.entries()) {
		const models: VehicleModel[] = [];

		for (const [model, productsList] of modelMap.entries()) {
			models.push({
				model,
				products: productsList,
			});
			totalProducts += productsList.length;
		}

		// Sort models alphabetically
		models.sort((a, b) => a.model.localeCompare(b.model));
		totalModels += models.length;

		makes.push({
			make,
			models,
		});
	}

	// Sort makes alphabetically
	makes.sort((a, b) => a.make.localeCompare(b.make));

	const mapping: FitmentMapping = {
		timestamp: new Date().toISOString(),
		totalMakes: makes.length,
		totalModels,
		totalProducts,
		makes,
	};

	// Save the mapping
	const outputDir = path.join(
		process.cwd(),
		"apps",
		"server",
		"data",
		"nyehandel",
	);
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	const timestamp = new Date()
		.toISOString()
		.replace(/[:.]/g, "-")
		.split("T")[0];
	const outputFile = path.join(
		outputDir,
		`vehicle-fitment-mapping-from-db-${timestamp}.json`,
	);

	fs.writeFileSync(outputFile, JSON.stringify(mapping, null, 2));

	console.log("\n=== Summary ===");
	console.log(`Total fitment records: ${fitments.length}`);
	console.log(`Total makes: ${mapping.totalMakes}`);
	console.log(`Total models: ${mapping.totalModels}`);
	console.log(`Total product mappings: ${mapping.totalProducts}`);
	console.log(`\n✓ Mapping saved to: ${outputFile}`);
}

await main();
