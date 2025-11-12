# Attribute Extraction Test Report

## Overview

- **Total Products Tested**: 50
- **Products with Extracted Attributes**: 44 (88.0%)
- **Average Attributes per Product**: 1.80
- **Average Confidence**: 85.4%

## Attribute Frequency

- **brand**: 40 products
- **model**: 14 products
- **position**: 11 products
- **diameter**: 6 products
- **color**: 6 products
- **material**: 5 products
- **displacement**: 3 products
- **voltage**: 3 products
- **horsePower**: 2 products

## Category Performance

- **Moped - MC**: 49 products, avg 1.8 attributes, 75.2% confidence
- **Styre/Handtag**: 14 products, avg 1.6 attributes, 72.4% confidence
- **Förgasare**: 8 products, avg 1.5 attributes, 90.4% confidence
- **Stöd**: 7 products, avg 2.1 attributes, 86.3% confidence
- **Vajrar**: 6 products, avg 1.2 attributes, 75.0% confidence
- **Motordelar**: 5 products, avg 0.8 attributes, 35.0% confidence
- **Cylinder**: 4 products, avg 3.3 attributes, 85.6% confidence
- **Avgassystem**: 4 products, avg 1.0 attributes, 43.0% confidence
- **Bensintank / oljetank**: 4 products, avg 0.5 attributes, 45.0% confidence
- **Packningar / packboxar**: 4 products, avg 1.0 attributes, 90.0% confidence
- **Drev / Kedja**: 3 products, avg 2.7 attributes, 82.9% confidence
- **Eldelar**: 2 products, avg 2.0 attributes, 92.5% confidence
- **Hastighetsmätare**: 2 products, avg 2.0 attributes, 92.5% confidence
- **Vevaxel**: 2 products, avg 1.5 attributes, 81.5% confidence
- **Belysning / Blinkers**: 2 products, avg 2.0 attributes, 85.5% confidence
- **baklyse, framlyse**: 2 products, avg 2.0 attributes, 85.5% confidence
- **Bromsdelar**: 1 products, avg 4.0 attributes, 85.3% confidence
- **Hjul**: 1 products, avg 4.0 attributes, 85.3% confidence
- **Dyna / sadel**: 1 products, avg 2.0 attributes, 82.5% confidence
- **Framgaffel/stötdämpare**: 1 products, avg 2.0 attributes, 70.5% confidence
- **Pedaler**: 1 products, avg 2.0 attributes, 87.5% confidence
- **Tillbehör**: 1 products, avg 1.0 attributes, 90.0% confidence

## Top Examples


### Cylinder luftkyld motor SACHS 1 HK (ID: 4178)
**Categories**: Moped - MC, Cylinder
**Extracted Attributes** (5):
- **horsePower**: 1 (90% confidence, from name)
- **brand**: Sachs (90% confidence, from name)
- **diameter**: 38 (72% confidence, from description)
- **displacement**: 50 (76% confidence, from description)
- **material**: gjutjärn (64% confidence, from description)

### Cylinder Baotian/Kymco/GY6 70cc 47mm (ID: 432)
**Categories**: Moped - MC, Cylinder
**Extracted Attributes** (4):
- **diameter**: 47 (90% confidence, from name)
- **displacement**: 70 (95% confidence, from name)
- **model**: GY6 (95% confidence, from name)
- **brand**: Baotian (90% confidence, from name)

### Bromsskiva fram BAOTIAN 50QT, M.FL 155mm (ID: 493)
**Categories**: Moped - MC, Bromsdelar, Hjul
**Extracted Attributes** (4):
- **diameter**: 155 (90% confidence, from name)
- **brand**: Baotian (90% confidence, from name)
- **position**: fram (85% confidence, from name)
- **model**: BT50QT-9 (76% confidence, from description)

## Products with No Attributes

- **Tanklock låsbart TWS 50 / Jawa 586 / Tomos ATX / KTM** (Moped - MC, Bensintank / oljetank, Bensintank / oljetank)
- **Motor skruvsats Puch Maxi** (Moped - MC, Motordelar, Motordelar, Motordelar)
- **Gaswire std Puch DAK.3000+MONZA+NEVADA+MONTANA** (Moped - MC, Styre/Handtag)
- **Fjäder avgassystem Rieju** (Avgassystem, Avgassystem, Moped - MC)
- **Gaswire Rieju RR / Spike / MRT Euro 2 / MRX / SMT / RRX** (Moped - MC, Vajrar)

## Recommendations

1. **High Success Rate**: 44 out of 50 products (88.0%) have extractable attributes.

2. **Best Categories**: Cylinder, Stöd, Bromsdelar, Hjul, Drev / Kedja show excellent extraction potential.

3. **Pattern Improvements**: Consider enhancing patterns for products with zero attributes to improve coverage.

4. **Quality**: Average confidence of 85.4% indicates reliable extraction quality.
