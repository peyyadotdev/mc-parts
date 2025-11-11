"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type ColumnDef,
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { Pencil, Trash2, Plus } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/utils/trpc";
import { z } from "zod";

type BrandAliasRow = {
	id: string;
	brandId: string;
	brandName: string | null;
	alias: string;
	status: string;
	priority: string;
	createdAt: unknown;
	updatedAt: unknown;
};

export function BrandAliasesTable() {
	const [page, setPage] = React.useState(1);
	const [search, setSearch] = React.useState("");
	const [statusFilter, setStatusFilter] = React.useState<string | undefined>();
	const [isCreateOpen, setIsCreateOpen] = React.useState(false);
	const [editingId, setEditingId] = React.useState<string | null>(null);
	const queryClient = useQueryClient();

	const query = useQuery(
		trpc.brandAlias.list.queryOptions({
			page,
			limit: 50,
			search: search || undefined,
			status: statusFilter as any,
		}),
	);

	const createMutation = useMutation({
		mutationFn: trpc.brandAlias.create.mutate,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["brandAlias", "list"]] });
			setIsCreateOpen(false);
		},
	});

	const updateMutation = useMutation({
		mutationFn: trpc.brandAlias.update.mutate,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["brandAlias", "list"]] });
			setEditingId(null);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: trpc.brandAlias.delete.mutate,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["brandAlias", "list"]] });
		},
	});

	const brandsQuery = useQuery(trpc.listBrandsWithIds.queryOptions());

	const columnHelper = createColumnHelper<BrandAliasRow>();
	const columns: ColumnDef<BrandAliasRow, any>[] = React.useMemo(
		() => [
			columnHelper.accessor("brandName", {
				header: "Brand",
				cell: ({ getValue }) => (
					<span className="font-medium">{getValue() || "—"}</span>
				),
			}),
			columnHelper.accessor("alias", {
				header: "Alias",
				cell: ({ getValue }) => <span>{getValue()}</span>,
			}),
			columnHelper.accessor("status", {
				header: "Status",
				cell: ({ getValue }) => {
					const status = getValue();
					return (
						<span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
							{status}
						</span>
					);
				},
			}),
			columnHelper.accessor("priority", {
				header: "Priority",
				cell: ({ getValue }) => <span className="font-mono">{getValue()}</span>,
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
								if (confirm("Delete this alias?")) {
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
		data: (query.data?.aliases as BrandAliasRow[]) ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>Brand Aliases</CardTitle>
					<Button onClick={() => setIsCreateOpen(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Add Alias
					</Button>
				</div>
				<div className="mt-4 flex gap-4">
					<Input
						placeholder="Search aliases..."
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
						<option value="manual">Manual</option>
						<option value="auto">Auto</option>
						<option value="reviewed">Reviewed</option>
						<option value="approved">Approved</option>
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
						Error loading aliases
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
				<CreateBrandAliasDialog
					brands={brandsQuery.data || []}
					onClose={() => setIsCreateOpen(false)}
					onSubmit={(data) => createMutation.mutate(data)}
				/>
			)}

			{editingId && (
				<EditBrandAliasDialog
					id={editingId}
					brands={brandsQuery.data || []}
					onClose={() => setEditingId(null)}
					onSubmit={(data) => updateMutation.mutate({ id: editingId, ...data })}
				/>
			)}
		</Card>
	);
}

function CreateBrandAliasDialog({
	brands,
	onClose,
	onSubmit,
}: {
	brands: Array<{ id: string; name: string }>;
	onClose: () => void;
	onSubmit: (data: {
		brandId: string;
		alias: string;
		status?: string;
		priority?: string;
	}) => void;
}) {
	const [brandId, setBrandId] = React.useState("");
	const [alias, setAlias] = React.useState("");
	const [status, setStatus] = React.useState("auto");
	const [priority, setPriority] = React.useState("0");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!brandId || !alias) return;
		onSubmit({ brandId, alias, status, priority });
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
				<h2 className="mb-4 text-lg font-semibold">Create Brand Alias</h2>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label htmlFor="brand">Brand</Label>
						<select
							id="brand"
							value={brandId}
							onChange={(e) => setBrandId(e.target.value)}
							className="mt-1 w-full rounded-md border px-3 py-2"
							required
						>
							<option value="">Select brand...</option>
							{brands.map((b) => (
								<option key={b.id} value={b.id}>
									{b.name}
								</option>
							))}
						</select>
					</div>
					<div>
						<Label htmlFor="alias">Alias</Label>
						<Input
							id="alias"
							value={alias}
							onChange={(e) => setAlias(e.target.value)}
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
							<option value="auto">Auto</option>
							<option value="manual">Manual</option>
							<option value="reviewed">Reviewed</option>
							<option value="approved">Approved</option>
						</select>
					</div>
					<div>
						<Label htmlFor="priority">Priority</Label>
						<Input
							id="priority"
							type="number"
							value={priority}
							onChange={(e) => setPriority(e.target.value)}
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

function EditBrandAliasDialog({
	id,
	brands,
	onClose,
	onSubmit,
}: {
	id: string;
	brands: Array<{ id: string; name: string }>;
	onClose: () => void;
	onSubmit: (data: {
		alias?: string;
		status?: string;
		priority?: string;
	}) => void;
}) {
	const query = useQuery(trpc.brandAlias.getById.queryOptions({ id }));
	const [alias, setAlias] = React.useState("");
	const [status, setStatus] = React.useState("auto");
	const [priority, setPriority] = React.useState("0");

	React.useEffect(() => {
		if (query.data) {
			setAlias(query.data.alias);
			setStatus(query.data.status);
			setPriority(query.data.priority);
		}
	}, [query.data]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit({ alias, status, priority });
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
			<div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
				<h2 className="mb-4 text-lg font-semibold">Edit Brand Alias</h2>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label htmlFor="alias">Alias</Label>
						<Input
							id="alias"
							value={alias}
							onChange={(e) => setAlias(e.target.value)}
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
							<option value="auto">Auto</option>
							<option value="manual">Manual</option>
							<option value="reviewed">Reviewed</option>
							<option value="approved">Approved</option>
						</select>
					</div>
					<div>
						<Label htmlFor="priority">Priority</Label>
						<Input
							id="priority"
							type="number"
							value={priority}
							onChange={(e) => setPriority(e.target.value)}
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
