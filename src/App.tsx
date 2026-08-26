import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DownloadProvider } from "./context/DownloadContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Shell from "./eretail/Shell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SaleOrders from "./pages/SaleOrders";
import PurchaseOrders from "./pages/PurchaseOrders";
import GRN from "./pages/GRN";
import Inventory from "./pages/Inventory";
import InventoryOperations from "./pages/InventoryOperations";
import Transfers from "./pages/Transfers";
import Skus from "./pages/Skus";
import Partners from "./pages/Partners";
import ReturnsModule from "./eretail/returns/ReturnsModule";
import Reports from "./pages/Reports";

// eRetail shell
import EDashboard from "./eretail/EDashboard";
import GenericRoute from "./eretail/GenericRoute";
import VendorPromotions from "./eretail/procurement/VendorPromotions";
import PurchaseChargeMasters from "./eretail/procurement/PurchaseChargeMasters";
import CategoryBuyers from "./eretail/procurement/CategoryBuyers";
import ReportRoute from "./eretail/ReportRoute";
import ControlTower from "./eretail/ControlTower";
import Downloads from "./eretail/Downloads";
import ManageChannels from "./eretail/ManageChannels";
import SkuChannelListing from "./eretail/SkuChannelListing";
import VendorMaster from "./eretail/masters/VendorMaster";
import CustomerMaster from "./eretail/masters/CustomerMaster";
import TransporterMaster from "./eretail/masters/TransporterMaster";
import ClientMaster from "./eretail/masters/ClientMaster";
import CustomerGroupMaster from "./eretail/masters/CustomerGroupMaster";
import TaxCode from "./eretail/masters/TaxCode";
import ManageCoupons from "./eretail/masters/ManageCoupons";
import TaxApplication from "./eretail/masters/TaxApplication";
import SkuBarcode from "./eretail/masters/SkuBarcode";
import SkuCompanyLink from "./eretail/masters/SkuCompanyLink";
import MerchandisingHierarchy from "./eretail/masters/MerchandisingHierarchy";
import ManageAttribute from "./eretail/masters/ManageAttribute";
import AttributeSet from "./eretail/masters/AttributeSet";
import GenerateVouchers from "./eretail/masters/GenerateVouchers";
import VendorSkuCatalog from "./eretail/masters/VendorSkuCatalog";
import VendorSkuLocCatalog from "./eretail/masters/VendorSkuLocCatalog";
import OrganizationHierarchy from "./eretail/masters/OrganizationHierarchy";
import LocationEnquiry from "./eretail/masters/LocationEnquiry";
import LocationEditor from "./eretail/masters/LocationEditor";
import StoreGroup from "./eretail/masters/StoreGroup";
import SkuImport from "./eretail/masters/SkuImport";
import SkuGroup from "./eretail/masters/SkuGroup";
import OtherMasters from "./eretail/masters/OtherMasters";
import { RecordedSkuEnquiry } from "./eretail/masters/RecordedSkuWorkflows";
import PromotionManagement from "./eretail/masters/PromotionManagement";
import PricingEvents from "./eretail/masters/PricingEvents";
import PriceZoneMaster from "./eretail/masters/PriceZone";
import ExternalApps from "./eretail/masters/ExternalApps";
import OrderRefund from "./eretail/masters/OrderRefund";
import OmsRules from "./eretail/sales/OmsRules";
import MasterOrderEnquiry from "./eretail/sales/MasterOrderEnquiry";
import OrderEnquiry from "./eretail/sales/OrderEnquiry";
import OrderMaintenance from "./eretail/sales/OrderMaintenance";
import MarketOrderView from "./eretail/sales/MarketOrderView";
import KittingOrder from "./eretail/sales/KittingOrder";
import GlobalOrderSearch from "./eretail/sales/GlobalOrderSearch";
import CodReconciliation from "./eretail/sales/CodReconciliation";
import SkuModeration from "./eretail/sales/SkuModeration";
import WmsZone from "./eretail/wms/WmsZone";
import PickerZonePreference from "./eretail/wms/PickerZonePreference";
import BinEnquiry from "./eretail/wms/BinEnquiry";
import BinEditor from "./eretail/wms/BinEditor";
import LottableValidation from "./eretail/wms/LottableValidation";
import ReceiptValidation from "./eretail/wms/ReceiptValidation";
import SkuLabelPrint from "./eretail/wms/SkuLabelPrint";
import PutawayRules from "./eretail/wms/PutawayRules";
import AllocationStrategies from "./eretail/wms/AllocationStrategies";
import CycleCountWave from "./eretail/wms/CycleCountWave";
import ManageAwb from "./eretail/wms/ManageAwb";
import TransporterPreference from "./eretail/wms/TransporterPreference";
import ServicePinCodes from "./eretail/wms/ServicePinCodes";
import TaxCategory from "./eretail/masters/TaxCategory";
import TaxGroup from "./eretail/masters/TaxGroup";
import TaxZone from "./eretail/masters/TaxZone";
import TallyConfiguration from "./eretail/masters/TallyConfiguration";
import AdminModule from "./eretail/admin/AdminModule";
import {
  BackOrderPO,
  OTBManagement,
  POEnquiry,
  PurchaseOrderEditor,
  VendorInvoices,
} from "./eretail/procurement/ProcurementWorkflows";
import {
  ARSExecutionLog,
  ARSRules,
  ARSSettings,
  ARSSkuLocation,
} from "./eretail/procurement/ARSWorkflows";

// Fulfillment modules
import OrderProcessing from "./eretail/modules/OrderProcessing";
import Allocate from "./eretail/modules/Allocate";
import DeliveryShipping from "./eretail/modules/DeliveryShipping";
import BulkUpdate from "./eretail/modules/BulkUpdate";
import ManagePicklist from "./eretail/modules/ManagePicklist";
import ManagePicking from "./eretail/modules/ManagePicking";
import DeliverySplit from "./eretail/modules/DeliverySplit";
import ShipmentReceiving from "./eretail/modules/ShipmentReceiving";
import ShipmentHandover from "./eretail/modules/ShipmentHandover";
import OrderAcknowledgement from "./eretail/modules/OrderAcknowledgement";
import ConsolidateEwb from "./eretail/modules/ConsolidateEwb";
import InboundGatePass from "./eretail/modules/InboundGatePass";
import InboundEnquiry from "./eretail/modules/InboundEnquiry";
import InboundCreateEdit from "./eretail/modules/InboundCreateEdit";
import InboundRealtime from "./eretail/modules/InboundRealtime";
import InboundQC from "./eretail/modules/InboundQC";
import InventoryMoveHistory from "./eretail/modules/InventoryMoveHistory";
import InventoryMove from "./eretail/modules/InventoryMove";
import InventoryMoveScan from "./eretail/modules/InventoryMoveScan";
import CycleCount from "./eretail/modules/CycleCount";
import BinAudit from "./eretail/modules/BinAudit";
import BulkLottables from "./eretail/modules/BulkLottables";
import SortToBox from "./eretail/modules/SortToBox";
import AJIOWorkflow from "./eretail/modules/AJIOWorkflow";
import AmazonMFNWorkflow from "./eretail/modules/AmazonMFNWorkflow";
import VinLister from "./eretail/VinLister";

function P({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <DownloadProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />

            {/* eRetail shell — dashboard landing */}
            <Route
              path="/app/dashboard"
              element={
                <P>
                  <EDashboard />
                </P>
              }
            />
            <Route
              path="/app/control-tower"
              element={
                <P>
                  <ControlTower />
                </P>
              }
            />
            <Route
              path="/app/vin-lister"
              element={
                <P>
                  <VinLister />
                </P>
              }
            />
            <Route
              path="/app/fulfillment"
              element={<Navigate to="/app/dashboard" replace />}
            />

            {/* Generic master screens — every remaining menu item */}
            {[
              "inv-move",
              "inv-move-scan",
              "inv-move-history",
              "intercompany-move",
              "bulk-lottables",
              "stock-adjustment",
              "outbound-gate-pass",
              "outbound-memo",
              "sku-transaction-history",
              "sku-lot-transfer",
            ].map((key) => (
              <Route
                key={key}
                path={`/app/m/${key}`}
                element={
                  <P>
                    <InventoryOperations operation={key} />
                  </P>
                }
              />
            ))}
            <Route path="/app/r/inbound-gate-pass" element={<P><InboundGatePass /></P>} />
            <Route path="/app/r/inbound-enquiry" element={<P><InboundEnquiry /></P>} />
            <Route path="/app/r/inbound-create-edit" element={<P><InboundCreateEdit /></P>} />
            <Route path="/app/r/inbound-realtime" element={<P><InboundRealtime /></P>} />
            <Route path="/app/r/inbound-qc" element={<P><InboundQC /></P>} />
            <Route path="/app/r/inv-move-history" element={<P><InventoryMoveHistory /></P>} />
            <Route path="/app/r/inv-move" element={<P><InventoryMove /></P>} />
            <Route path="/app/r/inv-move-scan" element={<P><InventoryMoveScan /></P>} />
            <Route path="/app/r/cycle-count" element={<P><CycleCount /></P>} />
            <Route path="/app/r/bin-audit" element={<P><BinAudit /></P>} />
            <Route path="/app/r/bulk-lottables" element={<P><BulkLottables /></P>} />
            <Route
              path="/app/r/:key"
              element={
                <P>
                  <ReportRoute />
                </P>
              }
            />

            {/* Fulfillment sub-modules */}
            <Route
              path="/app/fulfillment/order-processing"
              element={
                <P>
                  <OrderProcessing />
                </P>
              }
            />
            <Route
              path="/app/fulfillment/allocate"
              element={
                <P>
                  <Allocate />
                </P>
              }
            />
            <Route
              path="/app/fulfillment/delivery-shipping"
              element={
                <P>
                  <DeliveryShipping />
                </P>
              }
            />
            <Route
              path="/app/fulfillment/bulk-update"
              element={
                <P>
                  <BulkUpdate />
                </P>
              }
            />
            <Route
              path="/app/fulfillment/manage-picklist"
              element={
                <P>
                  <ManagePicklist />
                </P>
              }
            />
            <Route
              path="/app/fulfillment/manage-picking"
              element={
                <P>
                  <ManagePicking />
                </P>
              }
            />
            <Route
              path="/app/fulfillment/delivery-split"
              element={
                <P>
                  <DeliverySplit />
                </P>
              }
            />
            <Route
              path="/app/fulfillment/shipment-handover"
              element={
                <P>
                  <ShipmentHandover />
                </P>
              }
            />
            <Route
              path="/app/fulfillment/shipment-receiving"
              element={
                <P>
                  <ShipmentReceiving />
                </P>
              }
            />
            <Route
              path="/app/fulfillment/order-acknowledgement"
              element={
                <P>
                  <OrderAcknowledgement />
                </P>
              }
            />
            <Route path="/app/fulfillment/consolidate-ewb" element={<P><ConsolidateEwb /></P>} />
            <Route
              path="/app/fulfillment/sort-to-box"
              element={
                <P>
                  <SortToBox />
                </P>
              }
            />
            <Route
              path="/app/fulfillment/ajio"
              element={
                <P>
                  <AJIOWorkflow />
                </P>
              }
            />
            <Route
              path="/app/fulfillment/amazon-mfn"
              element={
                <P>
                  <AmazonMFNWorkflow />
                </P>
              }
            />

            {/* Management pages — now inside the eRetail Shell for a unified theme */}
            <Route
              path="/app"
              element={<Navigate to="/app/dashboard" replace />}
            />
            <Route
              path="/app/sale-orders"
              element={
                <P>
                  <Shell
                    active="sales"
                    breadcrumb="SALES > Order Enquiry"
                    openScreens={[{ label: "Order Enquiry", to: "#" }]}
                  >
                    <SaleOrders />
                  </Shell>
                </P>
              }
            />
            <Route
              path="/app/purchase-orders"
              element={
                <P>
                  <Shell
                    active="procurement"
                    breadcrumb="PROCUREMENT > PO Revision"
                    openScreens={[{ label: "PO Revision", to: "#" }]}
                  >
                    <PurchaseOrders />
                  </Shell>
                </P>
              }
            />
            <Route
              path="/app/grn"
              element={
                <P>
                  <Shell
                    active="wms"
                    breadcrumb="WMS > Inbound Create/Edit"
                    openScreens={[{ label: "Inbound Create/Edit", to: "#" }]}
                  >
                    <GRN />
                  </Shell>
                </P>
              }
            />
            <Route
              path="/app/inventory"
              element={
                <P>
                  <Shell
                    active="wms"
                    breadcrumb="WMS > Inventory View"
                    openScreens={[{ label: "Inventory View", to: "#" }]}
                  >
                    <Inventory />
                  </Shell>
                </P>
              }
            />
            <Route
              path="/app/m/price-zone"
              element={
                <P>
                  <PriceZoneMaster />
                </P>
              }
            />
            <Route path="/app/m/external-apps" element={<P><ExternalApps /></P>} />
            <Route
              path="/app/m/vendor-promotions"
              element={
                <P>
                  <VendorPromotions />
                </P>
              }
            />
            <Route path="/app/m/purchase-charge" element={<P><PurchaseChargeMasters /></P>} />
            <Route
              path="/app/m/location"
              element={<P><LocationEnquiry /></P>}
            />
            <Route path="/app/m/location-create" element={<P><LocationEditor /></P>} />
            <Route path="/app/m/store-group" element={<P><StoreGroup /></P>} />
            <Route path="/app/m/sku-group" element={<P><SkuGroup /></P>} />
            <Route path="/app/m/order-refund" element={<P><OrderRefund /></P>} />
            <Route path="/app/m/oms-rules" element={<P><OmsRules /></P>} />
            <Route path="/app/master-order-enquiry" element={<P><MasterOrderEnquiry /></P>} />
            <Route path="/app/order-enquiry" element={<P><OrderEnquiry /></P>} />
            <Route path="/app/order-maintenance" element={<P><OrderMaintenance /></P>} />
            <Route path="/app/market-order-view" element={<P><MarketOrderView /></P>} />
            <Route path="/app/m/kitting-order" element={<P><KittingOrder /></P>} />
            <Route path="/app/global-order-search" element={<P><GlobalOrderSearch /></P>} />
            <Route path="/app/cod-reconciliation" element={<P><CodReconciliation /></P>} />
            <Route path="/app/sku-moderation" element={<P><SkuModeration /></P>} />
            <Route path="/app/wms/zone" element={<P><WmsZone /></P>} />
            <Route path="/app/wms/picker-zone-preference" element={<P><PickerZonePreference /></P>} />
            <Route path="/app/wms/bin-enquiry" element={<P><BinEnquiry /></P>} />
            <Route path="/app/wms/bin-editor" element={<P><BinEditor /></P>} />
            <Route path="/app/wms/lottable-validation" element={<P><LottableValidation /></P>} />
            <Route path="/app/wms/receipt-validation" element={<P><ReceiptValidation /></P>} />
            <Route path="/app/wms/sku-label-print" element={<P><SkuLabelPrint /></P>} />
            <Route path="/app/wms/putaway-rules" element={<P><PutawayRules /></P>} />
            <Route path="/app/wms/allocation-strategies" element={<P><AllocationStrategies /></P>} />
            <Route path="/app/wms/cycle-count-waves" element={<P><CycleCountWave /></P>} />
            <Route path="/app/wms/manage-awb" element={<P><ManageAwb /></P>} />
            <Route path="/app/wms/transporter-preference" element={<P><TransporterPreference /></P>} />
            <Route path="/app/wms/service-pin-codes" element={<P><ServicePinCodes /></P>} />
            <Route
              path="/app/m/:key"
              element={
                <P>
                  <GenericRoute />
                </P>
              }
            />
            <Route
              path="/app/transfers"
              element={
                <P>
                  <Shell
                    active="returns"
                    breadcrumb="RETURNS & TRANSFERS > STO Order Enquiry"
                    openScreens={[{ label: "STO Order Enquiry", to: "#" }]}
                  >
                    <Transfers />
                  </Shell>
                </P>
              }
            />
            <Route
              path="/app/skus"
              element={
                <P>
                  <Shell
                    active="master"
                    breadcrumb="MASTER > SKU Master"
                    openScreens={[{ label: "SKU Master", to: "#" }]}
                  >
                    <Skus />
                  </Shell>
                </P>
              }
            />
            <Route
              path="/app/partners"
              element={
                <P>
                  <Shell
                    active="master"
                    breadcrumb="MASTER > Trading Partners"
                    openScreens={[{ label: "Trading Partners", to: "#" }]}
                  >
                    <Partners />
                  </Shell>
                </P>
              }
            />
            <Route
              path="/app/returns"
              element={
                <P>
                  <ReturnsModule />
                </P>
              }
            />
            <Route
              path="/app/returns/:screen"
              element={
                <P>
                  <ReturnsModule />
                </P>
              }
            />
            <Route
              path="/app/reports"
              element={
                <P>
                  <Shell
                    active="reports"
                    breadcrumb="REPORTS > Reports & Analytics"
                    openScreens={[{ label: "Reports", to: "#" }]}
                  >
                    <Reports />
                  </Shell>
                </P>
              }
            />
            <Route
              path="/app/legacy-dashboard"
              element={
                <P>
                  <Shell
                    active="dashboard"
                    breadcrumb="DASHBOARD > Classic"
                    openScreens={[{ label: "Classic Dashboard", to: "#" }]}
                  >
                    <Dashboard />
                  </Shell>
                </P>
              }
            />
            <Route
              path="/app/downloads"
              element={
                <P>
                  <Downloads />
                </P>
              }
            />
            <Route
              path="/app/channels"
              element={
                <P>
                  <ManageChannels />
                </P>
              }
            />
            <Route path="/app/sku-channel-listing" element={<P><SkuChannelListing /></P>} />
            <Route
              path="/app/vendors"
              element={
                <P>
                  <VendorMaster />
                </P>
              }
            />
            <Route
              path="/app/customers"
              element={
                <P>
                  <CustomerMaster />
                </P>
              }
            />
            <Route
              path="/app/transporters"
              element={
                <P>
                  <TransporterMaster />
                </P>
              }
            />
            <Route
              path="/app/clients"
              element={
                <P>
                  <ClientMaster />
                </P>
              }
            />
            <Route
              path="/app/customer-groups"
              element={
                <P>
                  <CustomerGroupMaster />
                </P>
              }
            />
            <Route
              path="/app/tax-code"
              element={
                <P>
                  <TaxCode />
                </P>
              }
            />
            <Route
              path="/app/coupons"
              element={
                <P>
                  <ManageCoupons />
                </P>
              }
            />
            <Route
              path="/app/tax-application"
              element={
                <P>
                  <TaxApplication />
                </P>
              }
            />
            <Route
              path="/app/sku-barcode"
              element={
                <P>
                  <SkuBarcode />
                </P>
              }
            />
            <Route
              path="/app/sku-company-link"
              element={
                <P>
                  <SkuCompanyLink />
                </P>
              }
            />
            <Route
              path="/app/m/merch-hierarchy"
              element={
                <P>
                  <MerchandisingHierarchy />
                </P>
              }
            />
            <Route
              path="/app/m/manage-attribute"
              element={
                <P>
                  <ManageAttribute />
                </P>
              }
            />
            <Route
              path="/app/m/attribute-set"
              element={
                <P>
                  <AttributeSet />
                </P>
              }
            />
            <Route
              path="/app/m/vouchers"
              element={
                <P>
                  <GenerateVouchers />
                </P>
              }
            />
            <Route
              path="/app/m/vendor-sku-catalog"
              element={
                <P>
                  <VendorSkuCatalog />
                </P>
              }
            />
            <Route
              path="/app/m/vendor-sku-loc-catalog"
              element={
                <P>
                  <VendorSkuLocCatalog />
                </P>
              }
            />
            <Route
              path="/app/m/org-hierarchy"
              element={
                <P>
                  <OrganizationHierarchy />
                </P>
              }
            />
            <Route
              path="/app/m/other-masters"
              element={
                <P>
                  <OtherMasters />
                </P>
              }
            />
            <Route
              path="/app/sku-enquiry"
              element={
                <P>
                  <RecordedSkuEnquiry />
                </P>
              }
            />
            <Route
              path="/app/sku-import"
              element={
                <P>
                  <SkuImport />
                </P>
              }
            />
            <Route
              path="/app/promotions"
              element={
                <P>
                  <PromotionManagement />
                </P>
              }
            />
            <Route
              path="/app/pricing-events"
              element={
                <P>
                  <PricingEvents />
                </P>
              }
            />
            <Route
              path="/app/tax-categories"
              element={
                <P>
                  <TaxCategory />
                </P>
              }
            />
            <Route
              path="/app/tax-groups"
              element={
                <P>
                  <TaxGroup />
                </P>
              }
            />
            <Route
              path="/app/tax-zones"
              element={
                <P>
                  <TaxZone />
                </P>
              }
            />
            <Route
              path="/app/tally-configuration"
              element={
                <P>
                  <TallyConfiguration />
                </P>
              }
            />
            <Route
              path="/app/procurement/category-buyers"
              element={
                <P>
                  <CategoryBuyers />
                </P>
              }
            />
            <Route
              path="/app/procurement/po-enquiry"
              element={
                <P>
                  <POEnquiry />
                </P>
              }
            />
            <Route
              path="/app/procurement/po/single"
              element={
                <P>
                  <PurchaseOrderEditor mode="Single Location" />
                </P>
              }
            />
            <Route
              path="/app/procurement/po/multiple"
              element={
                <P>
                  <PurchaseOrderEditor mode="Multiple Location" />
                </P>
              }
            />
            <Route
              path="/app/procurement/po/back-orders"
              element={
                <P>
                  <BackOrderPO />
                </P>
              }
            />
            <Route
              path="/app/procurement/vendor-invoices"
              element={
                <P>
                  <VendorInvoices />
                </P>
              }
            />
            <Route
              path="/app/procurement/otb"
              element={
                <P>
                  <OTBManagement />
                </P>
              }
            />
            <Route
              path="/app/procurement/ars/sku-location"
              element={
                <P>
                  <ARSSkuLocation />
                </P>
              }
            />
            <Route
              path="/app/procurement/ars/rules"
              element={
                <P>
                  <ARSRules />
                </P>
              }
            />
            <Route
              path="/app/procurement/ars/logs"
              element={
                <P>
                  <ARSExecutionLog />
                </P>
              }
            />
            <Route
              path="/app/procurement/ars/settings"
              element={
                <P>
                  <ARSSettings />
                </P>
              }
            />
            <Route
              path="/app/admin/:screen"
              element={
                <P>
                  <AdminModule />
                </P>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DownloadProvider>
    </AuthProvider>
  );
}
