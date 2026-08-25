// Field schemas for each Master screen. Drives dynamic forms, grid columns,
// validations and dropdowns so every master has its real domain fields
// (not a generic 4-field placeholder).

export type FieldType = 'text' | 'number' | 'select' | 'date' | 'textarea' | 'email' | 'checkbox';
export type MField = {
  key: string;            // stored under `extra.<key>` (or base for code/name/description/status)
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];     // for select
  base?: boolean;         // maps to a base column (code/name/description/status)
  col?: boolean;          // show as a grid column
  default?: string | number;
  placeholder?: string;
  min?: number;
  help?: string;
};

export type MasterSchema = {
  codeLabel: string;
  nameLabel: string;
  fields: MField[];
  // downstream note shown on the screen
  usedBy?: string;
};

const STATUS: MField = { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], base: true, col: true, default: 'Active' };

// Reusable groups
const codeName = (codeLabel: string, nameLabel: string): MField[] => ([
  { key: 'code', label: codeLabel, type: 'text', required: true, base: true, col: true },
  { key: 'name', label: nameLabel, type: 'text', required: true, base: true, col: true },
]);

export const MASTER_SCHEMAS: Record<string, MasterSchema> = {
  'vendor-promotions': {
    codeLabel: 'Disc Key', nameLabel: 'Promotion Name',
    usedBy: 'Purchase Orders, Vendor invoices and procurement reporting',
    fields: [
      ...codeName('Disc Key', 'Promotion Name'),
      { key: 'vendor_code', label: 'Vendor Code', type: 'text', col: true, required: true },
      { key: 'promo_type', label: 'Promo Type', type: 'select', options: ['Line Discount'], col: true, required: true, default: 'Line Discount' },
      { key: 'promotion_code', label: 'Promotion Code', type: 'text', col: true, required: true },
      { key: 'start_date', label: 'Start Date', type: 'date', col: true, required: true },
      { key: 'end_date', label: 'End Date', type: 'date', col: true, required: true },
      STATUS,
    ],
  },
  'purchase-charge': {
    codeLabel: 'Charge Code', nameLabel: 'Charge Name',
    usedBy: 'Purchase Orders, ASN, GRN and purchase register',
    fields: [
      ...codeName('Charge Code', 'Charge Name'),
      { key: 'charge_type', label: 'Charge Type', type: 'select', options: ['Freight', 'Handling', 'Insurance', 'Packaging', 'Other'], col: true, required: true, default: 'Freight' },
      { key: 'calculation_basis', label: 'Calculation Basis', type: 'select', options: ['Flat Amount', 'Percentage', 'Per Unit'], col: true, required: true, default: 'Flat Amount' },
      { key: 'value', label: 'Charge Value', type: 'number', col: true, required: true, default: 0, min: 0 },
      { key: 'tax_code', label: 'Tax Code', type: 'text', col: true },
      { key: 'applicable_on', label: 'Applicable On', type: 'select', options: ['PO', 'ASN', 'GRN', 'All'], default: 'PO' },
      STATUS,
    ],
  },
  'category-buyers': {
    codeLabel: 'Buyer Code', nameLabel: 'Buyer Name',
    usedBy: 'Purchase Orders, PO approvals and category procurement reporting',
    fields: [
      ...codeName('Buyer Code', 'Buyer Name'),
      { key: 'category', label: 'Category', type: 'text', col: true, required: true },
      { key: 'email', label: 'Email', type: 'email', col: true, required: true },
      { key: 'phone', label: 'Phone', type: 'text', col: true },
      { key: 'location', label: 'Location', type: 'text', col: true },
      STATUS,
    ],
  },
  'ars-sku-location': {
    codeLabel: 'SKU Code', nameLabel: 'Location',
    usedBy: 'ARS replenishment, inventory planning and purchase order suggestions',
    fields: [
      ...codeName('SKU Code', 'Location'),
      { key: 'category', label: 'Category', type: 'text', col: true },
      { key: 'brand', label: 'Brand', type: 'text', col: true },
      { key: 'primary_vendor', label: 'Primary Vendor', type: 'text', col: true },
      { key: 'fulfillment_method', label: 'Fulfillment Method', type: 'select', options: ['Warehouse', 'Vendor', 'Drop Ship'], col: true, default: 'Warehouse' },
      { key: 'fulfillment_wh', label: 'Fulfillment WH', type: 'text', col: true },
      { key: 'wh_lead_time', label: 'WH Lead Time (days)', type: 'number', default: 0, min: 0 },
      { key: 'stock_cover_days', label: 'Stock Cover Days', type: 'number', default: 0, min: 0 },
      { key: 'minimum_transfer_qty', label: 'Minimum Transfer Qty', type: 'number', required: true, default: 1, min: 1 },
      { key: 'transfer_unit_factor', label: 'Transfer Unit Factor', type: 'number', required: true, default: 1, min: 1 },
      { key: 'ars_flag', label: 'ARS Flag', type: 'select', options: ['Yes', 'No'], col: true, required: true, default: 'Yes' },
      { key: 'maximum_sku_qty', label: 'Maximum SKU Qty', type: 'number', default: 0, min: 0 },
      STATUS,
    ],
  },
  'ars-rules': {
    codeLabel: 'Rule ID', nameLabel: 'Description',
    usedBy: 'ARS execution, replenishment recommendations and purchase planning',
    fields: [
      ...codeName('Rule ID', 'Description'),
      { key: 'location', label: 'Location', type: 'text', col: true, required: true },
      { key: 'product_set', label: 'Product Set', type: 'text', col: true },
      { key: 'ars_method', label: 'ARS Method', type: 'select', options: ['Min-Max', 'Sales History'], col: true, required: true, default: 'Min-Max' },
      { key: 'frequency', label: 'Frequency', type: 'select', options: ['Never', 'Bimonthly', 'Monthly', 'Biweekly', 'Weekly', 'Daily'], col: true, required: true, default: 'Weekly' },
      { key: 'last_run_date', label: 'Last Run Date', type: 'date', col: true },
      { key: 'next_run_date', label: 'Next Run Date', type: 'date', col: true },
      STATUS,
    ],
  },
  'ars-log': {
    codeLabel: 'Execution ID', nameLabel: 'Rule Name',
    usedBy: 'ARS audit, replenishment monitoring and exception reporting',
    fields: [
      ...codeName('Execution ID', 'Rule Name'),
      { key: 'location', label: 'Location', type: 'text', col: true, required: true },
      { key: 'execution_time', label: 'Exec Time', type: 'date', col: true, required: true },
      { key: 'frequency', label: 'Frequency', type: 'select', options: ['Bimonthly', 'Monthly', 'Biweekly', 'Weekly', 'Daily'], col: true, default: 'Daily' },
      { key: 'vendor_type', label: 'Vendor Type', type: 'select', options: ['Primary', 'Secondary', 'Marketplace'], col: true, default: 'Primary' },
      { key: 'output_type', label: 'Output Type', type: 'select', options: ['Replenishment', 'Transfer', 'Purchase Suggestion'], col: true, default: 'Replenishment' },
      STATUS,
    ],
  },
  // ---------- Tax Management ----------
  'tax-category': {
    codeLabel: 'HSN/SAC Code', nameLabel: 'Description',
    usedBy: 'SKU Master, Tax Code, Invoice & GST calculation',
    fields: [
      ...codeName('HSN/SAC Code', 'Description'),
      { key: 'type', label: 'Type', type: 'select', options: ['HSN (Goods)', 'SAC (Service)'], col: true, default: 'HSN (Goods)', required: true },
      { key: 'gst_rate', label: 'GST Rate (%)', type: 'number', col: true, required: true, min: 0, default: 18 },
      { key: 'cess', label: 'Cess (%)', type: 'number', default: 0, min: 0 },
      STATUS,
    ],
  },
  'tax-code': {
    codeLabel: 'Tax Code', nameLabel: 'Tax Name',
    usedBy: 'Tax Group, SKU Master, Purchase Orders, Invoices',
    fields: [
      ...codeName('Tax Code', 'Tax Name'),
      { key: 'rate', label: 'Rate (%)', type: 'number', col: true, required: true, min: 0, default: 18 },
      { key: 'tax_type', label: 'Tax Type', type: 'select', options: ['GST', 'IGST', 'CGST', 'SGST', 'VAT', 'CESS'], col: true, default: 'GST', required: true },
      { key: 'is_compound', label: 'Compound Tax', type: 'checkbox', default: 0 },
      STATUS,
    ],
  },
  'tax-group': {
    codeLabel: 'Group Code', nameLabel: 'Group Name',
    usedBy: 'SKU Master, Tax Application',
    fields: [
      ...codeName('Group Code', 'Group Name'),
      { key: 'tax_codes', label: 'Tax Codes (comma-sep)', type: 'text', col: true, placeholder: 'CGST9, SGST9' },
      { key: 'total_rate', label: 'Total Rate (%)', type: 'number', col: true, default: 18 },
      STATUS,
    ],
  },
  'tax-zone': {
    codeLabel: 'Zone Code', nameLabel: 'Zone Name',
    usedBy: 'Tax Application, Location Master',
    fields: [
      ...codeName('Zone Code', 'Zone Name'),
      { key: 'states', label: 'States Covered', type: 'textarea', placeholder: 'Delhi, UP, Punjab' },
      { key: 'zone_type', label: 'Zone Type', type: 'select', options: ['Intra-State', 'Inter-State', 'Union Territory', 'Export'], col: true, default: 'Intra-State' },
      STATUS,
    ],
  },
  'tax-application': {
    codeLabel: 'Rule Code', nameLabel: 'Rule Name',
    usedBy: 'Order tax computation, Invoicing',
    fields: [
      ...codeName('Rule Code', 'Rule Name'),
      { key: 'tax_zone', label: 'Tax Zone', type: 'select', options: ['Intra-State', 'Inter-State', 'Union Territory'], col: true, required: true, default: 'Intra-State' },
      { key: 'tax_group', label: 'Applied Tax Group', type: 'text', col: true, placeholder: 'GST18' },
      { key: 'apply_on', label: 'Apply On', type: 'select', options: ['Net Amount', 'Gross Amount', 'MRP'], default: 'Net Amount' },
      STATUS,
    ],
  },
  // ---------- POS Setup ----------
  'coupons': {
    codeLabel: 'Coupon Code', nameLabel: 'Coupon Name',
    usedBy: 'Sales Orders, POS, Channel promotions',
    fields: [
      ...codeName('Coupon Code', 'Coupon Name'),
      { key: 'discount_type', label: 'Discount Type', type: 'select', options: ['Percentage', 'Flat Amount'], col: true, required: true, default: 'Percentage' },
      { key: 'discount_value', label: 'Discount Value', type: 'number', col: true, required: true, min: 0, default: 10 },
      { key: 'min_order', label: 'Min Order Value (₹)', type: 'number', default: 0, min: 0 },
      { key: 'valid_from', label: 'Valid From', type: 'date' },
      { key: 'valid_to', label: 'Valid To', type: 'date' },
      { key: 'usage_limit', label: 'Usage Limit', type: 'number', default: 100, min: 0 },
      STATUS,
    ],
  },
  'voucher-condition': {
    codeLabel: 'Condition Code', nameLabel: 'Condition Name',
    usedBy: 'Generate Vouchers',
    fields: [
      ...codeName('Condition Code', 'Condition Name'),
      { key: 'min_purchase', label: 'Min Purchase (₹)', type: 'number', col: true, default: 999, min: 0 },
      { key: 'applicable_on', label: 'Applicable On', type: 'select', options: ['All SKUs', 'Category', 'Brand', 'Specific SKU'], col: true, default: 'All SKUs' },
      STATUS,
    ],
  },
  'vouchers': {
    codeLabel: 'Voucher Code', nameLabel: 'Voucher Name',
    usedBy: 'POS redemption, Sales Orders',
    fields: [
      ...codeName('Voucher Code', 'Voucher Name'),
      { key: 'face_value', label: 'Face Value (₹)', type: 'number', col: true, required: true, default: 500, min: 0 },
      { key: 'condition', label: 'Voucher Condition', type: 'text', placeholder: 'VC-MIN999' },
      { key: 'expiry', label: 'Expiry Date', type: 'date', col: true },
      { key: 'redeemed', label: 'Redeemed', type: 'checkbox', default: 0, col: true },
      STATUS,
    ],
  },
  // ---------- Trading Partners ----------
  'customer-group': {
    codeLabel: 'Group Code', nameLabel: 'Group Name',
    usedBy: 'Customer Master, Pricing, Promotions',
    fields: [
      ...codeName('Group Code', 'Group Name'),
      { key: 'discount_pct', label: 'Default Discount (%)', type: 'number', col: true, default: 0, min: 0 },
      { key: 'price_list', label: 'Price List', type: 'select', options: ['Retail', 'Wholesale', 'Distributor', 'Corporate'], col: true, default: 'Retail' },
      STATUS,
    ],
  },
  // ---------- SKU Management ----------
  'sku-group': {
    codeLabel: 'SKU Group code', nameLabel: 'SKU Group Name',
    usedBy: 'SKU Master, Merchandising Hierarchy, Reports',
    fields: [
      ...codeName('SKU Group code', 'SKU Group Name'),
      { key: 'sku_count', label: 'No of SKU', type: 'number', col: true, default: 0, min: 0 },
      STATUS,
    ],
  },
  'merch-hierarchy': {
    codeLabel: 'Node Code', nameLabel: 'Node Name',
    usedBy: 'SKU Master, Reporting, Category analytics',
    fields: [
      ...codeName('Node Code', 'Node Name'),
      { key: 'level', label: 'Hierarchy Level', type: 'select', options: ['Division', 'Department', 'Category', 'Sub-Category'], col: true, required: true, default: 'Category' },
      { key: 'parent', label: 'Parent Node', type: 'text', col: true },
      STATUS,
    ],
  },
  'attribute-set': {
    codeLabel: 'Attribute Set Code', nameLabel: 'Attribute Set Name',
    usedBy: 'SKU creation, SKU import and marketplace catalog mapping',
    fields: [
      ...codeName('Attribute Set Code', 'Attribute Set Name'),
      { key: 'category', label: 'Category', type: 'text', col: true, required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      STATUS,
    ],
  },
  'vendor-sku-catalog': {
    codeLabel: 'Vendor SKU Code', nameLabel: 'SKU Code',
    usedBy: 'Vendor purchasing, purchase orders and replenishment',
    fields: [
      ...codeName('Vendor SKU Code', 'SKU Code'),
      { key: 'vendor_code', label: 'Vendor Code', type: 'text', col: true, required: true },
      { key: 'unit_cost', label: 'Unit Cost', type: 'number', col: true, required: true, min: 0, default: 0 },
      { key: 'uom', label: 'UOM', type: 'text', col: true, required: true },
      { key: 'lead_time_days', label: 'Lead Time (Days)', type: 'number', col: true, default: 0, min: 0 },
      STATUS,
    ],
  },
  'vendor-sku-loc-catalog': {
    codeLabel: 'Vendor SKU Code', nameLabel: 'Location',
    usedBy: 'Location procurement, replenishment and purchase orders',
    fields: [
      ...codeName('Vendor SKU Code', 'Location'),
      { key: 'sku_code', label: 'SKU Code', type: 'text', col: true, required: true },
      { key: 'vendor_code', label: 'Vendor Code', type: 'text', col: true, required: true },
      { key: 'unit_cost', label: 'Unit Cost', type: 'number', col: true, min: 0, default: 0 },
      { key: 'lead_time_days', label: 'Lead Time (Days)', type: 'number', col: true, min: 0, default: 0 },
      STATUS,
    ],
  },
  'manage-attribute': {
    codeLabel: 'Attribute Code', nameLabel: 'Attribute Name',
    usedBy: 'SKU Master, Marketplace listing',
    fields: [
      ...codeName('Attribute Code', 'Attribute Name'),
      { key: 'data_type', label: 'Data Type', type: 'select', options: ['Text', 'Number', 'List', 'Boolean'], col: true, required: true, default: 'List' },
      { key: 'values', label: 'Allowed Values', type: 'textarea', placeholder: 'S, M, L, XL' },
      { key: 'mandatory', label: 'Mandatory', type: 'checkbox', default: 0, col: true },
      { key: 'searchable', label: 'Searchable', type: 'checkbox', default: 0, col: true },
      { key: 'sequence', label: 'Sequence', type: 'number', required: true, min: 1, col: true, default: 1 },
      STATUS,
    ],
  },
  'sku-company-link': {
    codeLabel: 'SKU Code', nameLabel: 'MFG SKU Code',
    usedBy: 'Company catalog, marketplace listing and order mapping',
    fields: [
      ...codeName('SKU Code', 'MFG SKU Code'),
      { key: 'company', label: 'Company', type: 'text', col: true, required: true },
      { key: 'location', label: 'Location', type: 'text', col: true, required: true },
      { key: 'operation_mode', label: 'Operation Mode', type: 'select', options: ['Add', 'Remove'], col: true, default: 'Add' },
      { key: 'brand', label: 'Brand', type: 'text', col: true },
      STATUS,
    ],
  },
  'sku-barcode': {
    codeLabel: 'Barcode (EAN)', nameLabel: 'SKU Code',
    usedBy: 'WMS Picking, Receiving, SKU Label Print',
    fields: [
      ...codeName('Barcode (EAN)', 'SKU Code'),
      { key: 'barcode_type', label: 'Barcode Type', type: 'select', options: ['EAN-13', 'UPC-A', 'CODE-128', 'QR'], col: true, default: 'EAN-13' },
      { key: 'uom', label: 'UOM', type: 'select', options: ['PCS', 'PAIR', 'SET', 'BOX'], col: true, default: 'PCS' },
      STATUS,
    ],
  },
  // ---------- Organization ----------
  'location': {
    codeLabel: 'Location Code', nameLabel: 'Location Name',
    usedBy: 'Inventory, WMS, PO, STO, Channels',
    fields: [
      ...codeName('Location Code', 'Location Name'),
      { key: 'shortname', label: 'Short Name', type: 'text', col: true },
      { key: 'loc_type', label: 'Location Type', type: 'select', options: ['Warehouse', 'Store', 'Kiosk', 'Virtual'], col: true, required: true, default: 'Warehouse' },
      { key: 'source_warehouse', label: 'Source Warehouse', type: 'text', col: true },
      { key: 'hierarchy_code', label: 'Hierarchy Code', type: 'text', col: true },
      { key: 'city', label: 'City', type: 'text', col: true },
      { key: 'state', label: 'State', type: 'text' },
      { key: 'gstin', label: 'GSTIN', type: 'text' },
      { key: 'address', label: 'Address', type: 'textarea' },
      STATUS,
    ],
  },
  'org-hierarchy': {
    codeLabel: 'Hierarchy Code', nameLabel: 'Hierarchy Name',
    usedBy: 'Locations, Reporting rollups',
    fields: [
      ...codeName('Hierarchy Code', 'Hierarchy Name'),
      { key: 'hierarchy_type', label: 'Hierarchy Type', type: 'text', col: true, required: true },
      { key: 'description', label: 'Description', type: 'textarea', required: true },
      { key: 'parent_hierarchy_code', label: 'Parent Hierarchy Code', type: 'text', col: true, required: true },
      { key: 'org_country', label: 'Org Country', type: 'text', col: true, required: true },
      { key: 'base_currency', label: 'Base Currency', type: 'text' },
      { key: 'base_language', label: 'Base Language', type: 'text' },
      { key: 'timezone', label: 'Timezone', type: 'text' },
      { key: 'weight_unit', label: 'Org Weight Unit', type: 'text' },
      { key: 'dimension_unit', label: 'Org Dimension Unit', type: 'text' },
      { key: 'financial_start_date', label: 'Financial Start Date', type: 'date' },
      { key: 'locale', label: 'Locale', type: 'text' },
    ],
  },
  'store-group': {
    codeLabel: 'Store Group Code', nameLabel: 'Store Group Name',
    usedBy: 'Allocation rules, Reporting',
    fields: [
      ...codeName('Store Group Code', 'Store Group Name'),
      { key: 'location_count', label: 'No of Locations', type: 'number', col: true, default: 0, min: 0 },
      { key: 'parent_store', label: 'Parent Store', type: 'text', col: true },
      STATUS,
    ],
  },
  // ---------- Miscellaneous ----------
  'pricing-event': {
    codeLabel: 'Event Code', nameLabel: 'Event Name',
    usedBy: 'SKU pricing, Channel price push',
    fields: [
      ...codeName('Event Code', 'Event Name'),
      { key: 'discount_pct', label: 'Discount (%)', type: 'number', col: true, required: true, default: 20, min: 0 },
      { key: 'start_date', label: 'Start Date', type: 'date', col: true },
      { key: 'end_date', label: 'End Date', type: 'date', col: true },
      { key: 'scope', label: 'Scope', type: 'select', options: ['All', 'Category', 'Brand', 'SKU Group'], default: 'All' },
      STATUS,
    ],
  },
  'price-zone': {
    codeLabel: 'Zone Code', nameLabel: 'Zone Name',
    usedBy: 'Location pricing, Channel pricing',
    fields: [
      ...codeName('Zone Code', 'Zone Name'),
      { key: 'tier', label: 'City Tier', type: 'select', options: ['Tier-1', 'Tier-2', 'Tier-3'], col: true, default: 'Tier-1' },
      { key: 'markup', label: 'Markup (%)', type: 'number', col: true, required: true, default: 0, min: 0 },
      STATUS,
    ],
  },
  'order-refund': {
    codeLabel: 'Refund Mode', nameLabel: 'Description',
    usedBy: 'Returns, Payment reconciliation',
    fields: [
      ...codeName('Refund Mode', 'Description'),
      { key: 'gateway', label: 'Gateway', type: 'select', options: ['UPI', 'Bank Transfer', 'Wallet', 'Original Method', 'Store Credit'], col: true, default: 'UPI' },
      { key: 'auto_refund', label: 'Auto Refund', type: 'checkbox', default: 1, col: true },
      STATUS,
    ],
  },
  'sales-rep': {
    codeLabel: 'Rep Code', nameLabel: 'Rep Name',
    usedBy: 'Orders, Commission, Reporting',
    fields: [
      ...codeName('Rep Code', 'Rep Name'),
      { key: 'region', label: 'Region', type: 'select', options: ['North', 'South', 'East', 'West'], col: true, default: 'North' },
      { key: 'phone', label: 'Phone', type: 'text', col: true },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'commission_pct', label: 'Commission (%)', type: 'number', default: 2, min: 0 },
      STATUS,
    ],
  },
  'other-masters': {
    codeLabel: 'Master Code', nameLabel: 'Master Name',
    usedBy: 'Various configuration screens',
    fields: [
      ...codeName('Master Code', 'Master Name'),
      { key: 'category', label: 'Category', type: 'select', options: ['UOM', 'Reason', 'Currency', 'Payment Term'], col: true, default: 'UOM' },
      { key: 'value', label: 'Value', type: 'text', col: true },
      STATUS,
    ],
  },
  'tally-config': {
    codeLabel: 'Config Code', nameLabel: 'Config Name',
    usedBy: 'Finance / Tally sync',
    fields: [
      ...codeName('Config Code', 'Config Name'),
      { key: 'company', label: 'Tally Company', type: 'text', col: true },
      { key: 'ledger', label: 'Default Ledger', type: 'text', col: true },
      { key: 'sync_mode', label: 'Sync Mode', type: 'select', options: ['Manual', 'Scheduled', 'Real-time'], col: true, default: 'Scheduled' },
      STATUS,
    ],
  },
  'external-apps': {
    codeLabel: 'App Code', nameLabel: 'App Name',
    usedBy: 'Integrations, Webhooks',
    fields: [
      ...codeName('App Code', 'App Name'),
      { key: 'app_type', label: 'Type', type: 'select', options: ['Marketplace', 'Payment', 'Logistics', 'ERP', 'Analytics'], col: true, required: true, default: 'Marketplace' },
      { key: 'endpoint', label: 'API Endpoint', type: 'text', required: true, placeholder: 'https://api.example.com' },
      { key: 'sync', label: 'Sync Enabled', type: 'checkbox', default: 1, col: true },
      STATUS,
    ],
  },
  // ---------- Custom ----------
  'consolidate-vendor-return': {
    codeLabel: 'Consolidation No', nameLabel: 'Description',
    usedBy: 'Vendor Returns (RTV)',
    fields: [
      ...codeName('Consolidation No', 'Description'),
      { key: 'vendor', label: 'Vendor', type: 'text', col: true, required: true },
      { key: 'total_qty', label: 'Total Qty', type: 'number', col: true, default: 0, min: 0 },
      STATUS,
    ],
  },
};

// Fallback for any module not explicitly defined
export const DEFAULT_SCHEMA: MasterSchema = {
  codeLabel: 'Code', nameLabel: 'Name',
  fields: [
    { key: 'code', label: 'Code', type: 'text', required: true, base: true, col: true },
    { key: 'name', label: 'Name', type: 'text', required: true, base: true, col: true },
    { key: 'description', label: 'Description', type: 'textarea', base: true },
    STATUS,
  ],
};

export function getSchema(moduleKey: string): MasterSchema {
  return MASTER_SCHEMAS[moduleKey] || DEFAULT_SCHEMA;
}
