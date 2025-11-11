#!/usr/bin/env node

/**
 * Analyze product data to identify enrichment opportunities
 * Focused on identifying patterns and suggesting structured attributes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function analyzeProducts(products) {
  const analysis = {
    totalProducts: products.length,
    productTypes: {},
    categories: {},
    attributePatterns: {},
    namePatterns: [],
    descriptionPatterns: [],
    technicalSpecsFound: [],
    enrichmentOpportunities: []
  };

  // Regular expressions for extracting technical specs from names and descriptions
  const patterns = {
    // Dimensions and measurements
    diameter: /(\d+)\s*mm/gi,
    size: /(\d+)\s*(cc|cm|mm|tum|")/gi,
    weight: /(\d+)\s*(kg|g)/gi,

    // Technical specs
    horsePower: /(\d+)\s*(hk|hp)/gi,
    voltage: /(\d+)\s*v/gi,

    // Compatibility
    model: /(BT\d+QT-\d+|MT\d+|MB\d+|QT\d+|GY6)/gi,
    brand: /(Honda|Yamaha|Suzuki|Kawasaki|Baotian|Kymco|Peugeot|Piaggio|Derbi|Aprilia|Gilera)/gi,

    // Product attributes
    material: /(aluminium|stål|gjutjärn|plast|gummi|rostfritt)/gi,
    color: /(svart|vit|röd|blå|grön|gul|silver|krom)/gi,
    position: /(fram|bak|höger|vänster|vänster\/höger)/gi
  };

  products.forEach(product => {
    // Track product types
    analysis.productTypes[product.type] = (analysis.productTypes[product.type] || 0) + 1;

    // Track categories
    if (product.categories) {
      product.categories.forEach(cat => {
        if (!analysis.categories[cat.name]) {
          analysis.categories[cat.name] = {
            count: 0,
            products: []
          };
        }
        analysis.categories[cat.name].count++;
        analysis.categories[cat.name].products.push(product.id);
      });
    }

    // Analyze name and description for patterns
    const fullText = `${product.name} ${product.description || ''}`.toLowerCase();

    // Extract technical specifications
    const specs = {};

    for (const [key, regex] of Object.entries(patterns)) {
      const matches = [...fullText.matchAll(regex)];
      if (matches.length > 0) {
        specs[key] = matches.map(m => m[0]);
        if (!analysis.technicalSpecsFound.includes(key)) {
          analysis.technicalSpecsFound.push(key);
        }
      }
    }

    // Check for existing attributes
    if (product.attributes && product.attributes.length > 0) {
      analysis.attributePatterns.hasAttributes = (analysis.attributePatterns.hasAttributes || 0) + 1;
    } else {
      analysis.attributePatterns.noAttributes = (analysis.attributePatterns.noAttributes || 0) + 1;
    }

    // Check for existing specifications
    if (product.specifications && product.specifications.length > 0) {
      analysis.attributePatterns.hasSpecifications = (analysis.attributePatterns.hasSpecifications || 0) + 1;
    } else {
      analysis.attributePatterns.noSpecifications = (analysis.attributePatterns.noSpecifications || 0) + 1;
    }

    // Store example products with extracted specs
    if (Object.keys(specs).length > 0) {
      analysis.namePatterns.push({
        id: product.id,
        name: product.name,
        extractedSpecs: specs,
        categories: product.categories?.map(c => c.name) || []
      });
    }
  });

  return analysis;
}

function suggestEnrichmentStrategy(analysis) {
  const suggestions = {
    strategy: "Strukturerad Product Enrichment",
    overview: "",
    categorySpecificAttributes: {},
    universalAttributes: [],
    extractionRules: [],
    implementationSteps: []
  };

  // Overview
  suggestions.overview = `
Baserat på analysen av ${analysis.totalProducts} produkter har jag identifierat flera
möjligheter för strukturerad product enrichment. Data innehåller för närvarande:
- ${analysis.attributePatterns.noAttributes || 0} produkter utan attribut
- ${analysis.attributePatterns.noSpecifications || 0} produkter utan specifikationer
- ${analysis.technicalSpecsFound.length} typer av tekniska specifikationer i beskrivningstexter
`;

  // Universal attributes
  suggestions.universalAttributes = [
    {
      name: "Compatibility",
      type: "multi-select",
      description: "Vilka fordon/modeller produkten passar till",
      extractionRule: "Regex: Model patterns från namn och beskrivning",
      importance: "high",
      examples: ["BT50QT-9", "Honda MT", "Kymco"]
    },
    {
      name: "Brand",
      type: "select",
      description: "Varumärke/tillverkare",
      extractionRule: "Regex: Brand patterns",
      importance: "high",
      examples: ["Honda", "Yamaha", "Baotian", "Kymco"]
    },
    {
      name: "Material",
      type: "select",
      description: "Vilket material produkten är gjord av",
      extractionRule: "Regex: Material patterns",
      importance: "medium",
      examples: ["Aluminium", "Stål", "Gjutjärn", "Plast"]
    },
    {
      name: "Position",
      type: "select",
      description: "Var på fordonet delen sitter",
      extractionRule: "Regex: Position patterns",
      importance: "medium",
      examples: ["Fram", "Bak", "Höger", "Vänster"]
    },
    {
      name: "Color",
      type: "select",
      description: "Färg på produkten",
      extractionRule: "Regex: Color patterns",
      importance: "low",
      examples: ["Svart", "Silver", "Krom"]
    }
  ];

  // Category-specific attributes based on analysis
  const categoryAttributes = {
    "Cylinder": [
      { name: "Diameter", unit: "mm", type: "numeric", importance: "critical" },
      { name: "Displacement", unit: "cc", type: "numeric", importance: "critical" },
      { name: "Power Output", unit: "hk", type: "numeric", importance: "high" },
      { name: "Includes Piston", type: "boolean", importance: "high" }
    ],
    "Förgasare": [
      { name: "Intake Size", unit: "mm", type: "numeric", importance: "critical" },
      { name: "Type", type: "select", options: ["Standard", "Racing", "Performance"], importance: "high" },
      { name: "Adjustment Type", type: "select", importance: "medium" }
    ],
    "Avgassystem": [
      { name: "Type", type: "select", options: ["Original", "Sport", "Racing", "Effekt"], importance: "high" },
      { name: "Material", type: "select", options: ["Aluminium", "Stål", "Rostfritt"], importance: "high" },
      { name: "Sound Level", unit: "dB", type: "numeric", importance: "medium" },
      { name: "Mounting Type", type: "select", importance: "medium" }
    ],
    "Bromsdelar": [
      { name: "Disc Diameter", unit: "mm", type: "numeric", importance: "critical" },
      { name: "Pad Material", type: "select", importance: "high" },
      { name: "Position", type: "select", options: ["Fram", "Bak"], importance: "high" }
    ],
    "Eldelar": [
      { name: "Voltage", unit: "V", type: "numeric", importance: "high" },
      { name: "Wattage", unit: "W", type: "numeric", importance: "medium" },
      { name: "Connector Type", type: "select", importance: "medium" }
    ]
  };

  suggestions.categorySpecificAttributes = categoryAttributes;

  // Extraction rules
  suggestions.extractionRules = [
    {
      rule: "Extract dimensions from product name and description",
      pattern: "\\d+\\s*mm|\\d+\\s*cc|\\d+\\s*cm",
      priority: "high",
      exampleMatch: "47mm -> Diameter: 47mm"
    },
    {
      rule: "Extract model compatibility",
      pattern: "BT\\d+QT-\\d+|MT\\d+|MB\\d+|GY6",
      priority: "high",
      exampleMatch: "BT50QT-9 -> Compatible with: BT50QT-9"
    },
    {
      rule: "Extract material information",
      pattern: "aluminium|stål|gjutjärn|plast|gummi",
      priority: "medium",
      exampleMatch: "aluminium -> Material: Aluminium"
    },
    {
      rule: "Extract position/placement",
      pattern: "fram|bak|höger|vänster",
      priority: "medium",
      exampleMatch: "fram -> Position: Fram"
    },
    {
      rule: "Extract power output",
      pattern: "\\d+\\s*hk|\\d+\\s*hp",
      priority: "high",
      exampleMatch: "1 hk -> Power: 1 HP"
    }
  ];

  // Implementation steps
  suggestions.implementationSteps = [
    {
      step: 1,
      title: "Skapa attributschema i databas",
      description: "Definiera alla attribut och deras möjliga värden i databasen",
      tasks: [
        "Skapa product_attributes tabell",
        "Skapa attribute_definitions tabell med möjliga värden",
        "Skapa kopplingar mellan produkter och attribut"
      ]
    },
    {
      step: 2,
      title: "Implementera automatisk extraktion",
      description: "Bygg system för att automatiskt extrahera attribut från befintlig data",
      tasks: [
        "Skapa regex-baserade extractors för varje attributtyp",
        "Implementera NLP-baserad extraktion för mer komplexa mönster",
        "Validera extraherad data mot definierade värden"
      ]
    },
    {
      step: 3,
      title: "Manuell granskning och komplettering",
      description: "Tillåt manuell granskning och korrigering av extraherad data",
      tasks: [
        "Bygg admin-gränssnitt för attributhantering",
        "Implementera bulk-redigering av attribut",
        "Skapa confidence scores för automatiskt extraherade attribut"
      ]
    },
    {
      step: 4,
      title: "Använd attribut för förbättrad sökning och filtrering",
      description: "Integrera attribut i sök- och filterfunktionalitet",
      tasks: [
        "Indexera attribut för snabb sökning",
        "Skapa filtergränssnitt baserat på attribut",
        "Implementera attribut-baserad produktmatchning"
      ]
    }
  ];

  return suggestions;
}

function generateExamples(analysis) {
  const examples = [];

  // Get examples from different categories
  const categoryCounts = Object.entries(analysis.categories)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  for (const [categoryName, categoryData] of categoryCounts) {
    const categoryProducts = analysis.namePatterns.filter(p =>
      p.categories.includes(categoryName)
    ).slice(0, 3);

    if (categoryProducts.length > 0) {
      examples.push({
        category: categoryName,
        productCount: categoryData.count,
        examples: categoryProducts
      });
    }
  }

  return examples;
}

async function main() {
  console.log('=== Product Enrichment Analysis ===\n');

  const sampleDir = path.join(__dirname, 'sample-2025-11-11');

  // Load all product data
  const allProducts = [];
  const productFiles = ['avgassystem.json', 'forgasare.json', 'mixed-products.json'];

  for (const file of productFiles) {
    const filePath = path.join(sampleDir, file);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (data.data && Array.isArray(data.data)) {
        allProducts.push(...data.data);
      }
    }
  }

  // Remove duplicates based on ID
  const uniqueProducts = Array.from(
    new Map(allProducts.map(p => [p.id, p])).values()
  );

  console.log(`Analyzing ${uniqueProducts.length} unique products...\n`);

  // Perform analysis
  const analysis = analyzeProducts(uniqueProducts);

  // Generate enrichment suggestions
  const suggestions = suggestEnrichmentStrategy(analysis);

  // Generate examples
  const examples = generateExamples(analysis);

  // Save results
  const outputDir = sampleDir;

  fs.writeFileSync(
    path.join(outputDir, 'enrichment-analysis.json'),
    JSON.stringify({ analysis, suggestions, examples }, null, 2)
  );

  // Create a markdown report
  const report = `# Product Enrichment Analysis Report

## Översikt

${suggestions.overview}

## Kategorier

Totalt ${Object.keys(analysis.categories).length} kategorier funna:

${Object.entries(analysis.categories)
  .sort((a, b) => b[1].count - a[1].count)
  .map(([name, data]) => `- **${name}**: ${data.count} produkter`)
  .join('\n')}

## Tekniska Specifikationer Funna

Följande typer av teknisk data identifierades i produktnamn och beskrivningar:

${analysis.technicalSpecsFound.map(spec => `- ${spec}`).join('\n')}

## Universella Attribut

Dessa attribut kan appliceras på alla eller de flesta produkter:

${suggestions.universalAttributes.map(attr => `
### ${attr.name} (${attr.importance})

- **Typ**: ${attr.type}
- **Beskrivning**: ${attr.description}
- **Extraktionsregel**: ${attr.extractionRule}
- **Exempel**: ${attr.examples.join(', ')}
`).join('\n')}

## Kategori-Specifika Attribut

${Object.entries(suggestions.categorySpecificAttributes).map(([category, attrs]) => `
### ${category}

${attrs.map(attr => `- **${attr.name}**${attr.unit ? ` (${attr.unit})` : ''} - ${attr.importance} importance`).join('\n')}
`).join('\n')}

## Extraktionsregler

${suggestions.extractionRules.map((rule, i) => `
${i + 1}. **${rule.rule}** (${rule.priority})
   - Pattern: \`${rule.pattern}\`
   - Exempel: ${rule.exampleMatch}
`).join('\n')}

## Implementeringssteg

${suggestions.implementationSteps.map(step => `
### Steg ${step.step}: ${step.title}

${step.description}

**Uppgifter:**
${step.tasks.map(task => `- ${task}`).join('\n')}
`).join('\n')}

## Exempel på Extraherad Data

${examples.map(ex => `
### ${ex.category} (${ex.productCount} produkter)

${ex.examples.map(prod => `
#### ${prod.name} (ID: ${prod.id})

**Extraherade specifikationer:**
${Object.entries(prod.extractedSpecs).map(([key, values]) => `- ${key}: ${values.join(', ')}`).join('\n')}
`).join('\n')}
`).join('\n')}

## Nästa Steg

1. **Granska rapporten** och justera attributschema efter era behov
2. **Prioritera kategorier** - börja med de mest populära kategorierna
3. **Implementera extraktionslogik** - börja med de enklaste mönstren
4. **Validera resultat** - granska automatiskt extraherad data
5. **Iterera och förbättra** - kontinuerlig förbättring baserat på resultat

## Datakvali tetsanalys

- **Produkter med attribut**: ${analysis.attributePatterns.hasAttributes || 0}
- **Produkter utan attribut**: ${analysis.attributePatterns.noAttributes || 0}
- **Produkter med specifikationer**: ${analysis.attributePatterns.hasSpecifications || 0}
- **Produkter utan specifikationer**: ${analysis.attributePatterns.noSpecifications || 0}

**Conclusion**: Stor potential för enrichment - de flesta produkter saknar strukturerade attribut.
`;

  fs.writeFileSync(
    path.join(outputDir, 'ENRICHMENT-REPORT.md'),
    report
  );

  console.log('✓ Analysis complete!\n');
  console.log('Files created:');
  console.log(`  - ${path.join(outputDir, 'enrichment-analysis.json')}`);
  console.log(`  - ${path.join(outputDir, 'ENRICHMENT-REPORT.md')}`);
  console.log('\nSummary:');
  console.log(`  - ${uniqueProducts.length} products analyzed`);
  console.log(`  - ${Object.keys(analysis.categories).length} categories found`);
  console.log(`  - ${analysis.technicalSpecsFound.length} types of technical specs identified`);
  console.log(`  - ${suggestions.universalAttributes.length} universal attributes suggested`);
  console.log(`  - ${Object.keys(suggestions.categorySpecificAttributes).length} category-specific attribute sets defined`);
}

main().catch(console.error);
