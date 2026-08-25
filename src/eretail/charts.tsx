// Lightweight dependency-free charts (bar, line, donut) with click handlers.
type Series = { labels: string[]; values: number[] };

const money = (n: number) => '\u20b9' + Number(n || 0).toLocaleString('en-IN');

export function BarChart({ data, color = '#3b8fc4', onClick, format }: { data: Series; color?: string; onClick?: (label: string, i: number) => void; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.values);
  return (
    <div className="flex h-52 items-end gap-1.5 overflow-x-auto pb-1">
      {data.labels.map((lb, i) => (
        <button key={i} onClick={() => onClick?.(lb, i)} className="group flex min-w-[26px] flex-1 flex-col items-center gap-1" title={`${lb}: ${format ? format(data.values[i]) : data.values[i]}`}>
          <span className="text-[9px] font-semibold text-slate-500 opacity-0 group-hover:opacity-100">{format ? format(data.values[i]) : data.values[i]}</span>
          <div className="flex w-full items-end justify-center" style={{ height: 150 }}>
            <div className="w-full max-w-[34px] rounded-t transition-all group-hover:opacity-80" style={{ height: `${Math.max(2, (data.values[i] / max) * 100)}%`, background: color }} />
          </div>
          <span className="whitespace-nowrap text-[9px] text-slate-400">{lb}</span>
        </button>
      ))}
    </div>
  );
}

export function LineChart({ data, color = '#2f9e9e', onClick, format }: { data: Series; color?: string; onClick?: (label: string, i: number) => void; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.values);
  const W = Math.max(300, data.labels.length * 44), H = 150;
  const pts = data.values.map((v, i) => [ (i / Math.max(1, data.labels.length - 1)) * W, H - (v / max) * (H - 10) ]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return (
    <div className="overflow-x-auto pb-1">
      <svg width={W} height={H + 20} className="min-w-full">
        <path d={`${path} L ${W} ${H} L 0 ${H} Z`} fill={color} opacity="0.12" />
        <path d={path} fill="none" stroke={color} strokeWidth="2" />
        {pts.map((p, i) => (
          <g key={i} className="cursor-pointer" onClick={() => onClick?.(data.labels[i], i)}>
            <circle cx={p[0]} cy={p[1]} r="8" fill="transparent" />
            <circle cx={p[0]} cy={p[1]} r="3" fill={color}><title>{`${data.labels[i]}: ${format ? format(data.values[i]) : data.values[i]}`}</title></circle>
          </g>
        ))}
      </svg>
      <div className="flex gap-1 text-[9px] text-slate-400" style={{ width: W }}>
        {data.labels.map((lb, i) => <span key={i} className="flex-1 text-center">{lb}</span>)}
      </div>
    </div>
  );
}

const DONUT_COLORS = ['#3b8fc4', '#2f9e9e', '#f5a623', '#e05252', '#8e5fd0', '#3aa856', '#ec4899', '#14b8a6', '#f97316'];

export function DonutChart({ data, onClick, money: isMoney }: { data: Series; onClick?: (label: string, i: number) => void; money?: boolean }) {
  const total = data.values.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  const R = 60, C = 2 * Math.PI * R;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width="150" height="150" viewBox="0 0 150 150">
        <g transform="translate(75,75) rotate(-90)">
          {data.values.map((v, i) => {
            const frac = v / total; const dash = frac * C;
            const el = (
              <circle key={i} r={R} fill="none" stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth="24"
                strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-acc * C} className="cursor-pointer transition-opacity hover:opacity-80"
                onClick={() => onClick?.(data.labels[i], i)}><title>{`${data.labels[i]}: ${v}`}</title></circle>
            );
            acc += frac; return el;
          })}
          <circle r="36" fill="#fff" />
        </g>
        <text x="75" y="72" textAnchor="middle" className="fill-slate-700 text-lg font-bold">{isMoney ? money(total) : total}</text>
        <text x="75" y="88" textAnchor="middle" className="fill-slate-400 text-[9px]">Total</text>
      </svg>
      <div className="space-y-1 text-xs">
        {data.labels.map((lb, i) => (
          <button key={i} onClick={() => onClick?.(lb, i)} className="flex items-center gap-2 hover:underline">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="text-slate-600">{lb}</span>
            <span className="font-semibold text-slate-700">{data.values[i]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function DualLineChart({ labels, a, b, colorA = '#f5a623', colorB = '#e05252', labelA = 'Pending', labelB = 'Failed', onClick }: { labels: string[]; a: number[]; b: number[]; colorA?: string; colorB?: string; labelA?: string; labelB?: string; onClick?: (label: string, i: number) => void }) {
  const max = Math.max(1, ...a, ...b);
  const W = Math.max(300, labels.length * 44), H = 150;
  const mk = (vals: number[]) => vals.map((v, i) => [(i / Math.max(1, labels.length - 1)) * W, H - (v / max) * (H - 10)]);
  const pa = mk(a), pb = mk(b);
  const toPath = (p: number[][]) => p.map((pt, i) => (i ? 'L' : 'M') + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1)).join(' ');
  return (
    <div>
      <div className="mb-1 flex gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="h-2 w-3 rounded" style={{ background: colorA }} />{labelA}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-3 rounded" style={{ background: colorB }} />{labelB}</span>
      </div>
      <div className="overflow-x-auto">
        <svg width={W} height={H + 20} className="min-w-full">
          <path d={toPath(pa)} fill="none" stroke={colorA} strokeWidth="2" />
          <path d={toPath(pb)} fill="none" stroke={colorB} strokeWidth="2" />
          {pa.map((p, i) => <circle key={'a' + i} cx={p[0]} cy={p[1]} r="3" fill={colorA} className="cursor-pointer" onClick={() => onClick?.(labels[i], i)}><title>{`${labels[i]} ${labelA}: ${a[i]}`}</title></circle>)}
          {pb.map((p, i) => <circle key={'b' + i} cx={p[0]} cy={p[1]} r="3" fill={colorB} className="cursor-pointer" onClick={() => onClick?.(labels[i], i)}><title>{`${labels[i]} ${labelB}: ${b[i]}`}</title></circle>)}
        </svg>
        <div className="flex gap-1 text-[9px] text-slate-400" style={{ width: W }}>
          {labels.map((lb, i) => <span key={i} className="flex-1 text-center">{lb}</span>)}
        </div>
      </div>
    </div>
  );
}
