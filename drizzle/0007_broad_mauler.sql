ALTER TABLE "tasks" ADD COLUMN "first_reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "second_reminder_sent_at" timestamp with time zone;