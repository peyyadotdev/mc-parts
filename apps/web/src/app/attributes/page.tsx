"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { FilterSidebar } from "@/components/attributes/filter-sidebar";
import { CompactDataTable } from "@/components/attributes/compact-data-table";
import { ProductDetailSlideOut } from "@/components/attributes/product-detail-slideout";
import { BulkEnrichmentPanel } from "@/components/attributes/bulk-enrichment-panel";

export default function AttributesPage() {
	const queryClient = useQueryClient();

	// Layout state
	const [sidebarOpen, setSidebarOpen] = React.useState(false);
	const [mounted, setMounted] = React.useState(false);
	const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);
	const [activeTab, setActiveTab] = React.useState<"review" | "enrichment">("review");

	// Filter state
	const [page, setPage] = React.useState(1);
	const [search, setSearch] = React.useState("");
	const [debouncedSearch, setDebouncedSearch] = React.useState("");
	const [hasAttributes, setHasAttributes] = React.useState<"all" | "yes" | "no">("all");
	const [extractedOnly, setExtractedOnly] = React.useState(false);

	React.useEffect(() => {
		const handle = setTimeout(() => {
			setDebouncedSearch(search);
			setPage(1);
		}, 250);
		return () => clearTimeout(handle);
	}, [search]);

	// Mount effect for hydration safety
	React.useEffect(() => {
		setMounted(true);
		// Set initial sidebar state based on screen size after mount
		setSidebarOpen(window.innerWidth >= 1024);
	}, []);

	// Responsive sidebar handling
	React.useEffect(() => {
		if (!mounted) return;

		const handleResize = () => {
			if (window.innerWidth < 1024 && sidebarOpen) {
				setSidebarOpen(false);
			}
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [sidebarOpen, mounted]);

	const variantsQuery = trpc.getVariantsWithAttributes.useQuery({
		page,
		limit: 25,
		search: debouncedSearch,
		hasAttributes,
		extractedOnly,
	});

	// Keyboard shortcuts
	React.useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Cmd+K or Ctrl+K to focus search
			if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
				event.preventDefault();
				// Focus search input in sidebar
				const searchInput = document.querySelector('#search') as HTMLInputElement;
				if (searchInput) {
					searchInput.focus();
					searchInput.select();
				}
			}

			// Cmd+B or Ctrl+B to toggle sidebar
			if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
				event.preventDefault();
				setSidebarOpen(prev => !prev);
			}

			// ESC to close slide-out (handled in ProductDetailSlideOut)
			// Arrow keys for navigation when no input is focused
			if (!document.activeElement || document.activeElement.tagName !== 'INPUT') {
				if (event.key === 'ArrowLeft' && variantsQuery.data?.pagination.hasPrevPage) {
					event.preventDefault();
					setPage(prev => Math.max(1, prev - 1));
				} else if (event.key === 'ArrowRight' && variantsQuery.data?.pagination.hasNextPage) {
					event.preventDefault();
					setPage(prev => prev + 1);
				}
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [variantsQuery.data?.pagination]);

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
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const updateMutation = trpc.updateVariantAttributes.useMutation({
		onSuccess: async () => {
			toast.success("Attributes saved");
			await Promise.all([
				variantsQuery.refetch(),
				variantDetailsQuery.refetch(),
			]);
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const handleExtract = (variantId?: string) => {
		const targetId = variantId || selectedVariantId;
		if (!targetId) return;
		extractMutation.mutate({ variantId: targetId });
	};

	const handleUpdateAttributes = (attributes: any[]) => {
		if (!selectedVariantId) return;
		updateMutation.mutate({
			variantId: selectedVariantId,
			attributes,
		});
	};

	const handleRemoveAttribute = (slug: string) => {
		if (!selectedVariantId) return;
		updateMutation.mutate({
			variantId: selectedVariantId,
			attributes: [],
			clear: [slug],
		});
	};

	const handleRefresh = () => {
		queryClient.invalidateQueries({ queryKey: ["getVariantsWithAttributes"] });
		toast.info("Refreshing data...");
	};

	const handleBulkExtract = () => {
		toast.info("Bulk extraction not yet implemented");
	};

	const handleExport = () => {
		toast.info("Export functionality not yet implemented");
	};

	return (
		<div className="flex h-screen overflow-hidden">
			{/* Filter Sidebar */}
			<FilterSidebar
				isOpen={sidebarOpen}
				onToggle={() => setSidebarOpen(!sidebarOpen)}
				search={search}
				onSearchChange={setSearch}
				hasAttributes={hasAttributes}
				onHasAttributesChange={setHasAttributes}
				extractedOnly={extractedOnly}
				onExtractedOnlyChange={setExtractedOnly}
				onRefresh={handleRefresh}
				onBulkExtract={handleBulkExtract}
				onExport={handleExport}
				onSwitchToEnrichment={() => setActiveTab("enrichment")}
				totalVariants={variantsQuery.data?.pagination.total}
				filteredVariants={variantsQuery.data?.variants.length}
			/>

			{/* Main Content Area */}
			<div
				className={`
					flex-1 transition-all duration-300 p-4 sm:p-6
					${sidebarOpen ? 'ml-80' : 'ml-16'}
					${sidebarOpen && 'lg:ml-80 md:ml-16 sm:ml-16'}
				`}
			>
				<div className="h-full flex flex-col">
					{/* Header */}
					<div className="mb-4 sm:mb-6">
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-xl sm:text-2xl font-bold">Product Data Management</h1>
								<p className="text-muted-foreground text-sm sm:text-base">
									Inspect, curate, and enhance your product catalog.
								</p>
							</div>
						</div>

						{/* Tabs */}
						<div className="flex space-x-1 mt-4 border-b">
							<button
								className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "review"
										? "border-blue-500 text-blue-600"
										: "border-transparent text-gray-500 hover:text-gray-700"
								}`}
								onClick={() => setActiveTab("review")}
							>
								Attribute Review
							</button>
							<button
								className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "enrichment"
										? "border-blue-500 text-blue-600"
										: "border-transparent text-gray-500 hover:text-gray-700"
								}`}
								onClick={() => setActiveTab("enrichment")}
							>
								Bulk Enrichment
							</button>
						</div>
					</div>

					{/* Tab Content */}
					{activeTab === "review" ? (
						<CompactDataTable
							variants={variantsQuery.data?.variants || []}
							selectedVariantId={selectedVariantId}
							isLoading={variantsQuery.isLoading}
							onVariantSelect={setSelectedVariantId}
							pagination={variantsQuery.data?.pagination}
							onPageChange={setPage}
						/>
					) : (
						<BulkEnrichmentPanel />
					)}
				</div>
			</div>

			{/* Product Detail Slide-out */}
			<ProductDetailSlideOut
				isOpen={Boolean(selectedVariantId)}
				onClose={() => setSelectedVariantId(null)}
				variantData={variantDetailsQuery.data}
				attributeDefinitions={definitionsQuery.data}
				isLoading={variantDetailsQuery.isLoading}
				isExtracting={extractMutation.isPending}
				isUpdating={updateMutation.isPending}
				onExtract={() => handleExtract()}
				onUpdateAttributes={handleUpdateAttributes}
				onRemoveAttribute={handleRemoveAttribute}
			/>
		</div>
	);
}