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
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/utils/trpc";

type AttributeTemplateRow = {
	id: string;
	name: string;
	description: string | null;
	categoryId: string | null;
	categoryName: string | null;
	requiredAttributeIds: unknown;
	optionalAttributeIds: unknown;
	isActive: string;
	createdAt: unknown;
	updatedAt: unknown;
};

export function AttributeTemplatesTable() {
	const [page, setPage] = React.useState(1);
	const [search, setSearch] = React.useState("");
	const [isCreateOpen, setIsCreateOpen] = React.useState(false);
	const [editingId, setEditingId] = React.useState<string | null>(null);
	const queryClient = useQueryClient();

	const query = useQuery(
		trpc.attributeTemplate.list.queryOptions({
			page,
			limit: 50,
			search: search || undefined,
		}),
	);

	const attributesQuery = useQuery(
		trpc.attributeDefinition.list.queryOptions({ page: 1, limit: 1000 }),
	);

	const createMutation = useMutation({
		mutationFn: trpc.attributeTemplate.create.mutate,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["attributeTemplate", "list"]] });
			setIsCreateOpen(false);
		},
	});

	const updateMutation = useMutation({
		mutationFn: trpc.attributeTemplate.update.mutate,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["attributeTemplate", "list"]] });
			setEditingId(null);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: trpc.attributeTemplate.delete.mutate,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["attributeTemplate", "list"]] });
		},
	});

	const columnHelper = createColumnHelper<AttributeTemplateRow>();
	const columns: ColumnDef<AttributeTemplateRow, any>[] = React.useMemo(
		() => [
			columnHelper.accessor("name", {
				header: "Name",
				cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
			}),
			columnHelper.accessor("categoryName", {
				header: "Category",
				cell: ({ getValue }) => <span>{getValue() || "—"}</span>,
			}),
			columnHelper.accessor("isActive", {
				header: "Active",
				cell: ({ getValue }) => (
					<span
						className={`rounded-full px-2 py-1 text-xs ${
							getValue() === "true"
								? "bg-green-100 text-green-800"
								: "bg-gray-100 text-gray-800"
						}`}
					>
						{getValue() === "true" ? "Yes" : "No"}
					</span>
				),
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
								if (confirm("Delete this template?")) {
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
		data: (query.data?.templates as AttributeTemplateRow[]) ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>Attribute Templates</CardTitle>
					<Button onClick={() => setIsCreateOpen(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Add Template
					</Button>
				</div>
				<div className="mt-4">
					<Input
						placeholder="Search templates..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="max-w-xs"
					/>
				</div>
			</CardHeader>
			<CardContent>
				{query.isLoading ? (
					<div className="py-10 text-center text-muted-foreground">
						Loading...
					</div>
				) : query.error ? (
					<div className="py-10 text-center text-destructive">
						Error loading templates
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
				<CreateAttributeTemplateDialog
					attributes={attributesQuery.data?.definitions || []}
					onClose={() => setIsCreateOpen(false)}
					onSubmit={(data) => createMutation.mutate(data)}
				/>
			)}

			{editingId && (
				<EditAttributeTemplateDialog
					id={editingId}
					attributes={attributesQuery.data?.definitions || []}
					onClose={() => setEditingId(null)}
					onSubmit={(data) => updateMutation.mutate({ id: editingId, ...data })}
				/>
			)}
		</Card>
	);
}

function CreateAttributeTemplateDialog({
	attributes,
	onClose,
	onSubmit,
}: {
	attributes: Array<{ id: string; name: string; key: string }>;
	onClose: () => void;
	onSubmit: (data: {
		name: string;
		description?: string;
		categoryId?: string;
		requiredAttributeIds: string[];
		optionalAttributeIds?: string[];
		isActive?: boolean;
	}) => void;
}) {
	const [name, setName] = React.useState("");
	const [description, setDescription] = React.useState("");
	const [requiredIds, setRequiredIds] = React.useState<string[]>([]);
	const [optionalIds, setOptionalIds] = React.useState<string[]>([]);
	const [isActive, setIsActive] = React.useState(true);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name || requiredIds.length === 0) return;
		onSubmit({
			name,
			description: description || undefined,
			requiredAttributeIds: requiredIds,
			optionalAttributeIds: optionalIds.length > 0 ? optionalIds : undefined,
			isActive,
		});
	};

	const toggleAttribute = (id: string, isRequired: boolean) => {
		if (isRequired) {
			setRequiredIds((prev) =>
				prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
			);
			setOptionalIds((prev) => prev.filter((i) => i !== id));
		} else {
			setOptionalIds((prev) =>
				prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
			);
			setRequiredIds((prev) => prev.filter((i) => i !== id));
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="w-full max-w-2xl rounded-lg bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto">
				<h2 className="mb-4 text-lg font-semibold">Create Attribute Template</h2>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>
					<div>
						<Label htmlFor="description">Description</Label>
						<Input
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>
					<div>
						<Label>Required Attributes</Label>
						<div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
							{attributes.map((attr) => (
								<div key={attr.id} className="flex items-center gap-2">
									<Checkbox
										checked={requiredIds.includes(attr.id)}
										onCheckedChange={() => toggleAttribute(attr.id, true)}
									/>
									<span className="text-sm">
										{attr.name} ({attr.key})
									</span>
								</div>
							))}
						</div>
					</div>
					<div>
						<Label>Optional Attributes</Label>
						<div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
							{attributes.map((attr) => (
								<div key={attr.id} className="flex items-center gap-2">
									<Checkbox
										checked={optionalIds.includes(attr.id)}
										onCheckedChange={() => toggleAttribute(attr.id, false)}
									/>
									<span className="text-sm">
										{attr.name} ({attr.key})
									</span>
								</div>
							))}
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							id="isActive"
							checked={isActive}
							onCheckedChange={(checked) => setIsActive(checked === true)}
						/>
						<Label htmlFor="isActive">Active</Label>
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

function EditAttributeTemplateDialog({
	id,
	attributes,
	onClose,
	onSubmit,
}: {
	id: string;
	attributes: Array<{ id: string; name: string; key: string }>;
	onClose: () => void;
	onSubmit: (data: {
		name?: string;
		description?: string;
		categoryId?: string;
		requiredAttributeIds?: string[];
		optionalAttributeIds?: string[];
		isActive?: boolean;
	}) => void;
}) {
	const query = useQuery(trpc.attributeTemplate.getById.queryOptions({ id }));
	const [name, setName] = React.useState("");
	const [description, setDescription] = React.useState("");
	const [requiredIds, setRequiredIds] = React.useState<string[]>([]);
	const [optionalIds, setOptionalIds] = React.useState<string[]>([]);
	const [isActive, setIsActive] = React.useState(true);

	React.useEffect(() => {
		if (query.data) {
			setName(query.data.name);
			setDescription(query.data.description || "");
			setRequiredIds(
				query.data.requiredAttributeIds
					? (JSON.parse(query.data.requiredAttributeIds as string) as string[])
					: [],
			);
			setOptionalIds(
				query.data.optionalAttributeIds
					? (JSON.parse(query.data.optionalAttributeIds as string) as string[])
					: [],
			);
			setIsActive(query.data.isActive === "true");
		}
	}, [query.data]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit({
			name,
			description: description || undefined,
			requiredAttributeIds: requiredIds,
			optionalAttributeIds: optionalIds.length > 0 ? optionalIds : undefined,
			isActive,
		});
	};

	const toggleAttribute = (id: string, isRequired: boolean) => {
		if (isRequired) {
			setRequiredIds((prev) =>
				prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
			);
			setOptionalIds((prev) => prev.filter((i) => i !== id));
		} else {
			setOptionalIds((prev) =>
				prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
			);
			setRequiredIds((prev) => prev.filter((i) => i !== id));
		}
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
				<h2 className="mb-4 text-lg font-semibold">Edit Attribute Template</h2>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>
					<div>
						<Label htmlFor="description">Description</Label>
						<Input
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>
					<div>
						<Label>Required Attributes</Label>
						<div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
							{attributes.map((attr) => (
								<div key={attr.id} className="flex items-center gap-2">
									<Checkbox
										checked={requiredIds.includes(attr.id)}
										onCheckedChange={() => toggleAttribute(attr.id, true)}
									/>
									<span className="text-sm">
										{attr.name} ({attr.key})
									</span>
								</div>
							))}
						</div>
					</div>
					<div>
						<Label>Optional Attributes</Label>
						<div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
							{attributes.map((attr) => (
								<div key={attr.id} className="flex items-center gap-2">
									<Checkbox
										checked={optionalIds.includes(attr.id)}
										onCheckedChange={() => toggleAttribute(attr.id, false)}
									/>
									<span className="text-sm">
										{attr.name} ({attr.key})
									</span>
								</div>
							))}
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							id="isActive"
							checked={isActive}
							onCheckedChange={(checked) => setIsActive(checked === true)}
						/>
						<Label htmlFor="isActive">Active</Label>
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
