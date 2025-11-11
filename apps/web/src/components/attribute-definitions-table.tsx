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
import { trpc } from "@/utils/trpc";

type AttributeDefinitionRow = {
	id: string;
	key: string;
	name: string;
	dataType: string;
	unit: string | null;
	defaultValue: string | null;
	enumValues: string | null;
	description: string | null;
	createdAt: unknown;
	updatedAt: unknown;
};

export function AttributeDefinitionsTable() {
	const [page, setPage] = React.useState(1);
	const [search, setSearch] = React.useState("");
	const [dataTypeFilter, setDataTypeFilter] = React.useState<string | undefined>();
	const [isCreateOpen, setIsCreateOpen] = React.useState(false);
	const [editingId, setEditingId] = React.useState<string | null>(null);
	const queryClient = useQueryClient();

	const query = useQuery(
		trpc.attributeDefinition.list.queryOptions({
			page,
			limit: 50,
			search: search || undefined,
			dataType: dataTypeFilter as any,
		}),
	);

	const createMutation = useMutation({
		mutationFn: trpc.attributeDefinition.create.mutate,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["attributeDefinition", "list"]] });
			setIsCreateOpen(false);
		},
	});

	const updateMutation = useMutation({
		mutationFn: trpc.attributeDefinition.update.mutate,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["attributeDefinition", "list"]] });
			setEditingId(null);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: trpc.attributeDefinition.delete.mutate,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["attributeDefinition", "list"]] });
		},
	});

	const columnHelper = createColumnHelper<AttributeDefinitionRow>();
	const columns: ColumnDef<AttributeDefinitionRow, any>[] = React.useMemo(
		() => [
			columnHelper.accessor("key", {
				header: "Key",
				cell: ({ getValue }) => (
					<span className="font-mono font-medium">{getValue()}</span>
				),
			}),
			columnHelper.accessor("name", {
				header: "Name",
				cell: ({ getValue }) => <span>{getValue()}</span>,
			}),
			columnHelper.accessor("dataType", {
				header: "Type",
				cell: ({ getValue }) => (
					<span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
						{getValue()}
					</span>
				),
			}),
			columnHelper.accessor("unit", {
				header: "Unit",
				cell: ({ getValue }) => <span>{getValue() || "—"}</span>,
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
								if (confirm("Delete this definition?")) {
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
		data: (query.data?.definitions as AttributeDefinitionRow[]) ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>Attribute Definitions</CardTitle>
					<Button onClick={() => setIsCreateOpen(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Add Definition
					</Button>
				</div>
				<div className="mt-4 flex gap-4">
					<Input
						placeholder="Search definitions..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="max-w-xs"
					/>
					<select
						value={dataTypeFilter || "all"}
						onChange={(e) =>
							setDataTypeFilter(
								e.target.value === "all" ? undefined : e.target.value,
							)
						}
						className="rounded-md border px-3 py-2"
					>
						<option value="all">All Types</option>
						<option value="string">String</option>
						<option value="number">Number</option>
						<option value="boolean">Boolean</option>
						<option value="date">Date</option>
						<option value="enum">Enum</option>
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
						Error loading definitions
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
				<CreateAttributeDefinitionDialog
					onClose={() => setIsCreateOpen(false)}
					onSubmit={(data) => createMutation.mutate(data)}
				/>
			)}

			{editingId && (
				<EditAttributeDefinitionDialog
					id={editingId}
					onClose={() => setEditingId(null)}
					onSubmit={(data) => updateMutation.mutate({ id: editingId, ...data })}
				/>
			)}
		</Card>
	);
}

function CreateAttributeDefinitionDialog({
	onClose,
	onSubmit,
}: {
	onClose: () => void;
	onSubmit: (data: {
		key: string;
		name: string;
		dataType: "string" | "number" | "boolean" | "date" | "enum";
		unit?: string;
		defaultValue?: string;
		enumValues?: string[];
		description?: string;
	}) => void;
}) {
	const [key, setKey] = React.useState("");
	const [name, setName] = React.useState("");
	const [dataType, setDataType] = React.useState<"string" | "number" | "boolean" | "date" | "enum">("string");
	const [unit, setUnit] = React.useState("");
	const [defaultValue, setDefaultValue] = React.useState("");
	const [enumValues, setEnumValues] = React.useState("");
	const [description, setDescription] = React.useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!key || !name) return;
		onSubmit({
			key,
			name,
			dataType,
			unit: unit || undefined,
			defaultValue: defaultValue || undefined,
			enumValues: dataType === "enum" && enumValues ? enumValues.split(",").map(s => s.trim()) : undefined,
			description: description || undefined,
		});
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
				<h2 className="mb-4 text-lg font-semibold">Create Attribute Definition</h2>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label htmlFor="key">Key</Label>
						<Input
							id="key"
							value={key}
							onChange={(e) => setKey(e.target.value)}
							required
							placeholder="e.g., weight"
						/>
					</div>
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
						<Label htmlFor="dataType">Data Type</Label>
						<select
							id="dataType"
							value={dataType}
							onChange={(e) => setDataType(e.target.value as any)}
							className="mt-1 w-full rounded-md border px-3 py-2"
							required
						>
							<option value="string">String</option>
							<option value="number">Number</option>
							<option value="boolean">Boolean</option>
							<option value="date">Date</option>
							<option value="enum">Enum</option>
						</select>
					</div>
					{dataType === "number" && (
						<div>
							<Label htmlFor="unit">Unit</Label>
							<Input
								id="unit"
								value={unit}
								onChange={(e) => setUnit(e.target.value)}
								placeholder="e.g., kg, cm"
							/>
						</div>
					)}
					{dataType === "enum" && (
						<div>
							<Label htmlFor="enumValues">Enum Values (comma-separated)</Label>
							<Input
								id="enumValues"
								value={enumValues}
								onChange={(e) => setEnumValues(e.target.value)}
								placeholder="e.g., red, blue, green"
							/>
						</div>
					)}
					<div>
						<Label htmlFor="defaultValue">Default Value</Label>
						<Input
							id="defaultValue"
							value={defaultValue}
							onChange={(e) => setDefaultValue(e.target.value)}
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

function EditAttributeDefinitionDialog({
	id,
	onClose,
	onSubmit,
}: {
	id: string;
	onClose: () => void;
	onSubmit: (data: {
		key?: string;
		name?: string;
		dataType?: "string" | "number" | "boolean" | "date" | "enum";
		unit?: string;
		defaultValue?: string;
		enumValues?: string[];
		description?: string;
	}) => void;
}) {
	const query = useQuery(trpc.attributeDefinition.getById.queryOptions({ id }));
	const [key, setKey] = React.useState("");
	const [name, setName] = React.useState("");
	const [dataType, setDataType] = React.useState<"string" | "number" | "boolean" | "date" | "enum">("string");
	const [unit, setUnit] = React.useState("");
	const [defaultValue, setDefaultValue] = React.useState("");
	const [enumValues, setEnumValues] = React.useState("");
	const [description, setDescription] = React.useState("");

	React.useEffect(() => {
		if (query.data) {
			setKey(query.data.key);
			setName(query.data.name);
			setDataType(query.data.dataType as any);
			setUnit(query.data.unit || "");
			setDefaultValue(query.data.defaultValue || "");
			setEnumValues(query.data.enumValues ? JSON.parse(query.data.enumValues).join(", ") : "");
			setDescription(query.data.description || "");
		}
	}, [query.data]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit({
			key,
			name,
			dataType,
			unit: unit || undefined,
			defaultValue: defaultValue || undefined,
			enumValues: dataType === "enum" && enumValues ? enumValues.split(",").map(s => s.trim()) : undefined,
			description: description || undefined,
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
			<div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
				<h2 className="mb-4 text-lg font-semibold">Edit Attribute Definition</h2>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label htmlFor="key">Key</Label>
						<Input
							id="key"
							value={key}
							onChange={(e) => setKey(e.target.value)}
							required
						/>
					</div>
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
						<Label htmlFor="dataType">Data Type</Label>
						<select
							id="dataType"
							value={dataType}
							onChange={(e) => setDataType(e.target.value as any)}
							className="mt-1 w-full rounded-md border px-3 py-2"
							required
						>
							<option value="string">String</option>
							<option value="number">Number</option>
							<option value="boolean">Boolean</option>
							<option value="date">Date</option>
							<option value="enum">Enum</option>
						</select>
					</div>
					{dataType === "number" && (
						<div>
							<Label htmlFor="unit">Unit</Label>
							<Input
								id="unit"
								value={unit}
								onChange={(e) => setUnit(e.target.value)}
							/>
						</div>
					)}
					{dataType === "enum" && (
						<div>
							<Label htmlFor="enumValues">Enum Values (comma-separated)</Label>
							<Input
								id="enumValues"
								value={enumValues}
								onChange={(e) => setEnumValues(e.target.value)}
							/>
						</div>
					)}
					<div>
						<Label htmlFor="defaultValue">Default Value</Label>
						<Input
							id="defaultValue"
							value={defaultValue}
							onChange={(e) => setDefaultValue(e.target.value)}
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
