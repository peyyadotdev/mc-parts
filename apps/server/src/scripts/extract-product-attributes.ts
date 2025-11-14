#!/usr/bin/env bun

/**
 * Attribute extraction CLI.
 *
 * This script powers the enrichment pipeline by:
 *  - Converting product text into structured attributes using the extraction service
 *  - Persisting results into the new attribute tables (and legacy JSON snapshot for back-compat)
 *  - Emitting a concise run summary
 *
 * Usage examples:
 *  bun run apps/server/src/scripts/extract-product-attributes.ts
 *  bun run apps/server/src/scripts/extract-product-attributes.ts --limit=25 --dry-run
 *  bun run apps/server/src/scripts/extract-product-attributes.ts --variant=<uuid>
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
	category,
	product,
	productCategory,
	productVariant,
} from "../db/schema";
import {
	createExtractionContext,
	extractAttributes,
	persistExtractionResult,
	summarizeOutcome,
} from "../services/attributeExtraction/engine";

interface CliOptions {
	limit?: number;
	offset?: number;
	batchSize: number;
	dryRun: boolean;
	variantId?: string;
	reportPath?: string;
}

interface VariantRow {
	productId: string;
	variantId: string;
	variantSku: string | null;
	name: string;
	description: string | null;
	attributes: Record<string, unknown> | null;
}

const DEFAULT_BATCH_SIZE = 50;
const _DEFAULT_LIMIT = 250;

function parseArgs(): CliOptions {
	const args = process.argv.slice(2);
	let limit: number | undefined;
	let offset: number | undefined;
	let batchSize = DEFAULT_BATCH_SIZE;
	let dryRun = false;
	let variantId: string | undefined;
	let reportPath: string | undefined;

	for (const arg of args) {
		if (arg.startsWith("--limit=")) {
			limit = Number.parseInt(arg.split("=")[1] ?? "", 10);
		} else if (arg.startsWith("--offset=")) {
			offset = Number.parseInt(arg.split("=")[1] ?? "", 10);
		} else if (arg.startsWith("--batch-size=")) {
			batchSize = Number.parseInt(arg.split("=")[1] ?? "", 10);
		} else if (arg === "--dry-run") {
			dryRun = true;
		} else if (arg.startsWith("--variant=")) {
			variantId = arg.split("=")[1];
		} else if (arg.startsWith("--report=")) {
			reportPath = arg.split("=")[1];
		}
	}

	return {
		limit: Number.isFinite(limit) ? limit : undefined,
		offset: Number.isFinite(offset) ? offset : undefined,
		batchSize:
			Number.isFinite(batchSize) && batchSize > 0
				? batchSize
				: DEFAULT_BATCH_SIZE,
		dryRun,
		variantId,
		reportPath,
	};
}

async function fetchCategoriesByProduct(productIds: string[]) {
	if (!productIds.length) return new Map<string, string[]>();

	const rows = await db
		.select({
			productId: productCategory.productId,
			categoryName: category.name,
		})
		.from(productCategory)
		.innerJoin(category, eq(productCategory.categoryId, category.id))
		.where(inArray(productCategory.productId, productIds));

	const map = new Map<string, string[]>();
	for (const row of rows) {
		if (!row.categoryName) continue;
		const list = map.get(row.productId) ?? [];
		list.push(row.categoryName);
		map.set(row.productId, list);
	}
	return map;
}

async function fetchVariantBatch(options: {
	batchSize: number;
	offset: number;
	variantId?: string;
}) {
	const { batchSize, offset, variantId } = options;

	const query = db
		.select({
			productId: product.id,
			variantId: productVariant.id,
			variantSku: productVariant.sku,
			name: product.name,
			description: product.description,
			attributes: productVariant.attributes,
		})
		.from(product)
		.innerJoin(productVariant, eq(product.id, productVariant.productId))
		.orderBy(desc(productVariant.updatedAt))
		.limit(batchSize)
		.offset(offset);

	if (variantId) {
		return query.where(eq(productVariant.id, variantId));
	}

	return query;
}

async function main() {
	const options = parseArgs();
	const context = createExtractionContext();
	const runStartedAt = Date.now();
	const startTime = performance.now();

	console.log("🔍  Product attribute extraction");
	console.log(
		`    mode=${options.dryRun ? "dry-run" : "apply"} batchSize=${options.batchSize} limit=${options.limit ?? "∞"}${options.variantId ? ` variant=${options.variantId}` : ""}`,
	);

	let processed = 0;
	let updated = 0;
	let skipped = 0;
	let offset = options.offset ?? 0;
	let batches = 0;

	const attributeStats = new Map<
		string,
		{ count: number; values: number; topConfidence: number }
	>();

	while (true) {
		if (options.limit && processed >= options.limit) break;

		const remaining =
			options.limit != null
				? Math.max(options.limit - processed, 0)
				: options.batchSize;
		const batchSize = options.limit
			? Math.min(options.batchSize, remaining)
			: options.batchSize;

		const rows = await fetchVariantBatch({
			batchSize,
			offset,
			variantId: options.variantId,
		});

		if (!rows.length) break;

		const categories = await fetchCategoriesByProduct(
			rows.map((row) => row.productId),
		);

		for (const row of rows as VariantRow[]) {
			if (options.limit && processed >= options.limit) break;

			const categoryList = categories.get(row.productId) ?? [];

			const outcome = extractAttributes(
				{
					productId: row.productId,
					variantId: row.variantId,
					name: row.name,
					description: row.description,
					categories: categoryList,
					legacyAttributes: row.attributes as Record<string, unknown> | null,
				},
				context,
			);

			if (!outcome.attributes.length) {
				skipped++;
				processed++;
				continue;
			}

			const summary = summarizeOutcome(outcome);

			for (const attribute of summary.attributes) {
				const stat = attributeStats.get(attribute.slug) ?? {
					count: 0,
					values: 0,
					topConfidence: 0,
				};

				stat.count += 1;
				stat.values += attribute.count;
				stat.topConfidence = Math.max(
					stat.topConfidence,
					attribute.topConfidence,
				);

				attributeStats.set(attribute.slug, stat);
			}

			if (!options.dryRun) {
				await persistExtractionResult({
					db,
					context,
					variantId: row.variantId,
					outcome,
					overrideLegacyAttributes: true,
					existingLegacyAttributes: row.attributes as Record<
						string,
						unknown
					> | null,
				});
			}

			const matchSummary = summary.attributes
				.map((attribute) => `${attribute.slug}(${attribute.count})`)
				.join(", ");

			console.log(
				`✅ ${options.dryRun ? "[dry]" : "[save]"} ${row.variantSku ?? row.variantId} → ${matchSummary}`,
			);

			updated++;
			processed++;
		}

		batches++;
		offset += rows.length;

		if (rows.length < options.batchSize || options.variantId) {
			break;
		}
	}

	const durationMs = performance.now() - startTime;
	const topAttributes = Array.from(attributeStats.entries())
		.sort(([, a], [, b]) => b.count - a.count)
		.slice(0, 10);

	console.log("\n📊  Extraction summary");
	console.log(`    processed=${processed}`);
	console.log(`    updated=${updated}`);
	console.log(`    skipped=${skipped}`);
	console.log(`    batches=${batches}`);
	console.log(`    duration=${(durationMs / 1000).toFixed(1)}s`);

	if (topAttributes.length) {
		console.log("\n🏅  Top attributes:");
		for (const [slug, stat] of topAttributes) {
			console.log(
				`    ${slug.padEnd(30)} count=${String(stat.count).padStart(3)} values=${String(stat.values).padStart(3)} topConfidence=${(stat.topConfidence * 100).toFixed(1)}%`,
			);
		}
	}

	if (options.dryRun) {
		console.log("\n🚧 Dry run completed. No database changes were applied.");
	} else {
		console.log("\n💾 Extraction results persisted to database.");
	}

	const metrics = {
		runStartedAt: new Date(runStartedAt).toISOString(),
		durationMs,
		filters: {
			limit: options.limit ?? null,
			offset: options.offset ?? null,
			batchSize: options.batchSize,
			dryRun: options.dryRun,
			variantId: options.variantId ?? null,
		},
		processed,
		updated,
		skipped,
		batches,
		topAttributes: topAttributes.map(([slug, stat]) => ({
			slug,
			variantCount: stat.count,
			valueCount: stat.values,
			topConfidence: stat.topConfidence,
		})),
	};

	if (options.reportPath) {
		if (options.reportPath === "stdout") {
			console.log(JSON.stringify({ event: "extraction_summary", ...metrics }));
		} else {
			mkdirSync(dirname(options.reportPath), { recursive: true });
			writeFileSync(options.reportPath, JSON.stringify(metrics, null, 2));
			console.log(`📝 Metrics written to ${options.reportPath}`);
		}
	}
}

if (import.meta.main) {
	main().catch((error) => {
		console.error("❌ Extraction run failed", error);
		process.exitCode = 1;
	});
}
