import "dotenv/config";
import * as cheerio from "cheerio";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/index";
import { product } from "../db/schema/tables/product";
import { productFitment } from "../db/schema/tables/product_fitment";
import { productVariant } from "../db/schema/tables/product_variant";
import { vehicleModel } from "../db/schema/tables/vehicle_model";

const BASE = "https://mopeddelar.se";

function parseSetCookies(arr: string[]) {
	const jar: Record<string, string> = {};
	for (const c of arr) {
		const [kv] = c.split(";");
		const [k, v] = kv.split("=");
		jar[k.trim()] = v;
	}
	const xsrf = jar["XSRF-TOKEN"]
		? decodeURIComponent(jar["XSRF-TOKEN"])
		: undefined;
	const cookie = Object.entries(jar)
		.map(([k, v]) => `${k}=${v}`)
		.join("; ");
	return { cookie, xsrf };
}

async function primeSession() {
	const res = await fetch(`${BASE}/`, { redirect: "follow" });
	const setCookies = (res.headers as any).getSetCookie?.() || [];
	return parseSetCookies(setCookies);
}

async function req(path: string, jar: { cookie?: string; xsrf?: string }) {
	const headers: Record<string, string> = {
		Accept: "application/json",
		"X-Requested-With": "XMLHttpRequest",
		Referer: `${BASE}/`,
	};
	if (jar.cookie) headers.Cookie = jar.cookie;
	if (jar.xsrf) headers["X-XSRF-TOKEN"] = jar.xsrf;
	const res = await fetch(`${BASE}/${path}`, { headers, redirect: "follow" });
	const text = await res.text();
	let json: unknown;
	try {
		json = JSON.parse(text);
	} catch {
		json = text;
	}
	return { ok: res.ok, status: res.status, json };
}

async function postForm(
	path: string,
	form: Record<string, string>,
	jar: { cookie?: string; xsrf?: string },
) {
	const headers: Record<string, string> = {
		Accept: "application/json",
		"Content-Type": "application/x-www-form-urlencoded",
		"X-Requested-With": "XMLHttpRequest",
		Referer: `${BASE}/`,
	};
	if (jar.cookie) headers.Cookie = jar.cookie;
	if (jar.xsrf) headers["X-XSRF-TOKEN"] = jar.xsrf;
	const body = new URLSearchParams(form).toString();
	const res = await fetch(`${BASE}/${path}`, {
		method: "POST",
		headers,
		body,
		redirect: "follow",
	});
	const text = await res.text();
	let json: unknown;
	try {
		json = JSON.parse(text);
	} catch {
		json = text;
	}
	return { ok: res.ok, status: res.status, json };
}

function unwrapArray(payload: any): any[] {
	if (Array.isArray(payload)) return payload;
	if (
		payload &&
		typeof payload === "object" &&
		Array.isArray((payload as any).data)
	)
		return (payload as any).data;
	return [];
}

function extractSkusFromResponse(response: any): string[] {
	// Handle HTML response format: {"html": ["<div>...</div>", ...]}
	let htmlStrings: string[] = [];

	if (response && typeof response === "object" && "html" in response) {
		htmlStrings = Array.isArray((response as any).html)
			? (response as any).html
			: [];
	} else {
		// Fallback: try unwrapArray for backward compatibility
		const arr = unwrapArray(response);
		if (arr.length > 0 && typeof arr[0] === "string") {
			htmlStrings = arr;
		} else {
			// Old format with direct JSON objects
			return arr.map((p: any) => String(p?.sku || "")).filter(Boolean);
		}
	}

	// Parse HTML to extract product SKUs
	const skus: string[] = [];

	for (const html of htmlStrings) {
		if (!html || typeof html !== "string") continue;

		const $ = cheerio.load(html);

		// Extract SKU from product cards
		$(".product-card__sku, [class*='sku']").each((_, el) => {
			const sku = $(el).text().trim();
			if (sku) {
				skus.push(sku);
			}
		});
	}

	return skus;
}

async function ensureVehicleModel(make: string, modelName: string) {
	const existing = await db
		.select({ id: vehicleModel.id })
		.from(vehicleModel)
		.where(and(eq(vehicleModel.make, make), eq(vehicleModel.model, modelName)))
		.limit(1);
	if (existing[0]) return existing[0].id;
	const inserted = await db
		.insert(vehicleModel)
		.values({ make: make, model: modelName, type: "moped" })
		.returning({ id: vehicleModel.id });
	return inserted[0].id;
}

async function minimalUpsertVariants(skus: string[]) {
	if (skus.length === 0) return 0;
	const existing = await db
		.select({ sku: productVariant.sku })
		.from(productVariant)
		.where(inArray(productVariant.sku, skus));
	const exists = new Set(existing.map((r) => r.sku));
	let inserted = 0;
	for (const sku of skus) {
		if (exists.has(sku)) continue;
		const [p] = await db
			.insert(product)
			.values({ name: `Imported ${sku}`, status: "active" })
			.returning({ id: product.id });
		await db.insert(productVariant).values({ productId: p.id, sku });
		inserted++;
	}
	return inserted;
}

function normalize(str: string) {
	return str.toLowerCase().replace(/\s+/g, " ").trim();
}

async function findModelCandidates(
	make: string,
	inputModel: string,
	jar: { cookie?: string; xsrf?: string },
) {
	const resp = await postForm(
		"frontend-api/biluppgifter/get-models",
		{ brand: make },
		jar,
	);
	const models = unwrapArray(resp.json).map((m: any) => String(m?.model ?? m));
	const target = normalize(inputModel);
	const exact = models.filter((m) => normalize(m) === target);
	if (exact.length) return exact;
	// heuristics: contains and space/number variations
	const contains = models.filter(
		(m) => normalize(m).includes(target) || target.includes(normalize(m)),
	);
	// try a few common transforms
	const transforms = new Set<string>();
	transforms.add(inputModel);
	transforms.add(inputModel.replace(/\s+/g, ""));
	transforms.add(inputModel.replace(/\s*(\d)/g, " $1"));
	for (const t of Array.from(transforms)) {
		const cand = models.filter((m) => normalize(m) === normalize(t));
		for (const c of cand) contains.push(c);
	}
	return Array.from(new Set(contains));
}

async function main() {
	const make = process.argv[2];
	const model = process.argv[3];
	const year = process.argv[4];
	if (!make || !model) {
		console.error(
			"Usage: bun src/scripts/upsert-fitment-from-endpoint.ts <make> <modelNameOrSlug> [year]",
		);
		process.exit(1);
	}
	const jar = await primeSession();
	// First try as-is
	const path0 = year
		? `frontend-api/biluppgifter/get-products/${encodeURIComponent(make)}/${encodeURIComponent(model)}?year=${encodeURIComponent(year)}`
		: `frontend-api/biluppgifter/get-products/${encodeURIComponent(make)}/${encodeURIComponent(model)}`;
	let resp = await req(path0, jar);
	let skus = extractSkusFromResponse(resp.json);

	let triedCandidates: string[] = [];
	if (skus.length === 0) {
		// discover models for brand and try candidates
		const candidates = await findModelCandidates(make, model, jar);
		triedCandidates = candidates;
		for (const cand of candidates) {
			const path = year
				? `frontend-api/biluppgifter/get-products/${encodeURIComponent(make)}/${encodeURIComponent(cand)}?year=${encodeURIComponent(year)}`
				: `frontend-api/biluppgifter/get-products/${encodeURIComponent(make)}/${encodeURIComponent(cand)}`;
			const r = await req(path, jar);
			const s = extractSkusFromResponse(r.json);
			if (s.length > 0) {
				resp = r;
				skus = s;
				break;
			}
		}
	}

	const vmId = await ensureVehicleModel(make, decodeURIComponent(model));
	const insertedVariants = await minimalUpsertVariants(skus);
	let linked = 0;
	for (const sku of skus) {
		const row = await db
			.select({ id: productVariant.id })
			.from(productVariant)
			.where(eq(productVariant.sku, sku))
			.limit(1);
		const vid = row[0]?.id;
		if (!vid) continue;
		try {
			await db
				.insert(productFitment)
				.values({ variantId: vid, vehicleModelId: vmId });
			linked++;
		} catch {}
	}
	console.log(
		JSON.stringify(
			{
				make,
				model,
				triedCandidates,
				year: year || null,
				vmId,
				skus: skus.length,
				insertedVariants: insertedVariants || 0,
				linked,
			},
			null,
			2,
		),
	);
}

await main();
