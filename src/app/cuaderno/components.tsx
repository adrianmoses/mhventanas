import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { formatDate, formatDecimal, formatTime } from "./format.js";
import { logout } from "./auth.js";
import { deleteHunt } from "./hunts.js";
import {
  HUNT_CAUSE_LABELS,
  HUNT_RANK_LABELS,
  HUNT_RESULT_LABELS,
  HUNT_WEAPON_LABELS,
} from "./labels.js";
import type {
  CauseCount,
  Goal,
  Hunt,
  MonsterRow,
  Summary,
  Trend,
} from "./stats.js";

export function SummaryStats({
  summary,
  filtered,
}: {
  summary: Summary;
  filtered: boolean;
}) {
  const stats: [string, string][] = [
    [String(summary.count), filtered ? "cacerías (filtradas)" : "cacerías"],
    [summary.completedPct == null ? "—" : `${summary.completedPct}%`, "completadas"],
    [formatTime(summary.avgTime), "tiempo medio"],
    [summary.avgCarts == null ? "—" : formatDecimal(summary.avgCarts), "desmayos por caza"],
  ];
  return (
    <div className="cz-summary">
      {stats.map(([value, label]) => (
        <div className="cz-stat" key={label}>
          <span className="cz-stat__v">{value}</span>
          <span className="cz-stat__l">{label}</span>
        </div>
      ))}
    </div>
  );
}

export function GoalsPanel({ goals }: { goals: Goal[] }) {
  return (
    <section className="cz-panel">
      <h2>Objetivos pendientes</h2>
      {goals.length ? (
        <div className="cz-goals">
          {goals.map((g) => (
            <div className="cz-goal" key={g.monsterSlug}>
              <Link
                className="cz-goal__m"
                to="/cuaderno/monstruo/$slug"
                params={{ slug: g.monsterSlug }}
              >
                {g.monsterName}
              </Link>
              <div>{g.nextGoal}</div>
              <div className="cz-goal__t">
                {formatDate(g.huntedOn)} · {HUNT_WEAPON_LABELS[g.weapon]}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="cz-empty">
          Cuando rellenes “Objetivo para la próxima vez”, aparecerá aquí.
        </p>
      )}
    </section>
  );
}

export function CauseBars({ causes, count }: { causes: CauseCount[]; count: number }) {
  const max = causes[0]?.count ?? 1;
  return (
    <section className="cz-panel">
      <h2>Por qué te golpean</h2>
      {causes.length ? (
        <div className="cz-bars">
          {causes.map(({ cause, count: n }) => (
            <div className="cz-bar" key={cause}>
              <span>{HUNT_CAUSE_LABELS[cause]}</span>
              <span className="cz-bar__track">
                <span className="cz-bar__fill" style={{ width: `${(n / max) * 100}%` }} />
              </span>
              <span className="cz-bar__c cz-num">{n}</span>
            </div>
          ))}
          <p className="cz-hint">
            En {count} cacería{count === 1 ? "" : "s"}. La barra más larga es tu patrón
            a corregir.
          </p>
        </div>
      ) : (
        <p className="cz-empty">
          Marca las causas al registrar una cacería para ver tus patrones.
        </p>
      )}
    </section>
  );
}

export function MonsterTable({ rows }: { rows: MonsterRow[] }) {
  const navigate = useNavigate();
  return (
    <div className="cz-scroll">
      <table className="cz-table">
        <thead>
          <tr>
            <th>Monstruo</th>
            <th className="cz-r">Cacerías</th>
            <th className="cz-r">Mejor</th>
            <th className="cz-r">Último</th>
            <th className="cz-r">Desmayos/caza</th>
            <th>Arma habitual</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r) => (
              <tr
                key={r.monsterSlug}
                onClick={() =>
                  navigate({ to: "/cuaderno/monstruo/$slug", params: { slug: r.monsterSlug } })
                }
              >
                <td>
                  <Link to="/cuaderno/monstruo/$slug" params={{ slug: r.monsterSlug }}>
                    {r.monsterName}
                  </Link>
                </td>
                <td className="cz-r cz-num">{r.count}</td>
                <td className="cz-r cz-num">{formatTime(r.best)}</td>
                <td className="cz-r cz-num">{formatTime(r.last)}</td>
                <td className="cz-r cz-num">{formatDecimal(r.avgCarts)}</td>
                <td>{HUNT_WEAPON_LABELS[r.weapon]}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="cz-empty">
                Sin cacerías todavía.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Clear-time line chart (inline SVG, as in the mockup). */
export function TimeTrendChart({ monsterName, trend }: { monsterName: string; trend: Trend }) {
  const pts = trend.points;
  const W = 640, H = 180, L = 46, R = 16, T = 14, B = 30;
  const ts = pts.map((p) => p.timeSeconds);
  const lo = Math.floor(Math.min(...ts) / 60) * 60;
  let hi = Math.ceil(Math.max(...ts) / 60) * 60;
  if (hi === lo) hi = lo + 60;
  const step = Math.max(60, Math.ceil((hi - lo) / 4 / 60) * 60);
  const x = (i: number) => L + (i * (W - L - R)) / (pts.length - 1);
  const y = (t: number) => T + ((hi - t) / (hi - lo)) * (H - T - B);
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += step) ticks.push(t);
  const line = pts.map((p, i) => `${x(i)},${y(p.timeSeconds)}`).join(" ");
  const area = `${x(0)},${H - B} ${line} ${x(pts.length - 1)},${H - B}`;
  const d = trend.delta;
  const last = pts.length - 1;
  const shortDate = (iso: string) => formatDate(iso).split("/").slice(0, 2).join("/");

  return (
    <div className="cz-chart">
      <div className="cz-sec-head">
        <h3>{monsterName}: tiempo de caza</h3>
        <span className="cz-hint">
          {d < 0
            ? `${formatTime(-d)} más rápido que tu primera caza`
            : d > 0
              ? `${formatTime(d)} más lento que tu primera caza`
              : "igual que tu primera caza"}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Evolución del tiempo de caza de ${monsterName}`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--border)" />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" className="cz-chart__label">
              {formatTime(t)}
            </text>
          </g>
        ))}
        <polygon points={area} fill="var(--accent)" opacity={0.12} />
        <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth={2} />
        {pts.map((p, i) => (
          <circle
            key={p.huntId}
            cx={x(i)}
            cy={y(p.timeSeconds)}
            r={i === last ? 5 : 3.5}
            fill={i === last ? "var(--accent)" : "var(--surface)"}
            stroke="var(--accent)"
            strokeWidth={2}
          >
            <title>
              {formatDate(p.huntedOn)} · {formatTime(p.timeSeconds)} · {p.carts} desmayo(s)
            </title>
          </circle>
        ))}
        {pts.map((p, i) =>
          i === 0 || i === last || pts.length <= 6 ? (
            <text
              key={p.huntId}
              x={x(i)}
              y={H - 10}
              textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}
              className="cz-chart__label"
            >
              {shortDate(p.huntedOn)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

export function EntryList({
  entries,
  isOwner,
  openId,
  emptyText = "Ninguna entrada coincide con los filtros.",
}: {
  entries: Hunt[];
  isOwner: boolean;
  openId?: number;
  emptyText?: string;
}) {
  if (!entries.length) return <p className="cz-empty">{emptyText}</p>;
  return (
    <div className="cz-entries">
      {entries.map((h) => (
        <EntryCard key={h.id} hunt={h} isOwner={isOwner} defaultOpen={h.id === openId} />
      ))}
    </div>
  );
}

function Carts({ n }: { n: number }) {
  return (
    <span className="cz-carts" title={`${n} desmayo(s)`} aria-label={`${n} desmayo(s)`}>
      {[0, 1, 2].map((i) => (
        <i key={i} className={i < n ? "on" : ""} />
      ))}
    </span>
  );
}

/** A hunt entry. <details> so it expands without JS and before hydration. */
function EntryCard({
  hunt: h,
  isOwner,
  defaultOpen,
}: {
  hunt: Hunt;
  isOwner: boolean;
  defaultOpen: boolean;
}) {
  const fields: [string, string | null][] = [
    ["Build", h.build],
    ["Me golpeó", h.hits],
    ["Desmayo", h.cartCause],
    ["Señales y aperturas", h.learned],
    ["Debilidades y partes", h.weaknesses],
    ["Faltó", h.missingItems],
    ["Comida y trampas", h.prep],
    ["Bien", h.wentWell],
    ["Error principal", h.mainError],
  ];
  return (
    <details className="cz-entry" id={`caza-${h.id}`} open={defaultOpen}>
      <summary className="cz-entry__head">
        <span className="cz-entry__mon">{h.monsterName}</span>
        <span className="cz-entry__meta">
          {HUNT_RANK_LABELS[h.rank]}
          {h.variant ? ` · ${h.variant}` : ""} · {HUNT_WEAPON_LABELS[h.weapon]} ·{" "}
          {formatDate(h.huntedOn)}
        </span>
        <span className="cz-entry__right">
          <span className="cz-num">{formatTime(h.timeSeconds)}</span>
          <Carts n={h.carts} />
          <span className={`cz-pill cz-pill--${h.result}`}>{HUNT_RESULT_LABELS[h.result]}</span>
        </span>
      </summary>
      <div className="cz-entry__body">
        {h.nextGoal ? (
          <div className="cz-next">
            <b>Próxima vez:</b> {h.nextGoal}
          </div>
        ) : null}
        {h.causes.length ? (
          <div className="cz-tags">
            {h.causes.map((c) => (
              <span className="cz-tag" key={c}>
                {HUNT_CAUSE_LABELS[c]}
              </span>
            ))}
          </div>
        ) : null}
        <dl className="cz-dl">
          {fields.map(([label, value]) =>
            value ? (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ) : null,
          )}
        </dl>
        {isOwner ? <OwnerActions id={h.id} /> : null}
      </div>
    </details>
  );
}

function OwnerActions({ id }: { id: number }) {
  const router = useRouter();
  const del = useServerFn(deleteHunt);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  if (confirming) {
    return (
      <div className="cz-row-actions">
        <span>¿Borrar esta cacería?</span>
        <button
          type="button"
          className="cz-btn-danger"
          onClick={async () => {
            try {
              await del({ data: { id } });
              await router.invalidate();
            } catch {
              setError("No se pudo borrar. Inténtalo otra vez.");
            }
          }}
        >
          Borrar
        </button>
        <button type="button" className="cz-btn-ghost" onClick={() => setConfirming(false)}>
          Cancelar
        </button>
        <span className="cz-hint" role="status">
          {error}
        </span>
      </div>
    );
  }
  return (
    <div className="cz-row-actions">
      <Link className="cz-btn-ghost" to="/cuaderno/$id/editar" params={{ id: String(id) }}>
        Editar
      </Link>
      <Link className="cz-btn-ghost" to="/cuaderno/nueva" search={{ repetir: id }}>
        Repetir contra este monstruo
      </Link>
      <button type="button" className="cz-btn-ghost" onClick={() => setConfirming(true)}>
        Borrar
      </button>
    </div>
  );
}

/**
 * Page header shared by the cuaderno pages. Omit `isOwner` (the form pages) to
 * hide the actions. Visitors get "+ Registrar cacería" too — it goes through the
 * login page — plus an "Entrar" link that returns them to the current page.
 */
export function CuadernoHeader({
  title,
  intro,
  isOwner,
  back,
}: {
  title: string;
  intro?: string;
  isOwner?: boolean;
  back?: boolean;
}) {
  return (
    <header className="cz-top">
      <div>
        <div className="cz-eyebrow">
          {back ? <Link to="/cuaderno">Cuaderno de Caza</Link> : "Monster Hunter · registro personal"}
        </div>
        <h1>{title}</h1>
        {intro ? <p>{intro}</p> : null}
      </div>
      {isOwner === undefined ? null : (
        <div className="cz-row-actions">
          <Link className="cz-btn" to="/cuaderno/nueva">
            + Registrar cacería
          </Link>
          {isOwner ? <LogoutButton /> : <LoginLink />}
        </div>
      )}
    </header>
  );
}

function LoginLink() {
  const here = useLocation({ select: (l) => l.href });
  return (
    <Link className="cz-btn-ghost" to="/cuaderno/entrar" search={{ next: here }}>
      Entrar
    </Link>
  );
}

function LogoutButton() {
  const router = useRouter();
  const out = useServerFn(logout);
  return (
    <button
      type="button"
      className="cz-btn-ghost"
      onClick={async () => {
        await out();
        await router.invalidate();
      }}
    >
      Salir
    </button>
  );
}
