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

### Lint y tests

```bash
pnpm typecheck      # comprobación de tipos con TypeScript (primera línea de defensa)
pnpm test           # ejecutar la suite de Vitest (requiere `pnpm db:up`)
pnpm test:watch     # Vitest en modo watch
```

> Todavía no hay un linter dedicado (ESLint); `pnpm typecheck` cumple esa función
> por ahora, en línea con la postura de pruebas del proyecto.

### Base de datos

```bash
pnpm db:generate    # generar una migración SQL a partir de src/db/schema.ts
pnpm db:down        # detener Postgres (añade `-v` para borrar el volumen)
```

## Specs

La documentación del proyecto vive en [`docs/specs/`](docs/specs/):

- [`OVERVIEW.md`](docs/specs/OVERVIEW.md) — producto, consumidor, alcance.
- [`ARCHITECTURE.md`](docs/specs/ARCHITECTURE.md) — sistema, datos, decisiones.
- [`ROADMAP.md`](docs/specs/ROADMAP.md) — funcionalidades y orden de entrega.
- [`reference/glosario.html`](docs/specs/reference/glosario.html) — nomenclatura
  estándar de movimientos y armas (referencia).

Datos no oficiales · hecho por y para cazadores.
