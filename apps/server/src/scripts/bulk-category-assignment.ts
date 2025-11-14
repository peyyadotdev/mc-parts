import { inArray } from "drizzle-orm";
import { db } from "../db/index";
import { category, product, productCategory } from "../db/schema/index";

// Comprehensive category mapping for motorcycle parts
const CATEGORY_PATTERNS = [
	// Engine components
	{
		name: "Engine Components",
		subcategory: "Cylinder Kits",
		patterns: [
			/\bcylinder\s+kit\b/i,
			/\bcylinder\s+(set|combo)\b/i,
			/\bpiston\s+kit\b/i,
			/\bpiston\s+(set|combo)\b/i,
		],
		keywords: ["cylinder", "piston", "kit", "set", "bore"],
	},
	{
		name: "Engine Components",
		subcategory: "Pistons & Rings",
		patterns: [
			/\bpiston\b(?!\s+kit)/i,
			/\bpiston\s+ring/i,
			/\brings?\s+set\b/i,
			/\bpiston\s+pin\b/i,
		],
		keywords: ["piston", "ring", "gudgeon", "pin"],
	},
	{
		name: "Engine Components",
		subcategory: "Gaskets & Seals",
		patterns: [/\bgasket/i, /\bseal/i, /\bo[- ]?ring/i, /\bpackning/i],
		keywords: ["gasket", "seal", "o-ring", "packn"],
	},
	{
		name: "Engine Components",
		subcategory: "Crankshafts & Connecting Rods",
		patterns: [
			/\bcrankshaft/i,
			/\bcrank\s+(shaft|set)\b/i,
			/\bconnecting\s+rod/i,
			/\bcon[- ]?rod/i,
			/\bvevaxel/i,
		],
		keywords: ["crank", "connecting", "rod", "shaft"],
	},

	// Fuel system
	{
		name: "Fuel System",
		subcategory: "Carburetors",
		patterns: [
			/\bcarburetor/i,
			/\bcarb\b/i,
			/\bdellorto/i,
			/\bmikuni/i,
			/\bbing\b/i,
			/\bförgasare/i,
		],
		keywords: ["carb", "carburetor", "dellorto", "mikuni", "bing"],
	},
	{
		name: "Fuel System",
		subcategory: "Fuel Pumps",
		patterns: [/\bfuel\s+pump/i, /\bpetrol\s+pump/i, /\bbränslepump/i],
		keywords: ["fuel", "pump", "petrol"],
	},
	{
		name: "Fuel System",
		subcategory: "Fuel Lines & Filters",
		patterns: [
			/\bfuel\s+(line|hose|tube)/i,
			/\bfuel\s+filter/i,
			/\bpetrol\s+(line|hose|tube)/i,
			/\bbränsleslang/i,
		],
		keywords: ["fuel", "line", "hose", "filter", "tube"],
	},

	// Exhaust system
	{
		name: "Exhaust System",
		subcategory: "Exhaust Pipes",
		patterns: [
			/\bexhaust\s+(pipe|system)/i,
			/\bmuffler/i,
			/\bsilencer/i,
			/\bavgasrör/i,
			/\bljuddämpare/i,
		],
		keywords: ["exhaust", "pipe", "muffler", "silencer", "avgasrör"],
	},
	{
		name: "Exhaust System",
		subcategory: "Expansion Chambers",
		patterns: [/\bexpansion\s+chamber/i, /\bexpansion\s+pipe/i, /\bresonator/i],
		keywords: ["expansion", "chamber", "resonator"],
	},

	// Transmission & Drive
	{
		name: "Transmission & Drive",
		subcategory: "Clutches",
		patterns: [/\bclutch/i, /\bkoppling/i],
		keywords: ["clutch", "koppling"],
	},
	{
		name: "Transmission & Drive",
		subcategory: "Chains & Sprockets",
		patterns: [/\bchain/i, /\bsprocket/i, /\bcog/i, /\bkedja/i, /\bkugghjul/i],
		keywords: ["chain", "sprocket", "cog", "kedja"],
	},
	{
		name: "Transmission & Drive",
		subcategory: "CVT Components",
		patterns: [/\bvariator/i, /\bmultivar/i, /\bpulley/i, /\bbelt/i, /\brem/i],
		keywords: ["variator", "pulley", "belt", "cvt"],
	},

	// Electrical
	{
		name: "Electrical",
		subcategory: "Spark Plugs",
		patterns: [
			/\bspark\s+plug/i,
			/\bignition\s+plug/i,
			/\bngk/i,
			/\bdenso/i,
			/\btändstift/i,
		],
		keywords: ["spark", "plug", "ignition", "ngk", "denso"],
	},
	{
		name: "Electrical",
		subcategory: "Ignition System",
		patterns: [
			/\bignition\s+(coil|system)/i,
			/\bstator/i,
			/\brotor/i,
			/\btändning/i,
		],
		keywords: ["ignition", "coil", "stator", "rotor"],
	},
	{
		name: "Electrical",
		subcategory: "Lighting",
		patterns: [
			/\bheadlight/i,
			/\btaillight/i,
			/\bindicator/i,
			/\bblinker/i,
			/\bbulb/i,
			/\blampa/i,
		],
		keywords: ["light", "lamp", "bulb", "indicator", "blinker"],
	},

	// Brakes
	{
		name: "Brakes",
		subcategory: "Brake Pads",
		patterns: [/\bbrake\s+pad/i, /\bbrake\s+block/i, /\bbromsbelägg/i],
		keywords: ["brake", "pad", "block", "broms"],
	},
	{
		name: "Brakes",
		subcategory: "Brake Discs",
		patterns: [/\bbrake\s+(disc|disk|rotor)/i, /\bbromsskiva/i],
		keywords: ["brake", "disc", "disk", "rotor"],
	},
	{
		name: "Brakes",
		subcategory: "Brake Lines & Fluid",
		patterns: [
			/\bbrake\s+(line|hose|fluid)/i,
			/\bbrake\s+cable/i,
			/\bbromsslang/i,
			/\bbromsvätska/i,
		],
		keywords: ["brake", "line", "hose", "fluid", "cable"],
	},

	// Suspension
	{
		name: "Suspension",
		subcategory: "Shock Absorbers",
		patterns: [
			/\bshock\s+(absorber|damper)/i,
			/\bamortisseur/i,
			/\bstötdämpare/i,
		],
		keywords: ["shock", "absorber", "damper", "amortisseur"],
	},
	{
		name: "Suspension",
		subcategory: "Springs",
		patterns: [/\bspring/i, /\bfjäder/i],
		keywords: ["spring", "fjäder"],
	},

	// Wheels & Tires
	{
		name: "Wheels & Tires",
		subcategory: "Tires",
		patterns: [/\btire/i, /\btyre/i, /\bdäck/i],
		keywords: ["tire", "tyre", "däck"],
	},
	{
		name: "Wheels & Tires",
		subcategory: "Wheels & Rims",
		patterns: [/\bwheel/i, /\brim/i, /\bhjul/i, /\bfälg/i],
		keywords: ["wheel", "rim", "hjul", "fälg"],
	},

	// Body & Fairings
	{
		name: "Body & Fairings",
		subcategory: "Fairings",
		patterns: [/\bfairing/i, /\bcover/i, /\bpanel/i, /\bkåpa/i],
		keywords: ["fairing", "cover", "panel", "kåpa"],
	},
	{
		name: "Body & Fairings",
		subcategory: "Mirrors",
		patterns: [/\bmirror/i, /\bspegel/i],
		keywords: ["mirror", "spegel"],
	},

	// Cables & Controls
	{
		name: "Cables & Controls",
		subcategory: "Throttle Cables",
		patterns: [/\bthrottle\s+cable/i, /\bgaskabel/i],
		keywords: ["throttle", "cable", "gas"],
	},
	{
		name: "Cables & Controls",
		subcategory: "Control Cables",
		patterns: [/\bcable/i, /\bwire/i, /\bkabel/i, /\bvajer/i],
		keywords: ["cable", "wire", "kabel", "vajer"],
	},

	// Filters
	{
		name: "Filters",
		subcategory: "Air Filters",
		patterns: [/\bair\s+filter/i, /\bluftfilter/i],
		keywords: ["air", "filter", "luft"],
	},
	{
		name: "Filters",
		subcategory: "Oil Filters",
		patterns: [/\boil\s+filter/i, /\boljefilter/i],
		keywords: ["oil", "filter", "olje"],
	},

	// Tools & Maintenance
	{
		name: "Tools & Maintenance",
		subcategory: "Tools",
		patterns: [/\btool/i, /\bwrench/i, /\bkey/i, /\bverktyg/i],
		keywords: ["tool", "wrench", "key", "verktyg"],
	},
	{
		name: "Tools & Maintenance",
		subcategory: "Lubricants & Chemicals",
		patterns: [
			/\boil/i,
			/\bgrease/i,
			/\blubricant/i,
			/\bspray/i,
			/\bolja/i,
			/\bfett/i,
		],
		keywords: ["oil", "grease", "spray", "lubricant", "chemical"],
	},
];

interface CategoryAssignmentResult {
	productId: string;
	productName: string;
	assignedCategory: string;
	assignedSubcategory: string;
	confidence: number;
	matchedPattern: string;
}

async function assignCategoryFromName(productName: string): Promise<{
	category: string;
	subcategory: string;
	confidence: number;
	pattern: string;
} | null> {
	const name = productName.toLowerCase();

	let bestMatch: {
		category: string;
		subcategory: string;
		confidence: number;
		pattern: string;
	} | null = null;
	let highestScore = 0;

	for (const categoryInfo of CATEGORY_PATTERNS) {
		let score = 0;

		// Check pattern matches
		for (const pattern of categoryInfo.patterns) {
			if (pattern.test(name)) {
				score += 100; // High score for regex pattern match
				break;
			}
		}

		// Check keyword matches
		const keywordMatches = categoryInfo.keywords.filter((keyword) =>
			name.includes(keyword.toLowerCase()),
		).length;

		score += keywordMatches * 25; // Medium score for keyword matches

		// Bonus for multiple keyword matches
		if (keywordMatches > 1) {
			score += 25;
		}

		if (score > highestScore && score >= 50) {
			// Minimum threshold
			highestScore = score;

			let confidence = Math.min(0.95, score / 125); // Normalize to 0-0.95

			// Adjust confidence based on context
			if (name.startsWith(categoryInfo.keywords[0])) {
				confidence = Math.min(0.98, confidence + 0.1);
			}

			bestMatch = {
				category: categoryInfo.name,
				subcategory: categoryInfo.subcategory,
				confidence,
				pattern: categoryInfo.patterns[0].toString(),
			};
		}
	}

	return bestMatch;
}

async function createCategoriesIfNotExist(
	categories: { name: string; subcategory: string }[],
) {
	console.log("📝 Creating/verifying categories...");

	const uniqueCategories = [...new Set(categories.map((c) => c.name))];

	// Check existing categories
	const existingCategories = await db
		.select({ id: category.id, name: category.name })
		.from(category)
		.where(inArray(category.name, uniqueCategories));

	const existingCategoryNames = new Set(existingCategories.map((c) => c.name));
	const newCategoryNames = uniqueCategories.filter(
		(name) => !existingCategoryNames.has(name),
	);

	if (newCategoryNames.length > 0) {
		const newCategories = await db
			.insert(category)
			.values(
				newCategoryNames.map((name) => ({
					name,
					slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
				})),
			)
			.returning({ id: category.id, name: category.name });

		existingCategories.push(...newCategories);
		console.log(`✅ Created ${newCategoryNames.length} new categories`);
	}

	// Return map of category name to ID
	return new Map(existingCategories.map((c) => [c.name, c.id]));
}

async function bulkAssignCategories(limit = 1000, dryRun = false) {
	console.log(
		`🔍 Starting bulk category assignment ${dryRun ? "(DRY RUN)" : ""}...`,
	);
	console.log(`   Processing ${limit} products per batch\n`);

	let processed = 0;
	let updated = 0;
	let offset = 0;
	const batchSize = 100;
	const results: CategoryAssignmentResult[] = [];

	while (processed < limit) {
		// Get products - focusing on those without categories or with generic categories
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

		const categoryAssignments: CategoryAssignmentResult[] = [];
		const categoryUpdates: {
			productId: string;
			categoryName: string;
			subcategoryName: string;
		}[] = [];

		for (const prod of products) {
			const assignment = await assignCategoryFromName(prod.name);

			if (assignment && assignment.confidence >= 0.6) {
				categoryAssignments.push({
					productId: prod.id,
					productName: prod.name,
					assignedCategory: assignment.category,
					assignedSubcategory: assignment.subcategory,
					confidence: assignment.confidence,
					matchedPattern: assignment.pattern,
				});

				categoryUpdates.push({
					productId: prod.id,
					categoryName: assignment.category,
					subcategoryName: assignment.subcategory,
				});
			}

			processed++;
		}

		if (categoryUpdates.length > 0 && !dryRun) {
			// Create categories if they don't exist
			const uniqueCategories = [
				...new Set(
					categoryUpdates.map((u) => ({
						name: u.categoryName,
						subcategory: u.subcategoryName,
					})),
				),
			];
			const categoryMap = await createCategoriesIfNotExist(uniqueCategories);

			// Get existing product-category relationships to avoid duplicates
			const productIds = categoryUpdates.map((u) => u.productId);
			const existingRelations = await db
				.select({
					productId: productCategory.productId,
					categoryId: productCategory.categoryId,
				})
				.from(productCategory)
				.where(inArray(productCategory.productId, productIds));

			const existingKeys = new Set(
				existingRelations.map((r) => `${r.productId}-${r.categoryId}`),
			);

			// Insert new product-category relationships
			const newRelations = categoryUpdates
				.map((update) => {
					const categoryId = categoryMap.get(update.categoryName);
					if (!categoryId) {
						console.warn(
							`⚠️  Category "${update.categoryName}" not found in map`,
						);
						return null;
					}
					const key = `${update.productId}-${categoryId}`;
					if (existingKeys.has(key)) {
						return null; // Already exists
					}
					return {
						productId: update.productId,
						categoryId: categoryId,
					};
				})
				.filter(
					(r): r is { productId: string; categoryId: string } => r !== null,
				);

			if (newRelations.length > 0) {
				await db.insert(productCategory).values(newRelations);
				updated += newRelations.length;
				console.log(
					`   ✅ Linked ${newRelations.length} products to categories`,
				);
			} else {
				console.log(
					"   ℹ️  All products already have these categories assigned",
				);
			}
		}

		results.push(...categoryAssignments);
		offset += batchSize;

		if (processed >= limit) break;
	}

	// Summary report
	console.log(`\n${"=".repeat(80)}`);
	console.log("📊 CATEGORY ASSIGNMENT SUMMARY");
	console.log("=".repeat(80));
	console.log(`   Processed: ${processed.toLocaleString()} products`);
	console.log(`   Categories assigned: ${results.length.toLocaleString()}`);
	console.log(`   Products updated: ${updated.toLocaleString()}`);
	console.log(
		`   Success rate: ${((results.length / processed) * 100).toFixed(1)}%\n`,
	);

	// Category frequency analysis
	const categoryCounts = results.reduce(
		(acc, result) => {
			const key = `${result.assignedCategory} > ${result.assignedSubcategory}`;
			acc[key] = (acc[key] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	const sortedCategories = Object.entries(categoryCounts)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 15);

	console.log("🏆 TOP ASSIGNED CATEGORIES:");
	sortedCategories.forEach(([category, count], index) => {
		console.log(
			`   ${index + 1}. ${category}: ${count.toLocaleString()} products`,
		);
	});

	// Show some examples
	console.log("\n📋 ASSIGNMENT EXAMPLES:");
	results.slice(0, 10).forEach((result, index) => {
		console.log(
			`   ${index + 1}. "${result.productName}" → ${result.assignedCategory} > ${result.assignedSubcategory} (${(result.confidence * 100).toFixed(0)}%)`,
		);
	});

	return results;
}

async function main() {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run");
	const limitArg = args.find((arg) => arg.startsWith("--limit="));
	const limit = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : 2000;

	try {
		console.log("🚀 Starting bulk category assignment process...\n");

		if (dryRun) {
			console.log(
				"⚠️  DRY RUN MODE - No changes will be made to the database\n",
			);
		}

		await bulkAssignCategories(limit, dryRun);

		console.log("\n✅ Category assignment completed!");
	} catch (error) {
		console.error("❌ Error during category assignment:", error);
		process.exit(1);
	}
}

// Export the main function for API usage
export { bulkAssignCategories };
export default bulkAssignCategories;

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
