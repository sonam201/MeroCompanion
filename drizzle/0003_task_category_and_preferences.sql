CREATE TYPE "public"."task_category" AS ENUM('other', 'study', 'job_application', 'work');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "enabled_task_categories" text[] DEFAULT '{"other","study","job_application","work"}' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "category" "task_category" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "tag";--> statement-breakpoint
DROP TYPE "public"."task_tag";
