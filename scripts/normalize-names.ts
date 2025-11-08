#!/usr/bin/env bun
/**
 * Normalize file and directory names by decoding URL/HTML entities
 * and replacing risky characters. Works recursively within a root.
 *
 * Usage:
 *   bun scripts/normalize-names.ts --root "data/nyehandel/fitment-maps-all" [--apply]
 */

import { readdir, rename, stat } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

type Options = {
	root: string;
	apply: boolean;
};

function parseArgs(): Options {
	const args = new Map<string, string | boolean>();
	for (let i = 2; i < process.argv.length; i++) {
		const a = process.argv[i];
		if (a === "--apply") args.set("apply", true);
		else if (a === "--root") {
			const v = process.argv[i + 1];
			if (!v) throw new Error("--root requires a value");
			args.set("root", v);
			i++;
		}
	}
	const root = resolve(String(args.get("root") ?? ""));
	if (!root) throw new Error("--root is required");
	return { root, apply: Boolean(args.get("apply")) };
}

function percentDecodeRepeated(input: string, maxPasses = 3): string {
	let prev = input;
	for (let i = 0; i < maxPasses; i++) {
		try {
			const next = decodeURIComponent(prev);
			if (next === prev) return next;
			prev = next;
		} catch {
			// If invalid escape sequence, stop further decoding
			return prev;
		}
	}
	return prev;
}

function htmlDecodeBasic(input: string): string {
	// Numeric entities
	let out = input.replace(/&#(\d+);/g, (_, d) => {
		const code = Number(d);
		return Number.isFinite(code) ? String.fromCharCode(code) : _;
	});
	out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
		const code = Number.parseInt(h, 16);
		return Number.isFinite(code) ? String.fromCharCode(code) : _;
	});
	// Common named entities
	out = out
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'");
	return out;
}

function sanitizeSegment(seg: string): string {
	// Special case: [object Object]
	if (/^\[object Object\]$/i.test(seg)) return "UNKNOWN";

	// Decode URL and HTML entities repeatedly
	let s = seg;
	const before = s;
	s = percentDecodeRepeated(s);
	s = htmlDecodeBasic(s);

	// Replace risky characters
	s = s
		.replace(/[\\/]/g, " - ") // path separators
		.replace(/[<>:;|]/g, " - ")
		.replace(/[*?`"']/g, "")
		.replace(/\s__\s/g, " - ")
		.replace(/%/g, ""); // any stray percent

	// Kebab-case: lowercase, remove parens, replace spaces/underscores with hyphens
	s = s.toLowerCase();
	s = s.replace(/[()[\]]/g, "");
	s = s.replace(/[\s_]+/g, "-");
	// Normalize hyphens and trim
	s = s.replace(/-{2,}/g, "-");
	s = s.replace(/^[-.]+|[-.]+$/g, "");

	// Preserve Swedish letters; no extra transliteration applied
	return s || before; // never empty out
}

async function collectPaths(root: string): Promise<string[]> {
	const out: string[] = [];
	async function walk(dir: string) {
		const entries = await readdir(dir, { withFileTypes: true });
		for (const e of entries) {
			const p = join(dir, e.name);
			if (e.isDirectory()) {
				await walk(p);
				out.push(p);
			} else {
				out.push(p);
			}
		}
	}
	await walk(root);
	// Sort by depth (deepest first) to avoid breaking traversal on rename
	out.sort((a, b) => b.split(sep).length - a.split(sep).length);
	return out;
}

async function pathExists(p: string): Promise<boolean> {
	try {
		await stat(p);
		return true;
	} catch {
		return false;
	}
}

async function main() {
	const { root, apply } = parseArgs();
	const paths = await collectPaths(root);

	const mapping: Array<{ from: string; to: string }> = [];
	const collisions = new Set<string>();

	for (const full of paths) {
		const parts = full.split(sep);
		const base = parts[parts.length - 1] ?? "";
		const parent = dirname(full);

		const isJson = base.toLowerCase().endsWith(".json");
		const stem = isJson ? base.slice(0, -5) : base; // remove .json if present
		const sanitized = sanitizeSegment(stem);
		const nextBase = isJson ? `${sanitized}.json` : sanitized;
		if (nextBase === base) continue; // no change

		let candidate = join(parent, nextBase);
		if (await pathExists(candidate)) {
			// If only case differs on a case-insensitive FS, treat as non-collision
			if (full.toLowerCase() === candidate.toLowerCase()) {
				mapping.push({ from: full, to: candidate });
				continue;
			}
			// de-dupe
			let n = 2;
			const stem2 = isJson ? sanitized : sanitized;
			while (await pathExists(candidate)) {
				const altBase = isJson ? `${stem2} (${n}).json` : `${stem2} (${n})`;
				candidate = join(parent, altBase);
				n++;
			}
			collisions.add(candidate);
		}
		mapping.push({ from: full, to: candidate });
	}

	const logPath = join(root, "name-normalization.log.json");
	await Bun.write(
		logPath,
		JSON.stringify(
			{
				root,
				apply,
				count: mapping.length,
				collisions: [...collisions],
				mapping,
			},
			null,
			2,
		),
	);

	console.log(`[normalize-names] root=${root}`);
	console.log(`[normalize-names] planned renames: ${mapping.length}`);
	console.log(`[normalize-names] log written to: ${logPath}`);

	if (!apply) {
		console.log("[normalize-names] dry-run complete (no changes applied).");
		return;
	}

	for (const m of mapping) {
		// Skip if path already moved by prior rename in same parent in this run
		if (!(await pathExists(m.from))) continue;
		// Handle case-only rename safely on case-insensitive FS via temp hop
		if (m.from.toLowerCase() === m.to.toLowerCase()) {
			const tmp = join(dirname(m.from), `${Date.now()}.__tmp__`);
			await rename(m.from, tmp);
			await rename(tmp, m.to);
		} else {
			await rename(m.from, m.to);
		}
		console.log(`renamed: ${m.from} -> ${m.to}`);
	}

	console.log(`[normalize-names] applied ${mapping.length} renames.`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
