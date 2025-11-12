import { describe, expect, it } from "bun:test";
import {
	createExtractionContext,
	extractAttributes,
} from "../services/attributeExtraction/engine";

const context = createExtractionContext();

describe("attribute extraction engine", () => {
	it("extracts cylinder metrics with correct units", () => {
		const outcome = extractAttributes(
			{
				name: "Cylinder Baotian/Kymco/GY6 70cc 47mm",
				description: "Komplett cylinderkit med 47 mm borr och 70 cc volym.",
				categories: ["Cylinder"],
			},
			context,
		);

		const diameter = outcome.attributes.find((attr) => attr.slug === "cylinder.diameter");
		const displacement = outcome.attributes.find((attr) => attr.slug === "cylinder.displacement");

		expect(diameter).toBeTruthy();
		expect(diameter?.values[0].normalizedValue).toBeCloseTo(47);
		expect(diameter?.values[0].unit).toBe("mm");

		expect(displacement).toBeTruthy();
		expect(displacement?.values[0].normalizedValue).toBeCloseTo(70);
		expect(displacement?.values[0].unit).toBe("cc");
	});

	it("recognises brand synonyms and compatibility models", () => {
		const outcome = extractAttributes(
			{
				name: "Bakljus Sachs Transport 1187 + 1188",
				description:
					"Passar MCB Compact och Sachs Transport modellerna. Konstruktion i aluminium.",
				categories: ["Belysning / Blinkers", "Moped - MC"],
			},
			context,
		);

		const brand = outcome.attributes.find((attr) => attr.slug === "brand.oem");
		const compatibility = outcome.attributes.find(
			(attr) => attr.slug === "compatibility.model",
		);

		expect(brand).toBeTruthy();
		expect(brand?.values.map((value) => value.normalizedValue)).toContain("Sachs");

		expect(compatibility).toBeTruthy();
		expect(
			compatibility?.values.map((value) => value.normalizedValue),
		).toEqual(expect.arrayContaining(["Transport", "Compact"]));
	});
});
