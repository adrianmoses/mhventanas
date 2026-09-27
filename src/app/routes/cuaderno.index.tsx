import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CauseBars,
  CuadernoHeader,
  EntryList,
  GoalsPanel,
  MonsterTable,
  SummaryStats,
} from "../cuaderno/components.js";
import { getHub } from "../cuaderno/hunts.js";
import { HUNT_WEAPON_LABELS } from "../cuaderno/labels.js";

type HubSearch = { monstruo?: string; arma?: string; q?: string; abierta?: number };

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export const Route = createFileRoute("/cuaderno/")({
  validateSearch: (s: Record<string, unknown>): HubSearch => ({
    monstruo: str(s.monstruo),
    arma: str(s.arma),
    q: str(s.q),
    abierta: Number.isSafeInteger(Number(s.abierta)) && Number(s.abierta) > 0
      ? Number(s.abierta)
      : undefined,
  }),
  loaderDeps: ({ search }) => ({ monstruo: search.monstruo, arma: search.arma, q: search.q }),
  loader: ({ deps }) =>
    getHub({ data: { monster: deps.monstruo, weapon: deps.arma, q: deps.q } }),
  head: () => ({
    meta: [
      { title: "Cuaderno de Caza | MH Ventanas" },
      {
        name: "description",
        content:
          "Registro de cacerías de Monster Hunter: qué me golpea, mejores tiempos y qué corregir la próxima vez.",
      },
    ],
  }),
  component: HubPage,
});

function HubPage() {
  const data = Route.useLoaderData();
  const { abierta } = Route.useSearch();
  const filtered = Boolean(data.filters.monster || data.filters.weapon || data.filters.q);

  return (
    <main className="cuaderno">
      <CuadernoHeader
        title="Cuaderno de Caza"
        intro="Anota cada cacería al terminar. El cuaderno cuenta qué te golpea más, cuáles son tus mejores tiempos y qué quieres corregir la próxima vez."
        isOwner={data.isOwner}
      />

      <SummaryStats summary={data.summary} filtered={filtered} />

      <div className="cz-insights">
        <GoalsPanel goals={data.goals} />
        <CauseBars causes={data.causes} count={data.summary.count} />
      </div>

      <section>
        <div className="cz-sec-head">
          <h2>Por monstruo</h2>
          <span className="cz-hint">Pulsa una fila para ver su historial</span>
        </div>
        <MonsterTable rows={data.monsterRows} />
      </section>

      <section>
        <div className="cz-sec-head">
          <h2>Entradas</h2>
        </div>
        <Filters
          monsters={data.filterOptions.monsters}
          weapons={data.filterOptions.weapons}
        />
        <EntryList
          entries={data.entries}
          isOwner={data.isOwner}
          openId={abierta}
          emptyText={
            data.total ? "Ninguna entrada coincide con los filtros." : "Sin cacerías todavía."
          }
        />
      </section>
    </main>
  );
}

/** Filters live in the URL so filtered views are linkable and SSR-rendered. */
function Filters({
  monsters,
  weapons,
}: {
  monsters: { slug: string; name: string }[];
  weapons: (keyof typeof HUNT_WEAPON_LABELS)[];
}) {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/cuaderno/" });
  const [q, setQ] = useState(search.q ?? "");

  const set = (patch: Partial<HubSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, abierta: undefined }), replace: true });

  // Debounce free-text search into the URL.
  useEffect(() => {
    if ((search.q ?? "") === q) return;
    const t = setTimeout(() => set({ q: q.trim() || undefined }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    // GET form so filtering also works before hydration / without JS.
    <form className="cz-filters" method="get" action="/cuaderno" onSubmit={(e) => e.preventDefault()}>
      <label className="cz-f">
        Monstruo
        <select
          name="monstruo"
          value={search.monstruo ?? ""}
          onChange={(e) => set({ monstruo: e.target.value || undefined })}
        >
          <option value="">Todos</option>
          {monsters.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className="cz-f">
        Arma
        <select
          name="arma"
          value={search.arma ?? ""}
          onChange={(e) => set({ arma: e.target.value || undefined })}
        >
          <option value="">Todas</option>
          {weapons.map((w) => (
            <option key={w} value={w}>
              {HUNT_WEAPON_LABELS[w]}
            </option>
          ))}
        </select>
      </label>
      <label className="cz-f">
        Buscar
        <input
          name="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="picado, veneno, trampa…"
        />
      </label>
    </form>
  );
}
