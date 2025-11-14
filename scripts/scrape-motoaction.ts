import { parseArgs } from "node:util";

interface VehicleTypeConfig {
	id: number;
	label: string;
	output: string;
}

interface ModelEntry {
	name: string;
	url: string;
}

interface YearEntry {
	year: string;
	models: ModelEntry[];
}

interface ManufacturerEntry {
	id: number;
	name: string;
	years: YearEntry[];
}

interface ScrapeResult {
	vehicleType: string;
	manufacturers: ManufacturerEntry[];
}

const ARGUMENTS = parseArgs({
	options: {
		cookie: {
			type: "string",
		},
		"user-agent": {
			type: "string",
		},
		types: {
			type: "string",
			multiple: true,
		},
		delay: {
			type: "string",
		},
	},
});

const cookie = ARGUMENTS.values.cookie ?? process.env.MOTOACTION_COOKIE;
const userAgent =
	ARGUMENTS.values["user-agent"] ?? process.env.MOTOACTION_USER_AGENT;
const delayMs = ARGUMENTS.values.delay
	? Number.parseInt(ARGUMENTS.values.delay, 10)
	: 500;

if (!cookie || !userAgent) {
	console.error(
		"Missing cookie or user-agent. Provide via --cookie/--user-agent arguments or MOTOACTION_COOKIE/MOTOACTION_USER_AGENT env vars.",
	);
	process.exit(1);
}

const typeConfigs: VehicleTypeConfig[] = (ARGUMENTS.values.types ?? []).flatMap(
	(entry) => {
		const [id, label, output] = entry.split(":");
		if (!id || !label || !output) {
			console.warn(`Skipping malformed type entry: ${entry}`);
			return [];
		}
		return [
			{
				id: Number.parseInt(id, 10),
				label,
				output,
			} satisfies VehicleTypeConfig,
		];
	},
);

if (typeConfigs.length === 0) {
	console.error(
		"No vehicle types configured. Pass --types " +
			'"<typeId>:<label>:<output.json>" (e.g. --types "9:moped:mopeds.json").',
	);
	process.exit(1);
}

async function requestMotoaction(
	body: Record<string, string>,
): Promise<string> {
	const params = new URLSearchParams(body);
	const res = await fetch(
		"https://www.motoaction.se/ajax/fetch-bike-partsmap",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Cookie: cookie,
				"User-Agent": userAgent,
				Accept: "text/html,application/xhtml+xml,application/xml", // mimic browser
				"Accept-Language": "en-US,en;q=0.9",
				"Cache-Control": "no-cache",
				Pragma: "no-cache",
				Referer: "https://www.motoaction.se/",
			},
			body: params.toString(),
		},
	);

	if (!res.ok) {
		throw new Error(`Request failed with status ${res.status}`);
	}

	return res.text();
}

const MANUFACTURER_REGEX =
	/fetch_dropdown_years\(\s*(\d+)\s*,\s*(\d+)\s*,\s*'([^']+)'\s*\)/g;
const YEAR_REGEX =
	/fetch_dropdown_models\(\s*(\d+)\s*,\s*(\d+)\s*,\s*'([^']+)'\s*\)/g;
const MODEL_REGEX =
	/model_relocation_action\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g;

async function fetchManufacturers(
	type: VehicleTypeConfig,
): Promise<ManufacturerEntry[]> {
	const html = await requestMotoaction({
		fetch_dropdown_manu: "1",
		manufacturers_types_id: String(type.id),
	});

	const manufacturers: ManufacturerEntry[] = [];
	for (const match of html.matchAll(MANUFACTURER_REGEX)) {
		const [, manufacturersTypesId, manufacturerId, name] = match;
		if (Number.parseInt(manufacturersTypesId, 10) !== type.id) continue;
		manufacturers.push({
			id: Number.parseInt(manufacturerId, 10),
			name,
			years: [],
		});
	}

	return manufacturers;
}

async function fetchYears(
	typeId: number,
	manufacturer: ManufacturerEntry,
): Promise<string[]> {
	const html = await requestMotoaction({
		fetch_dropdown_years: "1",
		manufacturers_types_id: String(typeId),
		manufacturers_id: String(manufacturer.id),
	});

	const years = new Set<string>();
	for (const match of html.matchAll(YEAR_REGEX)) {
		const [, type, manuId, year] = match;
		if (Number.parseInt(type, 10) !== typeId) continue;
		if (Number.parseInt(manuId, 10) !== manufacturer.id) continue;
		years.add(year);
	}

	return Array.from(years).sort(
		(a, b) => Number.parseInt(b) - Number.parseInt(a),
	);
}

async function fetchModels(
	typeId: number,
	manufacturerId: number,
	year: string,
): Promise<ModelEntry[]> {
	const html = await requestMotoaction({
		fetch_dropdown_models: "1",
		manufacturers_types_id: String(typeId),
		manufacturers_id: String(manufacturerId),
		year,
	});

	const models: ModelEntry[] = [];
	for (const match of html.matchAll(MODEL_REGEX)) {
		const [, name, url] = match;
		models.push({ name, url });
	}

	return models;
}

async function scrapeType(type: VehicleTypeConfig): Promise<ScrapeResult> {
	console.log(`→ Fetching manufacturers for ${type.label} (type ${type.id})`);
	const manufacturers = await fetchManufacturers(type);
	console.log(`  Found ${manufacturers.length} manufacturers`);

	for (const manufacturer of manufacturers) {
		console.log(`    ↳ Years for ${manufacturer.name}`);
		const years = await fetchYears(type.id, manufacturer);
		manufacturer.years = [];

		for (const year of years) {
			console.log(`      • ${manufacturer.name} ${year}`);
			const models = await fetchModels(type.id, manufacturer.id, year);
			manufacturer.years.push({
				year,
				models,
			});
			if (delayMs > 0) await Bun.sleep(delayMs);
		}
		if (delayMs > 0) await Bun.sleep(delayMs);
	}

	return {
		vehicleType: type.label,
		manufacturers,
	} satisfies ScrapeResult;
}

async function main() {
	const results: ScrapeResult[] = [];
	for (const type of typeConfigs) {
		try {
			const result = await scrapeType(type);
			results.push(result);
			await Bun.write(type.output, JSON.stringify(result, null, 2));
			console.log(`✔ Saved ${type.output}`);
		} catch (error) {
			console.error(
				`✖ Failed to scrape type ${type.label} (${type.id})`,
				error,
			);
		}
		if (delayMs > 0) await Bun.sleep(delayMs);
	}

	console.log(`Finished scraping ${results.length} vehicle types.`);
}

main().catch((error) => {
	console.error("Unexpected error", error);
	process.exit(1);
});
