#!/usr/bin/env bun

/**
 * Extraction smoke-test runner.
 *
 * Loads the Nyehandel sample exports, executes the attribute extraction service,
 * and emits JSON/Markdown/HTML reports summarising coverage, confidence, and
 * top-performing categories. Intended for quick regression checks while
 * evolving the extraction engine.
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
	createExtractionContext,
	extractAttributes,
	summarizeOutcome,
} from "../services/attributeExtraction/engine";

interface NyehandelProduct {
	id: number;
	name: string;
	description?: string | null;
	short_description?: string | null;
	categories?: Array<{ name: string }>;
	specifications?: Array<{ name?: string; value?: string }>;
}

interface ExtractionTestResult {
	productId: number;
	productName: string;
	categories: string[];
	totalAttributes: number;
	totalValues: number;
	avgConfidence: number;
	summary: ReturnType<typeof summarizeOutcome>;
}

interface ExtractionStats {
	totalProducts: number;
	withAttributes: number;
	averageAttributes: number;
	averageValues: number;
	averageConfidence: number;
	attributeFrequency: Record<string, number>;
	categoryPerformance: Record<
		string,
		{ products: number; attributes: number; values: number; confidence: number }
	>;
}

const DATA_DIR = join(process.cwd(), "data/nyehandel/sample-2025-11-11");
const PRODUCT_FILES = ["avgassystem.json", "forgasare.json", "mixed-products.json"];

const stripHtml = (value?: string | null) =>
	value ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : undefined;

function toTestResult(
	product: NyehandelProduct,
	context = createExtractionContext(),
): ExtractionTestResult {
	const categories = product.categories?.map((cat) => cat.name).filter(Boolean) ?? [];
	const outcome = extractAttributes(
		{
			name: product.name ?? "",
			description: stripHtml(product.description ?? product.short_description),
			categories,
		},
		context,
	);

	const summary = summarizeOutcome(outcome);
	const confidences: number[] = [];

	for (const attribute of outcome.attributes) {
		for (const value of attribute.values) {
			confidences.push(value.confidence);
		}
	}

	const avgConfidence =
		confidences.length > 0
			? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
			: 0;

	return {
		productId: product.id,
		productName: product.name,
		categories,
		totalAttributes: summary.totalAttributes,
		totalValues: summary.totalValues,
		avgConfidence,
		summary,
	};
}

function computeStatistics(results: ExtractionTestResult[]): ExtractionStats {
	const totalProducts = results.length;
	const withAttributes = results.filter((result) => result.totalAttributes > 0).length;

	const aggregate = results.reduce(
		(state, result) => {
			state.attributes += result.totalAttributes;
			state.values += result.totalValues;
			state.confidence += result.avgConfidence;

			for (const attribute of result.summary.attributes) {
				state.attributeFrequency[attribute.slug] =
					(state.attributeFrequency[attribute.slug] ?? 0) + 1;
			}

			for (const category of result.categories) {
				const performance =
					state.categoryPerformance[category] ?? {
						products: 0,
						attributes: 0,
						values: 0,
						confidence: 0,
					};

				performance.products += 1;
				performance.attributes += result.totalAttributes;
				performance.values += result.totalValues;
				performance.confidence += result.avgConfidence;

				state.categoryPerformance[category] = performance;
			}

			return state;
		},
		{
			attributes: 0,
			values: 0,
			confidence: 0,
			attributeFrequency: {} as Record<string, number>,
			categoryPerformance: {} as ExtractionStats["categoryPerformance"],
		},
	);

	for (const category of Object.keys(aggregate.categoryPerformance)) {
		const performance = aggregate.categoryPerformance[category];
		if (performance.products > 0) {
			performance.attributes /= performance.products;
			performance.values /= performance.products;
			performance.confidence /= performance.products;
		}
	}

	return {
		totalProducts,
		withAttributes,
		averageAttributes: totalProducts ? aggregate.attributes / totalProducts : 0,
		averageValues: totalProducts ? aggregate.values / totalProducts : 0,
		averageConfidence: totalProducts ? aggregate.confidence / totalProducts : 0,
		attributeFrequency: aggregate.attributeFrequency,
		categoryPerformance: aggregate.categoryPerformance,
	};
}

function saveReports(results: ExtractionTestResult[], stats: ExtractionStats) {
	const timestamp = new Date().toISOString().split("T")[0];
	const reportDir = join(DATA_DIR, "reports");
	mkdirSync(reportDir, { recursive: true });

	const jsonPayload = {
		generatedAt: new Date().toISOString(),
		results,
		stats,
	};

	writeFileSync(
		join(reportDir, `attribute-extraction-test-${timestamp}.json`),
		JSON.stringify(jsonPayload, null, 2),
	);

	const markdownReport = renderMarkdownReport(results, stats);
	writeFileSync(
		join(reportDir, `ATTRIBUTE-EXTRACTION-REPORT-${timestamp}.md`),
		markdownReport,
	);

	const htmlReport = renderHtmlReport(markdownReport);
	writeFileSync(
		join(reportDir, `ATTRIBUTE-EXTRACTION-REPORT-${timestamp}.html`),
		htmlReport,
	);

	return { markdownReport, htmlReportPath: `reports/ATTRIBUTE-EXTRACTION-REPORT-${timestamp}.html` };
}

function renderMarkdownReport(results: ExtractionTestResult[], stats: ExtractionStats) {
	const attributeLines = Object.entries(stats.attributeFrequency)
		.sort(([, countA], [, countB]) => countB - countA)
		.map(([slug, count]) => `- **${slug}**: ${count} products`);

	const categoryLines = Object.entries(stats.categoryPerformance)
		.sort(([, a], [, b]) => b.products - a.products)
		.map(
			([category, performance]) =>
				`- **${category}**: ${performance.products} products, avg ${performance.attributes.toFixed(1)} attributes, ${(performance.confidence * 100).toFixed(1)}% confidence`,
		);

	const topProducts = results
		.filter((result) => result.totalAttributes > 0)
		.sort((a, b) => b.totalAttributes - a.totalAttributes)
		.slice(0, 10)
		.map(
			(result) => `
### ${result.productName} (ID: ${result.productId})
**Categories**: ${result.categories.join(", ") || "–"}
**Attributes Detected**: ${result.totalAttributes} (${(result.avgConfidence * 100).toFixed(1)}% avg confidence)
${result.summary.attributes
	.map(
		(attribute) =>
			`- ${attribute.slug}: ${attribute.values
				.map((value) => `${value.normalizedValue} (${(value.confidence * 100).toFixed(0)}%)`)
				.join(", ")}`,
	)
	.join("\n")}
`,
		)
		.join("\n");

	return `# Attribute Extraction QA Report

Generated: ${new Date().toISOString()}

## Overview

- **Products tested**: ${stats.totalProducts}
- **Products with attributes**: ${stats.withAttributes} (${(
		(stats.withAttributes / stats.totalProducts) *
		100
	).toFixed(1)}%)
- **Average attributes per product**: ${stats.averageAttributes.toFixed(2)}
- **Average values per product**: ${stats.averageValues.toFixed(2)}
- **Average confidence**: ${(stats.averageConfidence * 100).toFixed(1)}%

## Attribute Frequency

${attributeLines.join("\n")}

## Category Performance

${categoryLines.join("\n")}

## Top Examples

${topProducts}

## Recommendations

1. Prioritise categories with lower average attribute counts for pattern refinement.
2. Investigate attributes appearing with confidence below 0.6 to tighten regex or dictionary coverage.
3. Use the HTML report for a richer, filterable QA review with category drill-down.
`;
}

function renderHtmlReport(markdown: string) {
	const body = markdown
		.replace(/^# (.*)$/gm, "<h1>$1</h1>")
		.replace(/^## (.*)$/gm, "<h2>$1</h2>")
		.replace(/^### (.*)$/gm, "<h3>$1</h3>")
		.replace(/^- (.*)$/gm, "<li>$1</li>")
		.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
		.replace(/`([^`]+)`/g, "<code>$1</code>")
		.replace(/\n{2,}/g, "</p><p>")
		.replace(/<\/h\d><p>/g, "</h2><p>")
		.replace(/<p>(<li>.*<\/li>)<\/p>/g, "<ul>$1</ul>");

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<title>Attribute Extraction QA Report</title>
	<style>
		body { font-family: system-ui, sans-serif; margin: 3rem auto; max-width: 960px; line-height: 1.6; color: #1f2933; }
		h1, h2, h3 { color: #0f172a; }
		code { background: #e2e8f0; padding: 0.1rem 0.3rem; border-radius: 4px; }
		ul { padding-left: 1.2rem; }
		section { margin-bottom: 2rem; }
	</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>`;
}

async function main() {
	console.log("🧪 Attribute extraction smoke test\n");

	const context = createExtractionContext();
	const products: NyehandelProduct[] = [];

	for (const file of PRODUCT_FILES) {
		try {
			const payload = JSON.parse(
				readFileSync(join(DATA_DIR, file), "utf-8"),
			) as { data?: NyehandelProduct[] };
			if (Array.isArray(payload.data)) {
				products.push(...payload.data);
				console.log(`✓ Loaded ${payload.data.length} products from ${file}`);
			}
		} catch (error) {
			console.warn(`⚠️ Failed to load ${file}: ${(error as Error).message}`);
		}
	}

	const uniqueProducts = Array.from(new Map(products.map((p) => [p.id, p])).values());
	console.log(`\n📦 ${uniqueProducts.length} unique products queued for extraction\n`);

	const results = uniqueProducts.map((product) => toTestResult(product, context));
	const stats = computeStatistics(results);

	const { htmlReportPath } = saveReports(results, stats);

	console.log("\n✅ Extraction smoke test complete");
	console.log(
		`   Success rate: ${stats.totalProducts ? ((stats.withAttributes / stats.totalProducts) * 100).toFixed(1) : "0.0"}%`,
	);
	console.log(`   Avg attributes/product: ${stats.averageAttributes.toFixed(2)}`);
	console.log(`   Avg confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`);
	console.log(`   Reports written to data/nyehandel/sample-2025-11-11/${htmlReportPath.replace(/^reports\//, "reports/")}`);
}

if (import.meta.main) {
	main().catch((error) => {
		console.error("❌ Smoke test failed", error);
		process.exitCode = 1;
	});
}