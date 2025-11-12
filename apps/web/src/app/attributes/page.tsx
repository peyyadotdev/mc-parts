"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { Calendar, RefreshCcw, Search, Wand2 } from "lucide-react";

const formatDate = (value?: string | null) =>
	value ? new Date(value).toLocaleString() : "—";

export default function AttributesPage() {
	const queryClient = useQueryClient();

	const [page, setPage] = React.useState(1);
	const [search, setSearch] = React.useState("");
	const [debouncedSearch, setDebouncedSearch] = React.useState("");
	const [hasAttributes, setHasAttributes] = React.useState<"all" | "yes" | "no">("all");
	const [extractedOnly, setExtractedOnly] = React.useState(false);
	const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);

	const [selectedDefinition, setSelectedDefinition] = React.useState<string>("");
	const [manualValue, setManualValue] = React.useState<string>("");
	const [manualUnit, setManualUnit] = React.useState<string>("");
	const [manualConfidence, setManualConfidence] = React.useState<number>(1);

	React.useEffect(() => {
		const handle = setTimeout(() => {
			setDebouncedSearch(search);
			setPage(1);
		}, 250);
		return () => clearTimeout(handle);
	}, [search]);

	const variantsQuery = trpc.getVariantsWithAttributes.useQuery({
		page,
		limit: 25,
		search: debouncedSearch,
		hasAttributes,
		extractedOnly,
	});

	const definitionsQuery = trpc.listAttributeDefinitions.useQuery();
	const variantDetailsQuery = trpc.getVariantAttributes.useQuery(
		{ variantId: selectedVariantId ?? "" },
		{ enabled: Boolean(selectedVariantId) },
	);

	const extractMutation = trpc.extractVariantAttributes.useMutation({
		onSuccess: async () => {
			toast.success("Extraction completed");
			await Promise.all([
				variantsQuery.refetch(),
				variantDetailsQuery.refetch(),
			]);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const updateMutation = trpc.updateVariantAttributes.useMutation({
		onSuccess: async () => {
			toast.success("Attributes saved");
			setManualValue("");
			setManualUnit("");
			await Promise.all([
				variantsQuery.refetch(),
				variantDetailsQuery.refetch(),
			]);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const handleManualSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!selectedVariantId) return;

		const definition = definitionsQuery.data?.find(
			(item) => item.slug === selectedDefinition,
		);

		if (!definition) {
			toast.error("Pick an attribute definition");
			return;
		}

		if (!manualValue.trim()) {
			toast.error("Value is required");
			return;
		}

		let value: string | number | boolean = manualValue.trim();
		if (definition.dataType === "number") {
			const numeric = Number.parseFloat(manualValue);
			if (Number.isNaN(numeric)) {
				toast.error("Enter a numeric value");
				return;
			}
			value = numeric;
		} else if (definition.dataType === "boolean") {
			value = manualValue.toLowerCase() === "true";
		}

		updateMutation.mutate({
			variantId: selectedVariantId,
			attributes: [
				{
					slug: definition.slug,
					values: [
						{
							value,
							unit: manualUnit || definition.unit || null,
							confidence: manualConfidence,
						},
					],
				},
			],
		});
	};

	const handleRemoveManual = (slug: string) => {
		if (!selectedVariantId) return;
		updateMutation.mutate({
			variantId: selectedVariantId,
			attributes: [],
			clear: [slug],
		});
	};

	const handleExtract = () => {
		if (!selectedVariantId) return;
		extractMutation.mutate({ variantId: selectedVariantId });
	};

	return (
		<div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
			<header className="flex flex-wrap gap-4 items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Attribute Review</h1>
					<p className="text-muted-foreground">
						Inspect and curate enrichment attributes before publishing.
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						queryClient.invalidateQueries({ queryKey: ["getVariantsWithAttributes"] });
						toast.info("Refreshing variants…");
					}}
				>
					<RefreshCcw className="mr-2 h-4 w-4" />
					Refresh
				</Button>
			</header>

			<Card>
				<CardContent className="flex flex-wrap gap-4 items-end p-4">
					<div className="relative flex-1 min-w-[220px]">
						<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							className="pl-8"
							placeholder="Search product name or SKU…"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
						/>
					</div>

					<div className="flex flex-col text-sm">
						<label className="text-muted-foreground text-xs mb-1">Has attributes</label>
						<select
							className="border rounded-md px-3 py-2 text-sm bg-background"
							value={hasAttributes}
							onChange={(event) =>
								setHasAttributes(event.target.value as "all" | "yes" | "no")
							}
						>
							<option value="all">All variants</option>
							<option value="yes">Has attributes</option>
							<option value="no">Missing attributes</option>
						</select>
					</div>

					<label className="flex items-center space-x-2 text-sm">
						<Checkbox
							checked={extractedOnly}
							onCheckedChange={(checked) => setExtractedOnly(Boolean(checked))}
						/>
						<span className="text-muted-foreground">Only with extracted values</span>
					</label>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-base font-medium">
						{variantsQuery.data?.pagination.total ?? 0} variants
					</CardTitle>
					<Button
						variant="outline"
						size="sm"
						onClick={() => toast.info("Bulk extraction not yet implemented")}
					>
						<Wand2 className="mr-2 h-4 w-4" />
						Bulk extract
					</Button>
				</CardHeader>
				<CardContent className="p-0">
					{variantsQuery.isLoading ? (
						<div className="space-y-2 p-4">
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
						</div>
					) : (
						<table className="w-full text-sm">
							<thead className="bg-muted/40">
								<tr>
									<th className="px-4 py-3 text-left font-medium">Product</th>
									<th className="px-4 py-3 text-left font-medium">SKU</th>
									<th className="px-4 py-3 text-left font-medium">Brand</th>
									<th className="px-4 py-3 text-left font-medium">Extracted</th>
									<th className="px-4 py-3 text-left font-medium">Manual</th>
									<th className="px-4 py-3 text-left font-medium">Last extracted</th>
									<th className="px-4 py-3 text-left font-medium w-[1%]"> </th>
								</tr>
							</thead>
							<tbody>
								{variantsQuery.data?.variants.map((variant) => {
									const isActive = selectedVariantId === variant.variantId;
									return (
										<tr
											key={variant.variantId}
											className={`border-b ${isActive ? "bg-accent/20" : "hover:bg-muted/40"}`}
										>
											<td className="px-4 py-3">
												<div className="max-w-[280px]">
													<div className="font-medium truncate">
														{variant.productName}
													</div>
												</div>
											</td>
											<td className="px-4 py-3 font-mono text-xs">{variant.sku}</td>
											<td className="px-4 py-3">
												{variant.brandName ? (
													<Badge variant="outline">{variant.brandName}</Badge>
												) : (
													<span className="text-muted-foreground">—</span>
												)}
											</td>
											<td className="px-4 py-3">
												<Badge variant={variant.extractedCount > 0 ? "default" : "outline"}>
													{variant.extractedCount}
												</Badge>
											</td>
											<td className="px-4 py-3">
												<Badge variant={variant.manualCount > 0 ? "default" : "outline"}>
													{variant.manualCount}
												</Badge>
											</td>
											<td className="px-4 py-3 text-muted-foreground text-xs flex items-center space-x-1">
												<Calendar className="h-4 w-4" />
												<span>{formatDate(variant.lastExtractedAt)}</span>
											</td>
											<td className="px-4 py-3">
												<Button
													variant={isActive ? "default" : "outline"}
													size="sm"
													onClick={() =>
														setSelectedVariantId(
															isActive ? null : (variant.variantId as string),
														)
													}
												>
													{isActive ? "Close" : "Review"}
												</Button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					)}

					{variantsQuery.data && variantsQuery.data.pagination.totalPages > 1 && (
						<div className="flex items-center justify-between border-t px-4 py-3 text-sm">
							<Button
								variant="outline"
								size="sm"
								disabled={!variantsQuery.data.pagination.hasPrevPage}
								onClick={() => setPage((current) => Math.max(1, current - 1))}
							>
								Previous
							</Button>
							<div>
								Page {page} of {variantsQuery.data.pagination.totalPages}
							</div>
							<Button
								variant="outline"
								size="sm"
								disabled={!variantsQuery.data.pagination.hasNextPage}
								onClick={() => setPage((current) => current + 1)}
							>
								Next
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{selectedVariantId && (
				<Card>
					<CardHeader className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between">
						<div>
							<CardTitle className="text-base font-semibold">
								Variant details
							</CardTitle>
							{variantDetailsQuery.data ? (
								<p className="text-sm text-muted-foreground">
									{variantDetailsQuery.data.variant.productName} ·{" "}
									<span className="font-mono">
										{variantDetailsQuery.data.variant.sku}
									</span>
								</p>
							) : null}
						</div>
						<Button
							size="sm"
							onClick={handleExtract}
							disabled={extractMutation.isLoading}
						>
							{extractMutation.isLoading ? (
								<>
									<Wand2 className="mr-2 h-4 w-4 animate-spin" />
									Extracting…
								</>
							) : (
								<>
									<Wand2 className="mr-2 h-4 w-4" />
									Run extraction
								</>
							)}
						</Button>
					</CardHeader>
					<CardContent className="space-y-6">
						{variantDetailsQuery.isLoading ? (
							<div className="space-y-2">
								<Skeleton className="h-5 w-64" />
								<Skeleton className="h-40 w-full" />
							</div>
						) : variantDetailsQuery.data ? (
							<>
								<section className="space-y-4">
									<div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
										{variantDetailsQuery.data.variant.categories.map((category) => (
											<Badge key={category} variant="outline">
												{category}
											</Badge>
										))}
									</div>

									<div className="space-y-4">
										{variantDetailsQuery.data.attributes.map((attribute) => (
											<div key={attribute.slug} className="border rounded-lg p-4 space-y-3">
												<div className="flex flex-wrap items-center justify-between gap-2">
													<div>
														<div className="font-medium">{attribute.label}</div>
														<div className="text-xs text-muted-foreground">
															{attribute.slug} · {attribute.dataType}
														</div>
													</div>
													<Badge variant="outline">{attribute.scope}</Badge>
												</div>
												<div className="space-y-2">
													{attribute.values.map((value) => (
														<div
															key={value.id}
															className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
														>
															<div className="space-x-2">
																<span className="font-medium">
																	{String(value.value)}
																</span>
																{value.unit ? (
																	<span className="text-muted-foreground">
																		({value.unit})
																	</span>
																) : null}
																<span className="text-muted-foreground">
																	· {(value.confidence * 100).toFixed(0)}%
																</span>
																<span className="text-muted-foreground">
																	· {value.source}
																</span>
															</div>
															{value.source === "manual" && (
																<Button
																	size="sm"
																	variant="outline"
																	onClick={() => handleRemoveManual(attribute.slug)}
																	disabled={updateMutation.isLoading}
																>
																	Remove
																</Button>
															)}
														</div>
													))}
													{attribute.values.length === 0 && (
														<div className="text-sm text-muted-foreground">
															No values captured yet.
														</div>
													)}
												</div>
											</div>
										))}
									</div>
								</section>

								<section>
									<h2 className="text-sm font-semibold mb-3">Add manual attribute</h2>
									<form className="grid gap-3 md:grid-cols-2" onSubmit={handleManualSubmit}>
										<div className="flex flex-col space-y-1">
											<label className="text-xs text-muted-foreground">
												Attribute
											</label>
											<select
												className="border rounded-md px-3 py-2 text-sm bg-background"
												value={selectedDefinition}
												onChange={(event) => {
													setSelectedDefinition(event.target.value);
													const def = definitionsQuery.data?.find(
														(item) => item.slug === event.target.value,
													);
													setManualUnit(def?.unit ?? "");
												}}
											>
												<option value="">Select attribute…</option>
												{definitionsQuery.data?.map((definition) => (
													<option value={definition.slug} key={definition.slug}>
														{definition.label} ({definition.dataType})
													</option>
												))}
											</select>
										</div>
										<div className="flex flex-col space-y-1">
											<label className="text-xs text-muted-foreground">
												Value
											</label>
											<Input
												value={manualValue}
												onChange={(event) => setManualValue(event.target.value)}
												placeholder="Enter value"
											/>
										</div>
										<div className="flex flex-col space-y-1">
											<label className="text-xs text-muted-foreground">
												Unit (optional)
											</label>
											<Input
												value={manualUnit}
												onChange={(event) => setManualUnit(event.target.value)}
												placeholder="e.g. mm"
											/>
										</div>
										<div className="flex flex-col space-y-1">
											<label className="text-xs text-muted-foreground">
												Confidence (0-1)
											</label>
											<Input
												type="number"
												step="0.05"
												min={0}
												max={1}
												value={manualConfidence}
												onChange={(event) =>
													setManualConfidence((value) => {
														const numeric = Number(event.target.value);
														if (Number.isNaN(numeric)) return value;
														return Math.min(1, Math.max(0, numeric));
													})
												}
											/>
										</div>
										<div className="md:col-span-2 flex justify-end">
											<Button
												type="submit"
												disabled={
													updateMutation.isLoading ||
													!selectedDefinition ||
													!manualValue
												}
											>
												Save manual value
											</Button>
										</div>
									</form>
								</section>
							</>
						) : (
							<div className="text-sm text-muted-foreground">
								No variant details available.
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}