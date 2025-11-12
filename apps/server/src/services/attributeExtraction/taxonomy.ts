/* eslint-disable perfectionist/sort-objects */
/**
 * Canonical attribute taxonomy and supporting lookup tables for the Nyehandel
 * product-enrichment pipeline.
 *
 * The taxonomy is used by:
 * - Extraction services (regex/NLP rules and normalization metadata)
 * - Database seeders and migrations (attribute definition/value tables)
 * - Admin UI (display labels, units, validation and confidence defaults)
 *
 * Downstream services should treat this file as the single-source-of-truth.
 */

export type AttributeScope = "universal" | "category";
export type AttributeDataType =
	| "string"
	| "number"
	| "boolean"
	| "enum"
	| "multi_enum";
export type AttributeImportance = "critical" | "high" | "medium" | "low";

export interface AttributeRegexPattern {
	/**
	 * Human-readable identifier for the regex. Used in logs/reporting.
	 */
	name: string;
	/**
	 * JS-compatible regex pattern stored as a string so it can be serialised to JSON.
	 */
	pattern: string;
	/**
	 * Regex flags to apply when compiling the pattern.
	 */
	flags?: string;
	/**
	 * Named capture group to read from the pattern. Defaults to "value".
	 */
	captureGroup?: string;
	/**
	 * Optional named capture group that exposes a unit. When absent, fall back to the attribute's default unit.
	 */
	unitCaptureGroup?: string;
	/**
	 * Optional description clarifying the intent of the regex.
	 */
	description?: string;
	/**
	 * Example matches used in documentation and QA snapshots.
	 */
	examples?: string[];
	/**
	 * Normalisation strategy applied to captured value before persisting.
	 */
	normalise?: "uppercase" | "lowercase" | "titlecase" | "numeric";
}

export interface EnumValueDefinition {
	value: string;
	/**
	 * Synonyms that should normalise to the canonical value.
	 */
	synonyms?: string[];
	/**
	 * Optional free-form notes for the reviewer or enrichment pipeline.
	 */
	notes?: string;
}

export interface AttributeDefinition {
	slug: string;
	label: string;
	description: string;
	scope: AttributeScope;
	dataType: AttributeDataType;
	importance: AttributeImportance;
	unit?: string;
	categoryApplicability?: string[];
	sourceFields: Array<"name" | "description" | "bullet" | "spec_sheet" | "manual_entry">;
	derivedFrom?: string[];
	regex?: AttributeRegexPattern[];
	enumValues?: EnumValueDefinition[];
	defaultConfidence?: number;
	validations?: {
		min?: number;
		max?: number;
		step?: number;
		allowZero?: boolean;
		requireInteger?: boolean;
	};
	notes?: string;
}

export const UNIVERSAL_ATTRIBUTES: AttributeDefinition[] = [
	{
		slug: "compatibility.model",
		label: "Compatible Model",
		description:
			"Vehicle models or platforms confirmed to be compatible with the product. Links to vehicle_model records.",
		scope: "universal",
		dataType: "multi_enum",
		importance: "high",
		sourceFields: ["name", "description", "bullet"],
		defaultConfidence: 0.55,
		regex: [
			{
				name: "model-with-dash",
				pattern:
					"\\b(?<model>(?:BT|MT|MB|GY|YY|QT|RS|ZX)[0-9]{1,4}(?:[A-Z]{1,3})?(?:[-\\s]?[0-9]{1,3})?)\\b",
				flags: "gi",
				description:
					"Captures common scooter/moped model codes with optional suffixes, e.g. BT50QT-9, MT50.",
				examples: ["BT50QT-9", "MT50", "GY6"],
				normalise: "uppercase",
			},
			{
				name: "model-alpha-numeric",
				pattern:
					"\\b(?<model>(?:Super|Compact|Transport|RR|RRX|SMT|MRT|DRAC)(?:\\s?[0-9]{0,4})?)\\b",
				flags: "gi",
				description:
					"Captures named series frequently used in Swedish moped catalogues.",
				examples: ["Super 9", "Compact", "Transport", "RRX"],
				normalise: "titlecase",
			},
			{
				name: "model-oem-alias",
				pattern: "\\b(?<model>(?:Ciao|Bravo|Fox|Zip|SPX|Turbo\\s?Kit))\\b",
				flags: "gi",
				description:
					"Covers legacy Piaggio and Peugeot aliases that must map to canonical vehicle models.",
				examples: ["Ciao", "Bravo", "SPX", "Turbo Kit"],
				normalise: "titlecase",
			},
		],
		notes:
			"Downstream services should normalise captured model strings via the modelDictionary before linking to vehicle_model IDs.",
	},
	{
		slug: "brand.oem",
		label: "OEM Brand",
		description:
			"Manufacturer or OEM brand that the product is designed for. Used for vehicle fitment and compatibility.",
		scope: "universal",
		dataType: "enum",
		importance: "high",
		sourceFields: ["name", "description", "bullet"],
		enumValues: [
			{ value: "Baotian", synonyms: ["baotian", "baotian.", "bt"], notes: "Chinese scooter OEM" },
			{ value: "Kymco", synonyms: ["kymco", "kymco."], notes: "Taiwanese scooter OEM" },
			{ value: "Honda", synonyms: ["honda", "mt", "honda mt", "mb"], notes: "Honda mopeds" },
			{ value: "Peugeot", synonyms: ["peugeot", "ludix"], notes: "Peugeot mopeds" },
			{ value: "Piaggio", synonyms: ["piaggio"], notes: "Includes Vespa/Piaggio family" },
			{ value: "Derbi", synonyms: ["derbi"], notes: "Derbi competition mopeds" },
			{ value: "Rieju", synonyms: ["rieju"], notes: "Spanish manufacturer" },
			{ value: "Sachs", synonyms: ["sachs"], notes: "Used for Sachs engines and mopeds" },
			{ value: "Yamaha", synonyms: ["yamaha"], notes: "Yamaha mopeds/scooters" },
			{ value: "Gilera", synonyms: ["gilera"], notes: "For Turbo Kit exhaust referencing Gilera" },
			{ value: "MCB", synonyms: ["mcb"], notes: "Swedish OEM for Compact/Transport" },
			{ value: "Top Racing", synonyms: ["top racing"], notes: "Aftermarket crank manufacturer" },
			{ value: "Turbo Kit", synonyms: ["turbo kit", "turbo-kit"], notes: "Aftermarket exhaust brand" },
			{ value: "Puch", synonyms: ["puch"], notes: "Legacy Austrian make" },
		],
		regex: [
			{
				name: "oem-brand",
				pattern:
					"\\b(?<value>baotian|kymco|honda|peugeot|piaggio|derbi|rieju|sachs|yamaha|gilera|mcb|turbo\\s?kit|top\\s?racing|puch)\\b",
				flags: "gi",
				description: "Matches any known OEM/vehicle make from the brand dictionary.",
				examples: ["Baotian", "Honda", "Turbo Kit"],
				normalise: "titlecase",
			},
		],
		defaultConfidence: 0.9,
	},
	{
		slug: "brand.manufacturer",
		label: "Part Manufacturer",
		description:
			"Brand of the part itself when different from the OEM brand (e.g. Turbo Kit exhaust for Honda).",
		scope: "universal",
		dataType: "enum",
		importance: "medium",
		sourceFields: ["name", "description", "bullet"],
		enumValues: [
			{
				value: "Turbo Kit",
				synonyms: ["turbo kit", "tk"],
			},
			{
				value: "Top Racing",
				synonyms: ["top racing"],
			},
			{
				value: "NGK",
				synonyms: ["ngk"],
			},
			{
				value: "Athena",
				synonyms: ["athena"],
			},
		],
		regex: [
			{
				name: "manufacturer-tag",
				pattern:
					"\\b(?<value>turbo\\s?kit|top\\s?racing|ngk|athena|malossi|polini|stage6)\\b",
				flags: "gi",
				description:
					"Captures known aftermarket manufacturers. Extend as catalogue grows.",
				examples: ["Turbo Kit", "Stage6"],
				normalise: "titlecase",
			},
		],
		defaultConfidence: 0.65,
		notes:
			"If manufacturer equals OEM brand, prefer storing only in brand.oem. Do not duplicate.",
	},
	{
		slug: "material.primary",
		label: "Primary Material",
		description: "Core material used in the product's construction.",
		scope: "universal",
		dataType: "enum",
		importance: "medium",
		sourceFields: ["name", "description", "bullet"],
		enumValues: [
			{ value: "Aluminium", synonyms: ["aluminium", "alu", "al"] },
			{ value: "Stål", synonyms: ["stål", "stainless", "rostfritt", "steel"] },
			{ value: "Gjutjärn", synonyms: ["gjutjärn", "cast iron"] },
			{ value: "Plast", synonyms: ["plast", "polymer", "plastik"] },
			{ value: "Gummi", synonyms: ["gummi", "rubber"] },
			{ value: "Krom", synonyms: ["krom", "chrome"] },
		],
		regex: [
			{
				name: "material",
				pattern:
					"\\b(?<value>aluminium|alu|stål|rostfritt|stainless|gjutjärn|plast|polymer|gummi|rubber|krom|chrome)\\b",
				flags: "gi",
				description: "Matches known material terms across Swedish/English variants.",
				examples: ["aluminium", "rostfritt stål", "gummi"],
				normalise: "lowercase",
			},
		],
		defaultConfidence: 0.7,
	},
	{
		slug: "position",
		label: "Vehicle Position",
		description: "Where on the vehicle the component is installed.",
		scope: "universal",
		dataType: "enum",
		importance: "medium",
		sourceFields: ["name", "description", "bullet"],
		enumValues: [
			{ value: "Fram", synonyms: ["fram", "front"] },
			{ value: "Bak", synonyms: ["bak", "rear"] },
			{ value: "Höger", synonyms: ["höger", "right"] },
			{ value: "Vänster", synonyms: ["vänster", "left"] },
			{ value: "Universal", synonyms: ["universal"] },
		],
		regex: [
			{
				name: "position-basic",
				pattern: "\\b(?<value>fram|bak|höger|vänster|front|rear|left|right)\\b",
				flags: "gi",
				description: "Basic Swedish/English position keywords.",
				examples: ["fram", "höger", "rear"],
				normalise: "lowercase",
			},
			{
				name: "position-with-side",
				pattern:
					"\\b(?:vänster|höger)\\s?(?:fram|bak)?\\b|\\b(?:front|rear)\\s?(?:left|right)?\\b",
				flags: "gi",
				description:
					"Captures compound descriptors such as 'höger fram' or 'rear left'.",
				examples: ["höger fram", "rear left"],
				normalise: "lowercase",
			},
		],
		defaultConfidence: 0.75,
	},
	{
		slug: "color",
		label: "Colour",
		description: "Primary visual colour of the component.",
		scope: "universal",
		dataType: "enum",
		importance: "low",
		sourceFields: ["name", "description", "bullet"],
		enumValues: [
			{ value: "Svart", synonyms: ["svart", "black"] },
			{ value: "Blå", synonyms: ["blå", "blue"] },
			{ value: "Röd", synonyms: ["röd", "red"] },
			{ value: "Grön", synonyms: ["grön", "green"] },
			{ value: "Silver", synonyms: ["silver"] },
			{ value: "Krom", synonyms: ["krom", "chrome"] },
			{ value: "Vit", synonyms: ["vit", "white"] },
		],
		regex: [
			{
				name: "colour-basic",
				pattern:
					"\\b(?<value>svart|blå|röd|grön|vit|silver|krom|chrome|black|blue|red|green|white)\\b",
				flags: "gi",
				description: "Matches major colour descriptors.",
				examples: ["svart", "chrome", "blue"],
				normalise: "lowercase",
			},
		],
		defaultConfidence: 0.6,
	},
];

export const CATEGORY_ATTRIBUTES: AttributeDefinition[] = [
	{
		slug: "cylinder.diameter",
		label: "Cylinder Bore Diameter",
		description: "Cylinder bore size. Used to validate displacement and fitment.",
		scope: "category",
		categoryApplicability: ["Cylinder"],
		dataType: "number",
		unit: "mm",
		importance: "critical",
		sourceFields: ["name", "description", "spec_sheet"],
		regex: [
			{
				name: "diameter-mm",
				pattern: "\\b(?<value>\\d{2,3}(?:[.,]\\d)?)\\s?(?<unit>mm|millimeter)\\b",
				flags: "gi",
				description: "Captures metric cylinder diameters.",
				examples: ["47mm", "38 mm"],
				normalise: "numeric",
			},
			{
				name: "diameter-inch",
				pattern: "\\b(?<value>\\d{1,2}(?:[.,]\\d{1,2})?)\\s?(?<unit>in|\"|tum)\\b",
				flags: "gi",
				description: "Captures imperial diameter measurements.",
				examples: ['1.5"', "2 in"],
				normalise: "numeric",
			},
		],
		validations: { min: 20, max: 80, step: 0.1, requireInteger: false },
		defaultConfidence: 0.85,
	},
	{
		slug: "cylinder.displacement",
		label: "Displacement",
		description: "Cylinder displacement in cubic centimetres.",
		scope: "category",
		categoryApplicability: ["Cylinder"],
		dataType: "number",
		unit: "cc",
		importance: "critical",
		sourceFields: ["name", "description", "spec_sheet"],
		regex: [
			{
				name: "displacement-cc",
				pattern: "\\b(?<value>\\d{2,3})\\s?(?<unit>cc|cm3|cm³)\\b",
				flags: "gi",
				description: "Captures CC displacement values.",
				examples: ["70cc", "50 cc"],
				normalise: "numeric",
			},
		],
		validations: { min: 40, max: 125, requireInteger: true },
		defaultConfidence: 0.85,
	},
	{
		slug: "cylinder.power_output",
		label: "Expected Power Output",
		description:
			"Nominal power output for the cylinder kit in horsepower (hk).",
		scope: "category",
		categoryApplicability: ["Cylinder"],
		dataType: "number",
		unit: "hk",
		importance: "high",
		sourceFields: ["name", "description", "spec_sheet"],
		regex: [
			{
				name: "power-hk",
				pattern: "\\b(?<value>\\d{1,2}(?:[.,]\\d)?)\\s?(?<unit>hk|hp)\\b",
				flags: "gi",
				description: "Captures horsepower statements.",
				examples: ["1 hk", "5hp"],
				normalise: "numeric",
			},
		],
		validations: { min: 1, max: 15, step: 0.1 },
		defaultConfidence: 0.7,
	},
	{
		slug: "cylinder.includes_piston",
		label: "Includes Piston",
		description:
			"Whether the cylinder kit includes a piston/piston rings. Defaults to false when unspecified.",
		scope: "category",
		categoryApplicability: ["Cylinder"],
		dataType: "boolean",
		importance: "high",
		sourceFields: ["description", "bullet", "spec_sheet"],
		regex: [
			{
				name: "includes-piston",
				pattern:
					"\\b(?:inkl(?:uderar)?|with|med)\\s?(?:kolv|piston|kolvringar|pistong)\\b",
				flags: "gi",
				description: "Looks for statements confirming included piston or rings.",
				examples: ["inkl kolv", "with piston"],
			},
		],
		defaultConfidence: 0.65,
	},
	{
		slug: "carburetor.intake_size",
		label: "Intake Diameter",
		description: "Venturi diameter for the carburettor intake.",
		scope: "category",
		categoryApplicability: ["Förgasare"],
		dataType: "number",
		unit: "mm",
		importance: "critical",
		sourceFields: ["name", "description", "spec_sheet"],
		regex: [
			{
				name: "intake-mm",
				pattern:
					"\\b(?<value>\\d{2}(?:[.,]\\d)?)\\s?(?<unit>mm|millimeter)\\s?(?:förgasare|insug|intake|venturi)?\\b",
				flags: "gi",
				description: "Captures mm intake sizes e.g. 18mm.",
				examples: ["18mm", "21 mm förgasare"],
				normalise: "numeric",
			},
		],
		validations: { min: 10, max: 32, step: 0.1 },
		defaultConfidence: 0.85,
	},
	{
		slug: "carburetor.type",
		label: "Carburettor Type",
		description: "High-level carburettor design, used for compatibility rules.",
		scope: "category",
		categoryApplicability: ["Förgasare"],
		dataType: "enum",
		importance: "high",
		sourceFields: ["name", "description", "spec_sheet"],
		enumValues: [
			{ value: "Standard", synonyms: ["standard", "oem"] },
			{ value: "Racing", synonyms: ["racing", "race"] },
			{ value: "Performance", synonyms: ["performance", "sport"] },
			{ value: "CVK", synonyms: ["cvk", "vacuum"] },
			{ value: "PHBG", synonyms: ["phbg"] },
		],
		regex: [
			{
				name: "carb-type",
				pattern:
					"\\b(?<value>standard|oem|racing|race|performance|sport|cvk|phbg|dellorto)\\b",
				flags: "gi",
				description:
					"Captures named carburettor types. Extend with additional Dell'Orto or Keihin variants.",
				examples: ["racing", "PHBG"],
				normalise: "lowercase",
			},
		],
		defaultConfidence: 0.7,
	},
	{
		slug: "carburetor.adjustment_type",
		label: "Adjustment Type",
		description:
			"Tuning mechanism exposed on the carburettor (needle, mixture screw, etc.).",
		scope: "category",
		categoryApplicability: ["Förgasare"],
		dataType: "enum",
		importance: "medium",
		sourceFields: ["description", "spec_sheet"],
		enumValues: [
			{ value: "Manual screw", synonyms: ["skruvjustering", "mixturskruv"] },
			{ value: "Cable choke", synonyms: ["vajerchoke", "kabelchoke"] },
			{ value: "Lever choke", synonyms: ["handchoke", "spakchoke"] },
			{ value: "Automatic choke", synonyms: ["automatisk choke", "elchoke"] },
		],
		regex: [
			{
				name: "adjustment",
				pattern:
					"\\b(?<value>automatisk\\s?choke|elchoke|vajerchoke|kabelchoke|handchoke|spakchoke|mixturskruv|blandningsskruv)\\b",
				flags: "gi",
				description:
					"Matches choke/adjustment descriptors for carburettors.",
				examples: ["automatisk choke", "vajerchoke"],
				normalise: "lowercase",
			},
		],
		defaultConfidence: 0.55,
	},
	{
		slug: "exhaust.type",
		label: "Exhaust Type",
		description: "High-level exhaust category for performance tuning.",
		scope: "category",
		categoryApplicability: ["Avgassystem"],
		dataType: "enum",
		importance: "high",
		sourceFields: ["name", "description", "bullet"],
		enumValues: [
			{ value: "Original", synonyms: ["original", "oem"] },
			{ value: "Sport", synonyms: ["sport", "effekt", "performance"] },
			{ value: "Racing", synonyms: ["racing", "race"] },
			{ value: "Slip-on", synonyms: ["slip-on", "slip on"] },
			{ value: "Full system", synonyms: ["hel system", "complete"] },
		],
		regex: [
			{
				name: "exhaust-type",
				pattern:
					"\\b(?<value>original|oem|sport|effekt|performance|racing|race|slip[-\\s]?on|full\\s?(?:system|kit))\\b",
				flags: "gi",
				description: "Matches exhaust descriptors across Swedish/English terms.",
				examples: ["effekt", "racing", "slip-on"],
				normalise: "lowercase",
			},
		],
		defaultConfidence: 0.7,
	},
	{
		slug: "exhaust.sound_level",
		label: "Sound Level",
		description: "Noise level in decibels when stated.",
		scope: "category",
		categoryApplicability: ["Avgassystem"],
		dataType: "number",
		unit: "dB",
		importance: "medium",
		sourceFields: ["description", "spec_sheet"],
		regex: [
			{
				name: "sound-db",
				pattern: "\\b(?<value>\\d{2,3})\\s?(?<unit>db|dba)\\b",
				flags: "gi",
				description: "Captures decibel ratings.",
				examples: ["94 dB"],
				normalise: "numeric",
			},
		],
		validations: { min: 70, max: 120 },
		defaultConfidence: 0.6,
	},
	{
		slug: "exhaust.mounting_type",
		label: "Mounting Type",
		description: "Mounting arrangement for the exhaust system.",
		scope: "category",
		categoryApplicability: ["Avgassystem"],
		dataType: "enum",
		importance: "medium",
		sourceFields: ["description", "spec_sheet"],
		enumValues: [
			{ value: "Frame mount", synonyms: ["ramfäste", "frame mount"] },
			{ value: "Engine mount", synonyms: ["motorfäste", "engine mount"] },
			{ value: "Silent block", synonyms: ["silentblock"] },
		],
		regex: [
			{
				name: "mounting",
				pattern:
					"\\b(?<value>ramfäste|motorfäste|silentblock|silent\\s?block|frame\\s?mount|engine\\s?mount)\\b",
				flags: "gi",
				description: "Matches mounting style keywords.",
				examples: ["ramfäste", "silent block"],
				normalise: "lowercase",
			},
		],
		defaultConfidence: 0.5,
	},
	{
		slug: "brake.disc_diameter",
		label: "Disc Diameter",
		description: "Diameter of brake disc in millimetres.",
		scope: "category",
		categoryApplicability: ["Bromsdelar"],
		dataType: "number",
		unit: "mm",
		importance: "critical",
		sourceFields: ["name", "description", "spec_sheet"],
		regex: [
			{
				name: "disc-mm",
				pattern: "\\b(?<value>\\d{2,3})\\s?(?<unit>mm|millimeter)\\b",
				flags: "gi",
				description: "Captures disc diameters.",
				examples: ["155mm"],
				normalise: "numeric",
			},
		],
		validations: { min: 80, max: 320 },
		defaultConfidence: 0.85,
	},
	{
		slug: "brake.pad_material",
		label: "Pad Material",
		description: "Brake pad compound material.",
		scope: "category",
		categoryApplicability: ["Bromsdelar"],
		dataType: "enum",
		importance: "high",
		sourceFields: ["description", "spec_sheet"],
		enumValues: [
			{ value: "Organisk", synonyms: ["organisk", "organic"] },
			{ value: "Sinter", synonyms: ["sinter", "sintermetall"] },
			{ value: "Keramisk", synonyms: ["keramic", "keramisk", "ceramic"] },
		],
		regex: [
			{
				name: "pad-material",
				pattern:
					"\\b(?<value>organisk|organic|sinter|sintermetall|keramisk|ceramic|semi-sinter)\\b",
				flags: "gi",
				description: "Matches brake pad material descriptors.",
				examples: ["organisk", "sinter"],
				normalise: "lowercase",
			},
		],
		defaultConfidence: 0.6,
	},
	{
		slug: "electrical.voltage",
		label: "Voltage",
		description: "Rated operating voltage for electrical components.",
		scope: "category",
		categoryApplicability: ["Eldelar", "Belysning / Blinkers"],
		dataType: "number",
		unit: "V",
		importance: "high",
		sourceFields: ["name", "description", "spec_sheet"],
		regex: [
			{
				name: "voltage-v",
				pattern: "\\b(?<value>\\d{1,2}(?:[.,]\\d)?)\\s?(?<unit>v|volt|volts)\\b",
				flags: "gi",
				description: "Captures voltage statements like 6V, 12 volt.",
				examples: ["6 v", "12V"],
				normalise: "numeric",
			},
		],
		validations: { min: 6, max: 24 },
		defaultConfidence: 0.8,
	},
	{
		slug: "electrical.wattage",
		label: "Wattage",
		description: "Power consumption for electrical components.",
		scope: "category",
		categoryApplicability: ["Eldelar", "Belysning / Blinkers"],
		dataType: "number",
		unit: "W",
		importance: "medium",
		sourceFields: ["description", "spec_sheet"],
		regex: [
			{
				name: "wattage-w",
				pattern: "\\b(?<value>\\d{1,3})\\s?(?<unit>w|watt)\\b",
				flags: "gi",
				description: "Captures wattage statements.",
				examples: ["35W", "55 watt"],
				normalise: "numeric",
			},
		],
		validations: { min: 5, max: 150 },
		defaultConfidence: 0.6,
	},
	{
		slug: "wire.length",
		label: "Cable Length",
		description: "Total length of wire/cable products.",
		scope: "category",
		categoryApplicability: ["Vajrar", "Styre/Handtag"],
		dataType: "number",
		unit: "mm",
		importance: "medium",
		sourceFields: ["description", "spec_sheet"],
		regex: [
			{
				name: "length-mm",
				pattern: "\\b(?<value>\\d{3,4})\\s?(?<unit>mm|millimeter)\\b",
				flags: "gi",
				description: "Captures explicit mm lengths.",
				examples: ["172 mm", "1146 mm"],
				normalise: "numeric",
			},
			{
				name: "length-cm",
				pattern: "\\b(?<value>\\d{2,3})\\s?(?<unit>cm|centimeter)\\b",
				flags: "gi",
				description: "Captures cm lengths and converts to mm downstream.",
				examples: ["107 cm"],
				normalise: "numeric",
			},
		],
		defaultConfidence: 0.5,
		validations: { min: 150, max: 1500 },
	},
];

export const ATTRIBUTE_TAXONOMY: AttributeDefinition[] = [
	...UNIVERSAL_ATTRIBUTES,
	...CATEGORY_ATTRIBUTES,
];

export interface DictionaryEntry {
	canonical: string;
	synonyms: string[];
	/**
	 * Vehicle make the brand links to, if applicable.
	 */
	make?: string;
	/**
	 * Optional external data sources used to verify the mapping.
	 */
	sources?: string[];
	notes?: string;
}

export const manufacturerDictionary: DictionaryEntry[] = [
	{
		canonical: "Baotian",
		synonyms: ["baotian", "bt"],
		make: "Baotian",
		sources: ["sample-2025-11-11"],
		notes: "Common Swedish scooter make, frequently paired with BT50QT family.",
	},
	{
		canonical: "Honda",
		synonyms: ["honda", "mt", "mt50", "mb", "mb5"],
		make: "Honda",
		sources: ["sample-2025-11-11"],
		notes: "Normalise MT/MB models to Honda make.",
	},
	{
		canonical: "Kymco",
		synonyms: ["kymco", "super 9"],
		make: "Kymco",
		sources: ["sample-2025-11-11"],
		notes: "Super 9 variants should link to Kymco vehicle models.",
	},
	{
		canonical: "Peugeot",
		synonyms: ["peugeot", "ludix", "spx"],
		make: "Peugeot",
		sources: ["sample-2025-11-11"],
	},
	{
		canonical: "Piaggio",
		synonyms: ["piaggio", "ciao", "bravo", "zip"],
		make: "Piaggio",
		sources: ["sample-2025-11-11"],
	},
	{
		canonical: "Rieju",
		synonyms: ["rieju", "rr", "rrx", "mrt", "smt"],
		make: "Rieju",
		sources: ["sample-2025-11-11"],
	},
	{
		canonical: "Sachs",
		synonyms: ["sachs", "compact", "transport"],
		make: "Sachs",
		sources: ["sample-2025-11-11"],
		notes: "Covers Sachs engine and frame family.",
	},
	{
		canonical: "Derbi",
		synonyms: ["derbi"],
		make: "Derbi",
		sources: ["sample-2025-11-11"],
	},
	{
		canonical: "Gilera",
		synonyms: ["gilera"],
		make: "Gilera",
		sources: ["sample-2025-11-11"],
	},
	{
		canonical: "Puch",
		synonyms: ["puch"],
		make: "Puch",
		sources: ["sample-2025-11-11"],
	},
	{
		canonical: "MCB",
		synonyms: ["mcb"],
		make: "MCB",
		sources: ["sample-2025-11-11"],
	},
	{
		canonical: "Yamaha",
		synonyms: ["yamaha"],
		make: "Yamaha",
		sources: ["sample-2025-11-11"],
	},
	{
		canonical: "Turbo Kit",
		synonyms: ["turbo kit", "turbo-kit"],
		sources: ["sample-2025-11-11"],
		notes: "Aftermarket exhaust brand; part manufacturer.",
	},
	{
		canonical: "Top Racing",
		synonyms: ["top racing"],
		sources: ["sample-2025-11-11"],
		notes: "Aftermarket crank brand; part manufacturer.",
	},
];

export interface ModelDictionaryEntry {
	raw: string;
	canonicalModel: string;
	make: string;
	externalVehicleModelSlug?: string;
	/**
	 * How we discovered the mapping (product name, description, manual input).
	 */
	source: "name" | "description" | "manual";
}

export const modelDictionary: ModelDictionaryEntry[] = [
	{ raw: "BT50QT-9", canonicalModel: "BT50QT-9", make: "Baotian", source: "name" },
	{ raw: "GY6", canonicalModel: "GY6", make: "Generic GY6", source: "name" },
	{ raw: "MB139", canonicalModel: "MB139", make: "Generic GY6", source: "name" },
	{ raw: "Super 9", canonicalModel: "Super 9", make: "Kymco", source: "name" },
	{ raw: "MT50", canonicalModel: "MT50", make: "Honda", source: "name" },
	{ raw: "MB5", canonicalModel: "MB5", make: "Honda", source: "manual" },
	{ raw: "Fox", canonicalModel: "Fox", make: "Peugeot", source: "manual" },
	{ raw: "Ludix", canonicalModel: "Ludix", make: "Peugeot", source: "name" },
	{ raw: "SPX", canonicalModel: "SPX", make: "Peugeot", source: "name" },
	{ raw: "Compact", canonicalModel: "Compact", make: "MCB", source: "name" },
	{ raw: "Transport", canonicalModel: "Transport", make: "Sachs", source: "name" },
	{ raw: "RR", canonicalModel: "RR", make: "Rieju", source: "name" },
	{ raw: "RRX", canonicalModel: "RRX", make: "Rieju", source: "name" },
	{ raw: "SMT", canonicalModel: "SMT", make: "Rieju", source: "name" },
	{ raw: "MRT", canonicalModel: "MRT", make: "Rieju", source: "name" },
	{ raw: "Ciao", canonicalModel: "Ciao", make: "Piaggio", source: "name" },
	{ raw: "Bravo", canonicalModel: "Bravo", make: "Piaggio", source: "name" },
];

export interface LinkageRule {
	brandSlug: string;
	modelSlugs: string[];
	vehicleModelLookup: {
		table: "vehicle_model";
		makeColumn: string;
		modelColumn: string;
	};
	/**
	 * Extra conditions for matching (e.g. year, engine displacement).
	 */
	conditions?: Array<{
		column: string;
		operator: "=" | ">=" | "<=" | "BETWEEN";
		value: string | number | [number, number];
	}>;
}

export const compatibilityLinkageRules: LinkageRule[] = [
	{
		brandSlug: "Baotian",
		modelSlugs: ["BT50QT-9", "GY6"],
		vehicleModelLookup: {
			table: "vehicle_model",
			makeColumn: "make",
			modelColumn: "model",
		},
	},
	{
		brandSlug: "Honda",
		modelSlugs: ["MT50", "MB5", "MB50"],
		vehicleModelLookup: {
			table: "vehicle_model",
			makeColumn: "make",
			modelColumn: "model",
		},
	},
	{
		brandSlug: "Peugeot",
		modelSlugs: ["Ludix", "SPX", "Fox"],
		vehicleModelLookup: {
			table: "vehicle_model",
			makeColumn: "make",
			modelColumn: "model",
		},
	},
	{
		brandSlug: "Piaggio",
		modelSlugs: ["Ciao", "Bravo", "Zip"],
		vehicleModelLookup: {
			table: "vehicle_model",
			makeColumn: "make",
			modelColumn: "model",
		},
	},
	{
		brandSlug: "Rieju",
		modelSlugs: ["RR", "RRX", "SMT", "MRT"],
		vehicleModelLookup: {
			table: "vehicle_model",
			makeColumn: "make",
			modelColumn: "model",
		},
	},
];

export const ATTRIBUTE_VERSION = "2025-11-12";

