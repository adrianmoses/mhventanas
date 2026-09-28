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

### Cuaderno de caza

`/cuaderno` es el registro de cacerías del autor: la lectura es pública y solo el
autor puede registrar, editar o borrar cacerías, tras entrar en `/cuaderno/entrar`.
Necesita dos variables de entorno (ver `.env.example`):

- `CUADERNO_OWNER_SECRET` — la clave para entrar.
- `SESSION_SECRET` — clave de cifrado de la cookie de sesión (mínimo 32 caracteres;
  `openssl rand -base64 32`).

A diferencia de las guías, la tabla `hunts` **no** se puede reconstruir desde git, así
que hay que hacer copias de seguridad:

```bash
pnpm hunts:export                      # volcar todas las cacerías como JSON a stdout
pnpm hunts:export backups/hunts.json   # … o a un fichero
```

## Despliegue

Producción: **Fly.io** (servidor Nitro en Docker) · **Neon** (Postgres) · **Cloudflare R2**
(clips). Ver `Dockerfile` y `fly.toml`.

En cada `fly deploy`, antes de que la nueva versión reciba tráfico, Fly ejecuta
`npm run release` (migraciones + `ingest` de `content/`, idempotente) en una máquina
temporal. Si falla, el despliegue se aborta y sigue sirviendo la versión anterior.

### Primera vez

1. **Neon:** crear un proyecto en la región más cercana a la app de Fly y copiar la
   cadena de conexión **directa** (no la *pooled*). Quitar `channel_binding=require`:
   postgres.js lo envía al servidor como parámetro y la conexión falla. Dejar
   `?sslmode=require`.
2. **R2:** activar el acceso público del bucket (dominio `r2.dev` o dominio propio);
   esa URL es `CDN_BASE_URL`.
3. **Fly:**

   ```bash
   fly launch --no-deploy        # crea la app; ajustar `app` y `primary_region` en fly.toml
   fly secrets set \
     DATABASE_URL='postgresql://…neon.tech/neondb?sslmode=require' \
     SESSION_SECRET="$(openssl rand -base64 32)" \
     CUADERNO_OWNER_SECRET='…' \
     CDN_BASE_URL='https://…'
   fly deploy
   ```

Las credenciales de R2 no van a Fly: solo se usan en local para `pnpm clips:upload`.

### Probar la imagen en local

```bash
docker build -t mhventanas .
docker run --rm -e DATABASE_URL=… -e CDN_BASE_URL=… mhventanas npm run release
docker run --rm -p 3000:3000 -e DATABASE_URL=… -e SESSION_SECRET=… \
  -e CUADERNO_OWNER_SECRET=… mhventanas
```

Desde el contenedor, el Postgres de `pnpm db:up` está en `host.docker.internal:5433`.

## Specs

La documentación del proyecto vive en [`docs/specs/`](docs/specs/):

- [`OVERVIEW.md`](docs/specs/OVERVIEW.md) — producto, consumidor, alcance.
- [`ARCHITECTURE.md`](docs/specs/ARCHITECTURE.md) — sistema, datos, decisiones.
- [`ROADMAP.md`](docs/specs/ROADMAP.md) — funcionalidades y orden de entrega.
- [`reference/glosario.html`](docs/specs/reference/glosario.html) — nomenclatura
  estándar de movimientos y armas (referencia).

Datos no oficiales · hecho por y para cazadores.
