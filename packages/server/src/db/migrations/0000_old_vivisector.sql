CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"key_hash" text NOT NULL,
	"name" text NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"test_id" text,
	"test_file" text NOT NULL,
	"test_title" text NOT NULL,
	"test_status" text,
	"name" text NOT NULL,
	"content_type" text,
	"s3_key" text NOT NULL,
	"s3_url" text,
	"body_text" text,
	"size_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"run_name" text NOT NULL,
	"project_name" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"run_duration_ms" integer NOT NULL,
	"run_sequential_duration_ms" integer,
	"run_total" integer NOT NULL,
	"run_passed" integer NOT NULL,
	"run_failed" integer NOT NULL,
	"run_skipped" integer NOT NULL,
	"run_timed_out" integer DEFAULT 0 NOT NULL,
	"run_interrupted" integer DEFAULT 0 NOT NULL,
	"run_workers" integer,
	"run_projects" integer,
	"step_assertions" integer DEFAULT 0 NOT NULL,
	"step_actions" integer DEFAULT 0 NOT NULL,
	"step_network" integer DEFAULT 0 NOT NULL,
	"step_hooks" integer DEFAULT 0 NOT NULL,
	"step_waits" integer DEFAULT 0 NOT NULL,
	"step_others" integer DEFAULT 0 NOT NULL,
	"git_branch" text,
	"git_commit" text,
	"git_commit_full" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"file" text NOT NULL,
	"suite" text,
	"title" text NOT NULL,
	"project" text,
	"status" text NOT NULL,
	"duration_ms" integer NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"passed_on_retry" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"error_line" integer,
	"error_file" text,
	"tags" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_details" (
	"test_id" text PRIMARY KEY NOT NULL,
	"error_stack" text,
	"steps_json" jsonb,
	"stdout_json" jsonb,
	"stderr_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_test_id_test_cases_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."test_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_details" ADD CONSTRAINT "test_details_test_id_test_cases_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."test_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_api_keys_tenant" ON "api_keys" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_api_keys_hash" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "idx_attachments_run" ON "attachments" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_attachments_test" ON "attachments" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "idx_runs_tenant_started" ON "runs" USING btree ("tenant_id","started_at");--> statement-breakpoint
CREATE INDEX "idx_runs_project" ON "runs" USING btree ("tenant_id","project_name");--> statement-breakpoint
CREATE INDEX "idx_test_cases_run" ON "test_cases" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_test_cases_tenant_file" ON "test_cases" USING btree ("tenant_id","file");--> statement-breakpoint
CREATE INDEX "idx_test_cases_status" ON "test_cases" USING btree ("run_id","status");