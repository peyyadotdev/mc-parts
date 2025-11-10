"use client";

import { useState } from "react";
import { BrandAliasesTable } from "@/components/brand-aliases-table";
import { AttributeDefinitionsTable } from "@/components/attribute-definitions-table";
import { AttributeTemplatesTable } from "@/components/attribute-templates-table";
import { ProductEnrichmentTable } from "@/components/product-enrichment-table";

export default function AdminPage() {
	const [activeTab, setActiveTab] = useState<
		"brands" | "attributes" | "templates" | "enrichment"
	>("brands");

	return (
		<div className="container mx-auto max-w-7xl px-4 py-8">
			<h1 className="mb-6 text-3xl font-bold">PIM Admin</h1>

			<div className="mb-6 border-b">
				<nav className="flex gap-4">
					<button
						onClick={() => setActiveTab("brands")}
						className={`border-b-2 px-4 py-2 font-medium ${
							activeTab === "brands"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						Brand Aliases
					</button>
					<button
						onClick={() => setActiveTab("attributes")}
						className={`border-b-2 px-4 py-2 font-medium ${
							activeTab === "attributes"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						Attribute Definitions
					</button>
					<button
						onClick={() => setActiveTab("templates")}
						className={`border-b-2 px-4 py-2 font-medium ${
							activeTab === "templates"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						Attribute Templates
					</button>
					<button
						onClick={() => setActiveTab("enrichment")}
						className={`border-b-2 px-4 py-2 font-medium ${
							activeTab === "enrichment"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						Product Enrichment
					</button>
				</nav>
			</div>

			<div>
				{activeTab === "brands" && <BrandAliasesTable />}
				{activeTab === "attributes" && <AttributeDefinitionsTable />}
				{activeTab === "templates" && <AttributeTemplatesTable />}
				{activeTab === "enrichment" && <ProductEnrichmentTable />}
			</div>
		</div>
	);
}
