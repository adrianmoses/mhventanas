import { Link, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { loadMonsterIndex } from "../loaders/queries.js";
import type { MonsterIndexEntry } from "../loaders/queries.js";

// Server-only: the DB query runs on the server during SSR and over RPC on client
// navigations, so the postgres client never reaches the browser bundle.
const getMonsterIndex = createServerFn({ method: "GET" }).handler(() =>
  loadMonsterIndex(),
);

export const Route = createFileRoute("/")({
  loader: (): Promise<MonsterIndexEntry[]> => getMonsterIndex(),
  head: () => ({
    meta: [{ title: "MH Ventanas — Guías de ventanas de castigo" }],
  }),
  component: Home,
});

function Home() {
  const monsters: MonsterIndexEntry[] = Route.useLoaderData();

  return (
    <main className="page">
      <h1>MH Ventanas</h1>
      <p>
        Guías de Monster Hunter en español centradas en las{" "}
        <strong>ventanas de castigo</strong>: cuándo y cómo atacar a cada
        monstruo de forma segura.
      </p>

      {monsters.length > 0 ? (
        <ul className="monster-index">
          {monsters.map((m) => (
            <li key={`${m.game}/${m.slug}`}>
              <Link
                to="/guias/$game/$monster"
                params={{ game: m.game, monster: m.slug }}
              >
                {m.name}
              </Link>
              <span className="monster-index__game">{m.game}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>Aún no hay guías disponibles.</p>
      )}
    </main>
  );
}
