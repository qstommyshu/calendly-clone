import { CalendarBookingForm } from "@/components/forms/CalendarBookingForm"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { db } from "@/drizzle/db"
import { getValidTimesFromSchedule } from "@/lib/getValidTimesFromSchedule"
import { clerkClient } from "@clerk/nextjs/server"
import {
  addMonths,
  eachMinuteOfInterval,
  endOfDay,
  roundToNearestMinutes,
} from "date-fns"
import Link from "next/link"
import { notFound } from "next/navigation"

export const revalidate = 0

export default async function BookEventPage({
  params: { clerkUserId, eventId },
}: {
  params: { clerkUserId: string; eventId: string }
}) {
  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId: userIdCol, isActive, id }, { eq, and }) =>
      and(eq(isActive, true), eq(userIdCol, clerkUserId), eq(id, eventId)),
  })

  if (event == null) return notFound()

  const calendarUser = await clerkClient().users.getUser(clerkUserId)
  const startDate = roundToNearestMinutes(new Date(), {
    nearestTo: 15,
    roundingMethod: "ceil",
  })
  const endDate = endOfDay(addMonths(startDate, 2))

  const validTimes = await getValidTimesFromSchedule(
    eachMinuteOfInterval({ start: startDate, end: endDate }, { step: 15 }),
    event
  )

  if (validTimes.length === 0) {
    return <NoTimeSlots event={event} calendarUser={calendarUser} />
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="max-w-2xl mx-auto px-2">
        {/* Compact Profile Header */}
        <div className="text-center mb-4">
          <div className="flex justify-center mb-3">
            <div className="flex -space-x-1">
              <div className="w-12 h-12 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center">
                <span className="text-sm font-semibold text-gray-600">
                  {calendarUser.firstName?.[0] || "U"}
                </span>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {event.name[0]}
                </span>
              </div>
            </div>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-1">
            Hi! Ready to book {event.name}?
          </h1>
          {event.description && (
            <p className="text-gray-600 text-sm">{event.description}</p>
          )}
        </div>

        {/* Calendar Booking Interface */}
        <CalendarBookingForm
          validTimes={validTimes}
          eventId={event.id}
          clerkUserId={clerkUserId}
          event={event}
        />
      </div>
    </div>
  )
}

function NoTimeSlots({
  event,
  calendarUser,
}: {
  event: { name: string; description: string | null }
  calendarUser: { id: string; fullName: string | null }
}) {
  return (
    <div className="max-w-md mx-auto p-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Book {event.name} with {calendarUser.fullName}
          </CardTitle>
          {event.description && (
            <CardDescription className="text-sm">{event.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="py-3">
          <p className="text-sm text-gray-600">
            {calendarUser.fullName} is currently booked up. Please check back later
            or choose a shorter event.
          </p>
        </CardContent>
        <CardFooter className="pt-3">
          <Button asChild size="sm">
            <Link href={`/book/${calendarUser.id}`}>Choose Another Event</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
