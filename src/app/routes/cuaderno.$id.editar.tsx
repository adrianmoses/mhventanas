import { createFileRoute, notFound } from "@tanstack/react-router";
import { CuadernoHeader } from "../cuaderno/components.js";
import { requireOwnerRoute } from "../cuaderno/guard.js";
import { HuntForm } from "../cuaderno/HuntForm.js";
import { getFormData } from "../cuaderno/hunts.js";

export const Route = createFileRoute("/cuaderno/$id/editar")({
  beforeLoad: requireOwnerRoute,
  loader: async ({ params }) => {
    const id = Number(params.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw notFound();
    const data = await getFormData({ data: { id } });
    if (!data.hunt) throw notFound();
    return { hunt: data.hunt, monsterNames: data.monsterNames };
  },
  head: () => ({
    meta: [
      { title: "Editar cacería — Cuaderno de Caza | MH Ventanas" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditHuntPage,
});

function EditHuntPage() {
  const { hunt, monsterNames } = Route.useLoaderData();
  return (
    <main className="cuaderno">
      <CuadernoHeader title="Editar cacería" back />
      <HuntForm mode={{ kind: "edit", hunt }} monsterNames={monsterNames} />
    </main>
  );
}
