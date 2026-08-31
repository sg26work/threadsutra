// Express server — serves the built frontend + all /api routes.
// Works locally (VS Code), on Render, or any Node host. The API route files
// use the Vercel handler signature (req, res), which is Express-compatible.
import "./env.js"; // must be first: loads .env before the Supabase client is created
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import skus from "./api/skus.js";
import partners from "./api/partners.js";
import saleOrders from "./api/sale-orders.js";
import purchaseOrders from "./api/purchase-orders.js";
import poRevision from "./api/po-revision.js";
import purchaseOrderComments from "./api/purchase-order-comments.js";
import purchaseOrderTags from "./api/purchase-order-tags.js";
import purchaseOrderInbound from "./api/purchase-order-inbound.js";
import purchaseOrderAsn from "./api/purchase-order-asn.js";
import grn from "./api/grn.js";
import asnEnquiry from "./api/asn-enquiry.js";
import manageAsn from "./api/manage-asn.js";
import vendorPromotions from "./api/vendor-promotions.js";
import purchaseChargeMasters from "./api/purchase-charge-masters.js";
import categoryBuyers from "./api/category-buyers.js";
import inventory from "./api/inventory.js";
import inventoryOps from "./api/inventory-ops.js";
import transfers from "./api/transfers.js";
import stoEnquiry from "./api/sto-enquiry.js";
import stoEditor from "./api/sto-editor.js";
import userEnquiry from "./api/user-enquiry.js";
import userEditor from "./api/user-editor.js";
import roleEditor from "./api/role-editor.js";
import orderImport from "./api/order-import.js";
import commonImport from "./api/common-import.js";
import exportsApi from "./api/exports.js";
import settingsApi from "./api/settings.js";
import returns from "./api/returns.js";
import fulfillment from "./api/fulfillment.js";
import picklists from "./api/picklists.js";
import shipments from "./api/shipments.js";
import generic from "./api/generic.js";
import reports from "./api/reports.js";
import downloads from "./api/downloads.js";
import channels from "./api/channels.js";
import skuChannelLinks from "./api/sku-channel-links.js";
import dashboard from "./api/dashboard.js";
import platforms from "./api/platforms.js";
import vendors from "./api/vendors.js";
import taxcodes from "./api/taxcodes.js";
import coupons from "./api/coupons.js";
import taxapp from "./api/taxapp.js";
import skubarcode from "./api/skubarcode.js";
import customers from "./api/customers.js";
import transporters from "./api/transporters.js";
import clients from "./api/clients.js";
import customerGroups from "./api/customer-groups.js";
import taxCategories from "./api/tax-categories.js";
import taxGroups from "./api/tax-groups.js";
import taxZones from "./api/tax-zones.js";
import orgHierarchy from "./api/org-hierarchy.js";
import locations from "./api/locations.js";
import storeGroups from "./api/store-groups.js";
import skuImports from "./api/sku-imports.js";
import skuCompanyLinks from "./api/sku-company-links.js";
import skuGroups from "./api/sku-groups.js";
import merchHierarchy from "./api/merch-hierarchy.js";
import manageAttributes from "./api/manage-attributes.js";
import pricingEvents from "./api/pricing-events.js";
import priceZones from "./api/price-zones.js";
import externalApps from "./api/external-apps.js";
import externalAppDefinitions from "./api/external-app-definitions.js";
import externalAppConnections from "./api/external-app-connections.js";
import orderRefunds from "./api/order-refunds.js";
import omsRules from "./api/oms-rules.js";
import masterOrders from "./api/master-orders.js";
import orderEnquiry from "./api/order-enquiry.js";
import orderMaintenance from "./api/order-maintenance.js";
import kittingOrders from "./api/kitting-orders.js";
import globalOrderSearch from "./api/global-order-search.js";
import codReconciliation from "./api/cod-reconciliation.js";
import skuModeration from "./api/sku-moderation.js";
import wmsZones from "./api/wms-zones.js";
import pickerZonePreferences from "./api/picker-zone-preferences.js";
import binEnquiry from "./api/bin-enquiry.js";
import binEditor from "./api/bin-editor.js";
import lottableValidations from "./api/lottable-validations.js";
import receiptValidations from "./api/receipt-validations.js";
import skuLabelPrint from "./api/sku-label-print.js";
import putawayRules from "./api/putaway-rules.js";
import putawayEnquiry from "./api/putaway-enquiry.js";
import dispatchCheckpoint from "./api/dispatch-checkpoint.js";
import skuGrading from "./api/sku-grading.js";
import discrepancyEnquiry from "./api/discrepancy-enquiry.js";
import bulkUpload from "./api/bulk-upload.js";
import mpInventoryLog from "./api/mp-inventory-log.js";
import lpnEnquiry from "./api/lpn-enquiry.js";
import transhipment from "./api/transhipment.js";
import transhipmentOld from "./api/transhipment-old.js";
import qcParamsMapping from "./api/qc-params-mapping.js";
import rtvEnquiry from "./api/rtv-enquiry.js";
import vendorReturnEditor from "./api/vendor-return-editor.js";
import customerReturnEnquiry from "./api/customer-return-enquiry.js";
import customerReturnEditor from "./api/customer-return-editor.js";
import returnOtc from "./api/return-otc.js";
import globalReturnsSearch from "./api/global-returns-search.js";
import returnWithoutOrder from "./api/return-without-order.js";
import allocationStrategies from "./api/allocation-strategies.js";
import cycleCountWaves from "./api/cycle-count-waves.js";
import manageAwb from "./api/manage-awb.js";
import transporterPreferences from "./api/transporter-preferences.js";
import servicePinCodes from "./api/service-pin-codes.js";
import orderAllocation from "./api/order-allocation.js";
import manageManifests from "./api/manage-manifests.js";
import deliveryShipping from "./api/delivery-shipping.js";
import bulkOrderUpdate from "./api/bulk-order-update.js";
import managePicklists from "./api/manage-picklists.js";
import managePicking from "./api/manage-picking.js";
import deliverySplit from "./api/delivery-split.js";
import shipmentHandoverReceive from "./api/shipment-handover.js";
import orderAcknowledgementApi from "./api/order-acknowledgement.js";
import consolidateEwb from "./api/consolidate-ewb.js";
import sortToBox from "./api/sort-to-box.js";
import inboundGatePass from "./api/inbound-gate-pass.js";
import inboundEnquiry from "./api/inbound-enquiry.js";
import inboundCreateEdit from "./api/inbound-create-edit.js";
import inboundRealtime from "./api/inbound-realtime.js";
import inboundQc from "./api/inbound-qc.js";
import inventoryMoveHistory from "./api/inventory-move-history.js";
import inventoryMove from "./api/inventory-move.js";
import inventoryMoveScan from "./api/inventory-move-scan.js";
import cycleCount from "./api/cycle-count.js";
import binAudit from "./api/bin-audit.js";
import bulkLottables from "./api/bulk-lottables.js";
import admin from "./api/admin.js";
import tallyConfig from "./api/tally-config.js";
import procurement from "./api/procurement.js";
import ars from "./api/ars.js";
import ajio from "./api/ajio.js";
import amazonMfn from "./api/amazon-mfn.js";
import vinLister from "./api/vin-lister.js";
import backOrders from "./api/back-orders.js";
import globalHeaderSearch from "./api/global-header-search.js";
import sellerPanelDashboard from "./api/seller-panel-dashboard.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Mount each serverless handler at its path. app.all forwards every method
// (GET/POST/PUT/DELETE/OPTIONS) to the handler, mirroring Vercel behavior.
const routes = {
  "/api/skus": skus,
  "/api/partners": partners,
  "/api/sale-orders": saleOrders,
  "/api/back-orders": backOrders,
  "/api/jsonOrderExits": globalHeaderSearch,
  "/api/seller-panel-dashboard": sellerPanelDashboard,
  "/api/purchase-orders": purchaseOrders,
  "/api/po-revision": poRevision,
  "/api/purchase-order-comments": purchaseOrderComments,
  "/api/purchase-order-tags": purchaseOrderTags,
  "/api/purchase-order-inbound": purchaseOrderInbound,
  "/api/purchase-order-asn": purchaseOrderAsn,
  "/api/grn": grn,
  "/api/asn-enquiry": asnEnquiry,
  "/api/manage-asn": manageAsn,
  "/api/vendor-promotions": vendorPromotions,
  "/api/purchase-charge-masters": purchaseChargeMasters,
  "/api/chargeMasterSearch": purchaseChargeMasters,
  "/api/jsonPOChargeDetailGrid": purchaseChargeMasters,
  "/api/saveUpdatePOCharges": purchaseChargeMasters,
  "/api/delUpdatePOCharges": purchaseChargeMasters,
  "/api/category-buyers": categoryBuyers,
  "/api/categoryBuyerSearch": categoryBuyers,
  "/api/catBuyerSaveBS": categoryBuyers,
  "/api/inventory": inventory,
  "/api/inventory-ops": inventoryOps,
  "/api/transfers": transfers,
  "/api/sto-enquiry": stoEnquiry,
  "/api/sto-editor": stoEditor,
  "/api/user-enquiry": userEnquiry,
  "/api/user-editor": userEditor,
  "/api/role-editor": roleEditor,
  "/api/order-import": orderImport,
  "/api/common-import": commonImport,
  "/api/exports": exportsApi,
  "/api/settings": settingsApi,
  "/api/returns": returns,
  "/api/fulfillment": fulfillment,
  "/api/picklists": picklists,
  "/api/shipments": shipments,
  "/api/generic": generic,
  "/api/reports": reports,
  "/api/downloads": downloads,
  "/api/channels": channels,
  "/api/sku-channel-links": skuChannelLinks,
  "/api/dashboard": dashboard,
  "/api/platforms": platforms,
  "/api/vendors": vendors,
  "/api/jsonVendorEnquirySearch": vendors,
  "/api/taxcodes": taxcodes,
  "/api/coupons": coupons,
  "/api/fetchCouponEnquiryData": coupons,
  "/api/taxapp": taxapp,
  "/api/skubarcode": skubarcode,
  "/api/customers": customers,
  "/api/jsonCustEnqSearch": customers,
  "/api/transporters": transporters,
  "/api/jsonTransporterEnquirySearch": transporters,
  "/api/clients": clients,
  "/api/jsonClientMasterEnquirySearch": clients,
  "/api/customer-groups": customerGroups,
  "/api/jsonCustGroupSearch": customerGroups,
  "/api/tax-categories": taxCategories,
  "/api/tax-groups": taxGroups,
  "/api/tax-zones": taxZones,
  "/api/org-hierarchy": orgHierarchy,
  "/api/locations": locations,
  "/api/store-groups": storeGroups,
  "/api/sku-imports": skuImports,
  "/api/sku-company-links": skuCompanyLinks,
  "/api/sku-groups": skuGroups,
  "/api/merch-hierarchy": merchHierarchy,
  "/api/manage-attributes": manageAttributes,
  "/api/pricing-events": pricingEvents,
  "/api/price-zones": priceZones,
  "/api/external-apps": externalApps,
  "/api/external-app-definitions": externalAppDefinitions,
  "/api/saveDefinition": externalAppDefinitions,
  "/api/testSMSConnection": externalAppConnections,
  "/api/jsonExternalAppsSearch": externalApps,
  "/api/getRewardMasterDataForExtAppId": externalApps,
  "/api/checkTaxIntConfigured": externalApps,
  "/api/saveExternalAppsData": externalApps,
  "/api/order-refunds": orderRefunds,
  "/api/oms-rules": omsRules,
  "/api/master-orders": masterOrders,
  "/api/order-enquiry": orderEnquiry,
  "/api/order-maintenance": orderMaintenance,
  "/api/kitting-orders": kittingOrders,
  "/api/global-order-search": globalOrderSearch,
  "/api/cod-reconciliation": codReconciliation,
  "/api/sku-moderation": skuModeration,
  "/api/wms-zones": wmsZones,
  "/api/picker-zone-preferences": pickerZonePreferences,
  "/api/bin-enquiry": binEnquiry,
  "/api/bin-editor": binEditor,
  "/api/lottable-validations": lottableValidations,
  "/api/receipt-validations": receiptValidations,
  "/api/sku-label-print": skuLabelPrint,
  "/api/putaway-rules": putawayRules,
  "/api/putaway-enquiry": putawayEnquiry,
  "/api/dispatch-checkpoint": dispatchCheckpoint,
  "/api/sku-grading": skuGrading,
  "/api/discrepancy-enquiry": discrepancyEnquiry,
  "/api/bulk-upload": bulkUpload,
  "/api/mp-inventory-log": mpInventoryLog,
  "/api/lpn-enquiry": lpnEnquiry,
  "/api/transhipment": transhipment,
  "/api/transhipment-old": transhipmentOld,
  "/api/qc-params-mapping": qcParamsMapping,
  "/api/rtv-enquiry": rtvEnquiry,
  "/api/vendor-return-editor": vendorReturnEditor,
  "/api/customer-return-enquiry": customerReturnEnquiry,
  "/api/customer-return-editor": customerReturnEditor,
  "/api/return-otc": returnOtc,
  "/api/global-returns-search": globalReturnsSearch,
  "/api/return-without-order": returnWithoutOrder,
  "/api/allocation-strategies": allocationStrategies,
  "/api/cycle-count-waves": cycleCountWaves,
  "/api/manage-awb": manageAwb,
  "/api/transporter-preferences": transporterPreferences,
  "/api/service-pin-codes": servicePinCodes,
  "/api/order-allocation": orderAllocation,
  "/api/manage-manifests": manageManifests,
  "/api/delivery-shipping": deliveryShipping,
  "/api/bulk-order-update": bulkOrderUpdate,
  "/api/manage-picklists": managePicklists,
  "/api/manage-picking": managePicking,
  "/api/delivery-split": deliverySplit,
  "/api/shipment-handover": shipmentHandoverReceive,
  "/api/order-acknowledgement": orderAcknowledgementApi,
  "/api/consolidate-ewb": consolidateEwb,
  "/api/sort-to-box": sortToBox,
  "/api/inbound-gate-pass": inboundGatePass,
  "/api/inbound-enquiry": inboundEnquiry,
  "/api/inbound-create-edit": inboundCreateEdit,
  "/api/inbound-realtime": inboundRealtime,
  "/api/inbound-qc": inboundQc,
  "/api/inventory-move-history": inventoryMoveHistory,
  "/api/inventory-move": inventoryMove,
  "/api/inventory-move-scan": inventoryMoveScan,
  "/api/cycle-count": cycleCount,
  "/api/bin-audit": binAudit,
  "/api/bulk-lottables": bulkLottables,
  "/api/admin": admin,
  "/api/tally-config": tallyConfig,
  "/api/procurement": procurement,
  "/api/ars": ars,
  "/api/fetchArsAttributes": ars,
  "/api/addAndUpdateArsAttributes": ars,
  "/api/bulkUpdateArsAttributes": ars,
  "/api/downloadArsAttribute": ars,
  "/api/ajio": ajio,
  "/api/amazon-mfn": amazonMfn,
  "/api/vin-lister": vinLister,
};
for (const [route, handler] of Object.entries(routes)) {
  app.all(route, (req, res) => handler(req, res));
}

// Serve the built frontend (produced by `npm run build`).
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// SPA fallback — send index.html for any non-API route so client-side
// routing (react-router) works on refresh / deep links.
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Bind to all IPv4 interfaces so other devices on the same LAN can reach the server.
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `\n  eRetail server running on http://localhost:${PORT} / http://<your-ip>:${PORT}\n`,
  );
});
