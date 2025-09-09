#!/usr/bin/env bun
import { config as loadEnv } from "dotenv";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

// Load .env.local then .env
loadEnv({ path: ".env.local" });
loadEnv();

type Json = unknown;
type HeadersLike = Record<string, string>;

type CliOpts = {
  baseUrl: string;
  identifier: string;
  token: string;
  language?: string;
  paths: { products: string; variants: string; categories: string };
  pageParam: string;
  pageSizeParam: string;
  pageSize: number;
  limit: number;
};

function parseArgs(argv: string[]): Partial<CliOpts> {
  const out: any = {};
  const get = (k: string) => {
    const i = argv.indexOf(k);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : undefined;
  };
  out.baseUrl = get("--base-url");
  out.identifier = get("--identifier");
  out.token = get("--token");
  out.language = get("--language");
  out.pageParam = get("--page-param");
  out.pageSizeParam = get("--page-size-param");
  out.pageSize = get("--page-size") ? Number(get("--page-size")) : undefined;
  out.limit = get("--limit") ? Number(get("--limit")) : undefined;

  const products = get("--path-products");
  const variants = get("--path-variants");
  const categories = get("--path-categories");
  if (products || variants || categories) {
    out.paths = {
      products: products ?? "/products",
      variants: variants ?? "/variants",
      categories: categories ?? "/categories",
    };
  }
  return out;
}

function resolveOpts(): CliOpts {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = args.baseUrl ?? process.env.NYE_BASE_URL ?? "https://api.nyehandel.se/api/v2";
  const identifier = args.identifier ?? process.env.NYE_IDENTIFIER;
  const token = args.token ?? process.env.NYE_TOKEN;
  if (!baseUrl || !identifier || !token) {
    console.error("Missing NYE_BASE_URL, NYE_IDENTIFIER or NYE_TOKEN.");
    process.exit(1);
  }
  return {
    baseUrl,
    identifier,
    token,
    language: args.language ?? process.env.NYE_LANGUAGE,
    paths: args.paths ?? { products: "/products", variants: "/variants", categories: "/categories" },
    pageParam: args.pageParam ?? process.env.NYE_PAGE_PARAM ?? "page",
    pageSizeParam: args.pageSizeParam ?? process.env.NYE_PAGE_SIZE_PARAM ?? "pageSize",
    pageSize: args.pageSize ?? (process.env.NYE_DEFAULT_PAGE_SIZE ? Number(process.env.NYE_DEFAULT_PAGE_SIZE) : 100),
    limit: args.limit ?? 300,
  };
}

function qs(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) usp.set(k, String(v));
  const s = usp.toString();
  return s ? `?${s}` : "";
}

async function httpGet<T = Json>(
  opts: CliOpts,
  path: string,
  query?: Record<string, string | number | undefined>
): Promise<{ data: T; headers: HeadersLike; url: string }> {
  const url = `${opts.baseUrl.replace(/\/+$/, "")}${path}${qs(query ?? {})}`;
  const headers: Record<string, string> = {
    "X-identifier": opts.identifier,
    Authorization: `Bearer ${opts.token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (opts.language) headers["X-Language"] = opts.language;

  const res = await fetch(url, { headers });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : null; } catch {
    throw new Error(`Non-JSON response from ${url}: ${text.slice(0, 200)}…`);
  }
  const outHeaders: HeadersLike = {};
  res.headers.forEach((v, k) => { outHeaders[k] = v; });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}: ${JSON.stringify(data).slice(0, 300)}…`);
  }
  return { data, headers: outHeaders, url };
}

async function fetchPagedArray(
  opts: CliOpts,
  path: string,
  sampleLimit: number
): Promise<{ items: any[]; headers: HeadersLike[]; urls: string[] }> {
  const items: any[] = [];
  const headers: HeadersLike[] = [];
  const urls: string[] = [];
  let page = 1;
  const pageSize = Math.min(opts.pageSize, sampleLimit);
  while (items.length < sampleLimit) {
    const { data, headers: h, url } = await httpGet<any>(opts, path, {
      [opts.pageParam]: page,
      [opts.pageSizeParam]: pageSize,
    });
    urls.push(url);
    headers.push(h);
    if (Array.isArray(data)) {
      items.push(...data);
      if (data.length < pageSize) break;
    } else if (data && Array.isArray((data as any).items)) {
      items.push(...(data as any).items);
      if ((data as any).items.length < pageSize) break;
    } else {
      const possible = Object.values(data ?? {}).find((v) => Array.isArray(v)) as any[] | undefined;
      if (possible) items.push(...possible);
      break;
    }
    page += 1;
  }
  return { items: items.slice(0, sampleLimit), headers, urls };
}

// ——— Inference (lightweight → Zod) ———

type Inferred =
  | { kind: "null" }
  | { kind: "boolean" }
  | { kind: "number" }
  | { kind: "string"; format?: "iso-date" | "iso-datetime" | "url" }
  | { kind: "array"; items: Inferred }
  | { kind: "object"; fields: Record<string, Inferred> }
  | { kind: "union"; variants: Inferred[] };

function isIsoDate(s: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(s); }
function isIsoDateTime(s: string): boolean { return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s); }
function isUrl(s: string): boolean { try { const u = new URL(s); return !!u.protocol && !!u.host; } catch { return false; } }

function inferValue(v: any): Inferred {
  if (v === null || v === undefined) return { kind: "null" };
  const t = typeof v;
  if (t === "boolean") return { kind: "boolean" };
  if (t === "number") return { kind: "number" };
  if (t === "string") {
    if (isIsoDateTime(v)) return { kind: "string", format: "iso-datetime" };
    if (isIsoDate(v)) return { kind: "string", format: "iso-date" };
    if (isUrl(v)) return { kind: "string", format: "url" };
    return { kind: "string" };
  }
  if (Array.isArray(v)) {
    const first = v.find((x) => x !== null && x !== undefined);
    return { kind: "array", items: first ? inferValue(first) : { kind: "null" } };
  }
  if (t === "object") {
    const fields: Record<string, Inferred> = {};
    for (const [k, val] of Object.entries(v)) fields[k] = inferValue(val);
    return { kind: "object", fields };
  }
  return { kind: "string" };
}

function merge(a: Inferred, b: Inferred): Inferred {
  if (a.kind === "union") return { kind: "union", variants: normalizeUnion([...a.variants, b]) };
  if (b.kind === "union") return { kind: "union", variants: normalizeUnion([a, ...b.variants]) };
  if (a.kind !== b.kind) return { kind: "union", variants: normalizeUnion([a, b]) };
  if (a.kind === "array" && b.kind === "array") return { kind: "array", items: merge(a.items, b.items) };
  if (a.kind === "object" && b.kind === "object") {
    const keys = new Set([...Object.keys(a.fields), ...Object.keys(b.fields)]);
    const fields: Record<string, Inferred> = {};
    for (const k of keys) {
      const av = a.fields[k];
      const bv = b.fields[k];
      if (!av) fields[k] = { kind: "union", variants: normalizeUnion([{ kind: "null" }, bv!]) };
      else if (!bv) fields[k] = { kind: "union", variants: normalizeUnion([av, { kind: "null" }]) };
      else fields[k] = merge(av, bv);
    }
    return { kind: "object", fields };
  }
  return a;
}

function normalizeUnion(vs: Inferred[]): Inferred[] {
  const key = (v: Inferred) => JSON.stringify(v);
  const uniq = new Map<string, Inferred>();
  for (const v of vs) uniq.set(key(v), v);
  return [...uniq.values()];
}

function inferFromSamples(samples: any[]): Inferred {
  const meaningful = samples.filter((x) => x != null);
  if (meaningful.length === 0) return { kind: "null" };
  return meaningful.map(inferValue).reduce(merge);
}

function toZod(name: string, inf: Inferred): string {
  const safeKey = (k: string) => /^[a-zA-Z_]\w*$/.test(k) ? k : JSON.stringify(k);
  const v = (x: Inferred): string => {
    switch (x.kind) {
      case "null": return "z.null()";
      case "boolean": return "z.boolean()";
      case "number": return "z.number()";
      case "string":
        if (x.format === "iso-datetime") return "z.string().datetime().or(z.string())";
        if (x.format === "iso-date") return "z.string()";
        if (x.format === "url") return "z.string().url().or(z.string())";
        return "z.string()";
      case "array": return `z.array(${v(x.items)})`;
      case "object":
        return `z.object({\n${Object.entries(x.fields).map(([k, val]) => `  ${safeKey(k)}: ${v(val)}.optional()`).join(",\n")}\n})`;
      case "union": return x.variants.map(v).join(".or(") + (x.variants.length > 1 ? ")" : "");
    }
  };
  return `export const ${name}Schema = ${v(inf)}; export type ${name} = z.infer<typeof ${name}Schema>;`;
}

async function run() {
  const opts = resolveOpts();
  // Use a human-readable local timestamp for snapshot folder names: YYYY-MM-DD HH.mm.ss
  const humanTimestamp = (d = new Date()) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${y}-${m}-${day} ${hh}.${mm}.${ss}`;
  };
  const outDir = join(process.cwd(), "data", "nyehandel", "snapshots", humanTimestamp());
  await mkdir(outDir, { recursive: true });

  const targets = [
    { key: "products", path: opts.paths.products },
    { key: "variants", path: opts.paths.variants },
    { key: "categories", path: opts.paths.categories },
  ] as const;

  const results: Record<string, any[]> = {};
  const headersPer: Record<string, HeadersLike[]> = {};
  const urlsPer: Record<string, string[]> = {};

  for (const t of targets) {
    try {
      const { items, headers, urls } = await fetchPagedArray(opts, t.path, opts.limit);
      results[t.key] = items;
      headersPer[t.key] = headers;
      urlsPer[t.key] = urls;
      await writeFile(join(outDir, `${t.key}.json`), JSON.stringify(items, null, 2), "utf8");
      await writeFile(join(outDir, `${t.key}.headers.json`), JSON.stringify(headers, null, 2), "utf8");
      await writeFile(join(outDir, `${t.key}.urls.json`), JSON.stringify(urls, null, 2), "utf8");
      console.log(`Saved ${items.length} ${t.key} samples`);
    } catch (e: any) {
      console.warn(`Warn: failed to fetch ${t.key}: ${e.message}`);
    }
  }

  const productInf = results.products ? inferFromSamples(results.products) : { kind: "null" } as Inferred;
  const variantInf = results.variants ? inferFromSamples(results.variants) : { kind: "null" } as Inferred;
  const categoryInf = results.categories ? inferFromSamples(results.categories) : { kind: "null" } as Inferred;

  const zodFile =
`import { z } from "zod";
${toZod("NyProduct", productInf)}
${toZod("NyVariant", variantInf)}
${toZod("NyCategory", categoryInf)}
`;
  await writeFile(join(outDir, "schemas.zod.ts"), zodFile, "utf8");

  console.log(`Snapshot written to ${outDir}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
