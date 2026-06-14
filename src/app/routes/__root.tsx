import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MH Ventanas — Guías de ventanas de castigo" },
      {
        name: "description",
        content:
          "Guías de Monster Hunter en español: aprende las ventanas de castigo de cada monstruo.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootDocument,
  notFoundComponent: NotFound,
});

function RootDocument() {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <main className="page not-found">
      <h1>Página no encontrada</h1>
      <p>No encontramos la guía que buscas.</p>
      <p>
        <Link to="/">Volver al inicio</Link>
      </p>
    </main>
  );
}
