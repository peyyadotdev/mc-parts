import { eq } from "drizzle-orm";
import { db, pool } from "../../db";
import {
	attributeCategory,
	attributeDefinition,
	enrichmentBrandDictionary,
	enrichmentCompatibilityRule,
	enrichmentModelDictionary,
} from "../../db/schema";
import {
	ATTRIBUTE_TAXONOMY,
	UNIVERSAL_ATTRIBUTES,
	manufacturerDictionary as manufacturerDictionarySource,
	modelDictionary as modelDictionarySource,
	compatibilityLinkageRules,
} from "../../services/attributeExtraction/taxonomy";

type AttributeDefinitionRow = typeof attributeDefinition.$inferInsert;

interface UpsertResult {
	id: string;
}

const now = new Date().toISOString();

function toCategoryKey(label: string): string {
	return label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function uniqueStrings(values: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const raw of values) {
		const value = raw.trim();
		if (!value) continue;
		const key = value.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(value);
	}
	return result;
}

async function seedAttributeDefinitions() {
	const definitions: AttributeDefinitionRow[] = ATTRIBUTE_TAXONOMY.map((def) => {
		const metadata: Record<string, unknown> = {
			version: { capturedAt: now },
		};
		if (def.notes) {
			metadata.notes = def.notes;
		}
		return {
			slug: def.slug,
			label: def.label,
			description: def.description,
			scope: def.scope,
			dataType: def.dataType,
			importance: def.importance,
			unit: def.unit ?? null,
			defaultConfidence: def.defaultConfidence ?? null,
			sourceFields: def.sourceFields ?? [],
			derivedFrom: def.derivedFrom ?? [],
			extractionRules: def.regex ?? [],
			enumValues: def.enumValues ?? null,
			validations: def.validations ?? null,
			metadata,
		};
	});

	await db.transaction(async (tx) => {
		for (const def of definitions) {
			const [record] = (await tx
				.insert(attributeDefinition)
				.values(def)
				.onConflictDoUpdate({
					target: attributeDefinition.slug,
					set: {
						label: def.label,
						description: def.description,
						scope: def.scope,
						dataType: def.dataType,
						importance: def.importance,
						unit: def.unit ?? null,
						defaultConfidence: def.defaultConfidence ?? null,
						sourceFields: def.sourceFields,
						derivedFrom: def.derivedFrom,
						extractionRules: def.extractionRules,
						enumValues: def.enumValues,
						validations: def.validations,
						metadata: def.metadata,
						updatedAt: new Date(),
					},
				})
				.returning({ id: attributeDefinition.id })) satisfies UpsertResult[];

			const attributeId = record?.id;
			if (!attributeId) continue;

			const taxonomyEntry = ATTRIBUTE_TAXONOMY.find((item) => item.slug === def.slug);
			if (!taxonomyEntry?.categoryApplicability?.length) {
				await tx
					.delete(attributeCategory)
					.where(eq(attributeCategory.attributeDefinitionId, attributeId));
				continue;
			}

			const categories = taxonomyEntry.categoryApplicability.map((label) => ({
				attributeDefinitionId: attributeId,
				categoryKey: toCategoryKey(label),
				metadata: { label, version: now },
			}));

			await tx
				.delete(attributeCategory)
				.where(eq(attributeCategory.attributeDefinitionId, attributeId));

			if (categories.length > 0) {
				await tx
					.insert(attributeCategory)
					.values(categories)
					.onConflictDoNothing();
			}
		}
	});
}

type BrandDictionaryRow = typeof enrichmentBrandDictionary.$inferInsert;

function buildBrandDictionary(): BrandDictionaryRow[] {
	const map = new Map<string, BrandDictionaryRow>();

	const addEntry = (entry: BrandDictionaryRow) => {
		const key = `${entry.type}:${entry.canonical.toLowerCase()}`;
		const existing = map.get(key);
		if (existing) {
			const mergedSynonyms = uniqueStrings([
				...(existing.synonyms as string[]),
				...(entry.synonyms as string[]),
			]);
			const mergedSources = uniqueStrings([
				...(existing.sources as string[]),
				...(entry.sources as string[]),
			]);
			map.set(key, {
				...existing,
				make: entry.make ?? existing.make ?? null,
				synonyms: mergedSynonyms,
				sources: mergedSources,
				notes: entry.notes ?? existing.notes ?? null,
			});
			return;
		}
		map.set(key, entry);
	};

	for (const entry of manufacturerDictionarySource) {
		addEntry({
			type: entry.make ? "oem" : "manufacturer",
			canonical: entry.canonical,
			make: entry.make ?? null,
			synonyms: entry.synonyms ?? [],
			sources: entry.sources ?? [],
			notes: entry.notes ?? null,
			metadata: {},
		});
	}

	const oemAttribute = UNIVERSAL_ATTRIBUTES.find(
		(attribute) => attribute.slug === "brand.oem",
	);
	if (oemAttribute?.enumValues) {
		for (const option of oemAttribute.enumValues) {
			addEntry({
				type: "oem",
				canonical: option.value,
				make: option.value,
				synonyms: option.synonyms ?? [],
				sources: ["taxonomy:brand.oem"],
				notes: option.notes ?? null,
				metadata: {},
			});
		}
	}

	const manufacturerAttribute = UNIVERSAL_ATTRIBUTES.find(
		(attribute) => attribute.slug === "brand.manufacturer",
	);
	if (manufacturerAttribute?.enumValues) {
		for (const option of manufacturerAttribute.enumValues) {
			addEntry({
				type: "manufacturer",
				canonical: option.value,
				make: null,
				synonyms: option.synonyms ?? [],
				sources: ["taxonomy:brand.manufacturer"],
				notes: option.notes ?? null,
				metadata: {},
			});
		}
	}

	return Array.from(map.values()).map((entry) => ({
		...entry,
		synonyms: uniqueStrings(entry.synonyms as string[]),
		sources: uniqueStrings(entry.sources as string[]),
	}));
}

async function seedBrandDictionary() {
	const rows = buildBrandDictionary();
	await db.transaction(async (tx) => {
		for (const row of rows) {
			await tx
				.insert(enrichmentBrandDictionary)
				.values(row)
				.onConflictDoUpdate({
					target: [
						enrichmentBrandDictionary.type,
						enrichmentBrandDictionary.canonical,
					],
					set: {
						make: row.make ?? null,
						synonyms: row.synonyms,
						sources: row.sources,
						notes: row.notes ?? null,
						metadata: row.metadata,
						updatedAt: new Date(),
					},
				});
		}
	});
}

async function seedModelDictionary() {
	await db.transaction(async (tx) => {
		for (const entry of modelDictionarySource) {
			await tx
				.insert(enrichmentModelDictionary)
				.values({
					raw: entry.raw,
					canonicalModel: entry.canonicalModel,
					make: entry.make,
					source: entry.source,
					externalVehicleModelSlug: entry.externalVehicleModelSlug ?? null,
					metadata: {},
				})
				.onConflictDoUpdate({
					target: [
						enrichmentModelDictionary.raw,
						enrichmentModelDictionary.make,
					],
					set: {
						canonicalModel: entry.canonicalModel,
						source: entry.source,
						externalVehicleModelSlug: entry.externalVehicleModelSlug ?? null,
						metadata: {},
						updatedAt: new Date(),
					},
				});
		}
	});
}

async function seedCompatibilityRules() {
	await db.transaction(async (tx) => {
		for (const rule of compatibilityLinkageRules) {
			await tx
				.insert(enrichmentCompatibilityRule)
				.values({
					brandSlug: rule.brandSlug,
					modelSlugs: rule.modelSlugs,
					makeColumn: rule.vehicleModelLookup.makeColumn,
					modelColumn: rule.vehicleModelLookup.modelColumn,
					conditions: rule.conditions ?? [],
					metadata: {},
				})
				.onConflictDoUpdate({
					target: [enrichmentCompatibilityRule.brandSlug],
					set: {
						modelSlugs: rule.modelSlugs,
						makeColumn: rule.vehicleModelLookup.makeColumn,
						modelColumn: rule.vehicleModelLookup.modelColumn,
						conditions: rule.conditions ?? [],
						metadata: {},
						updatedAt: new Date(),
					},
				});
		}
	});
}

async function main() {
	console.log("Seeding attribute definitions...");
	await seedAttributeDefinitions();
	console.log("Seeding brand dictionary...");
	await seedBrandDictionary();
	console.log("Seeding model dictionary...");
	await seedModelDictionary();
	console.log("Seeding compatibility rules...");
	await seedCompatibilityRules();
	console.log("✅ Enrichment seed complete");
}

if (import.meta.main) {
	main()
		.catch((error) => {
			console.error("❌ Seed failed", error);
			process.exitCode = 1;
		})
		.finally(async () => {
			await pool.end();
		});
}
