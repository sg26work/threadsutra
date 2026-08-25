// Converts tabular data (columns + rows) into different file formats.
// Used by the global download dialog.

export type ExportData = { columns: string[]; rows: (string | number)[][] };

export type FormatKey = 'csv' | 'excel' | 'json' | 'txt' | 'html' | 'pdf';

export const FORMATS: { key: FormatKey; label: string; ext: string; mime: string; desc: string }[] = [
  { key: 'csv', label: 'CSV', ext: 'csv', mime: 'text/csv', desc: 'Comma-separated values' },
  { key: 'excel', label: 'Excel', ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', desc: 'Microsoft Excel spreadsheet' },
  { key: 'json', label: 'JSON', ext: 'json', mime: 'application/json', desc: 'Structured data' },
  { key: 'txt', label: 'Text', ext: 'txt', mime: 'text/plain', desc: 'Plain tab-delimited text' },
  { key: 'html', label: 'HTML', ext: 'html', mime: 'text/html', desc: 'Web page table' },
  { key: 'pdf', label: 'PDF', ext: 'pdf', mime: 'application/pdf', desc: 'Printable document' },
];

const esc = (v: any) => String(v ?? '');
const csvCell = (v: any) => {
  const s = esc(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildFile(format: FormatKey, title: string, data: ExportData): { content: string; mime: string; ext: string } {
  const meta = FORMATS.find((f) => f.key === format)!;
  const { columns, rows } = data;

  if (format === 'csv') {
    const content = [columns.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n');
    return { content, mime: meta.mime, ext: meta.ext };
  }

  if (format === 'txt') {
    const content = [columns.join('\t'), ...rows.map((r) => r.map(esc).join('\t'))].join('\n');
    return { content, mime: meta.mime, ext: meta.ext };
  }

  if (format === 'json') {
    const objs = rows.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i]])));
    return { content: JSON.stringify(objs, null, 2), mime: meta.mime, ext: meta.ext };
  }

  // Shared HTML table (used by html, excel and pdf)
  const tableHtml = `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px">
    <thead><tr style="background:#2f3b57;color:#fff">${columns.map((c) => `<th align="left">${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  if (format === 'excel') {
    const content = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/></head><body><h3>${esc(title)}</h3>${tableHtml}</body></html>`;
    return { content, mime: meta.mime, ext: meta.ext };
  }

  if (format === 'html') {
    const content = `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)}</title></head><body style="padding:24px"><h2 style="font-family:Arial;border-bottom:2px solid #2f9e9e;padding-bottom:8px">${esc(title)}</h2>${tableHtml}</body></html>`;
    return { content, mime: meta.mime, ext: meta.ext };
  }

  // pdf -> we produce an HTML doc and let the browser "Save as PDF" via print.
  const content = `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)}</title></head><body style="padding:24px"><h2 style="font-family:Arial;border-bottom:2px solid #2f9e9e;padding-bottom:8px">${esc(title)}</h2>${tableHtml}</body></html>`;
  return { content, mime: 'text/html', ext: 'pdf' };
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
