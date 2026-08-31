import Shell from './Shell';

export default function EDashboard() {
  return (
    <Shell active="dashboard" breadcrumb="Dashboard" openScreens={[{ label: 'Dashboard', to: '#' }]}>
      <div
        data-eretail-welcome
        className="-m-4 flex h-[calc(100%+2rem)] min-h-[calc(100%+2rem)] items-center justify-center bg-white text-center text-[48px] leading-[53.5px] text-[#333]"
      >
        Welcome to eRetail
      </div>
    </Shell>
  );
}
