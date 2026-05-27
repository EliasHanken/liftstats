CREATE TYPE "public"."attempt_result" AS ENUM('good', 'no_lift', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."equipment" AS ENUM('Raw', 'Wraps', 'Single', 'Multi', 'Unlimited');--> statement-breakpoint
CREATE TYPE "public"."ingest_status" AS ENUM('running', 'ok', 'error');--> statement-breakpoint
CREATE TYPE "public"."lift" AS ENUM('SQ', 'BP', 'DL');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('M', 'F', 'Mx');--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('opl', 'goodlift');--> statement-breakpoint
CREATE TYPE "public"."target_status" AS ENUM('ok', 'error', 'pending');--> statement-breakpoint
CREATE TABLE "attempt" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"lift" "lift" NOT NULL,
	"attempt_no" integer NOT NULL,
	"weight_kg" numeric NOT NULL,
	"result" "attempt_result" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entry" (
	"id" serial PRIMARY KEY NOT NULL,
	"lifter_id" integer NOT NULL,
	"meet_id" integer NOT NULL,
	"equipment" "equipment" NOT NULL,
	"weight_class_kg" numeric NOT NULL,
	"bodyweight_kg" numeric,
	"age" numeric,
	"age_class" text,
	"division" text,
	"best_sq_kg" numeric,
	"best_bp_kg" numeric,
	"best_dl_kg" numeric,
	"total_kg" numeric,
	"place" integer,
	"gl_points" numeric,
	"wilks" numeric,
	"dots" numeric,
	"flight_size" integer
);
--> statement-breakpoint
CREATE TABLE "goodlift_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"goodlift_url" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"last_attempted_at" timestamp with time zone,
	"last_status" "target_status" DEFAULT 'pending' NOT NULL,
	"last_error" text,
	CONSTRAINT "goodlift_targets_goodlift_url_unique" UNIQUE("goodlift_url")
);
--> statement-breakpoint
CREATE TABLE "ingest_run" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" "source" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" "ingest_status" DEFAULT 'running' NOT NULL,
	"rows_added" integer DEFAULT 0 NOT NULL,
	"rows_updated" integer DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "lifter" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sex" "sex" NOT NULL,
	"birth_year" integer,
	"primary_fed" text,
	"country" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lifter_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "meet" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" "source" NOT NULL,
	"source_meet_id" text NOT NULL,
	"federation" text NOT NULL,
	"date" date NOT NULL,
	"name" text NOT NULL,
	"country" text,
	"town" text,
	"has_attempts" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempt" ADD CONSTRAINT "attempt_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_lifter_id_lifter_id_fk" FOREIGN KEY ("lifter_id") REFERENCES "public"."lifter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_meet_id_meet_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_entry_lift_no_unique" ON "attempt" USING btree ("entry_id","lift","attempt_no");--> statement-breakpoint
CREATE UNIQUE INDEX "entry_lifter_meet_eq_class_unique" ON "entry" USING btree ("lifter_id","meet_id","equipment","weight_class_kg");--> statement-breakpoint
CREATE INDEX "entry_lifter_idx" ON "entry" USING btree ("lifter_id");--> statement-breakpoint
CREATE INDEX "entry_flight_lookup_idx" ON "entry" USING btree ("meet_id","equipment","weight_class_kg");--> statement-breakpoint
CREATE INDEX "lifter_name_idx" ON "lifter" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "meet_source_meetid_unique" ON "meet" USING btree ("source","source_meet_id");--> statement-breakpoint
CREATE INDEX "meet_date_idx" ON "meet" USING btree ("date");