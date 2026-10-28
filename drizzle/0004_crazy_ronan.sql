CREATE TYPE "public"."pomodoro_kind" AS ENUM('focus', 'break');--> statement-breakpoint
ALTER TABLE "pomodoro_sessions" ADD COLUMN "kind" "pomodoro_kind" DEFAULT 'focus' NOT NULL;