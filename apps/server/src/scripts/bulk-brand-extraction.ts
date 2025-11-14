import { eq, inArray, isNull } from "drizzle-orm";
import { db } from "../db/index";
import { brand, product } from "../db/schema/index";

// Comprehensive brand patterns for motorcycle parts
const BRAND_PATTERNS = [
	// Major European brands
	{ name: "BOSCH", patterns: [/\bbosch\b/i] },
	{ name: "MANN-FILTER", patterns: [/\bmann\b/i, /\bmann[- ]filter\b/i] },
	{ name: "SACHS", patterns: [/\bsachs\b/i] },
	{ name: "MAHLE", patterns: [/\bmahle\b/i] },
	{ name: "FEBI BILSTEIN", patterns: [/\bfebi\b/i, /\bfebi[- ]bilstein\b/i] },
	{ name: "SWAG", patterns: [/\bswag\b/i] },
	{ name: "LEMFÖRDER", patterns: [/\blemf[öo]rder\b/i] },
	{ name: "SKF", patterns: [/\bskf\b/i] },
	{ name: "FAG", patterns: [/\bfag\b/i] },
	{ name: "INA", patterns: [/\bina\b/i] },
	{ name: "CONTINENTAL", patterns: [/\bcontinental\b/i, /\bconti\b/i] },
	{ name: "GATES", patterns: [/\bgates\b/i] },
	{ name: "VALEO", patterns: [/\bvaleo\b/i] },
	{ name: "HELLA", patterns: [/\bhella\b/i] },
	{ name: "OSRAM", patterns: [/\bosram\b/i] },

	// Motorcycle specific brands
	{ name: "POLINI", patterns: [/\bpolini\b/i] },
	{ name: "AIRSAL", patterns: [/\bairsal\b/i] },
	{ name: "EUROKIT", patterns: [/\beurokit\b/i] },
	{ name: "BING", patterns: [/\bbing\b/i] },
	{ name: "DELLORTO", patterns: [/\bdellorto\b/i, /\bdell['\s]orto\b/i] },
	{ name: "MIKUNI", patterns: [/\bmikuni\b/i] },
	{ name: "MALOSSI", patterns: [/\bmalossi\b/i] },
	{ name: "STAGE6", patterns: [/\bstage[- ]?6\b/i] },
	{ name: "YASUNI", patterns: [/\byasuni\b/i] },
	{ name: "ARROW", patterns: [/\barrow\b/i] },
	{ name: "AKRAPOVIC", patterns: [/\bakrapovic\b/i, /\bakra\b/i] },
	{ name: "LEOVINCE", patterns: [/\bleovince\b/i, /\bleo[- ]?vince\b/i] },

	// Engine manufacturers
	{ name: "MINARELLI", patterns: [/\bminarelli\b/i] },
	{ name: "DERBI", patterns: [/\bderbi\b/i] },
	{ name: "APRILIA", patterns: [/\baprilia\b/i] },
	{ name: "PIAGGIO", patterns: [/\bpiaggio\b/i] },
	{ name: "YAMAHA", patterns: [/\byamaha\b/i] },
	{ name: "HONDA", patterns: [/\bhonda\b/i] },
	{ name: "SUZUKI", patterns: [/\bsuzuki\b/i] },
	{ name: "KAWASAKI", patterns: [/\bkawasaki\b/i] },
	{ name: "KTM", patterns: [/\bktm\b/i] },
	{ name: "HUSQVARNA", patterns: [/\bhusqvarna\b/i, /\bhusky\b/i] },
	{ name: "BETA", patterns: [/\bbeta\b/i] },
	{ name: "GAS GAS", patterns: [/\bgas[- ]gas\b/i, /\bgasgas\b/i] },
	{ name: "SHERCO", patterns: [/\bsherco\b/i] },
	{ name: "RIEJU", patterns: [/\brieju\b/i] },
	{ name: "PEUGEOT", patterns: [/\bpeugeot\b/i] },
	{ name: "MBK", patterns: [/\bmbk\b/i] },
	{ name: "TM", patterns: [/\btm\b/i] },
	{ name: "HUSABERG", patterns: [/\bhusaberg\b/i] },

	// Tire brands
	{ name: "MICHELIN", patterns: [/\bmichelin\b/i] },
	{ name: "PIRELLI", patterns: [/\bpirelli\b/i] },
	{ name: "BRIDGESTONE", patterns: [/\bbridgestone\b/i] },
	{ name: "DUNLOP", patterns: [/\bdunlop\b/i] },
	{ name: "METZELER", patterns: [/\bmetzeler\b/i] },
	{ name: "MAXXIS", patterns: [/\bmaxxis\b/i] },
	{ name: "KENDA", patterns: [/\bkenda\b/i] },

	// Other parts brands
	{ name: "NGK", patterns: [/\bngk\b/i] },
	{ name: "DENSO", patterns: [/\bdenso\b/i] },
	{ name: "CHAMPION", patterns: [/\bchampion\b/i] },
	{ name: "MOTUL", patterns: [/\bmotul\b/i] },
	{ name: "CASTROL", patterns: [/\bcastrol\b/i] },
	{ name: "ELF", patterns: [/\belf\b/i] },
	{ name: "LIQUI MOLY", patterns: [/\bliqui[- ]moly\b/i] },
	{ name: "BREMBO", patterns: [/\bbrembo\b/i] },
	{ name: "EBC", patterns: [/\bebc\b/i] },
	{ name: "FERODO", patterns: [/\bferodo\b/i] },
	{ name: "GALFER", patterns: [/\bgalfer\b/i] },
	{ name: "NEWFREN", patterns: [/\bnewfren\b/i] },
	{ name: "KYOTO", patterns: [/\bkyoto\b/i] },
	{ name: "ATHENA", patterns: [/\bathena\b/i] },
	{ name: "TECNIUM", patterns: [/\btecnium\b/i] },
	{ name: "VERTEX", patterns: [/\bvertex\b/i] },
	{ name: "PROX", patterns: [/\bprox\b/i] },
	{ name: "WISECO", patterns: [/\bwiseco\b/i] },
	{ name: "JE PISTONS", patterns: [/\bje[- ]pistons?\b/i] },
	{ name: "WOSSNER", patterns: [/\bwossner\b/i, /\bwössner\b/i] },
	{ name: "COMETIC", patterns: [/\bcometic\b/i] },
	{ name: "BIHR", patterns: [/\bbihr\b/i] },
	{ name: "KOSO", patterns: [/\bkoso\b/i] },
	{ name: "DOPPLER", patterns: [/\bdoppler\b/i] },
	{ name: "MULTIVAR", patterns: [/\bmultivar\b/i] },
	{ name: "NARAKU", patterns: [/\bnaraku\b/i] },
	{ name: "TNT", patterns: [/\btnt\b/i] },
	{ name: "TOP PERFORMANCES", patterns: [/\btop[- ]performances?\b/i] },
	{ name: "DR PULLEY", patterns: [/\bdr[- ]pulley\b/i] },
	{ name: "POLINI", patterns: [/\bpolini\b/i] },
	{ name: "GIANELLI", patterns: [/\bgianelli\b/i] },
	{ name: "FMF", patterns: [/\bfmf\b/i] },
	{ name: "DEP", patterns: [/\bdep\b/i] },
	{ name: "SITO PLUS", patterns: [/\bsito[- ]plus\b/i] },
	{ name: "TECNIGAS", patterns: [/\btecnigas\b/i] },
	{ name: "GIANNELLI", patterns: [/\bgiannelli\b/i] },
	{ name: "ENDY", patterns: [/\bendy\b/i] },
];

interface BrandExtractionResult {
	productId: string;
	productName: string;
	extractedBrand: string;
	confidence: number;
	pattern: string;
}

async function extractBrandFromName(
	productName: string,
): Promise<{ brand: string; confidence: number; pattern: string } | null> {
	const name = productName.toLowerCase();

	for (const brandInfo of BRAND_PATTERNS) {
		for (const pattern of brandInfo.patterns) {
			if (pattern.test(name)) {
				// Calculate confidence based on position and context
				let confidence = 0.8;

				// Higher confidence if brand is at the beginning
				if (name.startsWith(brandInfo.name.toLowerCase())) {
					confidence = 0.95;
				}
				// Lower confidence if brand is part of a longer word (false positive)
				else if (
					name.includes(`${brandInfo.name.toLowerCase()}s`) ||
					name.includes(`${brandInfo.name.toLowerCase()}ed`)
				) {
					confidence = 0.3;
				}

				return {
					brand: brandInfo.name,
					confidence,
					pattern: pattern.toString(),
				};
			}
		}
	}

	return null;
}

async function createBrandsIfNotExist(brandNames: string[]) {
	console.log(`📝 Creating/verifying ${brandNames.length} brands...`);

	const existingBrands = await db
		.select({ name: brand.name })
		.from(brand)
		.where(inArray(brand.name, brandNames));

	const existingBrandNames = new Set(existingBrands.map((b) => b.name));
	const newBrandNames = brandNames.filter(
		(name) => !existingBrandNames.has(name),
	);

	if (newBrandNames.length > 0) {
		await db.insert(brand).values(
			newBrandNames.map((name) => ({
				name,
				slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
			})),
		);
		console.log(`✅ Created ${newBrandNames.length} new brands`);
	}

	// Get all brand IDs for mapping
	const allBrands = await db
		.select({ id: brand.id, name: brand.name })
		.from(brand)
		.where(inArray(brand.name, brandNames));

	return new Map(allBrands.map((b) => [b.name, b.id]));
}

async function bulkExtractBrands(limit = 1000, dryRun = false) {
	console.log(
		`🔍 Starting bulk brand extraction ${dryRun ? "(DRY RUN)" : ""}...`,
	);
	console.log(`   Processing ${limit} products per batch\n`);

	let processed = 0;
	let updated = 0;
	let offset = 0;
	const batchSize = 100;
	const results: BrandExtractionResult[] = [];

	while (processed < limit) {
		// Get products without brand IDs
		const products = await db
			.select({ id: product.id, name: product.name })
			.from(product)
			.where(isNull(product.brandId))
			.limit(batchSize)
			.offset(offset);

		if (products.length === 0) {
			break;
		}

		console.log(
			`📦 Processing batch ${Math.floor(offset / batchSize) + 1} (${products.length} products)...`,
		);

		const brandExtractions: BrandExtractionResult[] = [];
		const brandUpdates: { productId: string; brandName: string }[] = [];

		for (const prod of products) {
			const extraction = await extractBrandFromName(prod.name);

			if (extraction && extraction.confidence >= 0.7) {
				brandExtractions.push({
					productId: prod.id,
					productName: prod.name,
					extractedBrand: extraction.brand,
					confidence: extraction.confidence,
					pattern: extraction.pattern,
				});

				brandUpdates.push({
					productId: prod.id,
					brandName: extraction.brand,
				});
			}

			processed++;
		}

		if (brandUpdates.length > 0 && !dryRun) {
			// Create brands if they don't exist and get brand IDs
			const uniqueBrandNames = [
				...new Set(brandUpdates.map((u) => u.brandName)),
			];
			const brandIdMap = await createBrandsIfNotExist(uniqueBrandNames);

			// Update products with brand IDs
			for (const update of brandUpdates) {
				const brandId = brandIdMap.get(update.brandName);
				if (brandId) {
					await db
						.update(product)
						.set({ brandId })
						.where(eq(product.id, update.productId));
				}
			}

			updated += brandUpdates.length;
		}

		results.push(...brandExtractions);
		offset += batchSize;

		if (processed >= limit) break;
	}

	// Summary report
	console.log(`\n${"=".repeat(80)}`);
	console.log("📊 BRAND EXTRACTION SUMMARY");
	console.log("=".repeat(80));
	console.log(`   Processed: ${processed.toLocaleString()} products`);
	console.log(`   Brands extracted: ${results.length.toLocaleString()}`);
	console.log(`   Products updated: ${updated.toLocaleString()}`);
	console.log(
		`   Success rate: ${((results.length / processed) * 100).toFixed(1)}%\n`,
	);

	// Brand frequency analysis
	const brandCounts = results.reduce(
		(acc, result) => {
			acc[result.extractedBrand] = (acc[result.extractedBrand] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	const sortedBrands = Object.entries(brandCounts)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 20);

	console.log("🏆 TOP EXTRACTED BRANDS:");
	sortedBrands.forEach(([brand, count], index) => {
		console.log(
			`   ${index + 1}. ${brand}: ${count.toLocaleString()} products`,
		);
	});

	// Show some examples
	console.log("\n📋 EXTRACTION EXAMPLES:");
	results.slice(0, 10).forEach((result, index) => {
		console.log(
			`   ${index + 1}. "${result.productName}" → ${result.extractedBrand} (${(result.confidence * 100).toFixed(0)}%)`,
		);
	});

	return results;
}

async function main() {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run");
	const limitArg = args.find((arg) => arg.startsWith("--limit="));
	const limit = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : 5000;

	try {
		console.log("🚀 Starting bulk brand extraction process...\n");

		if (dryRun) {
			console.log(
				"⚠️  DRY RUN MODE - No changes will be made to the database\n",
			);
		}

		await bulkExtractBrands(limit, dryRun);

		console.log("\n✅ Brand extraction completed!");
	} catch (error) {
		console.error("❌ Error during brand extraction:", error);
		process.exit(1);
	}
}

// Export the main function for API usage
export { bulkExtractBrands };
export default bulkExtractBrands;

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
