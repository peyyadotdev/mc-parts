"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Wand2 } from "lucide-react";
import * as React from "react";
import { trpc } from "@/utils/trpc";

export default function AttributesPage() {
	const [page, setPage] = React.useState(1);
	const [search, setSearch] = React.useState("");
	const [debouncedSearch, setDebouncedSearch] = React.useState("");
	const [editingVariant, setEditingVariant] = React.useState<string | null>(null);

	// Debounce search
	React.useEffect(() => {
		const t = setTimeout(() => {
			setDebouncedSearch(search);
			setPage(1);
		}, 300);
		return () => clearTimeout(t);
	}, [search]);

	// Fetch data
	const { data, isLoading, error } = trpc.getVariantsWithAttributes.useQuery({
		page,
		search: debouncedSearch,
		hasAttributes: "all",
		extractedOnly: false,
	});

	if (error) {
		return (
			<div className="container mx-auto max-w-7xl px-4 py-8">
				<div className="text-center text-red-500">
					Error loading data: {error.message}
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold">Product Attributes</h1>
					<p className="text-muted-foreground">
						Manage and enrich product variant attributes
					</p>
				</div>

				<Button onClick={() => alert("Extract All Attributes - Not implemented yet")}>
					<Wand2 className="w-4 h-4 mr-2" />
					Extract All Attributes
				</Button>
			</div>

			{/* Search */}
			<Card>
				<CardContent className="p-4">
					<div className="relative">
						<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search products or SKUs..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-8"
						/>
					</div>
				</CardContent>
			</Card>

			{/* Results */}
			<Card>
				<CardHeader>
					<CardTitle>
						{data?.pagination.total || 0} variants found
					</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex justify-center p-8">
							<div>Loading...</div>
						</div>
					) : (
						<div className="border rounded-lg overflow-hidden">
							<table className="w-full">
								<thead className="bg-muted/50">
									<tr>
										<th className="p-3 text-left font-medium">Product</th>
										<th className="p-3 text-left font-medium">SKU</th>
										<th className="p-3 text-left font-medium">Brand</th>
										<th className="p-3 text-left font-medium">Attributes</th>
										<th className="p-3 text-left font-medium">Actions</th>
									</tr>
								</thead>
								<tbody>
									{data?.variants.map((variant) => {
										const attributes = variant.attributes as Record<string, any> || {};
										const attributeCount = Object.keys(attributes).length;

										return (
											<tr
												key={variant.variantId}
												className={`border-b hover:bg-muted/50 ${
													editingVariant === variant.variantId ? "bg-accent/20 border-accent/50" : ""
												}`}
											>
												<td className="p-3">
													<div className="max-w-xs">
														<div className="font-medium text-sm truncate">
															{variant.productName}
														</div>
													</div>
												</td>
												<td className="p-3 font-mono text-sm">
													{variant.sku}
												</td>
												<td className="p-3">
													{variant.brandName ? (
														<Badge variant="outline" className="text-xs">
															{variant.brandName}
														</Badge>
													) : (
														<span className="text-muted-foreground">—</span>
													)}
												</td>
												<td className="p-3">
													<div className="space-y-1">
														<Badge variant={attributeCount > 0 ? "default" : "outline"}>
															{attributeCount} attributes
														</Badge>
														{attributeCount > 0 && (
															<div className="text-xs space-y-1">
																{Object.entries(attributes).slice(0, 2).map(([key, attr]: [string, any]) => (
																	<div key={key} className="flex items-center space-x-1">
																		<span className="font-medium">{key}:</span>
																		<span>{String(attr?.value || attr)}</span>
																	</div>
																))}
																{attributeCount > 2 && (
																	<div className="text-muted-foreground">
																		+{attributeCount - 2} more...
																	</div>
																)}
															</div>
														)}
													</div>
												</td>
												<td className="p-3">
													<Button
														size="sm"
														variant="outline"
														onClick={() => {
															if (editingVariant === variant.variantId) {
																setEditingVariant(null);
															} else {
																setEditingVariant(variant.variantId);
															}
														}}
													>
														{editingVariant === variant.variantId ? "Cancel" : "Edit"}
													</Button>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}

					{/* Pagination */}
					{data && data.pagination.totalPages > 1 && (
						<div className="flex justify-center space-x-2 mt-4">
							<Button
								variant="outline"
								disabled={!data.pagination.hasPrevPage}
								onClick={() => setPage(page - 1)}
							>
								Previous
							</Button>
							<span className="flex items-center px-4 text-sm">
								Page {page} of {data.pagination.totalPages}
							</span>
							<Button
								variant="outline"
								disabled={!data.pagination.hasNextPage}
								onClick={() => setPage(page + 1)}
							>
								Next
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}