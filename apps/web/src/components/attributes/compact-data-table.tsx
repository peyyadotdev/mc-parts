"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";

interface Variant {
  variantId: string;
  productName: string;
  sku: string;
  gtin?: string | null;
  brandName?: string | null;
  extractedCount: number;
  manualCount: number;
  lastExtractedAt?: string | null;
  updatedAt: string | null;
}

interface CompactDataTableProps {
  variants: Variant[];
  selectedVariantId?: string | null;
  isLoading?: boolean;
  onVariantSelect: (variantId: string | null) => void;
  pagination?: {
    page: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    total: number;
  };
  onPageChange?: (page: number) => void;
}

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString() : "—";

export function CompactDataTable({
  variants,
  selectedVariantId,
  isLoading = false,
  onVariantSelect,
  pagination,
  onPageChange,
}: CompactDataTableProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Table Container */}
      <div className="flex-1 overflow-auto border rounded-lg">
        <div className="min-w-[800px] sm:min-w-0">
        <table className="w-full text-sm">
          {/* Sticky Header */}
          <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm border-b z-10">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wider">
                Product
              </th>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wider">
                SKU
              </th>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wider">
                Brand
              </th>
              <th className="px-3 py-2 text-center font-medium text-xs uppercase tracking-wider">
                Extracted
              </th>
              <th className="px-3 py-2 text-center font-medium text-xs uppercase tracking-wider">
                Manual
              </th>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wider">
                Last extracted
              </th>
              <th className="px-3 py-2 text-center font-medium text-xs uppercase tracking-wider w-[1%]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {isLoading ? (
              // Loading Skeleton
              Array.from({ length: 10 }).map((_, index) => (
                <tr key={index} className="hover:bg-muted/40">
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-48" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Skeleton className="h-5 w-8 mx-auto rounded-full" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Skeleton className="h-5 w-8 mx-auto rounded-full" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Skeleton className="h-6 w-16" />
                  </td>
                </tr>
              ))
            ) : variants.length > 0 ? (
              // Data Rows
              variants.map((variant) => {
                const isSelected = selectedVariantId === variant.variantId;
                return (
                  <tr
                    key={variant.variantId}
                    className={`
                      cursor-pointer transition-colors
                      ${isSelected
                        ? "bg-accent/50 border-accent"
                        : "hover:bg-muted/40"
                      }
                    `}
                    onClick={() =>
                      onVariantSelect(
                        isSelected ? null : variant.variantId
                      )
                    }
                  >
                    {/* Product Name */}
                    <td className="px-3 py-2">
                      <div className="max-w-[300px] truncate font-medium">
                        {variant.productName}
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="px-3 py-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {variant.sku}
                      </code>
                    </td>

                    {/* Brand */}
                    <td className="px-3 py-2">
                      {variant.brandName ? (
                        <Badge variant="outline" className="text-xs">
                          {variant.brandName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Extracted Count */}
                    <td className="px-3 py-2 text-center">
                      <Badge
                        variant={variant.extractedCount > 0 ? "default" : "outline"}
                        className="text-xs min-w-[2rem] justify-center"
                      >
                        {variant.extractedCount}
                      </Badge>
                    </td>

                    {/* Manual Count */}
                    <td className="px-3 py-2 text-center">
                      <Badge
                        variant={variant.manualCount > 0 ? "secondary" : "outline"}
                        className="text-xs min-w-[2rem] justify-center"
                      >
                        {variant.manualCount}
                      </Badge>
                    </td>

                    {/* Last Extracted */}
                    <td className="px-3 py-2">
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(variant.lastExtractedAt)}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2 text-center">
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-7 px-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          onVariantSelect(
                            isSelected ? null : variant.variantId
                          );
                        }}
                      >
                        {isSelected ? "Close" : "View"}
                      </Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              // Empty State
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center">
                  <div className="text-muted-foreground">
                    <div className="text-sm font-medium">No variants found</div>
                    <div className="text-xs">Try adjusting your filters</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/20">
          <div className="text-sm text-muted-foreground">
            Showing page {pagination.page} of {pagination.totalPages}
            ({pagination.total.toLocaleString()} total variants)
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrevPage}
              onClick={() => onPageChange?.(pagination.page - 1)}
            >
              Previous
            </Button>

            {/* Page Numbers (show current and surrounding pages) */}
            <div className="flex items-center space-x-1">
              {pagination.page > 2 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPageChange?.(1)}
                    className="w-8 h-8 p-0 text-xs"
                  >
                    1
                  </Button>
                  {pagination.page > 3 && <span className="text-xs">...</span>}
                </>
              )}

              {pagination.page > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPageChange?.(pagination.page - 1)}
                  className="w-8 h-8 p-0 text-xs"
                >
                  {pagination.page - 1}
                </Button>
              )}

              <Button
                variant="default"
                size="sm"
                className="w-8 h-8 p-0 text-xs"
              >
                {pagination.page}
              </Button>

              {pagination.page < pagination.totalPages && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPageChange?.(pagination.page + 1)}
                  className="w-8 h-8 p-0 text-xs"
                >
                  {pagination.page + 1}
                </Button>
              )}

              {pagination.page < pagination.totalPages - 1 && (
                <>
                  {pagination.page < pagination.totalPages - 2 && <span className="text-xs">...</span>}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPageChange?.(pagination.totalPages)}
                    className="w-8 h-8 p-0 text-xs"
                  >
                    {pagination.totalPages}
                  </Button>
                </>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNextPage}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}