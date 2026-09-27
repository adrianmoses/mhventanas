CREATE TYPE "public"."hunt_cause" AS ENUM('tell', 'pos', 'greed', 'dodge', 'stamina', 'heal', 'wind', 'other');--> statement-breakpoint
CREATE TYPE "public"."hunt_rank" AS ENUM('bajo', 'alto', 'maestro');--> statement-breakpoint
CREATE TYPE "public"."hunt_result" AS ENUM('ok', 'fail', 'quit');--> statement-breakpoint
CREATE TYPE "public"."hunt_weapon" AS ENUM('greatsword', 'longsword', 'sword-and-shield', 'dual-blades', 'hammer', 'hunting-horn', 'lance', 'gunlance', 'switch-axe', 'charge-blade', 'insect-glaive', 'bow', 'light-bowgun', 'heavy-bowgun');--> statement-breakpoint
CREATE TABLE "hunts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hunts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"hunted_on" date NOT NULL,
	"monster_name" text NOT NULL,
	"monster_slug" text NOT NULL,
	"rank" "hunt_rank" NOT NULL,
	"variant" text,
	"weapon" "hunt_weapon" NOT NULL,
	"time_seconds" integer,
	"carts" smallint DEFAULT 0 NOT NULL,
	"result" "hunt_result" NOT NULL,
	"build" text,
	"hits" text,
	"causes" "hunt_cause"[] DEFAULT '{}' NOT NULL,
	"cart_cause" text,
	"learned" text,
	"weaknesses" text,
	"missing_items" text,
	"prep" text,
	"went_well" text,
	"main_error" text,
	"next_goal" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hunts_carts_range" CHECK ("hunts"."carts" BETWEEN 0 AND 3),
	CONSTRAINT "hunts_time_nonnegative" CHECK ("hunts"."time_seconds" IS NULL OR "hunts"."time_seconds" >= 0)
);
--> statement-breakpoint
CREATE INDEX "hunts_monster_slug_idx" ON "hunts" USING btree ("monster_slug");