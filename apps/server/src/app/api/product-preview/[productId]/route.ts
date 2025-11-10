import { db } from "../../../db/index";
import { productEnrichment } from "../../../db/schema/tables/product_enrichment";
import { product } from "../../../db/schema/tables/product";
import { productVariant } from "../../../db/schema/tables/product_variant";
import { eq } from "drizzle-orm";
import { processEnrichmentContent, injectPlaceholders } from "../../../lib/markdown";
import { NextResponse } from "next/server";

export async function GET(
	request: Request,
	{ params }: { params: { productId: string } },
) {
	const { productId } = params;

	// Get product and enrichment
	const [p] = await db
		.select()
		.from(product)
		.where(eq(product.id, productId))
		.limit(1);

	if (!p) {
		return NextResponse.json({ error: "Product not found" }, { status: 404 });
	}

	const [enrichment] = await db
		.select()
		.from(productEnrichment)
		.where(eq(productEnrichment.productId, productId))
		.limit(1);

	if (!enrichment) {
		return NextResponse.json(
			{ error: "Enrichment not found" },
			{ status: 404 },
		);
	}

	// Get variant for placeholder data
	const [variant] = await db
		.select()
		.from(productVariant)
		.where(eq(productVariant.productId, productId))
		.limit(1);

	// Process enrichment content
	const content = enrichment.content as {
		frontMatter?: Record<string, unknown>;
		markdown: string;
		renderedHtml?: string;
	};

	const processed = await processEnrichmentContent(content);

	// Inject placeholders
	const placeholders = {
		price: variant?.priceCents ? (variant.priceCents / 100).toFixed(2) : "N/A",
		stock: variant?.stockQty ?? 0,
		availability: variant?.status ? "In Stock" : "Out of Stock",
	};

	const finalHtml = injectPlaceholders(
		processed.renderedHtml || "",
		placeholders,
	);

	// Return HTML
	return new NextResponse(finalHtml, {
		headers: {
			"Content-Type": "text/html",
		},
	});
}
