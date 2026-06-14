import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "MH Ventanas — Guías de ventanas de castigo" }],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="page">
      <h1>MH Ventanas</h1>
      <p>
        Guías de Monster Hunter en español centradas en las{" "}
        <strong>ventanas de castigo</strong>: cuándo y cómo atacar a cada
        monstruo de forma segura.
      </p>
    </main>
  );
}
