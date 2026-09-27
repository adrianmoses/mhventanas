import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  CauseBars,
  CuadernoHeader,
  EntryList,
  SummaryStats,
  TimeTrendChart,
} from "../cuaderno/components.js";
import { getMonsterPage } from "../cuaderno/hunts.js";

export const Route = createFileRoute("/cuaderno/monstruo/$slug")({
  loader: async ({ params }) => {
    const data = await getMonsterPage({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.monsterName} — Cuaderno de Caza | MH Ventanas` },
          {
            name: "description",
            content: `Historial de cacerías contra ${loaderData.monsterName}: tiempos, desmayos y qué corregir.`,
          },
        ]
      : [],
  }),
  component: MonsterPage,
});

function MonsterPage() {
  const data = Route.useLoaderData();
  return (
    <main className="cuaderno">
      <CuadernoHeader title={data.monsterName} isOwner={data.isOwner} back />
      <SummaryStats summary={data.summary} filtered={false} />
      {data.trend ? (
        <TimeTrendChart monsterName={data.monsterName} trend={data.trend} />
      ) : (
        <p className="cz-empty">
          La gráfica de tiempos aparece con al menos dos cacerías completadas con tiempo.
        </p>
      )}
      <CauseBars causes={data.causes} count={data.summary.count} />
      <section>
        <div className="cz-sec-head">
          <h2>Entradas</h2>
        </div>
        <EntryList entries={data.entries} isOwner={data.isOwner} />
      </section>
    </main>
  );
}
