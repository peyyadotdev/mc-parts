import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const BASE = "https://mopeddelar.se";

interface SessionJar {
	cookie?: string;
	xsrf?: string;
}

interface ProductSKU {
	sku: string;
	name?: string;
}

interface VehicleModel {
	model: string;
	products: ProductSKU[];
}

interface VehicleMake {
	make: string;
	models: VehicleModel[];
}

interface FitmentMapping {
	timestamp: string;
	totalMakes: number;
	totalModels: number;
	totalProducts: number;
	makes: VehicleMake[];
}

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

async function primeSession(): Promise<SessionJar> {
	console.log("🔐 Priming session...");
	const res = await fetch(`${BASE}/`, { redirect: "follow" });
	const setCookies = (res.headers as any).getSetCookie?.() || [];
	const jar = parseSetCookies(setCookies);
	console.log("✓ Session established\n");
	return jar;
}

async function req(path: string, jar: SessionJar) {
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
	jar: SessionJar,
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

async function getBrands(jar: SessionJar): Promise<string[]> {
	console.log("🏭 Fetching vehicle brands...");
	const resp = await req("frontend-api/biluppgifter/get-brands", jar);
	const brands = unwrapArray(resp.json).map((b: any) => String(b?.brand ?? b));
	console.log(`✓ Found ${brands.length} brands\n`);
	return brands;
}

async function getModels(make: string, jar: SessionJar): Promise<string[]> {
	const resp = await postForm(
		"frontend-api/biluppgifter/get-models",
		{ brand: make },
		jar,
	);
	const models = unwrapArray(resp.json).map((m: any) => String(m?.model ?? m));
	return models;
}

async function getProducts(
	make: string,
	model: string,
	jar: SessionJar,
): Promise<ProductSKU[]> {
	const allProducts: ProductSKU[] = [];
	let currentPage = 1;
	let lastPage = 1;

	do {
		const path = `frontend-api/biluppgifter/get-products/${encodeURIComponent(make)}/${encodeURIComponent(model)}?page=${currentPage}`;
		const resp = await req(path, jar);

		// Handle HTML response format: {"html": ["<div>...</div>", ...], "paginator": {...}}
		let htmlStrings: string[] = [];
		let paginator: any = null;

		if (resp.json && typeof resp.json === "object" && "html" in resp.json) {
			// Response is wrapped in {html: [...], paginator: {...}}
			htmlStrings = Array.isArray((resp.json as any).html)
				? (resp.json as any).html
				: [];
			paginator = (resp.json as any).paginator;

			if (paginator?.last_page) {
				lastPage = paginator.last_page;
			}
		} else {
			// Fallback: try unwrapArray for backward compatibility
			const arr = unwrapArray(resp.json);
			if (arr.length > 0 && typeof arr[0] === "string") {
				htmlStrings = arr;
			} else {
				// Old format with direct JSON objects
				return arr
					.map((p: any) => ({
						sku: String(p?.sku || ""),
						name: p?.name ? String(p.name) : undefined,
					}))
					.filter((p) => p.sku);
			}
		}

		// Parse HTML to extract product SKUs
		for (const html of htmlStrings) {
			if (!html || typeof html !== "string") continue;

			const $ = cheerio.load(html);

			// Extract SKU from product cards
			$(".product-card__sku, [class*='sku']").each((_, el) => {
				const sku = $(el).text().trim();
				if (sku) {
					// Try to find product name (adjust selector as needed)
					const card = $(el).closest(".product-card, [class*='product']");
					const name = card
						.find(".product-card__name, [class*='name']")
						.first()
						.text()
						.trim();

					allProducts.push({
						sku,
						name: name || undefined,
					});
				}
			});
		}

		currentPage++;

		// Small delay between pages to be nice to the API
		if (currentPage <= lastPage) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	} while (currentPage <= lastPage);

	return allProducts;
}

async function main() {
	console.log("=== Nyehandel Frontend API - Vehicle Fitment Mapper ===\n");

	const jar = await primeSession();
	const brands = await getBrands(jar);

	const mapping: FitmentMapping = {
		timestamp: new Date().toISOString(),
		totalMakes: 0,
		totalModels: 0,
		totalProducts: 0,
		makes: [],
	};

	let totalModelsCount = 0;
	let totalProductsCount = 0;

	for (const make of brands) {
		if (!make || make.trim() === "") continue;

		console.log(`📦 Processing brand: ${make}`);

		const models = await getModels(make, jar);
		console.log(`  ↳ Found ${models.length} models`);

		const vehicleMake: VehicleMake = {
			make,
			models: [],
		};

		for (const model of models) {
			if (!model || model.trim() === "") continue;

			try {
				const products = await getProducts(make, model, jar);

				if (products.length > 0) {
					console.log(`    ↳ ${model}: ${products.length} products`);
				}

				vehicleMake.models.push({
					model,
					products,
				});

				totalProductsCount += products.length;

				// Small delay to be nice to the API
				await new Promise((resolve) => setTimeout(resolve, 100));
			} catch (error) {
				console.error(`    ✗ Error fetching products for ${model}:`, error);
				vehicleMake.models.push({
					model,
					products: [],
				});
			}
		}

		totalModelsCount += models.length;
		mapping.makes.push(vehicleMake);

		// Delay between brands
		await new Promise((resolve) => setTimeout(resolve, 300));
	}

	mapping.totalMakes = brands.length;
	mapping.totalModels = totalModelsCount;
	mapping.totalProducts = totalProductsCount;

	// Create output directory
	const outputDir = path.join(
		process.cwd(),
		"apps",
		"server",
		"data",
		"nyehandel",
	);
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	const timestamp = new Date()
		.toISOString()
		.replace(/[:.]/g, "-")
		.split("T")[0];
	const outputFile = path.join(
		outputDir,
		`vehicle-fitment-mapping-${timestamp}.json`,
	);

	fs.writeFileSync(outputFile, JSON.stringify(mapping, null, 2));

	console.log("\n=== Summary ===");
	console.log(`Total brands: ${mapping.totalMakes}`);
	console.log(`Total models: ${mapping.totalModels}`);
	console.log(`Total products: ${mapping.totalProducts}`);
	console.log(`\n✓ Mapping saved to: ${outputFile}`);
}

await main();
