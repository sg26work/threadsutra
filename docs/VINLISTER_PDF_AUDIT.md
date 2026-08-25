# Vin Lister PDF-only inventory

## Sources read in full

1. `Vin eRetail _ Vin Lister User Manual – Vinculum Product Guide.pdf` (10 pages).
2. `Vin eRetail _ VinLister Feature List – Vinculum Product Guide.pdf` (3 pages).

No video, live Vin Lister site, or non-PDF source is used for this module.

## Documented navigation and workflows

| Area | PDF navigation | Required observable outcome |
| --- | --- | --- |
| Product import | `Admin > Import Type > Product > Download > Category`; then `Upload File > Import` | Category-specific product template download and product import; mandatory marketplace columns must be filled. |
| Image import | `Admin > Import Type > Image Import > Access Token (Dropbox) > Import` | Dropbox token based image import; images map by SKU name. |
| Channel price import | `Admin > Imports > Import Type > Channel Price > Download Template > Select Channel > Download`; then `Upload File > Import` | Channel-level SKU prices can be added or updated. |
| Products | `Products > Products` | Uploaded SKUs are visible and can be assigned to marketplaces. |
| Filter and price export | `Products > Products > Filter`; then `Price Export` | Filter by SKU and category; select up to five channels and export SKU/current prices. |
| Exports | `Admin > Exports > Filter` | Download product outputs including attributes and prices; retrieve price export sheets. |
| Manual marketplace output | `Admin > Exports > Export Type > Product by Export Profile` | Channel/category level upload-ready product sheet. |
| API listing | `Master > SKU Management > Operation > SKU Push > SKU > Process` | Product SKU is directly pushed to a marketplace through its API. |
| Transmit Enquiry | `Admin > Transmit Enquiry` | SKU-management/API push logs are visible. |

## Documented capabilities and data relationships

- Bulk category-specific catalog upload, external/PIM import, image repository import, marketplace attribute mapping, image conversion/hosting, immediate channel-price changes, Excel exports, and direct marketplace API pushes.
- Product imports create catalog products. Products are assigned to one or more marketplaces. Channel prices belong to the product + marketplace relationship.
- A product/channel/category export is an output record retrievable from Exports.
- SKU push creates a Transmit Enquiry log tied to the SKU and marketplace.
- The explicitly listed direct-listing marketplaces are Amazon, eBay, Lazada, Shopee, Walmart, Magento, Zalora, Shopify, Tokopedia, Bli Bli, TADA, and JD.
- The explicitly listed category readiness values are Fashion & Accessories, Health n Beauty, Jewellery, Baby Products, Electronics, Home Furnishing, Luggage & Travel, Adv & Mountaineering, Pet Supplies, Groceries, Meat & FMCG, and Baby and Mother Care.

## Evidence limits / decisions not invented

- The PDFs do not provide wireframes, colors, dimensions, field/template column names, exact error/success wording, pagination/sort behavior, role matrix, authentication/session rules, or endpoint contracts. These cannot be reproduced exactly from PDF-only evidence.
- The manual says templates contain mandatory columns and Excel dropdown/text cells but does not identify those columns. Any local template will therefore be clearly recorded as a minimal implementation schema, not claimed as source-exact.
- The feature list states PIM/external imports and image conversion/hosting as capabilities but provides no workflow, provider contract, or data schema. They remain documented but not implemented until evidence is supplied.

## Implemented and verified in this repository

- `/app/vin-lister` provides Products, Imports, Exports, SKU Management and Transmit Enquiry screens.
- API data is persisted in `vin_lister_products`, `vin_lister_imports`, `vin_lister_exports`, and `vin_lister_transmit_logs` through `/api/vin-lister`.
- `scripts/verify-vin-lister-api.mjs` verifies product import, marketplace assignment, channel-price update, export contents, SKU push, and transmit-log creation.
- The PDF supplies no source UI screens; the local UI uses the established project shell, responsive table/form patterns, and only labels/options named in the documents.
