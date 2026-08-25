import { useParams, Navigate } from 'react-router-dom';
import GenericModule from './GenericModule';
import { GENERIC_META } from './menuData';

export default function GenericRoute() {
  const { key } = useParams();
  const meta = key ? GENERIC_META[key] : undefined;
  if (!key || !meta) return <Navigate to="/app/dashboard" replace />;
  return (
    <GenericModule
      moduleKey={key}
      title={meta.title}
      breadcrumb={meta.crumb}
      active={meta.active}
      codeLabel={meta.codeLabel}
      nameLabel={meta.nameLabel}
    />
  );
}
