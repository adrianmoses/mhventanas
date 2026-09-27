import { createFileRoute } from "@tanstack/react-router";
import { CuadernoHeader } from "../cuaderno/components.js";
import { requireOwnerRoute } from "../cuaderno/guard.js";
import { HuntForm } from "../cuaderno/HuntForm.js";
import { getFormData } from "../cuaderno/hunts.js";

export const Route = createFileRoute("/cuaderno/nueva")({
  validateSearch: (s: Record<string, unknown>): { repetir?: number } => {
    const id = Number(s.repetir);
    return { repetir: Number.isSafeInteger(id) && id > 0 ? id : undefined };
  },
  beforeLoad: requireOwnerRoute,
  loaderDeps: ({ search }) => ({ repetir: search.repetir }),
  loader: ({ deps }) => getFormData({ data: { id: deps.repetir } }),
  head: () => ({
    meta: [
      { title: "Registrar cacería — Cuaderno de Caza | MH Ventanas" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewHuntPage,
});

function NewHuntPage() {
  const { hunt, monsterNames } = Route.useLoaderData();
  return (
    <main className="cuaderno">
      <CuadernoHeader title="Registrar cacería" back />
      <HuntForm mode={{ kind: "new", repeatFrom: hunt }} monsterNames={monsterNames} />
    </main>
  );
}
