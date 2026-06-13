import {
  pgTable,
  pgEnum,
  bigint,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/**
 * Weapon types covered by punish guides. Closed set, central to routing — kept
 * as a Postgres enum so the schema is the single typed source (Espada Larga =
 * longsword, Gran Espada = greatsword). Launch covers these two only.
 */
export const weaponType = pgEnum("weapon_type", ["longsword", "greatsword"]);

/**
 * A monster and its weapon-agnostic general guide. `slug` + `game` drive the
 * URL (e.g. /guias/wilds/chatacabra). `overviewContent` holds the compiled
 * general-page MDX and is nullable until the ingest pipeline (002) fills it.
 */
export const monsters = pgTable(
  "monsters",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    variant: text("variant"),
    game: text("game").notNull(),
    overviewContent: text("overview_content"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("monsters_game_slug_unique").on(t.game, t.slug)],
);

/**
 * A weapon-specific punish guide for a monster. One guide per (monster, weapon).
 * `content` is compiled weapon-page MDX. `publishedAt` gates visibility:
 * NULL or a future timestamp = hidden; a past timestamp = live (enforced by the
 * route loaders in 004).
 */
export const punishGuides = pgTable(
  "punish_guides",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    monsterId: bigint("monster_id", { mode: "number" })
      .notNull()
      .references(() => monsters.id, { onDelete: "cascade" }),
    weaponType: weaponType("weapon_type").notNull(),
    content: text("content").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("punish_guides_monster_weapon_unique").on(t.monsterId, t.weaponType)],
);

/**
 * WebM clip metadata. Linked to a monster and optionally to a specific punish
 * guide. `url` points at the CDN (wired in 003); referenced from MDX via
 * `<Clip slug="..." />`, unique per monster.
 */
export const clips = pgTable(
  "clips",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    monsterId: bigint("monster_id", { mode: "number" })
      .notNull()
      .references(() => monsters.id, { onDelete: "cascade" }),
    punishGuideId: bigint("punish_guide_id", { mode: "number" }).references(
      () => punishGuides.id,
      { onDelete: "cascade" },
    ),
    slug: text("slug").notNull(),
    url: text("url").notNull(),
    caption: text("caption"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("clips_monster_slug_unique").on(t.monsterId, t.slug)],
);
