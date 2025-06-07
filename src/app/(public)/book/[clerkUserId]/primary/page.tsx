import { CalendarBookingForm } from "@/components/forms/CalendarBookingForm"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { db } from "@/drizzle/db"
import { getValidTimesFromSchedule } from "@/lib/getValidTimesFromSchedule"
import { clerkClient } from "@clerk/nextjs/server"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  addMonths,
  eachMinuteOfInterval,
  endOfDay,
  roundToNearestMinutes,
} from "date-fns"

export const revalidate = 0

export default async function PrimaryBookingPage({
  params: { clerkUserId },
}: {
  params: { clerkUserId: string }
}) {
  // Fetch schedule with primary event configuration
  const schedule = await db.query.ScheduleTable.findFirst({
    where: ({ clerkUserId: userIdCol }, { eq }) => eq(userIdCol, clerkUserId),
    with: { availabilities: true },
  })

  if (!schedule) {
    return notFound()
  }

  // Check if primary event is enabled
  if (!schedule.primaryEventEnabled) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Primary Event Not Available</CardTitle>
            <CardDescription>
              This user has not enabled their primary event booking option.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please check with them for alternative booking options or visit their main booking page.
            </p>
            <Button asChild>
              <Link href={`/book/${clerkUserId}`}>
                View All Events
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get user information
  const { fullName } = await clerkClient().users.getUser(clerkUserId)

  // Create virtual event object for primary event
  const primaryEvent = {
    id: 'primary',
    name: `Meeting with ${fullName}`,
    description: schedule.primaryEventDescription || `Book a meeting with ${fullName}`,
    durationInMinutes: schedule.primaryEventDuration,
    clerkUserId,
    isActive: true,
  }

  // Generate valid times for booking
  const startDate = roundToNearestMinutes(new Date(), {
    nearestTo: 30,
    roundingMethod: "ceil",
  })
  const endDate = endOfDay(addMonths(startDate, 2))
  
  const validTimes = await getValidTimesFromSchedule(
    eachMinuteOfInterval({ start: startDate, end: endDate }, { step: 30 }),
    primaryEvent
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-4xl md:text-5xl font-semibold mb-4 text-center">
        {fullName}
      </div>
      <div className="text-muted-foreground mb-6 max-w-sm mx-auto text-center">
        Book a meeting using their primary event option.
      </div>
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{primaryEvent.name}</CardTitle>
          <CardDescription>
            {primaryEvent.durationInMinutes} minutes
            {primaryEvent.description && ` • ${primaryEvent.description}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validTimes.length > 0 ? (
            <CalendarBookingForm
              validTimes={validTimes}
              eventId={primaryEvent.id}
              clerkUserId={clerkUserId}
              event={{
                name: primaryEvent.name,
                durationInMinutes: primaryEvent.durationInMinutes,
              }}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No available times found for the next 2 months.
              </p>
              <Button asChild variant="outline">
                <Link href={`/book/${clerkUserId}`}>
                  View All Events
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 