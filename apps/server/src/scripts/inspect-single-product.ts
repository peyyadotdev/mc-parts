import "dotenv/config";
import {
	nyeBaseUrl,
	nyeHeaders,
} from "../../../../src/integrations/nyehandel/client";

async function main() {
	const productId = process.argv[2] || "1";
	const url = `${nyeBaseUrl}/products/${productId}`;

	console.log(`Fetching product ${productId}...`);

	const response = await fetch(url, { headers: nyeHeaders() });
	const data = await response.json();

	console.log(JSON.stringify(data, null, 2));
}

await main();
