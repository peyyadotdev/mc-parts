"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/utils/trpc";
import {
	AlertCircle,
	BarChart3,
	CheckCircle,
	FileText,
	Info,
	Loader2,
	Package,
	Play,
	Square,
	Tag,
	Wand2,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

interface EnrichmentJob {
	id: string;
	name: string;
	description: string;
	icon: typeof Wand2;
	status: "idle" | "running" | "completed" | "error";
	progress?: number;
	result?: {
		processed: number;
		message: string;
		examples?: any[];
	};
	lastRun?: Date;
}

export function BulkEnrichmentPanel() {
	const [dryRun, setDryRun] = React.useState(true);
	const [selectedJobs, setSelectedJobs] = React.useState<string[]>([]);
	const [limits, setLimits] = React.useState({
		brands: 1000,
		categories: 1000,
		descriptions: 500,
		cleanup: 1000,
	});

	const [jobs, setJobs] = React.useState<EnrichmentJob[]>([
		{
			id: "analysis",
			name: "Data Analysis",
			description: "Analyze current product data quality and identify gaps",
			icon: BarChart3,
			status: "idle",
		},
		{
			id: "cleanup",
			name: "Name Cleanup",
			description: "Standardize and clean up product names",
			icon: Package,
			status: "idle",
		},
		{
			id: "brands",
			name: "Brand Extraction",
			description:
				"Extract brand names from product names using pattern matching",
			icon: Tag,
			status: "idle",
		},
		{
			id: "categories",
			name: "Category Assignment",
			description: "Assign categories to products based on name analysis",
			icon: FileText,
			status: "idle",
		},
		{
			id: "descriptions",
			name: "Description Generation",
			description: "Generate product descriptions using extracted information",
			icon: Wand2,
			status: "idle",
		},
	]);

	const analysisQuery = trpc.analyzeProductData.useQuery({
		enabled: false, // Don't run automatically
	});

	const brandExtractionMutation = trpc.bulkExtractBrands.useMutation({
		onSuccess: (data: any) => {
			updateJobStatus("brands", "completed", data);
			toast.success(data.message);
		},
		onError: (error: Error) => {
			updateJobStatus("brands", "error");
			toast.error(`Brand extraction failed: ${error.message}`);
		},
	});

	const categoryAssignmentMutation = trpc.bulkAssignCategories.useMutation({
		onSuccess: (data: any) => {
			updateJobStatus("categories", "completed", data);
			toast.success(data.message);
		},
		onError: (error: Error) => {
			updateJobStatus("categories", "error");
			toast.error(`Category assignment failed: ${error.message}`);
		},
	});

	const descriptionGenerationMutation =
		trpc.bulkGenerateDescriptions.useMutation({
			onSuccess: (data: any) => {
				updateJobStatus("descriptions", "completed", data);
				toast.success(data.message);
			},
			onError: (error: Error) => {
				updateJobStatus("descriptions", "error");
				toast.error(`Description generation failed: ${error.message}`);
			},
		});

	const nameCleanupMutation = trpc.bulkCleanupNames.useMutation({
		onSuccess: (data: any) => {
			updateJobStatus("cleanup", "completed", data);
			toast.success(data.message);
		},
		onError: (error: Error) => {
			updateJobStatus("cleanup", "error");
			toast.error(`Name cleanup failed: ${error.message}`);
		},
	});

	const updateJobStatus = (
		jobId: string,
		status: EnrichmentJob["status"],
		result?: EnrichmentJob["result"],
	) => {
		setJobs((prev) =>
			prev.map((job) =>
				job.id === jobId
					? { ...job, status, result, lastRun: new Date() }
					: job,
			),
		);
	};

	const runSingleJob = async (jobId: string) => {
		updateJobStatus(jobId, "running");

		try {
			switch (jobId) {
				case "analysis": {
					const result = await analysisQuery.refetch();
					if (result.data) {
						updateJobStatus("analysis", "completed", {
							processed: 0,
							message: "Analysis completed successfully",
							examples: [],
						});
						toast.success("Data analysis completed");
					} else if (result.error) {
						updateJobStatus("analysis", "error");
						toast.error(`Analysis failed: ${result.error.message}`);
					}
					break;
				}
				case "brands":
					await brandExtractionMutation.mutateAsync({
						limit: limits.brands,
						dryRun,
					});
					break;
				case "categories":
					await categoryAssignmentMutation.mutateAsync({
						limit: limits.categories,
						dryRun,
					});
					break;
				case "descriptions":
					await descriptionGenerationMutation.mutateAsync({
						limit: limits.descriptions,
						dryRun,
					});
					break;
				case "cleanup":
					await nameCleanupMutation.mutateAsync({
						limit: limits.cleanup,
						dryRun,
					});
					break;
			}
		} catch (error) {
			// Error handling is done in the mutation callbacks
		}
	};

	const runSelectedJobs = async () => {
		const jobsToRun = jobs.filter((job) => selectedJobs.includes(job.id));

		for (const job of jobsToRun) {
			await runSingleJob(job.id);
			// Small delay between jobs
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	};

	const toggleJobSelection = (jobId: string) => {
		setSelectedJobs((prev) =>
			prev.includes(jobId)
				? prev.filter((id) => id !== jobId)
				: [...prev, jobId],
		);
	};

	const isAnyJobRunning = jobs.some((job) => job.status === "running");

	const getStatusIcon = (status: EnrichmentJob["status"]) => {
		switch (status) {
			case "running":
				return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
			case "completed":
				return <CheckCircle className="h-4 w-4 text-green-500" />;
			case "error":
				return <AlertCircle className="h-4 w-4 text-red-500" />;
			default:
				return <Info className="h-4 w-4 text-gray-400" />;
		}
	};

	const formatLastRun = (date?: Date) => {
		if (!date) return "Never";
		return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h2 className="font-bold text-2xl">Bulk Product Enrichment</h2>
				<p className="text-muted-foreground">
					Automate product data enhancement with AI-powered extraction and
					standardization.
				</p>
			</div>

			{/* Controls */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Enrichment Settings</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center space-x-2">
						<Checkbox
							id="dryRun"
							checked={dryRun}
							onCheckedChange={(checked) => setDryRun(Boolean(checked))}
						/>
						<Label htmlFor="dryRun" className="font-medium text-sm">
							Dry run mode (preview changes without applying them)
						</Label>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="brandsLimit" className="text-xs">
								Brand Extraction Limit
							</Label>
							<Input
								id="brandsLimit"
								type="number"
								value={limits.brands}
								onChange={(e) =>
									setLimits((prev) => ({
										...prev,
										brands: Number.parseInt(e.target.value) || 1000,
									}))
								}
								min={1}
								max={100000}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="categoriesLimit" className="text-xs">
								Category Assignment Limit
							</Label>
							<Input
								id="categoriesLimit"
								type="number"
								value={limits.categories}
								onChange={(e) =>
									setLimits((prev) => ({
										...prev,
										categories: Number.parseInt(e.target.value) || 1000,
									}))
								}
								min={1}
								max={100000}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="descriptionsLimit" className="text-xs">
								Description Generation Limit
							</Label>
							<Input
								id="descriptionsLimit"
								type="number"
								value={limits.descriptions}
								onChange={(e) =>
									setLimits((prev) => ({
										...prev,
										descriptions: Number.parseInt(e.target.value) || 500,
									}))
								}
								min={1}
								max={100000}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="cleanupLimit" className="text-xs">
								Name Cleanup Limit
							</Label>
							<Input
								id="cleanupLimit"
								type="number"
								value={limits.cleanup}
								onChange={(e) =>
									setLimits((prev) => ({
										...prev,
										cleanup: Number.parseInt(e.target.value) || 1000,
									}))
								}
								min={1}
								max={100000}
							/>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<Button
							onClick={runSelectedJobs}
							disabled={selectedJobs.length === 0 || isAnyJobRunning}
							className="flex items-center gap-2"
						>
							<Play className="h-4 w-4" />
							Run Selected Jobs ({selectedJobs.length})
						</Button>
						<Button
							variant="outline"
							onClick={() => setSelectedJobs(jobs.map((job) => job.id))}
							disabled={isAnyJobRunning}
						>
							Select All
						</Button>
						<Button
							variant="outline"
							onClick={() => setSelectedJobs([])}
							disabled={isAnyJobRunning}
						>
							Clear Selection
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Jobs List */}
			<div className="space-y-3">
				{jobs.map((job) => {
					const IconComponent = job.icon;
					const isSelected = selectedJobs.includes(job.id);

					return (
						<Card
							key={job.id}
							className={`transition-all ${isSelected ? "ring-2 ring-blue-500" : ""}`}
						>
							<CardContent className="p-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center space-x-3">
										<Checkbox
											checked={isSelected}
											onCheckedChange={() => toggleJobSelection(job.id)}
											disabled={isAnyJobRunning}
										/>
										<div className="flex items-center space-x-2">
											<IconComponent className="h-5 w-5 text-blue-500" />
											{getStatusIcon(job.status)}
										</div>
										<div className="flex-1">
											<div className="flex items-center space-x-2">
												<h3 className="font-medium">{job.name}</h3>
												<Badge variant="outline" className="text-xs">
													{job.status}
												</Badge>
											</div>
											<p className="text-muted-foreground text-sm">
												{job.description}
											</p>
											{job.result && (
												<p className="mt-1 text-green-600 text-xs">
													{job.result.message}
												</p>
											)}
										</div>
									</div>

									<div className="flex items-center space-x-2">
										<div className="text-right">
											<p className="text-muted-foreground text-xs">Last run</p>
											<p className="text-xs">{formatLastRun(job.lastRun)}</p>
										</div>
										<Button
											variant="outline"
											size="sm"
											onClick={() => runSingleJob(job.id)}
											disabled={job.status === "running" || isAnyJobRunning}
										>
											{job.status === "running" ? (
												<Square className="h-4 w-4" />
											) : (
												<Play className="h-4 w-4" />
											)}
										</Button>
									</div>
								</div>

								{/* Results */}
								{job.result &&
									job.result.examples &&
									job.result.examples.length > 0 && (
										<div className="mt-3 border-t pt-3">
											<p className="mb-2 font-medium text-xs">Examples:</p>
											<ScrollArea className="h-20">
												<div className="space-y-1">
													{job.result.examples
														.slice(0, 3)
														.map((example, index) => (
															<div
																key={index}
																className="rounded bg-muted/20 p-2 text-xs"
															>
																{typeof example === "string"
																	? example
																	: JSON.stringify(example)}
															</div>
														))}
												</div>
											</ScrollArea>
										</div>
									)}
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
