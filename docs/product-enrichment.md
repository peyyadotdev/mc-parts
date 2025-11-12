# Product Enrichment Glossary & Taxonomy

_Updated: 2025-11-12_

This document describes the canonical attribute taxonomy, regex extraction rules, and reference dictionaries that power the Nyehandel product enrichment pipeline. It is the operational companion to `apps/server/src/services/attributeExtraction/taxonomy.ts`, which should remain the single source of truth for programmatic usage.

## 1. Attribute Taxonomy Overview

- **Universal attributes** apply to all product categories and capture core metadata such as brand, compatibility, materials, and vehicle position.
- **Category attributes** extend the universal set with domain-specific fields per product family (e.g. cylinder kits, carburettors, exhaust systems).
- Attributes are described by:
  - `slug` (stable identifier)
  - `label` (UI display text)
  - `dataType` (`string`, `number`, `boolean`, `enum`, `multi_enum`)
  - `importance` (`critical`, `high`, `medium`, `low`)
  - `unit` (where applicable, e.g. `mm`, `cc`, `hk`, `dB`)
  - `regex` definitions with named capture groups (defaults to `value`; optional `unit` groups)
  - Validation hints (acceptable ranges, integer-only constraints)
  - Default confidence scores used by the extraction service

All attributes are declared in `ATTRIBUTE_TAXONOMY` and grouped via `UNIVERSAL_ATTRIBUTES` and `CATEGORY_ATTRIBUTES`.

### 1.1 Universal Attribute Summary

| Slug | Label | Data Type | Description | Default Confidence |
| ---- | ----- | --------- | ----------- | ------------------ |
| `compatibility.model` | Compatible Model | `multi_enum` | Vehicle model/platform. Normalise via `modelDictionary`. | 0.55 |
| `brand.oem` | OEM Brand | `enum` | Vehicle make associated with the part. | 0.90 |
| `brand.manufacturer` | Part Manufacturer | `enum` | Aftermarket brand of the part itself. | 0.65 |
| `material.primary` | Primary Material | `enum` | Core construction material. | 0.70 |
| `position` | Vehicle Position | `enum` | Fitment location (front/back/left/right). | 0.75 |
| `color` | Colour | `enum` | Primary colour. | 0.60 |

### 1.2 Category Attribute Summary

| Category | Key Attributes (slug → label → unit/type → importance) |
| -------- | -------------------------------------------------------------------------------- |
| Cylinder | `cylinder.diameter` → Cylinder Bore Diameter → `mm`/`number` → **critical**<br>`cylinder.displacement` → Displacement → `cc`/`number` → **critical**<br>`cylinder.power_output` → Expected Power Output → `hk`/`number` → **high**<br>`cylinder.includes_piston` → Includes Piston → `boolean` → **high** |
| Förgasare | `carburetor.intake_size` → Intake Diameter → `mm`/`number` → **critical**<br>`carburetor.type` → Carburettor Type → `enum` → **high**<br>`carburetor.adjustment_type` → Adjustment Type → `enum` → **medium** |
| Avgassystem | `exhaust.type` → Exhaust Type → `enum` → **high**<br>`exhaust.sound_level` → Sound Level → `dB`/`number` → **medium**<br>`exhaust.mounting_type` → Mounting Type → `enum` → **medium** |
| Bromsdelar | `brake.disc_diameter` → Disc Diameter → `mm`/`number` → **critical**<br>`brake.pad_material` → Pad Material → `enum` → **high** |
| Eldelar/Belysning | `electrical.voltage` → Voltage → `V`/`number` → **high**<br>`electrical.wattage` → Wattage → `W`/`number` → **medium** |
| Vajrar/Styre | `wire.length` → Cable Length → `mm`/`number` → **medium** (normalise cm → mm downstream) |

## 2. Regex Extraction Rules

Regex strings are stored with named capture groups to facilitate downstream parsing and normalisation. All patterns reside within the taxonomy file.

- **Default Capture Group**: `value`. If unspecified, extraction services should use this name.
- **Unit Capture Group**: `unit`. When present, convert using unit-awareness (e.g. `"cm"` → multiply by 10 to mm).
- **Normalisation**: Each regex optionally specifies a `normalise` directive:
  - `uppercase` → convert string to uppercase (`BT50QT-9`)
  - `lowercase` → convert to lowercase (used before synonym matching)
  - `titlecase` → convert to Title Case (`Super 9`)
  - `numeric` → parse to float (respect comma/period decimals)

### 2.1 Compatibility Example

```
Regex name: model-with-dash
Pattern: \b(?<model>(?:BT|MT|MB|GY|YY|QT|RS|ZX)[0-9]{1,4}(?:[A-Z]{1,3})?(?:[-\s]?[0-9]{1,3})?)\b
Flags: gi
Normalise: uppercase
Sample: "BT50QT-9" → `compatibility.model = ["BT50QT-9"]`
```

### 2.2 Numeric Extraction Example

```
Regex name: diameter-mm
Pattern: \b(?<value>\d{2,3}(?:[.,]\d)?)\s?(?<unit>mm|millimeter)\b
Flags: gi
Normalise: numeric
Transforms:
  - "47mm" → value=47, unit=mm
  - "38,5 millimeter" → value=38.5, unit=mm
```

Extraction services must:
1. Compile regex with provided `flags`.
2. Read the named capture group (default `value` unless overridden).
3. Apply normalisation.
4. Map to canonical enums using synonym lists.
5. Assign `defaultConfidence` unless overridden by downstream validation.

## 3. Manufacturer & Part-Brand Dictionaries

Two complementary dictionaries aid normalisation:

### 3.1 `manufacturerDictionary`

Located in the taxonomy file as an array of `DictionaryEntry { canonical, synonyms, make, sources, notes }`.

- Canonical shown in UI & persisted in `brand` table.
- Synonyms capture noisy text variants (case-insensitive).
- `make` points to the `vehicle_model.make` value used by Drizzle.
- `sources` list datasets (currently `sample-2025-11-11`).
- `notes` include contextual cues (e.g. “frequently paired with BT50QT family”).

Example row:

```
{
  canonical: "Baotian",
  synonyms: ["baotian", "bt"],
  make: "Baotian",
  sources: ["sample-2025-11-11"],
  notes: "Common Swedish scooter make, frequently paired with BT50QT family."
}
```

### 3.2 `modelDictionary`

Maps raw model strings → canonical model slug → vehicle make. Contains the capture targets referenced by compatibility regex rules.

Example rows:

```
{ raw: "BT50QT-9", canonicalModel: "BT50QT-9", make: "Baotian", source: "name" }
{ raw: "Super 9", canonicalModel: "Super 9", make: "Kymco", source: "name" }
{ raw: "Compact", canonicalModel: "Compact", make: "MCB", source: "name" }
```

### 3.3 Linkage Rules

`compatibilityLinkageRules` bind brand slugs and model slugs to the Drizzle `vehicle_model` table. Rules define:

- `brandSlug`
- `modelSlugs` (`compatibility.model` values)
- `vehicleModelLookup` describing how to join (`make` column, `model` column)
- Optional `conditions` for future year/engine constraints

These rules power automated creation of `product_fitment` entries during extraction backfills.

## 4. Confidence & Validation Guidance

- **Default Confidence**: Use values set per attribute unless more granular scoring is calculated (e.g. multi-match fallback).
- **Validation**: Enforce the `min`, `max`, `step`, and `requireInteger` hints before persisting numeric values.
  - Cylinder diameter must be between 20–80 mm.
  - Cylinder displacement limited to 40–125 cc and integer.
  - Brake disc diameter allowed 80–320 mm.
  - Voltage enforced between 6–24 V.
  - Cable lengths normalised to mm; valid range 150–1500 mm.
- **Fallback Handling**:
  - Reject values outside range and flag for manual review.
  - If regex captures ambiguous units, convert to canonical units or discard with low confidence.

## 5. Source vs Derived Fields

- **Source Fields**: `name`, `description`, `bullet`, `spec_sheet`, `manual_entry`. Extraction needs to track where each value originated.
- **Derived Fields**:
  - `compatibility.model` → derived from name/description but stored as relationships via `compatibilityLinkageRules`.
  - `brand.oem` → derived from dictionaries; ensures joinable `brand` record.
  - `wire.length` → derived from cm/in inputs; convert to `mm`.
  - `material.primary`/`color` → derived via enum normalisation.

Persist both raw capture and derived canonical value for traceability. Include provenance metadata (`source`, `confidence`, optional `extractedAt`) when storing to the new attribute tables.

## 6. Operational Notes

- **Versioning**: `ATTRIBUTE_VERSION` exposed for cache invalidation. Update when adding/removing attributes or modifying regex patterns.
- **Extensibility**:
  - Add new categories by appending to `CATEGORY_ATTRIBUTES` with a unique slug prefix.
  - Extend dictionaries as new brands/models enter the catalogue.
  - Use `notes` fields to document temporary heuristics or data issues.
- **Testing**: Forthcoming tests (see plan) should reference this document to build fixtures covering:
  - Positive matches per regex (unit & decimal edge cases)
  - False positives trimmed by validation rules
  - Synonym normalisation for brands/materials/positions

## 7. Next Steps

1. **Schema Migration**: Introduce `attribute_definition`, `attribute_value`, and linking tables using slugs from this taxonomy.
2. **Extraction Service Refactor**: Consume `ATTRIBUTE_TAXONOMY` and dictionaries for consistent parsing, normalisation, and confidence scoring.
3. **Admin UI**: Surface taxonomy metadata (labels, units, enum options) to drive form controls and QA review.

Maintain this document alongside the taxonomy module to ensure engineering, data, and content teams share a consistent view of the enrichment model.
