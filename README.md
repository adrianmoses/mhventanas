# MH Ventanas

Guía en español sobre **ventanas de castigo** en Monster Hunter: cuándo y cómo
atacar a cada monstruo de forma segura para maximizar el daño.

Cada monstruo tiene una guía general (set de movimientos, estados, qué provoca cada
ataque) y guías por arma para **Espada Larga (Longsword)** y **Gran Espada
(Greatsword)**.

## Stack

TanStack Start · Nitro · PostgreSQL · MDX · clips WebM (object storage + CDN).

## Development

Requiere Node ≥ 24, pnpm y Docker.

```bash
pnpm install        # instalar dependencias
cp .env.example .env  # configurar la conexión local
pnpm db:up          # levantar Postgres 17 (docker-compose, puerto 5433)
pnpm db:migrate     # aplicar migraciones
```

### Levantar la app

```bash
pnpm dev            # servidor de desarrollo (SSR) en http://localhost:3000
pnpm build          # compilar cliente + servidor Nitro en .output/
pnpm start          # servir la build de producción: node .output/server/index.mjs
```

Las rutas de guías se sirven con SSR en `/guias/{juego}/{monstruo}` (guía general) y
`/guias/{juego}/{monstruo}/{arma}` (guía por arma). El servidor lee `DATABASE_URL` y,
en producción, `PORT`.

### Lint y tests

```bash
pnpm typecheck      # comprobación de tipos con TypeScript (primera línea de defensa)
pnpm test           # ejecutar la suite de Vitest (requiere `pnpm db:up`)
pnpm test:watch     # Vitest en modo watch
pnpm test:e2e       # smoke E2E de Playwright sobre las rutas de guías
```

> El smoke E2E compila la app y la sirve con el servidor Nitro contra
> `TEST_DATABASE_URL`. La primera vez instala el navegador con
> `pnpm exec playwright install chromium`.

> Todavía no hay un linter dedicado (ESLint); `pnpm typecheck` cumple esa función
> por ahora, en línea con la postura de pruebas del proyecto.

### Base de datos

```bash
pnpm db:generate    # generar una migración SQL a partir de src/db/schema.ts
pnpm db:down        # detener Postgres (añade `-v` para borrar el volumen)
```

### Contenido (MDX)

Las guías se escriben como MDX en `content/{juego}/{monstruo}/` (`index.mdx` para la
guía general, `longsword.mdx` / `greatsword.mdx` por arma) y se ingieren en la base
de datos:

```bash
pnpm ingest         # compilar el MDX de content/ y volcarlo en Postgres (idempotente)
```

## Specs

La documentación del proyecto vive en [`docs/specs/`](docs/specs/):

- [`OVERVIEW.md`](docs/specs/OVERVIEW.md) — producto, consumidor, alcance.
- [`ARCHITECTURE.md`](docs/specs/ARCHITECTURE.md) — sistema, datos, decisiones.
- [`ROADMAP.md`](docs/specs/ROADMAP.md) — funcionalidades y orden de entrega.
- [`reference/glosario.html`](docs/specs/reference/glosario.html) — nomenclatura
  estándar de movimientos y armas (referencia).

Datos no oficiales · hecho por y para cazadores.
