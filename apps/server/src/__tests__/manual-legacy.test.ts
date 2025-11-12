import { describe, expect, it } from "bun:test";
import {
	buildLegacyAttributeSnapshot,
	buildLegacyManualSnapshot,
	createExtractionContext,
	extractAttributes,
} from "../services/attributeExtraction/engine";

const context = createExtractionContext();

describe("legacy snapshot builders", () => {
	it("captures extracted attributes into legacy snapshot shape", () => {
		const outcome = extractAttributes(
			{
				name: "Förgasare 18mm Baotian",
				description: "Insug 18 mm, material aluminium.",
				categories: ["Förgasare"],
			},
			context,
		);

		const snapshot = buildLegacyAttributeSnapshot(outcome);
		expect(snapshot["carburetor.intake_size"]).toBeDefined();
		expect(snapshot["material.primary"]).toBeDefined();

		const intake = snapshot["carburetor.intake_size"] as Record<string, unknown>;
		expect(intake.value).toBeCloseTo(18);
		expect(intake.unit).toBe("mm");
	});

	it("builds manual snapshot preserving confidence and unit", () => {
		const snapshot = buildLegacyManualSnapshot(
			[
				{
					slug: "brand.oem",
					values: [{ value: "Honda", confidence: 0.8 }],
				},
				{
					slug: "cylinder.diameter",
					values: [{ value: 47, unit: "mm", confidence: 1 }],
				},
			],
			"2025-11-12T10:00:00.000Z",
		);

		expect(snapshot["brand.oem"]).toEqual({
			value: "Honda",
			values: undefined,
			unit: null,
			confidence: 0.8,
			source: "manual",
			extracted: false,
			updatedAt: "2025-11-12T10:00:00.000Z",
		});

		expect(snapshot["cylinder.diameter"]).toEqual({
			value: 47,
			values: undefined,
			unit: "mm",
			confidence: 1,
			source: "manual",
			extracted: false,
			updatedAt: "2025-11-12T10:00:00.000Z",
		});
	});
});
