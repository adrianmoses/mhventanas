import type { GeneralFrontmatter, WeaponFrontmatter } from "./parse.js";

export type Weapon = "longsword" | "greatsword";

/** A content file located on disk, with path-derived metadata. */
export interface DiscoveredFile {
  kind: "general" | "weapon";
  absPath: string;
  game: string;
  monsterSlug: string;
  /** Set for weapon files only. */
  weapon?: Weapon;
}

export interface ParsedGeneral {
  kind: "general";
  absPath: string;
  game: string;
  monsterSlug: string;
  frontmatter: GeneralFrontmatter;
  body: string;
}

export interface ParsedWeapon {
  kind: "weapon";
  absPath: string;
  game: string;
  monsterSlug: string;
  weapon: Weapon;
  frontmatter: WeaponFrontmatter;
  body: string;
}

export type ParsedFile = ParsedGeneral | ParsedWeapon;

export type CompiledFile = ParsedFile & {
  /** Compiled MDX function-body string stored in the DB. */
  code: string;
  /** Literal `slug`s referenced by `<Clip>` in the body. */
  referencedSlugs: string[];
};

export type CompiledGeneral = Extract<CompiledFile, { kind: "general" }>;
export type CompiledWeapon = Extract<CompiledFile, { kind: "weapon" }>;

/** One monster's full record: its general guide plus any weapon guides, ready to upsert. */
export interface MonsterRecord {
  game: string;
  monsterSlug: string;
  general: CompiledGeneral;
  weapons: CompiledWeapon[];
}
