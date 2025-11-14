import "dotenv/config";
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

async function getProducts(
	make: string,
	model: string,
	jar: SessionJar,
): Promise<ProductSKU[]> {
	const allProducts: ProductSKU[] = [];
	let currentPage = 1;
	let lastPage = 1;

	console.log(`\n🔍 Fetching products for: ${make} ${model}`);

	do {
		const path = `frontend-api/biluppgifter/get-products/${encodeURIComponent(make)}/${encodeURIComponent(model)}?page=${currentPage}`;
		const resp = await req(path, jar);

		console.log(`\n📄 Page ${currentPage}:`);
		console.log(
			"📦 Response keys:",
			resp.json && typeof resp.json === "object"
				? Object.keys(resp.json)
				: "N/A",
		);

		// Handle HTML response format: {"html": ["<div>...</div>", ...], "paginator": {...}}
		let htmlStrings: string[] = [];
		let paginator: any = null;

		if (resp.json && typeof resp.json === "object" && "html" in resp.json) {
			htmlStrings = Array.isArray((resp.json as any).html)
				? (resp.json as any).html
				: [];
			paginator = (resp.json as any).paginator;

			console.log(`✓ Found ${htmlStrings.length} HTML strings on this page`);

			if (paginator) {
				console.log(
					`📊 Paginator: page ${paginator.current_page}/${paginator.last_page}, total: ${paginator.total}`,
				);
				lastPage = paginator.last_page || 1;
			}
		}

		// Parse HTML to extract product SKUs
		for (const html of htmlStrings) {
			if (!html || typeof html !== "string") continue;

			const $ = cheerio.load(html);

			$(".product-card__sku, [class*='sku']").each((_, el) => {
				const sku = $(el).text().trim();
				if (sku) {
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

		if (currentPage <= lastPage) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	} while (currentPage <= lastPage);

	return allProducts;
}

async function main() {
	console.log("=== Test Single Fitment - Yamaha Aerox 50 ===\n");

	const jar = await primeSession();

	const brand = "Yamaha";
	const model = "Aerox 50";

	console.log(`🔍 Fetching products for: ${brand} ${model}\n`);

	const products = await getProducts(brand, model, jar);

	console.log(`\n✅ Found ${products.length} products:`);
	console.log(JSON.stringify(products.slice(0, 5), null, 2));

	if (products.length > 5) {
		console.log(`\n... and ${products.length - 5} more products`);
	}
}

await main();
