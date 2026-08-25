// Reports — matched 1:1 to the reference eRetail Reports menu.
// Groups: Inbound, Finance, Outbound, Inventory, Sales & Return, Miscellaneous.
export type ReportMeta = { key: string; title: string; crumb: string; group: string };

export const REPORT_META: Record<string, ReportMeta> = {
  // Inbound
  'gr-register': { key: 'gr-register', title: 'GR Register', crumb: 'REPORTS > Inbound > GR Register', group: 'Inbound' },
  'po-report': { key: 'po-report', title: 'PO Report', crumb: 'REPORTS > Inbound > PO Report', group: 'Inbound' },
  'inbound-qc-report': { key: 'inbound-qc-report', title: 'Inbound QC Report', crumb: 'REPORTS > Inbound > Inbound QC Report', group: 'Inbound' },
  // Finance
  'sales-register': { key: 'sales-register', title: 'Sales Register', crumb: 'REPORTS > Finance > Sales Register', group: 'Finance' },
  'purchase-register': { key: 'purchase-register', title: 'Purchase Register', crumb: 'REPORTS > Finance > Purchase Register', group: 'Finance' },
  'sales-return-register': { key: 'sales-return-register', title: 'Sales Return Register', crumb: 'REPORTS > Finance > Sales Return Register', group: 'Finance' },
  // Outbound
  'shipping-label': { key: 'shipping-label', title: 'Ship Label/Delivery Challan', crumb: 'REPORTS > Outbound > Ship Label/Delivery Challan', group: 'Outbound' },
  'invoice-report': { key: 'invoice-report', title: 'Invoice', crumb: 'REPORTS > Outbound > Invoice', group: 'Outbound' },
  'manifest-report': { key: 'manifest-report', title: 'Manifest Report', crumb: 'REPORTS > Outbound > Manifest Report', group: 'Outbound' },
  'dispatch-report': { key: 'dispatch-report', title: 'Dispatch Report', crumb: 'REPORTS > Outbound > Dispatch Report', group: 'Outbound' },
  // Inventory
  'fin-inv-sku': { key: 'fin-inv-sku', title: 'Fin Inv Report - By SKU', crumb: 'REPORTS > Inventory > Fin Inv Report - By SKU', group: 'Inventory' },
  'fin-inv-sku-bin': { key: 'fin-inv-sku-bin', title: 'Fin Inv Report - By SKU BIN', crumb: 'REPORTS > Inventory > Fin Inv Report - By SKU BIN', group: 'Inventory' },
  'inventory-ageing': { key: 'inventory-ageing', title: 'Inventory Ageing', crumb: 'REPORTS > Inventory > Inventory Ageing', group: 'Inventory' },
  'inventory-ledger': { key: 'inventory-ledger', title: 'Inventory Ledger', crumb: 'REPORTS > Inventory > Inventory Ledger', group: 'Inventory' },
  // Sales & Return
  'sales-report': { key: 'sales-report', title: 'Sales Report', crumb: 'REPORTS > Sales & Return > Sales Report', group: 'Sales & Return' },
  'sku-wise-sales': { key: 'sku-wise-sales', title: 'SKU Wise Sales Report', crumb: 'REPORTS > Sales & Return > SKU Wise Sales Report', group: 'Sales & Return' },
  'order-life-cycle': { key: 'order-life-cycle', title: 'Order Life Cycle', crumb: 'REPORTS > Sales & Return > Order Life Cycle', group: 'Sales & Return' },
  // Miscellaneous
  'mis-report': { key: 'mis-report', title: 'MIS reports', crumb: 'REPORTS > Miscellaneous > MIS reports', group: 'Miscellaneous' },
  'pick-pack-report': { key: 'pick-pack-report', title: 'Pick Pack Report', crumb: 'REPORTS > Miscellaneous > Pick Pack Report', group: 'Miscellaneous' },
  'order-unallocation': { key: 'order-unallocation', title: 'Order Unallocation Log', crumb: 'REPORTS > Miscellaneous > Order Unallocation Log', group: 'Miscellaneous' },
  'mis-report-2': { key: 'mis-report-2', title: 'MIS Report 2.0', crumb: 'REPORTS > Miscellaneous > MIS Report 2.0', group: 'Miscellaneous' },
};
