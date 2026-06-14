import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { loadGeneralData } from "../loaders/queries.js";
import type { GeneralData } from "../loaders/queries.js";
import { runMdx } from "../mdx/run-content.js";
import { mdxComponents } from "../mdx/components.js";
import { ClipMapContext } from "../mdx/Clip.js";
import { WEAPON_LABELS } from "../weapons.js";

// Server-only: the DB query runs on the server during SSR and over RPC on client
// navigations, so the postgres client never reaches the browser bundle.
const getGeneral = createServerFn({ method: "GET" })
  .validator((data: { game: string; monster: string }) => data)
  .handler(({ data }) => loadGeneralData(data));

export const Route = createFileRoute("/guias/$game/$monster")({
  loader: async ({ params }): Promise<GeneralData> => {
    const data = await getGeneral({
      data: { game: params.game, monster: params.monster },
    });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.monster.name} — Guía | MH Ventanas` },
          {
            name: "description",
            content: `Guía general de ${loaderData.monster.name}: estados, baiting y ventanas de castigo.`,
          },
        ]
      : [],
  }),
  component: GeneralPage,
});

function GeneralPage() {
  const { monster, overviewCode, clipMap, weapons }: GeneralData =
    Route.useLoaderData();
  const { game, monster: monsterSlug } = Route.useParams();
  const Content = overviewCode ? runMdx(overviewCode) : null;

  return (
    <main className="page guide">
      {weapons.length > 0 ? (
        <ul className="weapon-links">
          {weapons.map((w) => (
            <li key={w}>
              <Link
                to="/guias/$game/$monster/$weapon"
                params={{ game, monster: monsterSlug, weapon: w }}
              >
                {WEAPON_LABELS[w]}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <ClipMapContext.Provider value={clipMap}>
        {Content ? (
          <Content components={mdxComponents} />
        ) : (
          <p>Esta guía aún no tiene contenido.</p>
        )}
      </ClipMapContext.Provider>
    </main>
  );
}
