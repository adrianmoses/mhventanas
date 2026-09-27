import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { login, safeNext } from "../cuaderno/auth.js";

export const Route = createFileRoute("/cuaderno/entrar")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: safeNext(search.next),
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Cuaderno de Caza | MH Ventanas" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const loginFn = useServerFn(login);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const secret = String(new FormData(e.currentTarget).get("secret") ?? "");
    setBusy(true);
    setError("");
    try {
      const res = await loginFn({ data: { secret } });
      if (!res.ok) {
        setError("Clave incorrecta.");
        return;
      }
      await navigate({ href: next });
    } catch {
      setError("No se pudo entrar. Inténtalo otra vez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="cuaderno cz-narrow">
      <header className="cz-top">
        <div>
          <div className="cz-eyebrow">
            <Link to="/cuaderno">Cuaderno de Caza</Link>
          </div>
          <h1>Entrar</h1>
          <p>Solo el autor del cuaderno puede registrar o editar cacerías.</p>
        </div>
      </header>
      <form className="cz-form" onSubmit={onSubmit}>
        <label className="cz-f">
          Clave
          <input type="password" name="secret" autoComplete="current-password" required />
        </label>
        <div className="cz-form-actions">
          <button className="cz-btn" type="submit" disabled={busy}>
            Entrar
          </button>
          <span className="cz-hint" role="status">
            {error}
          </span>
        </div>
      </form>
    </main>
  );
}
