#!/usr/bin/env bun

/**
 * Extract product attributes from product names and descriptions
 * Based on enrichment analysis patterns
 */

import { db } from "../db";
import { product, productVariant } from "../db/schema";
import { eq, isNull } from "drizzle-orm";

// Types for extracted attributes
interface ExtractedAttribute {
  name: string;
  value: string | number;
  confidence: number;
  source: 'name' | 'description';
}

interface ExtractedAttributes {
  [key: string]: {
    value: string | number;
    confidence: number;
    source: 'name' | 'description';
  };
}

// Extraction patterns based on enrichment analysis
const EXTRACTION_PATTERNS = {
  // Dimensions and measurements
  diameter: {
    regex: /(\d+)\s*mm/gi,
    transform: (value: string) => parseInt(value.replace(/[^\d]/g, '')),
    unit: 'mm',
    confidence: 0.9
  },

  displacement: {
    regex: /(\d+)\s*cc/gi,
    transform: (value: string) => parseInt(value.replace(/[^\d]/g, '')),
    unit: 'cc',
    confidence: 0.95
  },

  size: {
    regex: /(\d+)\s*(cm|mm|tum|")/gi,
    transform: (value: string) => {
      const match = value.match(/(\d+)\s*(cm|mm|tum|")/i);
      if (!match) return null;
      return {
        value: parseInt(match[1]),
        unit: match[2].toLowerCase()
      };
    },
    confidence: 0.8
  },

  // Technical specs
  horsePower: {
    regex: /(\d+)\s*(hk|hp)/gi,
    transform: (value: string) => parseInt(value.replace(/[^\d]/g, '')),
    unit: 'hp',
    confidence: 0.9
  },

  voltage: {
    regex: /(\d+)\s*v(?:\s|$|[^\w])/gi,
    transform: (value: string) => parseInt(value.replace(/[^\d]/g, '')),
    unit: 'V',
    confidence: 0.85
  },

  // Compatibility and brand
  model: {
    regex: /(BT\d+QT-\d+|MT\d+|MB\d+|QT\d+|GY6)/gi,
    transform: (value: string) => value.toUpperCase(),
    confidence: 0.95
  },

  brand: {
    regex: /(Honda|Yamaha|Suzuki|Kawasaki|Baotian|Kymco|Peugeot|Piaggio|Derbi|Aprilia|Gilera|Sachs)/gi,
    transform: (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
    confidence: 0.9
  },

  // Product attributes
  material: {
    regex: /(aluminium|stål|gjutjärn|plast|gummi|rostfritt|metall)/gi,
    transform: (value: string) => value.toLowerCase(),
    confidence: 0.8
  },

  color: {
    regex: /(svart|vit|röd|blå|grön|gul|silver|krom|vitt|svarta)/gi,
    transform: (value: string) => value.toLowerCase(),
    confidence: 0.7
  },

  position: {
    regex: /(fram|bak|höger|vänster|vänster\/höger|framre|bakre)/gi,
    transform: (value: string) => value.toLowerCase(),
    confidence: 0.85
  }
};

function extractAttributesFromText(text: string, source: 'name' | 'description'): ExtractedAttribute[] {
  const attributes: ExtractedAttribute[] = [];
  const lowerText = text.toLowerCase();

  for (const [attributeName, pattern] of Object.entries(EXTRACTION_PATTERNS)) {
    const matches = [...text.matchAll(pattern.regex)];

    if (matches.length > 0) {
      for (const match of matches) {
        const rawValue = match[1] || match[0];
        let transformedValue = pattern.transform(rawValue);

        if (transformedValue !== null && transformedValue !== undefined) {
          attributes.push({
            name: attributeName,
            value: transformedValue,
            confidence: pattern.confidence * (source === 'name' ? 1.0 : 0.8), // Names are more reliable
            source
          });
        }
      }
    }
  }

  return attributes;
}

function mergeAttributes(extractedAttrs: ExtractedAttribute[]): ExtractedAttributes {
  const merged: ExtractedAttributes = {};

  for (const attr of extractedAttrs) {
    const existing = merged[attr.name];

    if (!existing || attr.confidence > existing.confidence) {
      merged[attr.name] = {
        value: attr.value,
        confidence: attr.confidence,
        source: attr.source
      };
    }
  }

  return merged;
}

async function extractAttributesForProduct(productId: string, productName: string, productDescription?: string | null) {
  console.log(`Extracting attributes for product: ${productName}`);

  // Extract from name
  const nameAttributes = extractAttributesFromText(productName, 'name');

  // Extract from description if available
  const descAttributes = productDescription
    ? extractAttributesFromText(productDescription, 'description')
    : [];

  // Merge all extracted attributes
  const allAttributes = [...nameAttributes, ...descAttributes];
  const mergedAttributes = mergeAttributes(allAttributes);

  if (Object.keys(mergedAttributes).length > 0) {
    console.log(`  Found ${Object.keys(mergedAttributes).length} attributes:`,
      Object.entries(mergedAttributes).map(([key, attr]) =>
        `${key}: ${attr.value} (${(attr.confidence * 100).toFixed(0)}%)`
      ).join(', ')
    );

    return mergedAttributes;
  }

  return null;
}

async function updateProductVariantAttributes(variantId: string, attributes: ExtractedAttributes) {
  // Get existing attributes
  const [existingVariant] = await db
    .select({ attributes: productVariant.attributes })
    .from(productVariant)
    .where(eq(productVariant.id, variantId))
    .limit(1);

  const existingAttrs = (existingVariant?.attributes as any) || {};

  // Merge with existing attributes (prioritize existing manual entries)
  const updatedAttributes = {
    ...existingAttrs,
    ...Object.fromEntries(
      Object.entries(attributes).map(([key, attr]) => [
        key, {
          ...attr,
          extractedAt: new Date().toISOString(),
          extracted: true
        }
      ])
    )
  };

  // Update variant with new attributes
  await db
    .update(productVariant)
    .set({
      attributes: updatedAttributes,
      updatedAt: new Date()
    })
    .where(eq(productVariant.id, variantId));

  return updatedAttributes;
}

async function main() {
  console.log('🔍 Starting product attribute extraction...\n');

  // Get all products with their variants
  const products = await db
    .select({
      productId: product.id,
      productName: product.name,
      productDescription: product.description,
      variantId: productVariant.id,
      variantSku: productVariant.sku,
      currentAttributes: productVariant.attributes
    })
    .from(product)
    .innerJoin(productVariant, eq(product.id, productVariant.productId))
    .limit(100); // Process in batches to avoid overwhelming the system

  let processedCount = 0;
  let enrichedCount = 0;

  for (const prod of products) {
    try {
      // Skip if already has extensive attributes (manual entry)
      const currentAttrs = (prod.currentAttributes as any) || {};
      const manualAttributeCount = Object.keys(currentAttrs).filter(
        key => !currentAttrs[key]?.extracted
      ).length;

      if (manualAttributeCount > 5) {
        console.log(`⏭️ Skipping ${prod.productName} - already has ${manualAttributeCount} manual attributes`);
        processedCount++;
        continue;
      }

      // Extract attributes from product name and description
      const extractedAttributes = await extractAttributesForProduct(
        prod.productId,
        prod.productName,
        prod.productDescription
      );

      if (extractedAttributes) {
        await updateProductVariantAttributes(prod.variantId, extractedAttributes);
        enrichedCount++;
        console.log(`✅ Updated variant ${prod.variantSku}\n`);
      } else {
        console.log(`ℹ️ No attributes extracted for ${prod.productName}\n`);
      }

      processedCount++;

      // Add small delay to avoid overwhelming the database
      if (processedCount % 10 === 0) {
        console.log(`📊 Progress: ${processedCount}/${products.length} processed, ${enrichedCount} enriched`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error(`❌ Error processing product ${prod.productName}:`, error);
    }
  }

  console.log('\n🎉 Attribute extraction complete!');
  console.log(`📈 Results:`);
  console.log(`  - Products processed: ${processedCount}`);
  console.log(`  - Products enriched: ${enrichedCount}`);
  console.log(`  - Success rate: ${((enrichedCount / processedCount) * 100).toFixed(1)}%`);
}

// Run the script
if (import.meta.main) {
  main().catch(console.error);
}

export { extractAttributesFromText, mergeAttributes, extractAttributesForProduct };