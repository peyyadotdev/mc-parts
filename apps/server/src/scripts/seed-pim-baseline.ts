import "dotenv/config";
import { db } from "../db/index";
import { attributeDefinition } from "../db/schema/tables/attribute_definition";
import { attributeTemplate } from "../db/schema/tables/attribute_template";
import { brand } from "../db/schema/tables/brand";
import { brandAlias } from "../db/schema/tables/brand_alias";
import { brandMetadata } from "../db/schema/tables/brand_metadata";
import { product } from "../db/schema/tables/product";
import { productEnrichment } from "../db/schema/tables/product_enrichment";
import { productVariant } from "../db/schema/tables/product_variant";

async function main() {
	console.log("Seeding PIM baseline data...");

	// 1. Create demo brands
	const [bmwBrand] = await db
		.insert(brand)
		.values({ name: "BMW", slug: "bmw" })
		.returning({ id: brand.id });
	console.log("Created brand: BMW");

	const [audiBrand] = await db
		.insert(brand)
		.values({ name: "Audi", slug: "audi" })
		.returning({ id: brand.id });
	console.log("Created brand: Audi");

	// 2. Create brand aliases
	await db.insert(brandAlias).values([
		{ brandId: bmwBrand.id, alias: "B.M.W.", status: "approved", priority: "10" },
		{ brandId: bmwBrand.id, alias: "Bayerische Motoren Werke", status: "approved", priority: "5" },
		{ brandId: audiBrand.id, alias: "AUDI", status: "approved", priority: "10" },
	]);
	console.log("Created brand aliases");

	// 3. Create brand metadata
	await db.insert(brandMetadata).values([
		{
			brandId: bmwBrand.id,
			description: "Bavarian Motor Works",
			websiteUrl: "https://www.bmw.com",
		},
		{
			brandId: audiBrand.id,
			description: "German luxury automotive manufacturer",
			websiteUrl: "https://www.audi.com",
		},
	]);
	console.log("Created brand metadata");

	// 4. Create attribute definitions
	const [weightAttr] = await db
		.insert(attributeDefinition)
		.values({
			key: "weight",
			name: "Weight",
			dataType: "number",
			unit: "kg",
			description: "Product weight in kilograms",
		})
		.returning({ id: attributeDefinition.id });

	const [colorAttr] = await db
		.insert(attributeDefinition)
		.values({
			key: "color",
			name: "Color",
			dataType: "enum",
			enumValues: JSON.stringify(["black", "white", "red", "blue", "silver"]),
			description: "Product color",
		})
		.returning({ id: attributeDefinition.id });

	const [materialAttr] = await db
		.insert(attributeDefinition)
		.values({
			key: "material",
			name: "Material",
			dataType: "string",
			description: "Primary material",
		})
		.returning({ id: attributeDefinition.id });

	console.log("Created attribute definitions");

	// 5. Create attribute template
	const [template] = await db
		.insert(attributeTemplate)
		.values({
			name: "Standard Product Template",
			description: "Basic template for automotive products",
			requiredAttributeIds: JSON.stringify([weightAttr.id]),
			optionalAttributeIds: JSON.stringify([colorAttr.id, materialAttr.id]),
			isActive: "true",
		})
		.returning({ id: attributeTemplate.id });
	console.log("Created attribute template");

	// 6. Create demo products
	const [demoProduct] = await db
		.insert(product)
		.values({
			brandId: bmwBrand.id,
			name: "BMW Brake Pad Set",
			slug: "bmw-brake-pad-set",
			description: "High-performance brake pad set for BMW vehicles",
			status: "active",
		})
		.returning({ id: product.id });
	console.log("Created demo product");

	// 7. Create product variant
	const [variant] = await db
		.insert(productVariant)
		.values({
			productId: demoProduct.id,
			sku: "BMW-BP-001",
			gtin: "1234567890123",
			attributes: JSON.stringify({
				weight: 2.5,
				color: "black",
				material: "ceramic",
			}),
			priceCents: 12999,
			currency: "SEK",
			stockQty: 50,
			status: true,
			weightGrams: 2500,
		})
		.returning({ id: productVariant.id });
	console.log("Created product variant");

	// 8. Create product enrichment
	await db.insert(productEnrichment).values({
		productId: demoProduct.id,
		content: JSON.stringify({
			frontMatter: {
				title: "BMW Brake Pad Set",
				metaDescription: "Premium brake pads for BMW vehicles",
				keywords: ["brake pads", "BMW", "automotive"],
			},
			markdown: `# BMW Brake Pad Set

Premium ceramic brake pads designed specifically for BMW vehicles.

## Features

- High-performance ceramic compound
- Reduced brake dust
- Extended lifespan
- Quiet operation

## Specifications

- Weight: 2.5 kg
- Material: Ceramic
- Color: Black`,
			renderedHtml: "",
		}),
		status: "draft",
		language: "en",
	});
	console.log("Created product enrichment");

	console.log("\n✅ PIM baseline seeding completed!");
	console.log("\nSummary:");
	console.log("- Brands: 2 (BMW, Audi)");
	console.log("- Brand aliases: 3");
	console.log("- Brand metadata: 2");
	console.log("- Attribute definitions: 3");
	console.log("- Attribute templates: 1");
	console.log("- Products: 1");
	console.log("- Product variants: 1");
	console.log("- Product enrichments: 1");
}

await main().catch((err) => {
	console.error("Error seeding:", err);
	process.exit(1);
});
