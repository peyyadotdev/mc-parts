import { parseList, parseTimestamp } from "@/app/product-table/route";
import { describe, expect, it } from "bun:test";

describe("parseList", () => {
	it("returns undefined for null", () => {
		expect(parseList(null)).toBeUndefined();
	});
	it("splits comma lists and trims", () => {
		expect(parseList(" a, b ,c ")).toEqual(["a", "b", "c"]);
	});
	it("filters empty items", () => {
		expect(parseList("a,, ,b")).toEqual(["a", "b"]);
	});
});

describe("parseTimestamp", () => {
	it("returns undefined for null", () => {
		expect(parseTimestamp(null)).toBeUndefined();
	});
	it("returns undefined for non-numeric", () => {
		expect(parseTimestamp("abc")).toBeUndefined();
	});
	it("parses valid epoch ms", () => {
		const now = Date.now();
		const parsed = parseTimestamp(String(now));
		expect(parsed).toBeInstanceOf(Date);
		expect(parsed?.getTime()).toBe(now);
	});
});
