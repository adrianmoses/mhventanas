import {
  pgTable,
  pgEnum,
  bigint,
  check,
  date,
  index,
  integer,
  smallint,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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

/**
 * Weapons a hunt can be logged with in the cuaderno (010). All 14 weapons —
 * deliberately separate from `weapon_type`, which stays scoped to the guides
 * (LS/GS). Spanish labels live in src/app/cuaderno/labels.ts.
 */
export const huntWeapon = pgEnum("hunt_weapon", [
  "greatsword",
  "longsword",
  "sword-and-shield",
  "dual-blades",
  "hammer",
  "hunting-horn",
  "lance",
  "gunlance",
  "switch-axe",
  "charge-blade",
  "insect-glaive",
  "bow",
  "light-bowgun",
  "heavy-bowgun",
]);

export const huntRank = pgEnum("hunt_rank", ["bajo", "alto", "maestro"]);

/** ok = Completada, fail = Fallida, quit = Abandonada. */
export const huntResult = pgEnum("hunt_result", ["ok", "fail", "quit"]);

/** "Por qué te golpearon" — closed set of causes, tagged per hunt. */
export const huntCause = pgEnum("hunt_cause", [
  "tell",
  "pos",
  "greed",
  "dodge",
  "stamina",
  "heal",
  "wind",
  "other",
]);

/**
 * One logged hunt in the owner's cuaderno (010). Primary data — unlike the
 * guide tables it is NOT rebuildable from git, and ingest never touches it.
 * `monsterName` is free text (no FK to `monsters`: the log covers monsters
 * without guides); `monsterSlug` is derived from it on save and drives
 * /cuaderno/monstruo/:slug. `timeSeconds` is NULL when no time was recorded.
 */
export const hunts = pgTable(
  "hunts",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    huntedOn: date("hunted_on", { mode: "string" }).notNull(),
    monsterName: text("monster_name").notNull(),
    monsterSlug: text("monster_slug").notNull(),
    rank: huntRank("rank").notNull(),
    variant: text("variant"),
    weapon: huntWeapon("weapon").notNull(),
    timeSeconds: integer("time_seconds"),
    carts: smallint("carts").notNull().default(0),
    result: huntResult("result").notNull(),
    build: text("build"),
    hits: text("hits"),
    causes: huntCause("causes").array().notNull().default(sql`'{}'`),
    cartCause: text("cart_cause"),
    learned: text("learned"),
    weaknesses: text("weaknesses"),
    missingItems: text("missing_items"),
    prep: text("prep"),
    wentWell: text("went_well"),
    mainError: text("main_error"),
    nextGoal: text("next_goal"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("hunts_monster_slug_idx").on(t.monsterSlug),
    check("hunts_carts_range", sql`${t.carts} BETWEEN 0 AND 3`),
    check("hunts_time_nonnegative", sql`${t.timeSeconds} IS NULL OR ${t.timeSeconds} >= 0`),
  ],
);
