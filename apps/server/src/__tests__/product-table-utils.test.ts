import { describe, expect, it } from "bun:test";
import { deriveEnrichmentState, mapStatusToLevel } from "@/lib/product-table";

describe("deriveEnrichmentState", () => {
	it("returns missing_attributes for empty or invalid JSON", () => {
		expect(deriveEnrichmentState("")).toBe("missing_attributes");
		expect(deriveEnrichmentState("not json")).toBe("missing_attributes");
	});

	it("returns missing_attributes when no attributes present", () => {
		const raw = JSON.stringify([{}]);
		expect(deriveEnrichmentState(raw)).toBe("missing_attributes");
	});

	it("returns machine_generated when only extracted attributes present", () => {
		const raw = JSON.stringify([{ a: { source: "extracted" } }]);
		expect(deriveEnrichmentState(raw)).toBe("machine_generated");
	});

	it("returns verified when any manual attribute is present", () => {
		const raw = JSON.stringify([{ a: { source: "manual" }, b: { source: "extracted" } }]);
		expect(deriveEnrichmentState(raw)).toBe("verified");
	});
});

describe("mapStatusToLevel", () => {
	it("maps active to success", () => {
		expect(mapStatusToLevel("active")).toBe("success");
	});
	it("maps inactive to warning", () => {
		expect(mapStatusToLevel("inactive")).toBe("warning");
	});
	it("maps anything else to error", () => {
		expect(mapStatusToLevel("archived")).toBe("error");
		expect(mapStatusToLevel(null)).toBe("error");
		expect(mapStatusToLevel(undefined)).toBe("error");
	});
});


