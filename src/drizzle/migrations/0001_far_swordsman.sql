ALTER TABLE "schedules" ADD COLUMN "primaryEventDuration" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "primaryEventDescription" text;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "primaryEventEnabled" boolean DEFAULT true NOT NULL;