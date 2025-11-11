"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type ColumnDef,
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { Pencil, Trash2, Plus, Eye } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/utils/trpc";

type ProductEnrichmentRow = {
	id: string;
	productId: string;
	productName: string | null;
	content: unknown;
	status: string;
	language: string;
	createdAt: unknown;
	updatedAt: unknown;
};

export function ProductEnrichmentTable() {
	const [page, setPage] = React.useState(1);
	const [search, setSearch] = React.useState("");
	const [statusFilter, setStatusFilter] = React.useState<string | undefined>();
	const [isCreateOpen, setIsCreateOpen] = React.useState(false);
	const [editingId, setEditingId] = React.useState<string | null>(null);
	const queryClient = useQueryClient();

	const query = useQuery(
		trpc.productEnrichment.list.queryOptions({
			page,
			limit: 50,
			search: search || undefined,
			status: statusFilter as any,
		}),
	);

	const productsQuery = useQuery(trpc.getProducts.queryOptions({ page: 1, limit: 1000 }));

	const createMutation = useMutation({
		mutationFn: trpc.productEnrichment.create.mutate,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["productEnrichment", "list"]] });
			setIsCreateOpen(false);
		},
	});

	const updateMutation = useMutation({
		mutationFn: trpc.productEnrichment.update.mutate,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["productEnrichment", "list"]] });
			setEditingId(null);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: trpc.productEnrichment.delete.mutate,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["productEnrichment", "list"]] });
		},
	});

	const columnHelper = createColumnHelper<ProductEnrichmentRow>();
	const columns: ColumnDef<ProductEnrichmentRow, any>[] = React.useMemo(
		() => [
			columnHelper.accessor("productName", {
				header: "Product",
				cell: ({ getValue }) => (
					<span className="font-medium">{getValue() || "—"}</span>
				),
			}),
			columnHelper.accessor("status", {
				header: "Status",
				cell: ({ getValue }) => {
					const status = getValue();
					const colors: Record<string, string> = {
						draft: "bg-gray-100 text-gray-800",
						valid: "bg-green-100 text-green-800",
						invalid: "bg-red-100 text-red-800",
						published: "bg-blue-100 text-blue-800",
					};
					return (
						<span className={`rounded-full px-2 py-1 text-xs ${colors[status] || colors.draft}`}>
							{status}
						</span>
					);
				},
			}),
			columnHelper.accessor("language", {
				header: "Language",
				cell: ({ getValue }) => <span className="uppercase">{getValue()}</span>,
			}),
			columnHelper.display({
				id: "actions",
				header: "Actions",
				cell: ({ row }) => (
					<div className="flex gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setEditingId(row.original.id)}
						>
							<Pencil className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								if (confirm("Delete this enrichment?")) {
									deleteMutation.mutate({ id: row.original.id });
								}
							}}
						>
							<Trash2 className="h-4 w-4 text-destructive" />
						</Button>
					</div>
				),
			}),
		],
		[deleteMutation],
	);

	const table = useReactTable({
		data: (query.data?.enrichments as ProductEnrichmentRow[]) ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>Product Enrichment</CardTitle>
					<Button onClick={() => setIsCreateOpen(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Add Enrichment
					</Button>
				</div>
				<div className="mt-4 flex gap-4">
					<Input
						placeholder="Search enrichments..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="max-w-xs"
					/>
					<select
						value={statusFilter || "all"}
						onChange={(e) =>
							setStatusFilter(e.target.value === "all" ? undefined : e.target.value)
						}
						className="rounded-md border px-3 py-2"
					>
						<option value="all">All Status</option>
						<option value="draft">Draft</option>
						<option value="valid">Valid</option>
						<option value="invalid">Invalid</option>
						<option value="published">Published</option>
					</select>
				</div>
			</CardHeader>
			<CardContent>
				{query.isLoading ? (
					<div className="py-10 text-center text-muted-foreground">
						Loading...
					</div>
				) : query.error ? (
					<div className="py-10 text-center text-destructive">
						Error loading enrichments
					</div>
				) : (
					<div className="rounded-md border">
						<table className="w-full">
							<thead className="bg-muted">
								{table.getHeaderGroups().map((headerGroup) => (
									<tr key={headerGroup.id}>
										{headerGroup.headers.map((header) => (
											<th
												key={header.id}
												className="border-b p-3 text-left font-semibold"
											>
												{flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
											</th>
										))}
									</tr>
								))}
							</thead>
							<tbody>
								{table.getRowModel().rows.map((row) => (
									<tr key={row.id} className="border-b hover:bg-muted/50">
										{row.getVisibleCells().map((cell) => (
											<td key={cell.id} className="p-3">
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</CardContent>

			{isCreateOpen && (
				<CreateProductEnrichmentDialog
					products={productsQuery.data?.products || []}
					onClose={() => setIsCreateOpen(false)}
					onSubmit={(data) => createMutation.mutate(data)}
				/>
			)}

			{editingId && (
				<EditProductEnrichmentDialog
					id={editingId}
					onClose={() => setEditingId(null)}
					onSubmit={(data) => updateMutation.mutate({ id: editingId, ...data })}
				/>
			)}
		</Card>
	);
}

function CreateProductEnrichmentDialog({
	products,
	onClose,
	onSubmit,
}: {
	products: Array<{ id: string; name: string }>;
	onClose: () => void;
	onSubmit: (data: {
		productId: string;
		content: { frontMatter?: Record<string, unknown>; markdown: string; renderedHtml?: string };
		status?: string;
		language?: string;
	}) => void;
}) {
	const [productId, setProductId] = React.useState("");
	const [markdown, setMarkdown] = React.useState("");
	const [status, setStatus] = React.useState("draft");
	const [language, setLanguage] = React.useState("en");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!productId || !markdown) return;
		onSubmit({
			productId,
			content: {
				frontMatter: {},
				markdown,
				renderedHtml: "",
			},
			status,
			language,
		});
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="w-full max-w-2xl rounded-lg bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto">
				<h2 className="mb-4 text-lg font-semibold">Create Product Enrichment</h2>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label htmlFor="product">Product</Label>
						<select
							id="product"
							value={productId}
							onChange={(e) => setProductId(e.target.value)}
							className="mt-1 w-full rounded-md border px-3 py-2"
							required
						>
							<option value="">Select product...</option>
							{products.map((p) => (
								<option key={p.id} value={p.id}>
									{p.name}
								</option>
							))}
						</select>
					</div>
					<div>
						<Label htmlFor="markdown">Markdown Content</Label>
						<textarea
							id="markdown"
							value={markdown}
							onChange={(e) => setMarkdown(e.target.value)}
							className="mt-1 w-full rounded-md border px-3 py-2 font-mono text-sm"
							rows={10}
							required
						/>
					</div>
					<div>
						<Label htmlFor="status">Status</Label>
						<select
							id="status"
							value={status}
							onChange={(e) => setStatus(e.target.value)}
							className="mt-1 w-full rounded-md border px-3 py-2"
						>
							<option value="draft">Draft</option>
							<option value="valid">Valid</option>
							<option value="invalid">Invalid</option>
							<option value="published">Published</option>
						</select>
					</div>
					<div>
						<Label htmlFor="language">Language</Label>
						<Input
							id="language"
							value={language}
							onChange={(e) => setLanguage(e.target.value)}
							placeholder="en"
						/>
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit">Create</Button>
					</div>
				</form>
			</div>
		</div>
	);
}

function EditProductEnrichmentDialog({
	id,
	onClose,
	onSubmit,
}: {
	id: string;
	onClose: () => void;
	onSubmit: (data: {
		content?: { frontMatter?: Record<string, unknown>; markdown: string; renderedHtml?: string };
		status?: string;
		language?: string;
	}) => void;
}) {
	const query = useQuery(trpc.productEnrichment.getById.queryOptions({ id }));
	const [markdown, setMarkdown] = React.useState("");
	const [status, setStatus] = React.useState("draft");
	const [language, setLanguage] = React.useState("en");

	React.useEffect(() => {
		if (query.data?.content) {
			const content = query.data.content as {
				frontMatter?: Record<string, unknown>;
				markdown: string;
				renderedHtml?: string;
			};
			setMarkdown(content.markdown || "");
			setStatus(query.data.status);
			setLanguage(query.data.language);
		}
	}, [query.data]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit({
			content: {
				frontMatter: {},
				markdown,
				renderedHtml: "",
			},
			status,
			language,
		});
	};

	if (query.isLoading) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
				<div className="rounded-lg bg-background p-6">Loading...</div>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="w-full max-w-2xl rounded-lg bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto">
				<h2 className="mb-4 text-lg font-semibold">Edit Product Enrichment</h2>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label htmlFor="markdown">Markdown Content</Label>
						<textarea
							id="markdown"
							value={markdown}
							onChange={(e) => setMarkdown(e.target.value)}
							className="mt-1 w-full rounded-md border px-3 py-2 font-mono text-sm"
							rows={10}
							required
						/>
					</div>
					<div>
						<Label htmlFor="status">Status</Label>
						<select
							id="status"
							value={status}
							onChange={(e) => setStatus(e.target.value)}
							className="mt-1 w-full rounded-md border px-3 py-2"
						>
							<option value="draft">Draft</option>
							<option value="valid">Valid</option>
							<option value="invalid">Invalid</option>
							<option value="published">Published</option>
						</select>
					</div>
					<div>
						<Label htmlFor="language">Language</Label>
						<Input
							id="language"
							value={language}
							onChange={(e) => setLanguage(e.target.value)}
						/>
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit">Update</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
