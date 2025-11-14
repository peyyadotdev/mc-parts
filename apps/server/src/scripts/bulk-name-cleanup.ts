import { count, eq, sql } from "drizzle-orm";
import { db } from "../db/index";
import { product } from "../db/schema/index";

interface NameCleanupResult {
	productId: string;
	originalName: string;
	cleanedName: string;
	changes: string[];
	confidence: number;
}

// Common cleaning patterns for motorcycle parts
const CLEANUP_PATTERNS = [
	// Remove excessive whitespace
	{
		name: "excessive_whitespace",
		pattern: /\s{2,}/g,
		replacement: " ",
		description: "Remove extra spaces",
	},
	// Standardize slashes
	{
		name: "slash_normalization",
		pattern: /\s*\/\s*/g,
		replacement: " / ",
		description: "Normalize slashes with spaces",
	},
	// Clean up hyphens
	{
		name: "hyphen_normalization",
		pattern: /\s*-\s*/g,
		replacement: " - ",
		description: "Normalize hyphens with spaces",
	},
	// Remove leading/trailing whitespace
	{
		name: "trim_whitespace",
		pattern: /^\s+|\s+$/g,
		replacement: "",
		description: "Remove leading/trailing spaces",
	},
	// Standardize measurements
	{
		name: "measurement_standardization",
		pattern: /(\d+)\s*x\s*(\d+)/gi,
		replacement: "$1x$2",
		description: "Standardize measurements (remove spaces around 'x')",
	},
	// Clean up common abbreviations
	{
		name: "abbreviation_cleanup",
		pattern: /\bmm\./gi,
		replacement: "mm",
		description: "Remove periods from mm abbreviation",
	},
	// Fix common typos and inconsistencies
	{
		name: "brand_capitalization",
		pattern: /\bbosch\b/gi,
		replacement: "BOSCH",
		description: "Capitalize brand names",
	},
	{
		name: "sachs_capitalization",
		pattern: /\bsachs\b/gi,
		replacement: "SACHS",
		description: "Capitalize SACHS brand",
	},
	{
		name: "ngk_capitalization",
		pattern: /\bngk\b/gi,
		replacement: "NGK",
		description: "Capitalize NGK brand",
	},
	// Remove redundant words
	{
		name: "remove_redundant_kit",
		pattern: /\bkit\s+kit\b/gi,
		replacement: "kit",
		description: "Remove duplicate 'kit' words",
	},
	// Standardize temperature ratings
	{
		name: "temp_rating_standardization",
		pattern: /(\d+)\s*°?\s*c\b/gi,
		replacement: "$1°C",
		description: "Standardize temperature ratings",
	},
];

// Brand name standardization
const BRAND_STANDARDIZATION = {
	polini: "Polini",
	malossi: "Malossi",
	airsal: "Airsal",
	eurokit: "Eurokit",
	athena: "Athena",
	dellorto: "Dell'Orto",
	mikuni: "Mikuni",
	bing: "Bing",
	yamaha: "Yamaha",
	honda: "Honda",
	suzuki: "Suzuki",
	kawasaki: "Kawasaki",
	aprilia: "Aprilia",
	derbi: "Derbi",
	peugeot: "Peugeot",
	piaggio: "Piaggio",
	vespa: "Vespa",
	gilera: "Gilera",
	mbk: "MBK",
	rieju: "Rieju",
	beta: "Beta",
	ktm: "KTM",
	husqvarna: "Husqvarna",
	sherco: "Sherco",
	gasgas: "Gas Gas",
	minarelli: "Minarelli",
};

function cleanProductName(productName: string): {
	cleanedName: string;
	changes: string[];
} {
	let cleaned = productName;
	const changes: string[] = [];

	// Apply cleanup patterns
	for (const pattern of CLEANUP_PATTERNS) {
		const beforeClean = cleaned;
		cleaned = cleaned.replace(pattern.pattern, pattern.replacement);

		if (beforeClean !== cleaned) {
			changes.push(pattern.description);
		}
	}

	// Standardize brand names
	for (const [incorrect, correct] of Object.entries(BRAND_STANDARDIZATION)) {
		const regex = new RegExp(`\\b${incorrect}\\b`, "gi");
		const beforeBrand = cleaned;
		cleaned = cleaned.replace(regex, correct);

		if (beforeBrand !== cleaned) {
			changes.push(`Standardize brand: ${incorrect} → ${correct}`);
		}
	}

	// Final cleanup pass
	cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

	return { cleanedName: cleaned, changes };
}

function calculateConfidence(
	originalName: string,
	cleanedName: string,
	changes: string[],
): number {
	// Base confidence
	let confidence = 0.8;

	// Reduce confidence for major changes
	const similarity =
		1 -
		Math.abs(originalName.length - cleanedName.length) /
			Math.max(originalName.length, cleanedName.length);
	confidence *= similarity;

	// Adjust based on number of changes
	if (changes.length === 0) {
		confidence = 1.0; // No changes needed
	} else if (changes.length > 5) {
		confidence *= 0.7; // Many changes, lower confidence
	}

	// Boost confidence for common cleanup operations
	const commonOperations = [
		"Remove extra spaces",
		"Normalize slashes",
		"Capitalize brand names",
	];
	const hasCommonOps = changes.some((change) =>
		commonOperations.some((op) => change.includes(op)),
	);

	if (hasCommonOps) {
		confidence = Math.min(0.95, confidence + 0.1);
	}

	return Math.max(0.5, Math.min(1.0, confidence));
}

async function bulkCleanProductNames(limit = 1000, dryRun = false) {
	console.log(
		`🔍 Starting bulk product name cleanup ${dryRun ? "(DRY RUN)" : ""}...`,
	);
	console.log(`   Processing ${limit} products per batch\n`);

	let processed = 0;
	let updated = 0;
	let offset = 0;
	const batchSize = 100;
	const results: NameCleanupResult[] = [];

	while (processed < limit) {
		const products = await db
			.select({ id: product.id, name: product.name })
			.from(product)
			.limit(batchSize)
			.offset(offset);

		if (products.length === 0) {
			break;
		}

		console.log(
			`📦 Processing batch ${Math.floor(offset / batchSize) + 1} (${products.length} products)...`,
		);

		const nameUpdates: { productId: string; cleanedName: string }[] = [];

		for (const prod of products) {
			const { cleanedName, changes } = cleanProductName(prod.name);

			if (cleanedName !== prod.name) {
				const confidence = calculateConfidence(prod.name, cleanedName, changes);

				const result: NameCleanupResult = {
					productId: prod.id,
					originalName: prod.name,
					cleanedName,
					changes,
					confidence,
				};

				results.push(result);

				if (confidence >= 0.7 && !dryRun) {
					nameUpdates.push({
						productId: prod.id,
						cleanedName,
					});
				}
			}

			processed++;
		}

		// Update products with cleaned names
		if (nameUpdates.length > 0 && !dryRun) {
			for (const update of nameUpdates) {
				await db
					.update(product)
					.set({ name: update.cleanedName })
					.where(eq(product.id, update.productId));
			}
			updated += nameUpdates.length;
		}

		offset += batchSize;

		if (processed >= limit) break;
	}

	// Find and report duplicates that might need manual review
	console.log("🔍 Checking for potential duplicates after cleanup...");

	const duplicateNames = await db
		.select({
			name: product.name,
			count: count(),
		})
		.from(product)
		.groupBy(product.name)
		.having(sql`count(*) > 1`);

	// Summary report
	console.log(`\n${"=".repeat(80)}`);
	console.log("📊 NAME CLEANUP SUMMARY");
	console.log("=".repeat(80));
	console.log(`   Processed: ${processed.toLocaleString()} products`);
	console.log(`   Names cleaned: ${results.length.toLocaleString()}`);
	console.log(`   Products updated: ${updated.toLocaleString()}`);
	console.log(
		`   Cleanup rate: ${((results.length / processed) * 100).toFixed(1)}%`,
	);
	console.log(
		`   Potential duplicates: ${duplicateNames.length.toLocaleString()}\n`,
	);

	// Quality analysis
	const highConfidence = results.filter((r) => r.confidence >= 0.9).length;
	const mediumConfidence = results.filter(
		(r) => r.confidence >= 0.7 && r.confidence < 0.9,
	).length;
	const lowConfidence = results.filter((r) => r.confidence < 0.7).length;

	console.log("📈 CONFIDENCE DISTRIBUTION:");
	console.log(`   High confidence (90%+): ${highConfidence.toLocaleString()}`);
	console.log(
		`   Medium confidence (70-89%): ${mediumConfidence.toLocaleString()}`,
	);
	console.log(`   Low confidence (<70%): ${lowConfidence.toLocaleString()}\n`);

	// Common cleanup operations
	const operationCounts: Record<string, number> = {};
	results.forEach((result) => {
		result.changes.forEach((change) => {
			operationCounts[change] = (operationCounts[change] || 0) + 1;
		});
	});

	const sortedOperations = Object.entries(operationCounts)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 10);

	console.log("🔧 COMMON CLEANUP OPERATIONS:");
	sortedOperations.forEach(([operation, count], index) => {
		console.log(
			`   ${index + 1}. ${operation}: ${count.toLocaleString()} times`,
		);
	});

	// Show examples
	console.log("\n📋 CLEANUP EXAMPLES:");
	results.slice(0, 10).forEach((result, index) => {
		console.log(`\n   ${index + 1}. Original: "${result.originalName}"`);
		console.log(`      Cleaned: "${result.cleanedName}"`);
		console.log(`      Changes: ${result.changes.join(", ")}`);
		console.log(`      Confidence: ${(result.confidence * 100).toFixed(0)}%`);
	});

	if (duplicateNames.length > 0) {
		console.log("\n⚠️  POTENTIAL DUPLICATES (Top 10):");
		duplicateNames.slice(0, 10).forEach((dup, index) => {
			console.log(`   ${index + 1}. "${dup.name}" (${dup.count} occurrences)`);
		});
	}

	return results;
}

async function main() {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run");
	const limitArg = args.find((arg) => arg.startsWith("--limit="));
	const limit = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : 2000;

	try {
		console.log("🚀 Starting bulk product name cleanup process...\n");

		if (dryRun) {
			console.log(
				"⚠️  DRY RUN MODE - No changes will be made to the database\n",
			);
		}

		await bulkCleanProductNames(limit, dryRun);

		console.log("\n✅ Product name cleanup completed!");
	} catch (error) {
		console.error("❌ Error during name cleanup:", error);
		process.exit(1);
	}
}

// Export the main function for API usage
export { bulkCleanProductNames };
export default bulkCleanProductNames;

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
