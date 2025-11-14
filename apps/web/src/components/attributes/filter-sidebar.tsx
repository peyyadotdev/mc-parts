"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Wand2,
  Download,
  RefreshCcw,
} from "lucide-react";

interface FilterSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  hasAttributes: "all" | "yes" | "no";
  onHasAttributesChange: (value: "all" | "yes" | "no") => void;
  extractedOnly: boolean;
  onExtractedOnlyChange: (value: boolean) => void;
  onRefresh: () => void;
  onBulkExtract?: () => void;
  onExport?: () => void;
  onSwitchToEnrichment?: () => void;
  totalVariants?: number;
  filteredVariants?: number;
}

export function FilterSidebar({
  isOpen,
  onToggle,
  search,
  onSearchChange,
  hasAttributes,
  onHasAttributesChange,
  extractedOnly,
  onExtractedOnlyChange,
  onRefresh,
  onBulkExtract,
  onExport,
  onSwitchToEnrichment,
  totalVariants = 0,
  filteredVariants = 0,
}: FilterSidebarProps) {
  return (
    <div
      className={`
        fixed left-0 top-0 h-full bg-background border-r transition-all duration-300 z-10
        ${isOpen ? "w-80 max-w-[90vw] sm:w-80" : "w-16"}
        ${!isOpen && "shadow-lg md:shadow-none"}
      `}
    >
      {/* Toggle Button */}
      <div className="flex items-center justify-between p-4 border-b">
        {isOpen && (
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Filters</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={`${!isOpen ? "w-full justify-center" : ""}`}
        >
          {isOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Sidebar Content */}
      <div className={`p-4 space-y-6 ${!isOpen && "hidden"}`}>
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search" className="text-xs font-medium text-muted-foreground">
            SEARCH
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Product name or SKU..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <Label className="text-xs font-medium text-muted-foreground">
            FILTERS
          </Label>

          <div className="space-y-3">
            {/* Has Attributes Filter */}
            <div className="space-y-2">
              <Label htmlFor="hasAttributes" className="text-sm">
                Attribute Status
              </Label>
              <select
                id="hasAttributes"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={hasAttributes}
                onChange={(e) => onHasAttributesChange(e.target.value as "all" | "yes" | "no")}
              >
                <option value="all">All variants</option>
                <option value="yes">Has attributes</option>
                <option value="no">Missing attributes</option>
              </select>
            </div>

            {/* Extracted Only Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="extractedOnly"
                checked={extractedOnly}
                onCheckedChange={(checked) => onExtractedOnlyChange(Boolean(checked))}
              />
              <Label
                htmlFor="extractedOnly"
                className="text-sm font-medium cursor-pointer"
              >
                Only extracted values
              </Label>
            </div>
          </div>
        </div>

        {/* Stats */}
        <Card className="bg-muted/20">
          <CardContent className="p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total variants:</span>
                <span className="font-medium">{totalVariants.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Filtered:</span>
                <span className="font-medium">{filteredVariants.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground">
            ACTIONS
          </Label>

          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="w-full justify-start"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh data
            </Button>

            {onBulkExtract && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkExtract}
                className="w-full justify-start"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Bulk extract
              </Button>
            )}

            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="w-full justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}

            {onSwitchToEnrichment && (
              <Button
                variant="default"
                size="sm"
                onClick={onSwitchToEnrichment}
                className="w-full justify-start"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Bulk Enrichment
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Collapsed State Icons */}
      {!isOpen && (
        <div className="p-2 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={onRefresh}
            title="Refresh"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          {onBulkExtract && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={onBulkExtract}
              title="Bulk extract"
            >
              <Wand2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}