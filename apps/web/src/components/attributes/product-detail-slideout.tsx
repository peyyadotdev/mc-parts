"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  X,
  Wand2,
  Calendar,
  Tag,
  Package,
  Building2,
  Hash,
  Plus,
  Trash2,
} from "lucide-react";

interface ProductDetailSlideOutProps {
  isOpen: boolean;
  onClose: () => void;
  variantData?: {
    variant: {
      productName: string;
      sku: string;
      gtin?: string | null;
      brandName?: string | null;
      categories: string[];
      updatedAt?: string | null;
    };
    attributes: Array<{
      slug: string;
      label: string;
      dataType: string;
      scope: string;
      values: Array<{
        id: string;
        value: string | number | boolean | null;
        unit?: string | null;
        confidence: number;
        source: string;
        extractedAt?: string | null;
      }>;
    }>;
  };
  attributeDefinitions?: Array<{
    slug: string;
    label: string;
    dataType: string;
    unit?: string | null;
  }>;
  isLoading?: boolean;
  isExtracting?: boolean;
  isUpdating?: boolean;
  onExtract: () => void;
  onUpdateAttributes: (attributes: any[]) => void;
  onRemoveAttribute: (slug: string) => void;
}

export function ProductDetailSlideOut({
  isOpen,
  onClose,
  variantData,
  attributeDefinitions = [],
  isLoading = false,
  isExtracting = false,
  isUpdating = false,
  onExtract,
  onUpdateAttributes,
  onRemoveAttribute,
}: ProductDetailSlideOutProps) {
  const [selectedDefinition, setSelectedDefinition] = React.useState("");
  const [manualValue, setManualValue] = React.useState("");
  const [manualUnit, setManualUnit] = React.useState("");
  const [manualConfidence, setManualConfidence] = React.useState(1);

  const handleManualSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedDefinition || !manualValue.trim()) return;

    const definition = attributeDefinitions.find(
      (def) => def.slug === selectedDefinition
    );

    if (!definition) return;

    let value: string | number | boolean = manualValue.trim();
    if (definition.dataType === "number") {
      const numeric = Number.parseFloat(manualValue);
      if (Number.isNaN(numeric)) return;
      value = numeric;
    } else if (definition.dataType === "boolean") {
      value = manualValue.toLowerCase() === "true";
    }

    onUpdateAttributes([
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
    ]);

    // Reset form
    setSelectedDefinition("");
    setManualValue("");
    setManualUnit("");
    setManualConfidence(1);
  };

  // Handle ESC key to close
  React.useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div
        className={`
          fixed right-0 top-0 h-full bg-background border-l shadow-xl z-50
          w-full max-w-2xl sm:max-w-md md:max-w-lg lg:max-w-2xl transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-muted/20">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">
              Product Details
            </h2>
            {variantData && (
              <p className="text-sm text-muted-foreground truncate">
                {variantData.variant.productName}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="shrink-0 ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-6 space-y-6">
            {isLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : variantData ? (
              <>
                {/* Product Overview */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Product Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          SKU
                        </Label>
                        <div className="font-mono mt-1 flex items-center gap-2">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          {variantData.variant.sku}
                        </div>
                      </div>
                      {variantData.variant.gtin && (
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            GTIN
                          </Label>
                          <div className="font-mono mt-1">
                            {variantData.variant.gtin}
                          </div>
                        </div>
                      )}
                      {variantData.variant.brandName && (
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Brand
                          </Label>
                          <div className="mt-1 flex items-center gap-2">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {variantData.variant.brandName}
                          </div>
                        </div>
                      )}
                      {variantData.variant.updatedAt && (
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Last Updated
                          </Label>
                          <div className="mt-1 flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(variantData.variant.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Categories */}
                    {variantData.variant.categories.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          Categories
                        </Label>
                        <div className="flex flex-wrap gap-1">
                          {variantData.variant.categories.map((category) => (
                            <Badge key={category} variant="outline" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {category}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Extract Action */}
                <Card>
                  <CardContent className="p-4">
                    <Button
                      onClick={onExtract}
                      disabled={isExtracting}
                      className="w-full"
                      size="lg"
                    >
                      {isExtracting ? (
                        <>
                          <Wand2 className="h-4 w-4 mr-2 animate-spin" />
                          Extracting attributes...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Run attribute extraction
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Attributes */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Attributes ({variantData.attributes.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {variantData.attributes.length > 0 ? (
                      variantData.attributes.map((attribute) => (
                        <div key={attribute.slug} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{attribute.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {attribute.slug} · {attribute.dataType}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {attribute.scope}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            {attribute.values.map((value) => (
                              <div
                                key={value.id}
                                className="flex items-center justify-between p-3 bg-muted/20 rounded-md"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">
                                      {String(value.value)}
                                    </span>
                                    {value.unit && (
                                      <span className="text-xs text-muted-foreground">
                                        ({value.unit})
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{(value.confidence * 100).toFixed(0)}% confidence</span>
                                    <span>·</span>
                                    <span>{value.source}</span>
                                    {value.extractedAt && (
                                      <>
                                        <span>·</span>
                                        <span>{new Date(value.extractedAt).toLocaleDateString()}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {value.source === "manual" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRemoveAttribute(attribute.slug)}
                                    disabled={isUpdating}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No attributes found</p>
                        <p className="text-xs">Run extraction or add manual attributes</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Add Manual Attribute */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Manual Attribute
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleManualSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="definition" className="text-sm">
                            Attribute
                          </Label>
                          <select
                            id="definition"
                            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                            value={selectedDefinition}
                            onChange={(e) => {
                              setSelectedDefinition(e.target.value);
                              const def = attributeDefinitions.find(
                                (item) => item.slug === e.target.value
                              );
                              setManualUnit(def?.unit ?? "");
                            }}
                          >
                            <option value="">Select attribute...</option>
                            {attributeDefinitions.map((definition) => (
                              <option value={definition.slug} key={definition.slug}>
                                {definition.label} ({definition.dataType})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="value" className="text-sm">
                            Value
                          </Label>
                          <Input
                            id="value"
                            value={manualValue}
                            onChange={(e) => setManualValue(e.target.value)}
                            placeholder="Enter value"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="unit" className="text-sm">
                            Unit (optional)
                          </Label>
                          <Input
                            id="unit"
                            value={manualUnit}
                            onChange={(e) => setManualUnit(e.target.value)}
                            placeholder="e.g. mm, kg"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confidence" className="text-sm">
                            Confidence
                          </Label>
                          <Input
                            id="confidence"
                            type="number"
                            step="0.05"
                            min={0}
                            max={1}
                            value={manualConfidence}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              if (!isNaN(value)) {
                                setManualConfidence(Math.min(1, Math.max(0, value)));
                              }
                            }}
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={
                          isUpdating || !selectedDefinition || !manualValue.trim()
                        }
                        className="w-full"
                      >
                        Add attribute
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No product selected</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}