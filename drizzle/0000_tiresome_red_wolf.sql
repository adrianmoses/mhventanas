CREATE TYPE "public"."weapon_type" AS ENUM('longsword', 'greatsword');--> statement-breakpoint
CREATE TABLE "clips" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "clips_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"monster_id" bigint NOT NULL,
	"punish_guide_id" bigint,
	"slug" text NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clips_monster_slug_unique" UNIQUE("monster_id","slug")
);
--> statement-breakpoint
CREATE TABLE "monsters" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "monsters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"variant" text,
	"game" text NOT NULL,
	"overview_content" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monsters_game_slug_unique" UNIQUE("game","slug")
);
--> statement-breakpoint
CREATE TABLE "punish_guides" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "punish_guides_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"monster_id" bigint NOT NULL,
	"weapon_type" "weapon_type" NOT NULL,
	"content" text NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "punish_guides_monster_weapon_unique" UNIQUE("monster_id","weapon_type")
);
--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_punish_guide_id_punish_guides_id_fk" FOREIGN KEY ("punish_guide_id") REFERENCES "public"."punish_guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punish_guides" ADD CONSTRAINT "punish_guides_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE cascade ON UPDATE no action;