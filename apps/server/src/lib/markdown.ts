import matter from "gray-matter";
import { marked } from "marked";

export interface EnrichmentContent {
	frontMatter?: Record<string, unknown>;
	markdown: string;
	renderedHtml?: string;
}

/**
 * Parse markdown with front-matter
 */
export function parseMarkdown(
	content: string,
): { frontMatter: Record<string, unknown>; markdown: string } {
	const parsed = matter(content);
	return {
		frontMatter: parsed.data as Record<string, unknown>,
		markdown: parsed.content,
	};
}

/**
 * Render markdown to HTML
 */
export async function renderMarkdown(markdown: string): Promise<string> {
	return marked(markdown);
}

/**
 * Process enrichment content: parse front-matter and render markdown
 */
export async function processEnrichmentContent(
	content: EnrichmentContent,
): Promise<EnrichmentContent> {
	const { frontMatter, markdown } = parseMarkdown(content.markdown);
	const renderedHtml = await renderMarkdown(markdown);

	return {
		frontMatter,
		markdown,
		renderedHtml,
	};
}

/**
 * Inject placeholders into rendered HTML (price, stock, availability)
 */
export function injectPlaceholders(
	html: string,
	placeholders: {
		price?: number;
		stock?: number;
		availability?: string;
		[key: string]: unknown;
	},
): string {
	let result = html;
	for (const [key, value] of Object.entries(placeholders)) {
		const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
		result = result.replace(regex, String(value ?? ""));
	}
	return result;
}
