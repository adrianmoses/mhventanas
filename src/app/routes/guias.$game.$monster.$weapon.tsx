import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { loadWeaponData } from "../loaders/queries.js";
import type { WeaponData } from "../loaders/queries.js";
import { runMdx } from "../mdx/run-content.js";
import { mdxComponents } from "../mdx/components.js";
import { ClipMapContext } from "../mdx/Clip.js";
import { WEAPON_LABELS } from "../weapons.js";

const getWeapon = createServerFn({ method: "GET" })
  .validator((data: { game: string; monster: string; weapon: string }) => data)
  .handler(({ data }) => loadWeaponData(data));

export const Route = createFileRoute("/guias/$game/$monster/$weapon")({
  loader: async ({ params }): Promise<WeaponData> => {
    const data = await getWeapon({
      data: {
        game: params.game,
        monster: params.monster,
        weapon: params.weapon,
      },
    });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          {
            title: `${loaderData.monster.name} — ${WEAPON_LABELS[loaderData.weapon]} | MH Ventanas`,
          },
          {
            name: "description",
            content: `Guía de castigo de ${loaderData.monster.name} con ${WEAPON_LABELS[loaderData.weapon]}.`,
          },
        ]
      : [],
  }),
  component: WeaponPage,
});

function WeaponPage() {
  const { monster, weapon, contentCode, clipMap }: WeaponData =
    Route.useLoaderData();
  const { game, monster: monsterSlug } = Route.useParams();
  const Content = runMdx(contentCode);

  return (
    <main className="page guide">
      <nav className="page__nav">
        <Link to="/guias/$game/$monster" params={{ game, monster: monsterSlug }}>
          ← {monster.name}
        </Link>
        <span> · {WEAPON_LABELS[weapon]}</span>
      </nav>

      <ClipMapContext.Provider value={clipMap}>
        <Content components={mdxComponents} />
      </ClipMapContext.Provider>
    </main>
  );
}
