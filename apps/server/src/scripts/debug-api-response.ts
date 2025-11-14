import "dotenv/config";

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
	const setCookies = (res.headers as any).getSetCookies?.() || [];
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

	console.log(`\n🔍 Fetching: ${BASE}/${path}`);
	console.log("Headers:", JSON.stringify(headers, null, 2));

	const res = await fetch(`${BASE}/${path}`, { headers, redirect: "follow" });
	const text = await res.text();

	console.log(`\n📊 Response Status: ${res.status} ${res.statusText}`);
	console.log(`📦 Response Length: ${text.length} characters`);
	console.log(
		`\n📄 RAW Response (first 500 chars):\n${text.substring(0, 500)}`,
	);

	let json: unknown;
	try {
		json = JSON.parse(text);
		console.log(
			`\n✅ Valid JSON. Type: ${Array.isArray(json) ? `Array[${(json as any[]).length}]` : typeof json}`,
		);
		if (Array.isArray(json)) {
			console.log("\nFirst item:", JSON.stringify(json[0], null, 2));
		} else {
			const obj = json as any;
			console.log("\n📋 Keys:", Object.keys(obj));
			if (obj.html) console.log(`HTML array length: ${obj.html?.length}`);
			if (obj.paginator)
				console.log("\n🔢 Paginator:", JSON.stringify(obj.paginator, null, 2));
			if (obj.paginator_html)
				console.log(
					"\n📄 Paginator HTML (first 200 chars):",
					obj.paginator_html?.substring(0, 200),
				);
		}
	} catch {
		console.log("\n❌ NOT valid JSON - returned HTML or text");
		json = text;
	}

	return { ok: res.ok, status: res.status, json };
}

async function main() {
	console.log("=== DEBUG API Response ===\n");

	const jar = await primeSession();
	console.log("✓ Session established");
	console.log(`Cookie: ${jar.cookie?.substring(0, 50)}...`);
	console.log(`XSRF: ${jar.xsrf?.substring(0, 50)}...`);

	// Test Yamaha Aerox 50
	const brand = "Yamaha";
	const model = "Aerox 50";
	const path = `frontend-api/biluppgifter/get-products/${encodeURIComponent(brand)}/${encodeURIComponent(model)}`;

	await req(path, jar);
}

await main();
