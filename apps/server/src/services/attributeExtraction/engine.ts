import { and, eq, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { attributeDefinition as attributeDefinitionTable } from "../../db/schema/tables/attribute_definition";
import { productVariant } from "../../db/schema/tables/product_variant";
import { variantAttribute } from "../../db/schema/tables/variant_attribute";
import {
	ATTRIBUTE_TAXONOMY,
	type AttributeDefinition,
	type AttributeRegexPattern,
	type AttributeScope,
	type DictionaryEntry,
	type ModelDictionaryEntry,
	ATTRIBUTE_VERSION,
	compatibilityLinkageRules,
	manufacturerDictionary,
	modelDictionary,
} from "./taxonomy";

type SourceField = AttributeDefinition["sourceFields"][number];

export type ExtractionSourceField = SourceField | "inferred";

export interface ExtractionTarget {
	variantId?: string;
	productId?: string;
	name: string;
	description?: string | null;
	bullets?: string[];
	specSheet?: string[];
	categories?: string[];
	legacyAttributes?: Record<string, unknown> | null;
	metadata?: Record<string, unknown>;
}

export interface ExtractionOptions {
	categoryKeys?: string[];
	includeDebugMatches?: boolean;
}

export interface ExtractionHit {
	value: string | number | boolean | string[];
	rawValue: string;
	normalizedValue: string | number | boolean | string[];
	unit?: string | null;
	confidence: number;
	sourceField: ExtractionSourceField;
	ruleName: string;
	startIndex?: number;
	endIndex?: number;
	contextWindow?: string;
	dictionaryMatch?: string;
}

export interface AttributeExtraction {
	slug: string;
	values: ExtractionHit[];
	definition: AttributeDefinition;
	scope: AttributeScope;
}

export interface ExtractionOutcome {
	attributes: AttributeExtraction[];
	meta: {
		totalMatches: number;
		totalAttributes: number;
		fieldsEvaluated: ExtractionSourceField[];
		generatedAt: string;
		version: string;
	};
}

export interface AttributeExtractionContext {
	compiledAttributes: CompiledAttribute[];
	enumLookup: Map<string, { definition: AttributeDefinition; canonical: string }>;
	brandLookup: Map<string, DictionaryEntry>;
	modelLookup: Map<string, ModelDictionaryEntry>;
	categoryKeys: Map<string, string>;
	definitionBySlug: Map<string, AttributeDefinition>;
}

export interface ManualAttributeInput {
	slug: string;
	values: Array<{
		value: string | number | boolean;
		unit?: string | null;
		confidence?: number;
	}>;
}

interface CompiledAttribute {
	definition: AttributeDefinition;
	categoryKeys: Set<string>;
	regexRules: CompiledRegexRule[];
	enumCanonicalByKey: Map<string, { value: string; notes?: string | null }>;
}

interface CompiledRegexRule {
	name: string;
	regex: RegExp;
	config: AttributeRegexPattern;
}

const SOURCE_FIELD_WEIGHTS: Record<ExtractionSourceField, number> = {
	name: 1,
	description: 0.9,
	bullet: 0.85,
	spec_sheet: 0.95,
	manual_entry: 1,
	inferred: 0.7,
};

const DEFAULT_CONFIDENCE = 0.6;

const DEFAULT_CONTEXT_WINDOW = 40;

const categoryKey = (label: string) =>
	label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

const ensureGlobalFlags = (flags?: string) => {
	const normalized = flags ?? "gi";
	return normalized.includes("g") ? normalized : `${normalized}g`;
};

const clipWindow = (text: string, start: number, end: number, windowSize = DEFAULT_CONTEXT_WINDOW) => {
	const from = Math.max(0, start - windowSize);
	const to = Math.min(text.length, end + windowSize);
	return text.slice(from, to).trim();
};

export function createExtractionContext(): AttributeExtractionContext {
	const definitionBySlug = new Map<string, AttributeDefinition>();
	const compiledAttributes: CompiledAttribute[] = ATTRIBUTE_TAXONOMY.map((definition) => {
		definitionBySlug.set(definition.slug, definition);

		const categoryKeysSet = new Set<string>(
			definition.categoryApplicability?.map((label) => categoryKey(label)) ?? [],
		);

		const regexRules: CompiledRegexRule[] = (definition.regex ?? []).map((rule) => ({
			name: rule.name,
			regex: new RegExp(rule.pattern, ensureGlobalFlags(rule.flags)),
			config: rule,
		}));

		const enumCanonicalByKey = new Map<string, { value: string; notes?: string | null }>();
		if (definition.enumValues) {
			for (const option of definition.enumValues) {
				enumCanonicalByKey.set(option.value.toLowerCase(), {
					value: option.value,
					notes: option.notes ?? null,
				});
				for (const synonym of option.synonyms ?? []) {
					enumCanonicalByKey.set(synonym.toLowerCase(), {
						value: option.value,
						notes: option.notes ?? null,
					});
				}
			}
		}

		return {
			definition,
			categoryKeys: categoryKeysSet,
			regexRules,
			enumCanonicalByKey,
		};
	});

	const brandLookup = new Map<string, DictionaryEntry>();
	for (const entry of manufacturerDictionary) {
		brandLookup.set(entry.canonical.toLowerCase(), entry);
		for (const synonym of entry.synonyms ?? []) {
			brandLookup.set(synonym.toLowerCase(), entry);
		}
	}

	const modelLookup = new Map<string, ModelDictionaryEntry>();
	for (const entry of modelDictionary) {
		modelLookup.set(entry.raw.toLowerCase(), entry);
		modelLookup.set(entry.canonicalModel.toLowerCase(), entry);
	}

	const enumLookup = new Map<string, { definition: AttributeDefinition; canonical: string }>();
	for (const compiled of compiledAttributes) {
		for (const [key, value] of compiled.enumCanonicalByKey.entries()) {
			enumLookup.set(key, { definition: compiled.definition, canonical: value.value });
		}
	}

	const categoryKeysMap = new Map<string, string>();
	for (const attribute of compiledAttributes) {
		for (const key of attribute.categoryKeys) {
			categoryKeysMap.set(key, key);
		}
	}

	return {
		compiledAttributes,
		enumLookup,
		brandLookup,
		modelLookup,
		categoryKeys: categoryKeysMap,
		definitionBySlug,
	};
}

function normaliseValue(value: string, normalise?: AttributeRegexPattern["normalise"]) {
	switch (normalise) {
		case "uppercase":
			return value.toUpperCase();
		case "lowercase":
			return value.toLowerCase();
		case "titlecase":
			return value
				.toLowerCase()
				.replace(/\b\w/g, (s) => s.toUpperCase());
		case "numeric": {
			const numericValue = Number.parseFloat(value.replace(",", "."));
			return Number.isFinite(numericValue) ? numericValue : value;
		}
		default:
			return value.trim();
	}
}

function convertUnit(value: number, unit?: string | null, definitionUnit?: string | null) {
	if (!unit || !definitionUnit) return { value, unit };

	const from = unit.toLowerCase();
	const target = definitionUnit.toLowerCase();

	if (from === target) {
		return { value, unit: unit };
	}

	if (from === "cm" && target === "mm") {
		return { value: value * 10, unit: definitionUnit };
	}

	if (from === '"' || from === "tum") {
		const converted = target === "mm" ? value * 25.4 : value;
		return { value: Math.round(converted * 100) / 100, unit: definitionUnit };
	}

	return { value, unit };
}

function resolveEnumCanonical(
	compiled: CompiledAttribute,
	value: string,
	definition: AttributeDefinition,
) {
	const canonical = compiled.enumCanonicalByKey.get(value.toLowerCase());
	if (canonical) {
		return {
			canonical: canonical.value,
			dictionaryMatch: canonical.value,
		};
	}

	if (definition.slug === "brand.oem" || definition.slug === "brand.manufacturer") {
		return { canonical: value, dictionaryMatch: undefined };
	}

	return { canonical: value, dictionaryMatch: undefined };
}

function resolveBrandValue(value: string, context: AttributeExtractionContext) {
	const lookup = context.brandLookup.get(value.toLowerCase());
	if (!lookup) {
		return { canonical: value, dictionaryMatch: undefined };
	}
	return {
		canonical: lookup.canonical,
		dictionaryMatch: lookup.canonical,
	};
}

function resolveModelValue(value: string, context: AttributeExtractionContext) {
	const lookup = context.modelLookup.get(value.toLowerCase());
	if (!lookup) {
		return { canonical: value.toUpperCase(), dictionaryMatch: undefined };
	}
	return {
		canonical: lookup.canonicalModel,
		dictionaryMatch: `${lookup.canonicalModel} (${lookup.make})`,
	};
}

function applyValueResolution(
	value: unknown,
	definition: AttributeDefinition,
	context: AttributeExtractionContext,
	compiled: CompiledAttribute,
): { canonical: string | number | boolean | string[]; dictionaryMatch: string | undefined } {
	if (definition.slug === "brand.oem" || definition.slug === "brand.manufacturer") {
		if (typeof value === "string") {
			return resolveBrandValue(value, context);
		}
	}

	if (definition.slug === "compatibility.model") {
		if (typeof value === "string") {
			return resolveModelValue(value, context);
		}
	}

	if (definition.dataType === "enum" || definition.dataType === "multi_enum") {
		if (typeof value === "string") {
			return resolveEnumCanonical(compiled, value, definition);
		}
	}

	return { canonical: value as string | number | boolean | string[], dictionaryMatch: undefined };
}

function shouldEvaluateAttribute(
	definition: AttributeDefinition,
	field: ExtractionSourceField,
	productCategories?: string[],
) {
	if (definition.sourceFields && field !== "inferred" && !definition.sourceFields.includes(field)) {
		return false;
	}

	if (definition.scope === "category" && definition.categoryApplicability?.length) {
		if (!productCategories || productCategories.length === 0) return false;
		const keys = productCategories.map(categoryKey);
		const required = definition.categoryApplicability.map(categoryKey);
		return keys.some((key) => required.includes(key));
	}

	return true;
}

function computeConfidence(
	definition: AttributeDefinition,
	field: ExtractionSourceField,
) {
	const base = definition.defaultConfidence ?? DEFAULT_CONFIDENCE;
	const weight = SOURCE_FIELD_WEIGHTS[field] ?? 0.75;
	return Math.min(1, Number.parseFloat((base * weight).toFixed(3)));
}

function collectMatchesFromText(
	text: string,
	field: ExtractionSourceField,
	compiledAttribute: CompiledAttribute,
	definition: AttributeDefinition,
	context: AttributeExtractionContext,
) {
	const matches: ExtractionHit[] = [];
	for (const rule of compiledAttribute.regexRules) {
		for (const match of text.matchAll(rule.regex)) {
			if (!match || match[0] == null) continue;
			const rawValue =
				match.groups?.[rule.config.captureGroup ?? "value"] ??
				match[1] ??
				match[0];

			if (rawValue == null) continue;

			const unitCapture =
				match.groups?.[rule.config.unitCaptureGroup ?? "unit"] ?? null;

			let normalized = normaliseValue(String(rawValue), rule.config.normalise);
			let unit = unitCapture;

			if (definition.dataType === "number" && typeof normalized === "number") {
				const converted = convertUnit(normalized, unit, definition.unit);
				normalized = converted.value;
				unit = converted.unit ?? unit;
			}

			const resolved = applyValueResolution(
				normalized,
				definition,
				context,
				compiledAttribute,
			);

			const confidence = computeConfidence(definition, field);
			const startIndex = match.index ?? undefined;
			const endIndex = match.index != null ? match.index + match[0].length : undefined;

			matches.push({
				value: Array.isArray(resolved.canonical)
					? resolved.canonical
					: resolved.canonical,
				rawValue: String(rawValue),
				normalizedValue: resolved.canonical,
				unit: unit ?? definition.unit ?? null,
				confidence,
				sourceField: field,
				ruleName: rule.name,
				startIndex,
				endIndex,
				contextWindow:
					startIndex != null && endIndex != null
						? clipWindow(text, startIndex, endIndex)
						: undefined,
				dictionaryMatch: resolved.dictionaryMatch,
			});
		}
	}
	return matches;
}

export function extractAttributes(
	target: ExtractionTarget,
	context: AttributeExtractionContext,
	options: ExtractionOptions = {},
): ExtractionOutcome {
	const categories = options.categoryKeys ?? target.categories ?? [];
	const fieldsEvaluated: ExtractionSourceField[] = [];
	const matchesBySlug = new Map<string, ExtractionHit[]>();

	const evaluateField = (
		field: ExtractionSourceField,
		text?: string | null,
	) => {
		if (!text || !text.trim()) return;
		fieldsEvaluated.push(field);
		for (const compiled of context.compiledAttributes) {
			const definition = compiled.definition;
			if (!shouldEvaluateAttribute(definition, field, categories)) continue;
			const matches = collectMatchesFromText(text, field, compiled, definition, context);
			if (!matches.length) continue;
			const existing = matchesBySlug.get(definition.slug) ?? [];
			existing.push(...matches);
			matchesBySlug.set(definition.slug, existing);
		}
	};

	evaluateField("name", target.name);
	evaluateField("description", target.description);

	for (const bullet of target.bullets ?? []) {
		evaluateField("bullet", bullet);
	}

	for (const spec of target.specSheet ?? []) {
		evaluateField("spec_sheet", spec);
	}

	const attributes: AttributeExtraction[] = [];

	for (const [slug, hits] of matchesBySlug.entries()) {
		const definition = context.definitionBySlug.get(slug);
		if (!definition) continue;

		const deduped = dedupeHits(hits, definition);
		if (deduped.length === 0) continue;

		attributes.push({
			slug,
			values: deduped,
			definition,
			scope: definition.scope,
		});
	}

	return {
		attributes,
		meta: {
			totalMatches: Array.from(matchesBySlug.values()).reduce(
				(sum, hits) => sum + hits.length,
				0,
			),
			totalAttributes: attributes.length,
			fieldsEvaluated,
			generatedAt: new Date().toISOString(),
			version: ATTRIBUTE_VERSION,
		},
	};
}

function dedupeHits(hits: ExtractionHit[], definition: AttributeDefinition) {
	const map = new Map<string, ExtractionHit>();

	for (const hit of hits) {
		let key: string;
		if (definition.dataType === "number") {
			key = `${definition.slug}:${hit.normalizedValue}:${hit.unit ?? ""}`;
		} else if (definition.dataType === "boolean") {
			key = `${definition.slug}:${hit.normalizedValue}`;
		} else if (definition.dataType === "multi_enum") {
			key = `${definition.slug}:${String(hit.normalizedValue).toLowerCase()}`;
		} else if (typeof hit.normalizedValue === "string") {
			key = `${definition.slug}:${hit.normalizedValue.toLowerCase()}`;
		} else {
			key = `${definition.slug}:${JSON.stringify(hit.normalizedValue)}`;
		}

		const existing = map.get(key);
		if (!existing) {
			map.set(key, hit);
			continue;
		}

		if (hit.confidence > existing.confidence) {
			map.set(key, hit);
		}
	}

	return Array.from(map.values());
}

export function buildLegacyAttributeSnapshot(outcome: ExtractionOutcome) {
	const snapshot: Record<string, unknown> = {};
	for (const attribute of outcome.attributes) {
		if (!attribute.values.length) continue;
		const topValue = attribute.values.reduce((prev, curr) =>
			curr.confidence > prev.confidence ? curr : prev,
		);
		const valuePayload =
			attribute.definition.dataType === "multi_enum"
				? attribute.values.map((value) => value.normalizedValue)
				: topValue.normalizedValue;

		snapshot[attribute.slug] = {
			value: valuePayload,
			unit: topValue.unit ?? attribute.definition.unit ?? null,
			confidence: topValue.confidence,
			source: "extraction-service",
			sourceField: topValue.sourceField,
			extracted: true,
			extractedAt: outcome.meta.generatedAt,
			metadata: {
				rule: topValue.ruleName,
				dictionary: topValue.dictionaryMatch,
			},
		};
	}
	return snapshot;
}

interface PersistOptions {
	db: NodePgDatabase<any>;
	context: AttributeExtractionContext;
	variantId: string;
	outcome: ExtractionOutcome;
	overrideLegacyAttributes?: boolean;
	existingLegacyAttributes?: Record<string, unknown> | null;
	transaction?: Parameters<NodePgDatabase<any>["transaction"]>[0];
}

export async function persistExtractionResult({
	db,
	context,
	variantId,
	outcome,
	overrideLegacyAttributes = false,
	existingLegacyAttributes = null,
	transaction,
}: PersistOptions) {
	const slugs = outcome.attributes.map((attribute) => attribute.slug);
	if (!slugs.length) {
		return { inserted: 0, removed: 0, legacyUpdated: false };
	}

	const definitionRows = await db
		.select({
			id: attributeDefinitionTable.id,
			slug: attributeDefinitionTable.slug,
		})
		.from(attributeDefinitionTable)
		.where(inArray(attributeDefinitionTable.slug, slugs));

	const definitionIdBySlug = new Map(definitionRows.map((row) => [row.slug, row.id]));

	const runner: (cb: Parameters<NodePgDatabase<any>["transaction"]>[0]) => ReturnType<NodePgDatabase<any>["transaction"]> = transaction
		? transaction as any
		: (cb: Parameters<NodePgDatabase<any>["transaction"]>[0]) => db.transaction(cb);

	return runner(async (tx) => {
		let inserted = 0;
		let removed = 0;

		for (const attribute of outcome.attributes) {
			const definitionId = definitionIdBySlug.get(attribute.slug);
			if (!definitionId) continue;

			const deleteQuery: SQL[] = [
				eq(variantAttribute.variantId, variantId),
				eq(variantAttribute.attributeDefinitionId, definitionId),
				eq(variantAttribute.source, "extracted"),
			];

			const deleted = await tx
				.delete(variantAttribute)
				.where(and(...deleteQuery));

			removed += Number(deleted.rowCount ?? 0);

			const rows = attribute.values.map((value) => ({
				variantId,
				attributeDefinitionId: definitionId,
				valueText:
					attribute.definition.dataType === "string" ||
					attribute.definition.dataType === "enum" ||
					attribute.definition.dataType === "multi_enum"
						? String(value.normalizedValue)
						: null,
				valueNumber:
					attribute.definition.dataType === "number" &&
					typeof value.normalizedValue === "number"
						? value.normalizedValue
						: null,
				valueBoolean:
					attribute.definition.dataType === "boolean" &&
					typeof value.normalizedValue === "boolean"
						? value.normalizedValue
						: null,
				valueJson: null,
				unit: value.unit ?? attribute.definition.unit ?? null,
				confidence: String(value.confidence),
				source: "extracted" as const,
				sourceFields: [value.sourceField],
				extractedAt: new Date(outcome.meta.generatedAt),
				provenance: {
					raw: value.rawValue,
					rule: value.ruleName,
					context: value.contextWindow,
					dictionaryMatch: value.dictionaryMatch,
				},
			}));

			if (!rows.length) continue;

			const insertedRows = await tx.insert(variantAttribute).values(rows);
			inserted += Number(insertedRows.rowCount ?? rows.length);
		}

		let legacyUpdated = false;

		if (overrideLegacyAttributes) {
			const legacySnapshot = buildLegacyAttributeSnapshot(outcome);
			const existing = existingLegacyAttributes ?? {};
			const merged = {
				...(existing ?? {}),
				...legacySnapshot,
			};

			await tx
				.update(productVariant)
				.set({
					attributes: merged,
					updatedAt: new Date(),
				})
				.where(eq(productVariant.id, variantId));

			legacyUpdated = true;
		}

		return { inserted, removed, legacyUpdated };
	});
}

export function summarizeOutcome(outcome: ExtractionOutcome) {
	const summary = outcome.attributes.map((attribute) => ({
		slug: attribute.slug,
		count: attribute.values.length,
		topConfidence: Math.max(...attribute.values.map((value) => value.confidence)),
		values: attribute.values.map((value) => ({
			value: value.normalizedValue,
			confidence: value.confidence,
			sourceField: value.sourceField,
			unit: value.unit ?? attribute.definition.unit ?? null,
		})),
	}));

	return {
		totalAttributes: summary.length,
		totalValues: summary.reduce((sum, attribute) => sum + attribute.count, 0),
		attributes: summary,
		version: outcome.meta.version,
	};
}

export function getCompatibilityLinkageRules() {
	return compatibilityLinkageRules;
}

export function buildLegacyManualSnapshot(
	attributes: ManualAttributeInput[],
	timestamp = new Date().toISOString(),
) {
	const snapshot: Record<string, unknown> = {};
	for (const attribute of attributes) {
		if (attribute.values.length === 0) continue;
		const primary = attribute.values[0];
		const values = attribute.values.map((value) => value.value);
		snapshot[attribute.slug] = {
			value: attribute.values.length === 1 ? primary.value : values,
			values: attribute.values.length > 1 ? values : undefined,
			unit: primary.unit ?? null,
			confidence: primary.confidence ?? null,
			source: "manual",
			extracted: false,
			updatedAt: timestamp,
		};
	}
	return snapshot;
}

export async function persistManualAttributes({
	db,
	variantId,
	attributes,
	existingLegacyAttributes = null,
	clearSlugs = [],
}: {
	db: NodePgDatabase<any>;
	variantId: string;
	attributes: ManualAttributeInput[];
	existingLegacyAttributes?: Record<string, unknown> | null;
	clearSlugs?: string[];
}) {
	const slugsToDelete = Array.from(
		new Set([...attributes.map((attribute) => attribute.slug), ...clearSlugs]),
	);

	if (!attributes.length && slugsToDelete.length === 0) {
		return { inserted: 0, removed: 0 };
	}

	const definitionRows = await db
		.select({
			id: attributeDefinitionTable.id,
			slug: attributeDefinitionTable.slug,
			dataType: attributeDefinitionTable.dataType,
		})
		.from(attributeDefinitionTable)
		.where(inArray(attributeDefinitionTable.slug, slugsToDelete.length ? slugsToDelete : attributes.map((attribute) => attribute.slug)));

	const definitionBySlug = new Map(definitionRows.map((row) => [row.slug, row]));

	return db.transaction(async (tx) => {
		let removed = 0;
		if (definitionRows.length > 0) {
			const definitionIds = definitionRows.map((row) => row.id);
			const deleted = await tx
				.delete(variantAttribute)
				.where(
					and(
						eq(variantAttribute.variantId, variantId),
						inArray(variantAttribute.attributeDefinitionId, definitionIds),
						eq(variantAttribute.source, "manual"),
					),
				);
			removed = Number(deleted.rowCount ?? 0);
		}

		let inserted = 0;

		for (const attribute of attributes) {
			const definition = definitionBySlug.get(attribute.slug);
			if (!definition) continue;

			const rows = attribute.values.map((value) => ({
				variantId,
				attributeDefinitionId: definition.id,
				valueText:
					definition.dataType === "string" ||
					definition.dataType === "enum" ||
					definition.dataType === "multi_enum"
						? String(value.value)
						: null,
				valueNumber:
					definition.dataType === "number" && typeof value.value === "number"
						? value.value
						: null,
				valueBoolean:
					definition.dataType === "boolean" && typeof value.value === "boolean"
						? value.value
						: null,
				unit: value.unit ?? null,
				confidence: String(value.confidence ?? 1),
				source: "manual" as const,
				sourceFields: ["manual_entry"],
				extractedAt: null,
				provenance: { note: "manual_update" },
			}));

			if (!rows.length) continue;
			const res = await tx.insert(variantAttribute).values(rows);
			inserted += Number(res.rowCount ?? rows.length);
		}

		const timestamp = new Date().toISOString();

		const legacy = { ...(existingLegacyAttributes ?? {}) };
		for (const slug of slugsToDelete) {
			delete legacy[slug];
		}

		const manualSnapshot = buildLegacyManualSnapshot(attributes, timestamp);
		const merged = { ...legacy, ...manualSnapshot };

		await tx
			.update(productVariant)
			.set({
				attributes: merged,
				updatedAt: new Date(),
			})
			.where(eq(productVariant.id, variantId));

		return { inserted, removed };
	});
}
