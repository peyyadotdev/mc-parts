#!/usr/bin/env bun

import { argv } from "bun";

function getFlag(name: string): string | null {
	const i = argv.indexOf(`--${name}`);
	return i !== -1 ? argv[i + 1] : null;
}

const cookie = getFlag("cookie");
const userAgent = getFlag("user-agent");

if (!cookie || !userAgent) {
	console.error("Missing flags: --cookie and --user-agent are required.");
	process.exit(1);
}

const url = "https://www.motoaction.se/ajax/fetch-bike-partsmap";

// detta är payloaden som används av dropdownen för manufacturers
const body = new URLSearchParams({
	manufacturers_types_id: "9", // 9 = mopeder
	_token: "", // ignoreras pga cookie-session
});

(async () => {
	const res = await fetch(url, {
		method: "POST",
		headers: {
			"User-Agent": userAgent,
			Cookie: cookie,
			"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
			"X-Requested-With": "XMLHttpRequest",
		},
		body,
	});

	const text = await res.text();

	console.log("STATUS:", res.status);
	console.log("HEADERS:", res.headers);
	console.log("\n\nRESPONSE BODY:\n", text);
})();
