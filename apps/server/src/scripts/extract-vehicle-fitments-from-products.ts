import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
	nyeBaseUrl,
	nyeHeaders,
} from "../../../../src/integrations/nyehandel/client";

interface Product {
	id: number;
	name: string;
	sku?: string;
	fitments?: Array<{
		make?: string;
		model?: string;
		year?: string;
		[key: string]: any;
	}>;
	[key: string]: any;
}

interface ProductSKU {
	sku: string;
	name: string;
	productId: number;
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

async function fetchAllProducts(): Promise<Product[]> {
	console.log("🔍 Fetching all products from Nyehandel API...");

	const allProducts: Product[] = [];
	let page = 1;
	let hasMore = true;
	const pageSize = 100;

	while (hasMore) {
		try {
			const url = `${nyeBaseUrl}/products?page=${page}&pageSize=${pageSize}`;
			console.log(`  Fetching page ${page}...`);

			const response = await fetch(url, { headers: nyeHeaders() });

			if (!response.ok) {
				console.error(`  ✗ HTTP error! status: ${response.status}`);
				break;
			}

			const data = await response.json();
			const products = data.data || [];

			allProducts.push(...products);
			console.log(
				`  ✓ Fetched ${products.length} products (total: ${allProducts.length})`,
			);

			// Check if there are more pages
			const meta = data.meta || {};
			const totalPages = meta.last_page || meta.lastPage || 1;
			hasMore = page < totalPages && products.length > 0;

			page++;

			// Rate limiting - be nice to the API
			await new Promise((resolve) => setTimeout(resolve, 500));
		} catch (error) {
			console.error(`  ✗ Error fetching page ${page}:`, error);
			break;
		}
	}

	console.log(`\n✓ Total products fetched: ${allProducts.length}\n`);
	return allProducts;
}

function extractFitmentsFromProduct(
	product: Product,
): Array<{ make: string; model: string }> {
	const fitments: Array<{ make: string; model: string }> = [];

	// Check various possible locations for fitment data
	const fitmentData =
		product.fitments ||
		product.vehicle_fitments ||
		product.compatibility ||
		product.vehicles ||
		product.fits ||
		[];

	if (Array.isArray(fitmentData)) {
		for (const fit of fitmentData) {
			const make = fit.make || fit.brand || fit.manufacturer || "";
			const model = fit.model || fit.vehicle_model || "";

			if (make && model) {
				fitments.push({
					make: String(make).trim(),
					model: String(model).trim(),
				});
			}
		}
	}

	// Also check custom fields that might contain fitment info
	for (const [key, value] of Object.entries(product)) {
		if (
			key.toLowerCase().includes("fitment") ||
			key.toLowerCase().includes("vehicle") ||
			key.toLowerCase().includes("compatibility")
		) {
			if (Array.isArray(value)) {
				for (const item of value) {
					if (typeof item === "object" && item !== null) {
						const make = item.make || item.brand || item.manufacturer || "";
						const model = item.model || item.vehicle_model || "";

						if (make && model) {
							fitments.push({
								make: String(make).trim(),
								model: String(model).trim(),
							});
						}
					}
				}
			}
		}
	}

	return fitments;
}

function invertFitmentData(products: Product[]): FitmentMapping {
	console.log("🔄 Inverting fitment data structure...");

	// Map structure: make -> model -> products[]
	const makeModelMap = new Map<string, Map<string, ProductSKU[]>>();

	let productsWithFitments = 0;
	let totalFitmentRecords = 0;

	for (const product of products) {
		const fitments = extractFitmentsFromProduct(product);

		if (fitments.length === 0) {
			continue;
		}

		productsWithFitments++;
		totalFitmentRecords += fitments.length;

		const productSKU: ProductSKU = {
			sku: product.sku || String(product.id),
			name: product.name || `Product ${product.id}`,
			productId: product.id,
		};

		for (const { make, model } of fitments) {
			if (!make || !model) continue;

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
			const exists = productsList.some((p) => p.sku === productSKU.sku);
			if (!exists) {
				productsList.push(productSKU);
			}
		}
	}

	console.log(
		`  ✓ Products with fitments: ${productsWithFitments}/${products.length}`,
	);
	console.log(`  ✓ Total fitment records: ${totalFitmentRecords}`);

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

	return {
		timestamp: new Date().toISOString(),
		totalMakes: makes.length,
		totalModels,
		totalProducts,
		makes,
	};
}

async function main() {
	console.log("=== Nyehandel Vehicle Fitment Extractor ===\n");
	console.log("This script extracts vehicle fitments FROM products\n");

	// Fetch all products
	const products = await fetchAllProducts();

	if (products.length === 0) {
		console.error("❌ No products fetched. Exiting.");
		process.exit(1);
	}

	// Invert the data structure
	const mapping = invertFitmentData(products);

	// Save raw products for debugging (first 5)
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

	const samplePath = path.join(outputDir, "sample-products-with-fitments.json");
	const sampleProducts = products.slice(0, 5).map((p) => ({
		id: p.id,
		name: p.name,
		sku: p.sku,
		allKeys: Object.keys(p),
		fitments: p.fitments,
		vehicle_fitments: p.vehicle_fitments,
		compatibility: p.compatibility,
		vehicles: p.vehicles,
	}));
	fs.writeFileSync(samplePath, JSON.stringify(sampleProducts, null, 2));
	console.log(`\n📝 Sample products saved to: ${samplePath}`);

	// Save the mapping
	const timestamp = new Date()
		.toISOString()
		.replace(/[:.]/g, "-")
		.split("T")[0];
	const outputFile = path.join(
		outputDir,
		`vehicle-fitment-mapping-${timestamp}.json`,
	);

	fs.writeFileSync(outputFile, JSON.stringify(mapping, null, 2));

	console.log("\n=== Summary ===");
	console.log(`Total products fetched: ${products.length}`);
	console.log(`Total makes: ${mapping.totalMakes}`);
	console.log(`Total models: ${mapping.totalModels}`);
	console.log(`Total product mappings: ${mapping.totalProducts}`);
	console.log(`\n✓ Mapping saved to: ${outputFile}`);
}

await main();
