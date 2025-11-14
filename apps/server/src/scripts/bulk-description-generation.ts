import { eq, inArray, isNull } from "drizzle-orm";
import { db } from "../db/index";
import { brand, product } from "../db/schema/index";

interface ProductDescriptionResult {
	productId: string;
	originalName: string;
	generatedDescription: string;
	extractedSpecs: Record<string, string>;
	confidence: number;
}

// Common motorcycle parts specifications and their patterns
const SPEC_PATTERNS = {
	// Dimensions
	diameter: {
		patterns: [
			/(\d+(?:\.\d+)?)\s*mm(?:\s+diameter|\s+dia\.?)?/i,
			/(\d+(?:\.\d+)?)\s*x\s*\d+(?:\.\d+)?\s*mm/i,
		],
		unit: "mm",
		type: "dimension",
	},
	bore: {
		patterns: [/(\d+(?:\.\d+)?)\s*mm\s+bore/i, /bore\s+(\d+(?:\.\d+)?)\s*mm/i],
		unit: "mm",
		type: "dimension",
	},
	stroke: {
		patterns: [
			/(\d+(?:\.\d+)?)\s*mm\s+stroke/i,
			/stroke\s+(\d+(?:\.\d+)?)\s*mm/i,
		],
		unit: "mm",
		type: "dimension",
	},
	displacement: {
		patterns: [/(\d+(?:\.\d+)?)\s*cc/i, /(\d+(?:\.\d+)?)\s*cm3/i],
		unit: "cc",
		type: "performance",
	},

	// Electrical
	voltage: {
		patterns: [/(\d+(?:\.\d+)?)\s*v(?:olt)?/i, /(\d+(?:\.\d+)?)\s*v\s/i],
		unit: "V",
		type: "electrical",
	},
	amperage: {
		patterns: [/(\d+(?:\.\d+)?)\s*a(?:mp)?/i, /(\d+(?:\.\d+)?)\s*ah/i],
		unit: "A",
		type: "electrical",
	},

	// Threads and fittings
	thread: {
		patterns: [/m(\d+(?:\.\d+)?)/i, /(\d+(?:\.\d+)?)\s*mm\s+thread/i],
		unit: "M",
		type: "fitting",
	},

	// Engine specifications
	teeth: {
		patterns: [/(\d+)\s*t(?:eeth)?(?:\s|$)/i, /(\d+)\s*tand/i],
		unit: "T",
		type: "specification",
	},

	// Colors
	color: {
		patterns: [
			/\b(black|white|red|blue|green|yellow|orange|purple|silver|gold|chrome|clear|transparent)\b/i,
		],
		unit: "",
		type: "appearance",
	},
};

// Common motorcycle part categories and their description templates
const DESCRIPTION_TEMPLATES = {
	"cylinder kit": {
		template:
			"High-quality {brand} cylinder kit for {application}. Features {specifications} and provides excellent performance and durability. Suitable for {compatibility}.",
		keySpecs: ["bore", "displacement", "material"],
	},
	"piston kit": {
		template:
			"Precision-engineered {brand} piston kit for {application}. Includes piston, rings, and pin. {specifications} for optimal engine performance.",
		keySpecs: ["bore", "diameter", "material"],
	},
	gasket: {
		template:
			"Professional-grade {brand} gasket for {application}. Ensures proper sealing and prevents leakage. {specifications} for reliable performance.",
		keySpecs: ["material", "thickness"],
	},
	carburetor: {
		template:
			"High-performance {brand} carburetor for {application}. Features {specifications} for optimal fuel delivery and engine response.",
		keySpecs: ["diameter", "type", "jets"],
	},
	chain: {
		template:
			"Durable {brand} drive chain for {application}. Features {specifications} for maximum strength and longevity.",
		keySpecs: ["pitch", "links", "strength"],
	},
	sprocket: {
		template:
			"Precision-machined {brand} sprocket with {teeth} teeth for {application}. Constructed from high-grade steel for maximum durability.",
		keySpecs: ["teeth", "pitch", "material"],
	},
	"brake pad": {
		template:
			"High-performance {brand} brake pads for {application}. Features {specifications} for excellent stopping power and heat dissipation.",
		keySpecs: ["material", "compound"],
	},
	"spark plug": {
		template:
			"Premium {brand} spark plug for {application}. Features {specifications} for reliable ignition and optimal engine performance.",
		keySpecs: ["heat_range", "electrode", "gap"],
	},
	exhaust: {
		template:
			"Performance {brand} exhaust system for {application}. Features {specifications} for enhanced power delivery and distinctive sound.",
		keySpecs: ["material", "diameter", "length"],
	},
	filter: {
		template:
			"High-quality {brand} filter for {application}. Features {specifications} for optimal filtration and engine protection.",
		keySpecs: ["type", "efficiency", "material"],
	},
	tire: {
		template:
			"Premium {brand} tire for {application}. Features {specifications} for excellent grip and handling in all conditions.",
		keySpecs: ["size", "compound", "pattern"],
	},
};

function extractSpecifications(productName: string): Record<string, string> {
	const specs: Record<string, string> = {};
	const name = productName.toLowerCase();

	for (const [specName, specInfo] of Object.entries(SPEC_PATTERNS)) {
		for (const pattern of specInfo.patterns) {
			const match = name.match(pattern);
			if (match?.[1]) {
				let value = match[1];
				if (specInfo.unit && specName !== "color") {
					value = `${match[1]}${specInfo.unit}`;
				}
				specs[specName] = value;
				break;
			}
		}
	}

	return specs;
}

function detectPartCategory(productName: string): string | null {
	const name = productName.toLowerCase();

	const categories = [
		{ key: "cylinder kit", patterns: [/cylinder\s+kit/i, /piston\s+kit/i] },
		{ key: "piston kit", patterns: [/piston\s+kit/i] },
		{ key: "gasket", patterns: [/gasket/i, /seal/i] },
		{
			key: "carburetor",
			patterns: [/carb/i, /carburetor/i, /dellorto/i, /mikuni/i, /bing/i],
		},
		{ key: "chain", patterns: [/chain(?!\s+spray)/i] },
		{ key: "sprocket", patterns: [/sprocket/i, /cog/i] },
		{ key: "brake pad", patterns: [/brake\s+pad/i, /brake\s+block/i] },
		{ key: "spark plug", patterns: [/spark\s+plug/i] },
		{ key: "exhaust", patterns: [/exhaust/i, /muffler/i, /silencer/i] },
		{ key: "filter", patterns: [/filter/i] },
		{ key: "tire", patterns: [/tire/i, /tyre/i] },
	];

	for (const category of categories) {
		for (const pattern of category.patterns) {
			if (pattern.test(name)) {
				return category.key;
			}
		}
	}

	return null;
}

function extractCompatibility(productName: string): string[] {
	const compatibility: string[] = [];
	const name = productName.toLowerCase();

	// Vehicle brand patterns
	const vehicleBrands = [
		"aprilia",
		"derbi",
		"honda",
		"yamaha",
		"suzuki",
		"kawasaki",
		"ktm",
		"husqvarna",
		"beta",
		"sherco",
		"rieju",
		"peugeot",
		"mbk",
		"piaggio",
		"vespa",
		"gilera",
		"minarelli",
	];

	// Engine type patterns
	const engineTypes = [
		"am6",
		"am345",
		"am5",
		"dt50",
		"dt125",
		"yz85",
		"cr85",
		"sx50",
		"sx65",
		"sx85",
		"tc50",
		"tc65",
		"tc85",
	];

	for (const brand of vehicleBrands) {
		if (name.includes(brand)) {
			compatibility.push(brand.charAt(0).toUpperCase() + brand.slice(1));
		}
	}

	for (const engine of engineTypes) {
		if (name.includes(engine)) {
			compatibility.push(engine.toUpperCase());
		}
	}

	return compatibility;
}

async function generateProductDescription(
	productName: string,
	brandName?: string,
): Promise<{
	description: string;
	specs: Record<string, string>;
	confidence: number;
}> {
	const partCategory = detectPartCategory(productName);
	const specifications = extractSpecifications(productName);
	const compatibility = extractCompatibility(productName);

	let description = "";
	let confidence = 0.5; // Base confidence

	if (partCategory && DESCRIPTION_TEMPLATES[partCategory as keyof typeof DESCRIPTION_TEMPLATES]) {
		const template = DESCRIPTION_TEMPLATES[partCategory as keyof typeof DESCRIPTION_TEMPLATES];

		// Build description from template
		description = template.template;

		// Replace placeholders
		description = description.replace("{brand}", brandName || "Quality");
		description = description.replace(
			"{application}",
			compatibility.length > 0
				? compatibility.join(", ")
				: "compatible motorcycles",
		);

		// Build specifications text
		const specTexts: string[] = [];
		for (const spec of template.keySpecs) {
			if (specifications[spec]) {
				specTexts.push(`${spec}: ${specifications[spec]}`);
			}
		}

		// Add general specifications
		const otherSpecs = Object.entries(specifications)
			.filter(([key]) => !template.keySpecs.includes(key))
			.map(([key, value]) => `${key}: ${value}`);

		specTexts.push(...otherSpecs);

		const specificationsText =
			specTexts.length > 0
				? `Specifications include ${specTexts.join(", ")}`
				: "engineered to OEM standards";

		description = description.replace("{specifications}", specificationsText);
		description = description.replace(
			"{compatibility}",
			compatibility.length > 0
				? `${compatibility.join(", ")} models`
				: "various motorcycle models",
		);

		// Calculate confidence based on available information
		confidence = 0.6;
		if (brandName) confidence += 0.1;
		if (Object.keys(specifications).length > 0) confidence += 0.1;
		if (compatibility.length > 0) confidence += 0.1;
		if (Object.keys(specifications).length > 2) confidence += 0.1;
	} else {
		// Generate generic description
		const productType = partCategory || "motorcycle part";
		description = `High-quality ${brandName || ""} ${productType} for motorcycle applications. `;

		if (Object.keys(specifications).length > 0) {
			const specList = Object.entries(specifications)
				.map(([key, value]) => `${key}: ${value}`)
				.join(", ");
			description += `Features ${specList}. `;
		}

		if (compatibility.length > 0) {
			description += `Compatible with ${compatibility.join(", ")} models. `;
		}

		description += "Engineered for reliable performance and durability.";

		confidence = 0.4;
		if (brandName) confidence += 0.1;
		if (Object.keys(specifications).length > 0) confidence += 0.1;
		if (compatibility.length > 0) confidence += 0.1;
	}

	return {
		description: description.trim(),
		specs: specifications,
		confidence,
	};
}

async function bulkGenerateDescriptions(limit = 1000, dryRun = false) {
	console.log(
		`🔍 Starting bulk description generation ${dryRun ? "(DRY RUN)" : ""}...`,
	);
	console.log(`   Processing ${limit} products per batch\n`);

	let processed = 0;
	let updated = 0;
	let offset = 0;
	const batchSize = 50; // Smaller batches for description generation
	const results: ProductDescriptionResult[] = [];

	while (processed < limit) {
		// Get products without descriptions, preferably with brand names
		const products = await db
			.select({
				id: product.id,
				name: product.name,
				brandId: product.brandId,
				description: product.description,
			})
			.from(product)
			.where(isNull(product.description))
			.limit(batchSize)
			.offset(offset);

		if (products.length === 0) {
			break;
		}

		console.log(
			`📦 Processing batch ${Math.floor(offset / batchSize) + 1} (${products.length} products)...`,
		);

		// Get brand names for products that have brand IDs
		const productBrandIds = products
			.filter((p) => p.brandId)
			.map((p) => p.brandId!);

		const brands =
			productBrandIds.length > 0
				? await db
						.select({ id: brand.id, name: brand.name })
						.from(brand)
						.where(inArray(brand.id, productBrandIds))
				: [];

		const brandMap = new Map(brands.map((b) => [b.id, b.name]));

		const descriptionUpdates: { productId: string; description: string }[] = [];

		for (const prod of products) {
			const brandName = prod.brandId ? brandMap.get(prod.brandId) : undefined;

			const generated = await generateProductDescription(prod.name, brandName);

			if (generated.confidence >= 0.5) {
				const result: ProductDescriptionResult = {
					productId: prod.id,
					originalName: prod.name,
					generatedDescription: generated.description,
					extractedSpecs: generated.specs,
					confidence: generated.confidence,
				};

				results.push(result);

				if (!dryRun) {
					descriptionUpdates.push({
						productId: prod.id,
						description: generated.description,
					});
				}
			}

			processed++;
		}

		// Update products with descriptions
		if (descriptionUpdates.length > 0 && !dryRun) {
			for (const update of descriptionUpdates) {
				await db
					.update(product)
					.set({ description: update.description })
					.where(eq(product.id, update.productId));
			}
			updated += descriptionUpdates.length;
		}

		offset += batchSize;

		if (processed >= limit) break;

		// Small delay to avoid overwhelming the system
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	// Summary report
	console.log(`\n${"=".repeat(80)}`);
	console.log("📊 DESCRIPTION GENERATION SUMMARY");
	console.log("=".repeat(80));
	console.log(`   Processed: ${processed.toLocaleString()} products`);
	console.log(`   Descriptions generated: ${results.length.toLocaleString()}`);
	console.log(`   Products updated: ${updated.toLocaleString()}`);
	console.log(
		`   Success rate: ${((results.length / processed) * 100).toFixed(1)}%\n`,
	);

	// Quality analysis
	const highQuality = results.filter((r) => r.confidence >= 0.8).length;
	const mediumQuality = results.filter(
		(r) => r.confidence >= 0.6 && r.confidence < 0.8,
	).length;
	const lowQuality = results.filter((r) => r.confidence < 0.6).length;

	console.log("📈 QUALITY DISTRIBUTION:");
	console.log(`   High quality (80%+): ${highQuality.toLocaleString()}`);
	console.log(`   Medium quality (60-79%): ${mediumQuality.toLocaleString()}`);
	console.log(`   Low quality (<60%): ${lowQuality.toLocaleString()}\n`);

	// Show some examples
	console.log("📋 GENERATED DESCRIPTIONS EXAMPLES:");
	results.slice(0, 5).forEach((result, index) => {
		console.log(`\n   ${index + 1}. "${result.originalName}"`);
		console.log(`      → ${result.generatedDescription}`);
		console.log(`      Confidence: ${(result.confidence * 100).toFixed(0)}%`);
		if (Object.keys(result.extractedSpecs).length > 0) {
			console.log(
				`      Specs: ${Object.entries(result.extractedSpecs)
					.map(([k, v]) => `${k}=${v}`)
					.join(", ")}`,
			);
		}
	});

	return results;
}

async function main() {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run");
	const limitArg = args.find((arg) => arg.startsWith("--limit="));
	const limit = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : 1000;

	try {
		console.log("🚀 Starting bulk description generation process...\n");

		if (dryRun) {
			console.log(
				"⚠️  DRY RUN MODE - No changes will be made to the database\n",
			);
		}

		await bulkGenerateDescriptions(limit, dryRun);

		console.log("\n✅ Description generation completed!");
	} catch (error) {
		console.error("❌ Error during description generation:", error);
		process.exit(1);
	}
}

// Export the main function for API usage
export { bulkGenerateDescriptions };
export default bulkGenerateDescriptions;

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
