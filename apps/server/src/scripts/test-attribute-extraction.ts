#!/usr/bin/env bun

/**
 * Test attribute extraction on sample products from nyehandel
 * Run this to validate extraction patterns before applying to database
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { extractAttributesFromText, mergeAttributes } from './extract-product-attributes';

interface Product {
  id: number;
  name: string;
  description?: string | null;
  categories?: Array<{ name: string }>;
}

interface TestResult {
  productId: number;
  productName: string;
  categories: string[];
  extractedAttributes: Record<string, any>;
  attributeCount: number;
  confidence: number;
}

function testAttributeExtraction(products: Product[]): TestResult[] {
  const results: TestResult[] = [];

  for (const product of products) {
    // Extract from name
    const nameAttributes = extractAttributesFromText(product.name, 'name');

    // Extract from description if available
    const descAttributes = product.description
      ? extractAttributesFromText(product.description, 'description')
      : [];

    // Merge all extracted attributes
    const allAttributes = [...nameAttributes, ...descAttributes];
    const mergedAttributes = mergeAttributes(allAttributes);

    // Calculate average confidence
    const confidences = Object.values(mergedAttributes).map(attr => attr.confidence);
    const avgConfidence = confidences.length > 0
      ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
      : 0;

    const result: TestResult = {
      productId: product.id,
      productName: product.name,
      categories: product.categories?.map(c => c.name) || [],
      extractedAttributes: mergedAttributes,
      attributeCount: Object.keys(mergedAttributes).length,
      confidence: avgConfidence
    };

    results.push(result);
  }

  return results;
}

function analyzeResults(results: TestResult[]) {
  const stats = {
    totalProducts: results.length,
    productsWithAttributes: results.filter(r => r.attributeCount > 0).length,
    averageAttributesPerProduct: results.reduce((sum, r) => sum + r.attributeCount, 0) / results.length,
    averageConfidence: results
      .filter(r => r.confidence > 0)
      .reduce((sum, r) => sum + r.confidence, 0) / results.filter(r => r.confidence > 0).length,

    // Attribute frequency
    attributeFrequency: {} as Record<string, number>,

    // Category performance
    categoryPerformance: {} as Record<string, { products: number; avgAttributes: number; avgConfidence: number }>
  };

  // Count attribute frequency
  results.forEach(result => {
    Object.keys(result.extractedAttributes).forEach(attr => {
      stats.attributeFrequency[attr] = (stats.attributeFrequency[attr] || 0) + 1;
    });
  });

  // Analyze category performance
  results.forEach(result => {
    result.categories.forEach(category => {
      if (!stats.categoryPerformance[category]) {
        stats.categoryPerformance[category] = { products: 0, avgAttributes: 0, avgConfidence: 0 };
      }
      stats.categoryPerformance[category].products++;
      stats.categoryPerformance[category].avgAttributes += result.attributeCount;
      stats.categoryPerformance[category].avgConfidence += result.confidence;
    });
  });

  // Calculate averages for categories
  Object.keys(stats.categoryPerformance).forEach(category => {
    const cat = stats.categoryPerformance[category];
    cat.avgAttributes /= cat.products;
    cat.avgConfidence /= cat.products;
  });

  return stats;
}

function generateReport(results: TestResult[], stats: any) {
  const report = `# Attribute Extraction Test Report

## Overview

- **Total Products Tested**: ${stats.totalProducts}
- **Products with Extracted Attributes**: ${stats.productsWithAttributes} (${((stats.productsWithAttributes / stats.totalProducts) * 100).toFixed(1)}%)
- **Average Attributes per Product**: ${stats.averageAttributesPerProduct.toFixed(2)}
- **Average Confidence**: ${(stats.averageConfidence * 100).toFixed(1)}%

## Attribute Frequency

${Object.entries(stats.attributeFrequency)
  .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
  .map(([attr, count]) => `- **${attr}**: ${count} products`)
  .join('\n')}

## Category Performance

${Object.entries(stats.categoryPerformance)
  .sort((a: [string, any], b: [string, any]) => b[1].products - a[1].products)
  .map(([category, perf]: [string, any]) =>
    `- **${category}**: ${perf.products} products, avg ${perf.avgAttributes.toFixed(1)} attributes, ${(perf.avgConfidence * 100).toFixed(1)}% confidence`
  )
  .join('\n')}

## Top Examples

${results
  .filter(r => r.attributeCount > 3)
  .sort((a, b) => b.attributeCount - a.attributeCount)
  .slice(0, 10)
  .map(result => `
### ${result.productName} (ID: ${result.productId})
**Categories**: ${result.categories.join(', ')}
**Extracted Attributes** (${result.attributeCount}):
${Object.entries(result.extractedAttributes).map(([key, attr]: [string, any]) =>
  `- **${key}**: ${attr.value} (${(attr.confidence * 100).toFixed(0)}% confidence, from ${attr.source})`
).join('\n')}`)
  .join('\n')}

## Products with No Attributes

${results
  .filter(r => r.attributeCount === 0)
  .slice(0, 5)
  .map(result => `- **${result.productName}** (${result.categories.join(', ')})`)
  .join('\n')}

## Recommendations

1. **High Success Rate**: ${stats.productsWithAttributes} out of ${stats.totalProducts} products (${((stats.productsWithAttributes / stats.totalProducts) * 100).toFixed(1)}%) have extractable attributes.

2. **Best Categories**: ${Object.entries(stats.categoryPerformance)
  .filter(([_, perf]: [string, any]) => perf.avgAttributes > 2)
  .map(([category, _]) => category)
  .join(', ')} show excellent extraction potential.

3. **Pattern Improvements**: Consider enhancing patterns for products with zero attributes to improve coverage.

4. **Quality**: Average confidence of ${(stats.averageConfidence * 100).toFixed(1)}% indicates reliable extraction quality.
`;

  return report;
}

async function main() {
  console.log('🧪 Testing attribute extraction on sample products...\n');

  // Load sample data
  const dataDir = join(process.cwd(), 'data/nyehandel/sample-2025-11-11');
  const productFiles = ['avgassystem.json', 'forgasare.json', 'mixed-products.json'];

  const allProducts: Product[] = [];

  for (const file of productFiles) {
    try {
      const filePath = join(dataDir, file);
      const data = JSON.parse(readFileSync(filePath, 'utf8'));

      if (data.data && Array.isArray(data.data)) {
        allProducts.push(...data.data);
        console.log(`✓ Loaded ${data.data.length} products from ${file}`);
      }
    } catch (error) {
      console.log(`⚠️ Could not load ${file}:`, error.message);
    }
  }

  // Remove duplicates
  const uniqueProducts = Array.from(
    new Map(allProducts.map(p => [p.id, p])).values()
  );

  console.log(`\n📊 Testing extraction on ${uniqueProducts.length} unique products...\n`);

  // Run extraction test
  const results = testAttributeExtraction(uniqueProducts);

  // Analyze results
  const stats = analyzeResults(results);

  // Generate report
  const report = generateReport(results, stats);

  // Save results
  const timestamp = new Date().toISOString().split('T')[0];
  const outputDir = join(dataDir);

  writeFileSync(
    join(outputDir, `attribute-extraction-test-${timestamp}.json`),
    JSON.stringify({ results, stats }, null, 2)
  );

  writeFileSync(
    join(outputDir, `EXTRACTION-TEST-REPORT-${timestamp}.md`),
    report
  );

  console.log('✅ Test completed!\n');
  console.log('📄 Reports generated:');
  console.log(`  - JSON: attribute-extraction-test-${timestamp}.json`);
  console.log(`  - Report: EXTRACTION-TEST-REPORT-${timestamp}.md`);

  console.log('\n📈 Quick Stats:');
  console.log(`  - Success rate: ${((stats.productsWithAttributes / stats.totalProducts) * 100).toFixed(1)}%`);
  console.log(`  - Avg attributes/product: ${stats.averageAttributesPerProduct.toFixed(2)}`);
  console.log(`  - Avg confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`);
}

if (import.meta.main) {
  main().catch(console.error);
}