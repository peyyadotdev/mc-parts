"use client";

import { useQuery } from "@tanstack/react-query";
import {
	type ColumnDef,
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

type ProductRow = {
	id: string;
	name: string;
	status: string | null;
	createdAt: unknown;
	updatedAt?: unknown;
	variantCount: number;
	fitmentCount?: number;
	brandName?: string | null;
};

export function VirtualizedDataTable() {
	const [page, setPage] = React.useState(1);
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [status, setStatus] = React.useState<"all" | "active" | "inactive">(
		"all",
	);
	const [search, setSearch] = React.useState("");
	const [debouncedSearch, setDebouncedSearch] = React.useState("");
	const [columnSizing, setColumnSizing] = React.useState<
		Record<string, number>
	>({});

	React.useEffect(() => {
		const t = setTimeout(() => {
			setDebouncedSearch(search);
			setPage(1);
		}, 300);
		return () => clearTimeout(t);
	}, [search]);

	// Clamp sortBy to server-supported columns
	const sortId = sorting[0]?.id as string | undefined;
	const sortBy =
		sortId === "createdAt" || sortId === "variantCount" || sortId === "name"
			? (sortId as "name" | "createdAt" | "variantCount")
			: "name";

	const query = useQuery(
		trpc.getProducts.queryOptions({
			page,
			limit: 100,
			search: debouncedSearch || undefined,
			sortBy,
			sortOrder: sorting[0]?.desc ? "desc" : "asc",
			status,
		}),
	);

	const columnHelper = createColumnHelper<ProductRow>();
	const columns: ColumnDef<ProductRow, any>[] = React.useMemo(
		() => [
			columnHelper.accessor("name", {
				header: "Product Name",
				size: 360,
				cell: ({ row, getValue }) => (
					<div className="truncate">
						<div className="truncate font-medium">{getValue()}</div>
						<div className="text-muted-foreground text-sm">
							{row.original.id.slice(0, 8)}...
						</div>
					</div>
				),
			}),
			columnHelper.accessor("brandName", {
				header: "Brand",
				size: 140,
				enableSorting: false,
				cell: ({ getValue }) => (
					<span className="text-sm">{getValue() || "—"}</span>
				),
			}),
			columnHelper.accessor("status", {
				header: "Status",
				size: 100,
				enableSorting: false,
				cell: ({ getValue }) => {
					const v = getValue();
					return (
						<span
							className={cn(
								"rounded-full px-2 py-1 text-xs",
								v === "active"
									? "bg-green-100 text-green-800"
									: "bg-gray-100 text-gray-800",
							)}
						>
							{v ?? "unknown"}
						</span>
					);
				},
			}),
			columnHelper.accessor("variantCount", {
				header: "Variants",
				size: 100,
				cell: ({ getValue }) => <span className="font-mono">{getValue()}</span>,
			}),
			columnHelper.accessor("fitmentCount", {
				header: "Fitments",
				size: 100,
				enableSorting: false,
				cell: ({ getValue }) => (
					<span className="font-mono">{getValue() ?? 0}</span>
				),
			}),
			columnHelper.accessor("createdAt", {
				header: "Created",
				size: 160,
				enableSorting: true,
				cell: ({ getValue }) => (
					<span className="text-muted-foreground text-sm">
						{getValue()
							? new Date(getValue() as unknown as string).toLocaleDateString()
							: "N/A"}
					</span>
				),
			}),
			columnHelper.accessor("updatedAt", {
				header: "Updated",
				size: 160,
				enableSorting: false,
				cell: ({ getValue }) => (
					<span className="text-muted-foreground text-sm">
						{getValue()
							? new Date(getValue() as unknown as string).toLocaleDateString()
							: "N/A"}
					</span>
				),
			}),
		],
		[],
	);

	const table = useReactTable({
		data: (query.data?.products as ProductRow[]) ?? [],
		columns,
		manualSorting: true,
		columnResizeMode: "onChange",
		state: {
			sorting,
			columnSizing,
		},
		onSortingChange: setSorting,
		onColumnSizingChange: setColumnSizing,
		getCoreRowModel: getCoreRowModel(),
	});

	const parentRef = React.useRef<HTMLDivElement>(null);
	const rows = table.getRowModel().rows;
	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 56,
		overscan: 8,
	});

	// Measure sticky header height to offset virtual rows so first row isn't hidden
	const headerRef = React.useRef<HTMLTableSectionElement>(null);
	const [headerHeight, setHeaderHeight] = React.useState(0);
	React.useLayoutEffect(() => {
		const update = () => {
			const h = headerRef.current?.getBoundingClientRect().height ?? 0;
			setHeaderHeight(h);
		};
		update();
		const ro = new ResizeObserver(update);
		if (headerRef.current) ro.observe(headerRef.current);
		window.addEventListener("resize", update);
		return () => {
			ro.disconnect();
			window.removeEventListener("resize", update);
		};
	}, []);

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-4">
					<CardTitle>Products</CardTitle>
					<div className="flex items-center gap-3">
						<div className="relative">
							<Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 h-4 w-4 text-muted-foreground" />
							<Input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search products..."
								className="w-[260px] pl-8"
							/>
						</div>
						<select
							value={status}
							onChange={(e) =>
								setStatus(e.target.value as "all" | "active" | "inactive")
							}
							className="rounded-md border px-3 py-2"
						>
							<option value="all">All</option>
							<option value="active">Active</option>
							<option value="inactive">Inactive</option>
						</select>
					</div>
				</div>
				<div className="text-muted-foreground text-sm">
					{(query.data?.pagination.total ?? 0).toLocaleString()} total products
				</div>
			</CardHeader>
			<CardContent>
				{query.isLoading ? (
					<div className="flex items-center justify-center py-10 text-muted-foreground">
						Loading…
					</div>
				) : query.error ? (
					<div className="flex items-center justify-center py-10 text-destructive">
						Failed to load
					</div>
				) : (
					<>
						<div
							ref={parentRef}
							className="h-[600px] overflow-auto rounded-md border"
						>
							<div
								style={{
									height: rowVirtualizer.getTotalSize(),
									width: "100%",
									position: "relative",
								}}
							>
								<table className="w-full">
									<thead
										ref={headerRef}
										className="sticky top-0 z-10 bg-background"
									>
										{table.getHeaderGroups().map((hg) => (
											<tr key={hg.id} className="border-b">
												{hg.headers.map((header) => (
													<th
														key={header.id}
														className="relative whitespace-nowrap border-r p-3 text-left last:border-r-0"
														style={{
															width: header.getSize(),
															minWidth: header.getSize(),
															maxWidth: header.getSize(),
														}}
													>
														{header.isPlaceholder ? null : (
															<button
																onClick={
																	header.column.getCanSort()
																		? header.column.getToggleSortingHandler()
																		: undefined
																}
																className="h-auto w-full justify-start p-0 text-left font-semibold"
																type="button"
																data-slot="button"
															>
																{flexRender(
																	header.column.columnDef.header,
																	header.getContext(),
																)}
																{header.column.getIsSorted() === "asc" && (
																	<ChevronUp className="ml-1 inline h-4 w-4" />
																)}
																{header.column.getIsSorted() === "desc" && (
																	<ChevronDown className="ml-1 inline h-4 w-4" />
																)}
															</button>
														)}
														<button
															type="button"
															aria-label="Resize column"
															aria-hidden="true"
															onMouseDown={header.getResizeHandler()}
															onTouchStart={header.getResizeHandler()}
															className="absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none select-none opacity-0 transition-opacity hover:opacity-100"
															tabIndex={-1}
														/>
													</th>
												))}
											</tr>
										))}
									</thead>
									<tbody>
										{rowVirtualizer.getVirtualItems().map((vRow) => {
											const row = rows[vRow.index];
											return (
												<tr
													key={row.id}
													className="border-b hover:bg-muted/50"
													style={{
														position: "absolute",
														top: 0,
														left: 0,
														width: "100%",
														height: vRow.size,
														transform: `translateY(${vRow.start + headerHeight}px)`,
													}}
												>
													{row.getVisibleCells().map((cell) => (
														<td
															key={cell.id}
															className="whitespace-nowrap border-r p-3 align-top last:border-r-0"
															style={{
																width: cell.column.getSize(),
																minWidth: cell.column.getSize(),
																maxWidth: cell.column.getSize(),
															}}
														>
															{flexRender(
																cell.column.columnDef.cell,
																cell.getContext(),
															)}
														</td>
													))}
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>

						{query.data?.pagination && (
							<div className="mt-4 flex items-center justify-between">
								<div className="text-muted-foreground text-sm">
									Page {query.data.pagination.page} of{" "}
									{query.data.pagination.totalPages}
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										disabled={!query.data.pagination.hasPrevPage}
										onClick={() => setPage((p) => Math.max(1, p - 1))}
									>
										Previous
									</Button>
									<Button
										variant="outline"
										size="sm"
										disabled={!query.data.pagination.hasNextPage}
										onClick={() => setPage((p) => p + 1)}
									>
										Next
									</Button>
								</div>
							</div>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}
