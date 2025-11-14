import { count, isNull, sql } from "drizzle-orm";
import { db } from "../db/index";
import { product, productVariant } from "../db/schema/index";

interface ProductDataAnalysis {
	totalProducts: number;
	totalVariants: number;
	missingBrandNames: number;
	missingCategories: number;
	missingDescriptions: number;
	duplicateProductNames: number;
	averageProductNameLength: number;
	commonBrandPatterns: { pattern: string; count: number }[];
	categoryDistribution: { category: string; count: number }[];
	productNameSamples: string[];
}

async function analyzeProductData(): Promise<ProductDataAnalysis> {
	console.log("🔍 Analyzing product data quality...\n");

	// Basic counts
	const [totalProductsResult] = await db
		.select({ count: count() })
		.from(product);
	const [totalVariantsResult] = await db
		.select({ count: count() })
		.from(productVariant);

	const totalProducts = totalProductsResult.count;
	const totalVariants = totalVariantsResult.count;

	console.log("📊 Basic Statistics:");
	console.log(`   Total products: ${totalProducts.toLocaleString()}`);
	console.log(`   Total variants: ${totalVariants.toLocaleString()}\n`);

	// Missing data analysis
	const [missingBrandNamesResult] = await db
		.select({ count: count() })
		.from(product)
		.where(isNull(product.brandId));

	const [missingDescriptionsResult] = await db
		.select({ count: count() })
		.from(product)
		.where(isNull(product.description));

	console.log("🚫 Missing Data:");
	console.log(
		`   Products without brand IDs: ${missingBrandNamesResult.count.toLocaleString()}`,
	);
	console.log(
		`   Products without descriptions: ${missingDescriptionsResult.count.toLocaleString()}\n`,
	);

	// Product name analysis
	const allProductNames = await db
		.select({ name: product.name })
		.from(product)
		.limit(1000); // Sample for analysis

	const productNameLengths = allProductNames.map((p) => p.name.length);
	const averageProductNameLength =
		productNameLengths.reduce((a, b) => a + b, 0) / productNameLengths.length;

	// Look for duplicate product names
	const duplicateNames = await db
		.select({
			name: product.name,
			count: count(),
		})
		.from(product)
		.groupBy(product.name)
		.having(sql`count(*) > 1`);

	console.log("📝 Product Names:");
	console.log(
		`   Average length: ${averageProductNameLength.toFixed(1)} characters`,
	);
	console.log(
		`   Duplicate names: ${duplicateNames.length.toLocaleString()}\n`,
	);

	// Brand pattern analysis
	const brandPatterns = [
		{ pattern: "BOSCH", regex: /bosch/i },
		{ pattern: "MANN", regex: /mann/i },
		{ pattern: "FILTER", regex: /filter/i },
		{ pattern: "SACHS", regex: /sachs/i },
		{ pattern: "MAHLE", regex: /mahle/i },
		{ pattern: "FEBI", regex: /febi/i },
		{ pattern: "SWAG", regex: /swag/i },
		{ pattern: "LEMFÖRDER", regex: /lemf[öo]rder/i },
		{ pattern: "SKF", regex: /skf/i },
		{ pattern: "FAG", regex: /fag/i },
		{ pattern: "CONTINENTAL", regex: /continental/i },
		{ pattern: "GATES", regex: /gates/i },
		{ pattern: "VALEO", regex: /valeo/i },
		{ pattern: "HELLA", regex: /hella/i },
		{ pattern: "OSRAM", regex: /osram/i },
	];

	const brandPatternCounts = brandPatterns
		.map((brand) => ({
			pattern: brand.pattern,
			count: allProductNames.filter((p) => brand.regex.test(p.name)).length,
		}))
		.filter((b) => b.count > 0)
		.sort((a, b) => b.count - a.count);

	console.log("🏷️  Brand Patterns Found in Product Names:");
	brandPatternCounts.slice(0, 10).forEach((brand) => {
		console.log(
			`   ${brand.pattern}: ${brand.count.toLocaleString()} products`,
		);
	});
	console.log();

	// Sample product names for manual inspection
	const productNameSamples = allProductNames.slice(0, 20).map((p) => p.name);

	console.log("📋 Sample Product Names:");
	productNameSamples.forEach((name, i) => {
		console.log(`   ${i + 1}. ${name}`);
	});

	return {
		totalProducts,
		totalVariants,
		missingBrandNames: missingBrandNamesResult.count,
		missingCategories: 0, // Will analyze categories separately
		missingDescriptions: missingDescriptionsResult.count,
		duplicateProductNames: duplicateNames.length,
		averageProductNameLength,
		commonBrandPatterns: brandPatternCounts,
		categoryDistribution: [], // Will analyze categories separately
		productNameSamples,
	};
}

async function main() {
	try {
		const analysis = await analyzeProductData();

		console.log(`\n${"=".repeat(80)}`);
		console.log("🎯 ENRICHMENT PRIORITIES:");
		console.log("=".repeat(80));

		const priorities = [];

		if (analysis.missingBrandNames > 0) {
			priorities.push(
				`1. Extract brand names from ${analysis.missingBrandNames.toLocaleString()} products`,
			);
		}

		priorities.push("2. Implement category assignment system for all products");

		if (analysis.missingDescriptions > 0) {
			priorities.push(
				`3. Generate descriptions for ${analysis.missingDescriptions.toLocaleString()} products`,
			);
		}

		if (analysis.duplicateProductNames > 0) {
			priorities.push(
				`4. Clean up ${analysis.duplicateProductNames.toLocaleString()} duplicate product names`,
			);
		}

		for (const priority of priorities) {
			console.log(priority);
		}

		console.log("\n🚀 Ready to start bulk enrichment process!");
	} catch (error) {
		console.error("❌ Error analyzing product data:", error);
		process.exit(1);
	}
}

// Export the main function for API usage
export { analyzeProductData };
export default analyzeProductData;

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
