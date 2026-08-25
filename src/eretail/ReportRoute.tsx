import { useParams, Navigate } from 'react-router-dom';
import ReportScreen from './ReportScreen';
import { REPORT_META } from './reportsMeta';

export default function ReportRoute() {
  const { key } = useParams();
  const meta = key ? REPORT_META[key] : undefined;
  if (!key || !meta) return <Navigate to="/app/reports" replace />;
  return <ReportScreen reportKey={meta.key} title={meta.title} crumb={meta.crumb} />;
}
