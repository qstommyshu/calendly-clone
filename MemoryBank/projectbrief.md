# Project Brief

## Project Name
Calendly Clone

## Project Overview
A scheduling application that allows users to book appointments and manage their calendar.

## Key Objectives
- [x] User authentication and profile management (Clerk integration)
- [x] Calendar integration and availability management  
- [x] Appointment booking system
- [ ] **Primary Event Feature** (Current Focus)
- [ ] Email notifications and reminders
- [ ] Dashboard for managing appointments

## Current Development Focus
### Primary Event Feature (Level 3 - Intermediate)
**Goal:** Implement a streamlined primary event system that allows users to share a single, configurable booking link.

**Key Features:**
- Primary event accessible via `/book/user_id/primary` URL pattern
- Configurable duration and description through schedule page
- Copy button for easy URL sharing in events page  
- Seamless integration with existing booking system

**Business Value:**
- Simplifies user onboarding (single default event)
- Reduces friction for users who primarily offer one type of meeting
- Maintains existing event system while adding convenience layer

## Technology Stack
- Frontend: Next.js, React, TypeScript
- Styling: Tailwind CSS, shadcn/ui components
- Database: PostgreSQL with Drizzle ORM
- Authentication: Clerk
- Deployment: (To be determined)

## Project Status
- **Current Phase**: PLAN MODE - Primary Event Feature
- **Complexity Level**: Level 3 (Intermediate Feature)
- **Last Updated**: Primary event planning phase
- **Next Phase**: CREATIVE MODE for architecture and UI design

## Architecture Context
### Existing System:
- Event-based scheduling with EventTable storage
- User schedules managed through ScheduleTable 
- Public booking routes at `/book/[clerkUserId]/[eventId]`
- Copy functionality for event URLs

### Primary Event Integration:
- Leverages existing authentication and scheduling infrastructure
- Extends current UI patterns and component library
- Maintains backwards compatibility with existing event system

## Notes
Memory Bank initialized for Calendly Clone project. Currently implementing primary event feature to enhance user experience and provide simplified booking URL sharing.
