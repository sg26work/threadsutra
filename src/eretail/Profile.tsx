import Shell from './Shell';

const sections = [
  ['Basic Information', ['Seller Code', 'Contact Name', 'Seller Name', 'Mobile No', 'Business Name', 'Mobile Verified', 'Email Verified', 'Seller Rating', 'CST/VAT/TIN No', 'Email Address']],
  ['Bank Details', ['Bank Name', 'Branch Address', 'Bank Account', 'Branch Name', 'IFSC Code']],
  ['Seller Configuration Details', ['Default Delivery Mode', 'Is Return Allowed', 'Tax Zone', 'Return Days', 'Invoice Type']],
] as const;

export default function Profile() {
  return <Shell active="" breadcrumb="Profile" openScreens={[{ label: 'Profile', to: '#' }]}>
    <div className="border bg-white text-xs text-[#444]">
      <div className="flex h-[42px] items-center border-b px-4"><b className="text-sm">Profile</b><span className="ml-auto text-[#3c8dbc]">Home&nbsp;&nbsp;&nbsp; Profile</span></div>
      <div className="p-4">{sections.map(([title, labels]) => <section key={title} className="mb-4"><h2 className="border-b bg-slate-50 px-3 py-2 text-sm font-semibold">{title}</h2><div className="grid grid-cols-2 gap-x-16 px-5 py-3">{labels.map((label) => <div key={label} className="grid min-h-[30px] grid-cols-[180px_1fr] items-center border-b border-slate-100"><b>{label}</b><span /></div>)}</div></section>)}</div>
    </div>
  </Shell>;
}
