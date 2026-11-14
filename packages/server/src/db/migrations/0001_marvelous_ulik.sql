ALTER TABLE "attachments" ADD COLUMN "project" text;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "run_flaky" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "playwright_version" text;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "os_name" text;--> statement-breakpoint
ALTER TABLE "test_details" ADD COLUMN "failed_attempts_json" jsonb;