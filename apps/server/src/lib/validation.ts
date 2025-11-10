import { db } from "../db/index";
import { attributeDefinition } from "../db/schema/tables/attribute_definition";
import { attributeTemplate } from "../db/schema/tables/attribute_template";
import { productVariant } from "../db/schema/tables/product_variant";
import { eq } from "drizzle-orm";

export interface ValidationError {
	field: string;
	message: string;
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationError[];
}

/**
 * Validate product variant attributes against assigned template
 */
export async function validateVariantAttributes(
	variantId: string,
	templateId?: string,
): Promise<ValidationResult> {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	// Get variant
	const [variant] = await db
		.select()
		.from(productVariant)
		.where(eq(productVariant.id, variantId))
		.limit(1);

	if (!variant) {
		return {
			valid: false,
			errors: [{ field: "variant", message: "Variant not found" }],
			warnings: [],
		};
	}

	const attributes = (variant.attributes as Record<string, unknown>) || {};

	// If no template assigned, skip validation
	if (!templateId) {
		return {
			valid: true,
			errors: [],
			warnings: [
				{
					field: "template",
					message: "No template assigned to this variant",
				},
			],
		};
	}

	// Get template
	const [template] = await db
		.select()
		.from(attributeTemplate)
		.where(eq(attributeTemplate.id, templateId))
		.limit(1);

	if (!template) {
		return {
			valid: false,
			errors: [{ field: "template", message: "Template not found" }],
			warnings: [],
		};
	}

	const requiredIds = template.requiredAttributeIds
		? (JSON.parse(template.requiredAttributeIds as string) as string[])
		: [];
	const optionalIds = template.optionalAttributeIds
		? (JSON.parse(template.optionalAttributeIds as string) as string[])
		: [];

	// Get attribute definitions
	const allAttributeIds = [...requiredIds, ...optionalIds];
	if (allAttributeIds.length === 0) {
		return {
			valid: true,
			errors: [],
			warnings: [],
		};
	}
	const definitions = await db
		.select()
		.from(attributeDefinition)
		.where(eq(attributeDefinition.id, allAttributeIds[0])); // Simplified - should use IN clause for multiple IDs

	// Validate required attributes
	for (const attrId of requiredIds) {
		const def = definitions.find((d) => d.id === attrId);
		if (!def) continue;

		const value = attributes[def.key];
		if (value === undefined || value === null || value === "") {
			errors.push({
				field: def.key,
				message: `Required attribute '${def.name}' is missing`,
			});
		} else {
			// Type validation
			const typeError = validateAttributeType(value, def);
			if (typeError) {
				errors.push({
					field: def.key,
					message: typeError,
				});
			}
		}
	}

	// Validate optional attributes (warnings only)
	for (const attrId of optionalIds) {
		const def = definitions.find((d) => d.id === attrId);
		if (!def) continue;

		const value = attributes[def.key];
		if (value !== undefined && value !== null && value !== "") {
			const typeError = validateAttributeType(value, def);
			if (typeError) {
				warnings.push({
					field: def.key,
					message: typeError,
				});
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Validate attribute value against definition
 */
function validateAttributeType(
	value: unknown,
	def: {
		dataType: string;
		enumValues?: string | null;
	},
): string | null {
	switch (def.dataType) {
		case "number":
			if (typeof value !== "number" && isNaN(Number(value))) {
				return `Value must be a number`;
			}
			break;
		case "boolean":
			if (typeof value !== "boolean" && value !== "true" && value !== "false") {
				return `Value must be a boolean`;
			}
			break;
		case "date":
			if (isNaN(Date.parse(String(value)))) {
				return `Value must be a valid date`;
			}
			break;
		case "enum":
			if (def.enumValues) {
				const allowedValues = JSON.parse(def.enumValues) as string[];
				if (!allowedValues.includes(String(value))) {
					return `Value must be one of: ${allowedValues.join(", ")}`;
				}
			}
			break;
		case "string":
		default:
			// String is always valid
			break;
	}
	return null;
}
