import { spawn } from "node:child_process";
import { promisify } from "node:util";

const sleep = promisify(setTimeout);

interface WorkflowStep {
	name: string;
	script: string;
	args: string[];
	description: string;
}

interface WorkflowResult {
	step: string;
	success: boolean;
	duration: number;
	output: string;
	error?: string;
}

const ENRICHMENT_WORKFLOW: WorkflowStep[] = [
	{
		name: "Analysis",
		script: "src/scripts/analyze-product-data.ts",
		args: [],
		description: "Analyze current product data quality and identify gaps",
	},
	{
		name: "Name Cleanup",
		script: "src/scripts/bulk-name-cleanup.ts",
		args: ["--limit=5000"],
		description: "Standardize and clean up product names",
	},
	{
		name: "Brand Extraction",
		script: "src/scripts/bulk-brand-extraction.ts",
		args: ["--limit=10000"],
		description:
			"Extract brand names from product names using pattern matching",
	},
	{
		name: "Category Assignment",
		script: "src/scripts/bulk-category-assignment.ts",
		args: ["--limit=5000"],
		description: "Assign categories to products based on name analysis",
	},
	{
		name: "Description Generation",
		script: "src/scripts/bulk-description-generation.ts",
		args: ["--limit=3000"],
		description: "Generate product descriptions using extracted information",
	},
	{
		name: "Final Analysis",
		script: "src/scripts/analyze-product-data.ts",
		args: [],
		description: "Re-analyze data to measure improvement",
	},
];

async function runScript(step: WorkflowStep): Promise<WorkflowResult> {
	console.log(`\n${"=".repeat(80)}`);
	console.log(`🚀 STARTING: ${step.name.toUpperCase()}`);
	console.log(`${"=".repeat(80)}`);
	console.log(`📝 ${step.description}`);
	console.log(`🔧 Running: bun run ${step.script} ${step.args.join(" ")}\n`);

	const startTime = Date.now();

	return new Promise((resolve) => {
		const child = spawn("bun", ["run", step.script, ...step.args], {
			stdio: ["pipe", "pipe", "pipe"],
			cwd: process.cwd(),
		});

		let output = "";
		let errorOutput = "";

		child.stdout.on("data", (data) => {
			const text = data.toString();
			output += text;
			process.stdout.write(text); // Real-time output
		});

		child.stderr.on("data", (data) => {
			const text = data.toString();
			errorOutput += text;
			process.stderr.write(text); // Real-time error output
		});

		child.on("close", (code) => {
			const duration = Date.now() - startTime;
			const success = code === 0;

			resolve({
				step: step.name,
				success,
				duration,
				output,
				error: success ? undefined : errorOutput,
			});
		});

		child.on("error", (error) => {
			const duration = Date.now() - startTime;
			resolve({
				step: step.name,
				success: false,
				duration,
				output,
				error: error.message,
			});
		});
	});
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

async function runEnrichmentWorkflow(skipSteps: string[] = [], dryRun = false) {
	console.log("🎯 BULK PRODUCT ENRICHMENT WORKFLOW");
	console.log(`${"=".repeat(80)}`);
	console.log(`📊 Total steps: ${ENRICHMENT_WORKFLOW.length}`);
	console.log(
		`⏭️  Skipping: ${skipSteps.length > 0 ? skipSteps.join(", ") : "none"}`,
	);
	console.log(`⚠️  Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
	console.log(`⏰ Started: ${new Date().toISOString()}\n`);

	const workflowStartTime = Date.now();
	const results: WorkflowResult[] = [];

	for (let i = 0; i < ENRICHMENT_WORKFLOW.length; i++) {
		const step = ENRICHMENT_WORKFLOW[i];

		// Skip if requested
		if (skipSteps.includes(step.name.toLowerCase())) {
			console.log(`⏭️  Skipping: ${step.name}`);
			continue;
		}

		// Add dry-run flag if specified
		const args =
			dryRun && step.name !== "Analysis" && step.name !== "Final Analysis"
				? [...step.args, "--dry-run"]
				: step.args;

		const stepWithArgs = { ...step, args };

		try {
			const result = await runScript(stepWithArgs);
			results.push(result);

			if (result.success) {
				console.log(
					`\n✅ ${step.name} completed successfully in ${formatDuration(result.duration)}`,
				);
			} else {
				console.log(
					`\n❌ ${step.name} failed after ${formatDuration(result.duration)}`,
				);
				if (result.error) {
					console.log(`💥 Error: ${result.error}`);
				}

				// Ask if we should continue
				console.log(
					`\n⚠️  Step "${step.name}" failed. Continue with remaining steps? (y/N)`,
				);
				// For automation, we'll continue by default
				console.log("🔄 Continuing with remaining steps...\n");
			}

			// Brief pause between steps
			if (i < ENRICHMENT_WORKFLOW.length - 1) {
				console.log("⏳ Pausing 3 seconds before next step...\n");
				await sleep(3000);
			}
		} catch (error) {
			console.error(`💥 Unexpected error in ${step.name}:`, error);
			results.push({
				step: step.name,
				success: false,
				duration: 0,
				output: "",
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	const workflowDuration = Date.now() - workflowStartTime;

	// Final summary
	console.log(`\n${"=".repeat(80)}`);
	console.log("📊 WORKFLOW SUMMARY");
	console.log(`${"=".repeat(80)}`);
	console.log(`⏰ Total duration: ${formatDuration(workflowDuration)}`);
	console.log(
		`✅ Successful steps: ${results.filter((r) => r.success).length}`,
	);
	console.log(`❌ Failed steps: ${results.filter((r) => !r.success).length}`);
	console.log(`⏭️  Skipped steps: ${skipSteps.length}\n`);

	console.log("📋 STEP DETAILS:");
	results.forEach((result, index) => {
		const status = result.success ? "✅" : "❌";
		console.log(
			`   ${index + 1}. ${status} ${result.step} (${formatDuration(result.duration)})`,
		);
		if (!result.success && result.error) {
			console.log(`      Error: ${result.error}`);
		}
	});

	const successRate =
		(results.filter((r) => r.success).length / results.length) * 100;
	console.log(`\n🎯 Success rate: ${successRate.toFixed(1)}%`);

	if (successRate === 100) {
		console.log("\n🎉 ALL ENRICHMENT STEPS COMPLETED SUCCESSFULLY!");
		console.log(
			"📈 Your product catalog should now have significantly improved data quality.",
		);
	} else if (successRate >= 75) {
		console.log("\n🎊 Most enrichment steps completed successfully!");
		console.log(
			"🔍 Review the failed steps and consider re-running them individually.",
		);
	} else {
		console.log("\n⚠️  Several enrichment steps failed.");
		console.log(
			"🔧 Please review the errors and check your database configuration.",
		);
	}

	return results;
}

async function main() {
	const args = process.argv.slice(2);

	// Parse command line arguments
	const dryRun = args.includes("--dry-run");
	const skipArg = args.find((arg) => arg.startsWith("--skip="));
	const skipSteps = skipArg
		? skipArg
				.split("=")[1]
				.split(",")
				.map((s) => s.trim().toLowerCase())
		: [];

	// Show help
	if (args.includes("--help") || args.includes("-h")) {
		console.log(`
🎯 BULK PRODUCT ENRICHMENT WORKFLOW

Usage: bun run bulk-enrichment-workflow.ts [options]

Options:
  --dry-run              Run in dry-run mode (no database changes)
  --skip=step1,step2     Skip specific steps
  --help, -h             Show this help

Available steps to skip:
  - analysis             Skip initial data analysis
  - name                 Skip name cleanup
  - brand                Skip brand extraction
  - category             Skip category assignment
  - description          Skip description generation
  - final                Skip final analysis

Examples:
  bun run bulk-enrichment-workflow.ts --dry-run
  bun run bulk-enrichment-workflow.ts --skip=analysis,final
  bun run bulk-enrichment-workflow.ts --dry-run --skip=analysis
`);
		process.exit(0);
	}

	try {
		await runEnrichmentWorkflow(skipSteps, dryRun);
	} catch (error) {
		console.error("\n💥 Workflow failed with unexpected error:", error);
		process.exit(1);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
