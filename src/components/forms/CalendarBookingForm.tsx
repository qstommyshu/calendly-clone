"use client"

import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Textarea } from "../ui/textarea"
import { meetingFormSchema } from "@/schema/meetings"
import {
  formatTimeString,
} from "@/lib/formatters"
import { 
  ChevronLeft, 
  ChevronRight,
  ChevronDown 
} from "lucide-react"
import { 
  isSameDay, 
  format, 
  addDays,
  subDays,
  isToday,
  startOfWeek,
  addWeeks,
  subWeeks,
} from "date-fns"
import { cn } from "@/lib/utils"
import { useMemo, useState } from "react"
import { toZonedTime } from "date-fns-tz"
import { createMeeting } from "@/server/actions/meetings"

const WEEKDAYS = ["Sun", "Mon", "Tues", "Wed", "Thur", "Fri", "Sat"]
const TIME_SLOTS_PER_PAGE = 6

export function CalendarBookingForm({
  validTimes,
  eventId,
  clerkUserId,
  event,
}: {
  validTimes: Date[]
  eventId: string
  clerkUserId: string
  event: { name: string; durationInMinutes: number }
}) {
  const [centerDate, setCenterDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<Date | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [timeSlotPage, setTimeSlotPage] = useState(0)

  const form = useForm<z.infer<typeof meetingFormSchema>>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  })

  const timezone = form.watch("timezone")
  const validTimesInTimezone = useMemo(() => {
    return validTimes.map(date => toZonedTime(date, timezone))
  }, [validTimes, timezone])

  // Get 7 days for the week containing the center date (Sunday to Saturday)
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(centerDate, { weekStartsOn: 0 }) // 0 = Sunday
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [centerDate])

  // Get available times for selected date
  const availableTimesForDate = useMemo(() => {
    if (!selectedDate) return []
    return validTimesInTimezone
      .filter(time => isSameDay(time, selectedDate))
      .sort((a, b) => a.getTime() - b.getTime())
  }, [selectedDate, validTimesInTimezone])

  // Paginate time slots
  const paginatedTimeSlots = useMemo(() => {
    const startIndex = timeSlotPage * TIME_SLOTS_PER_PAGE
    return availableTimesForDate.slice(startIndex, startIndex + TIME_SLOTS_PER_PAGE)
  }, [availableTimesForDate, timeSlotPage])

  const totalPages = Math.ceil(availableTimesForDate.length / TIME_SLOTS_PER_PAGE)
  const canGoToPrevPage = timeSlotPage > 0
  const canGoToNextPage = timeSlotPage < totalPages - 1

  // Check if date has available times
  const hasAvailableTimes = (date: Date) => {
    return validTimesInTimezone.some(time => isSameDay(time, date))
  }

  const handleDateSelect = (date: Date) => {
    if (hasAvailableTimes(date)) {
      setSelectedDate(date)
      setSelectedTime(null)
      setShowBookingForm(false)
      setTimeSlotPage(0) // Reset to first page when selecting new date
    }
  }

  const handleTimeSelect = (time: Date) => {
    setSelectedTime(time)
    form.setValue("startTime", time)
    form.setValue("date", time)
    setShowBookingForm(true)
  }

  const navigate = (direction: 'prev' | 'next') => {
    setCenterDate(prev => 
      direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1)
    )
    setSelectedDate(null)
    setSelectedTime(null)
    setShowBookingForm(false)
    setTimeSlotPage(0)
  }

  const navigateTimeSlots = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && canGoToPrevPage) {
      setTimeSlotPage(prev => prev - 1)
    } else if (direction === 'next' && canGoToNextPage) {
      setTimeSlotPage(prev => prev + 1)
    }
  }

  async function onSubmit(values: z.infer<typeof meetingFormSchema>) {
    const data = await createMeeting({
      ...values,
      eventId,
      clerkUserId,
    })

    if (data?.error) {
      form.setError("root", {
        message: "There was an error saving your event",
      })
    }
  }

  if (showBookingForm && selectedTime) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBookingForm(false)}
            className="mr-4"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Book {event.name}</h2>
            <p className="text-sm text-gray-600">
              {format(selectedTime, "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <div className="text-destructive text-sm">
                {form.formState.errors.root.message}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="guestName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guestEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Email *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="guestNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      className="resize-none" 
                      rows={3}
                      placeholder="Please share anything that will help prepare for our meeting."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBookingForm(false)}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                type="submit" 
                disabled={form.formState.isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {form.formState.isSubmitting ? "Scheduling..." : "Schedule Event"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden max-w-2xl mx-auto">
      {/* Month Navigation */}
      <div className="flex items-center justify-between p-6 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('prev')}
          className="p-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold">
            {format(centerDate, "MMMM").toUpperCase()}
          </h2>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('next')}
          className="p-2"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-6">
        {/* Week Calendar - 7 days centered around current date */}
        <div className="grid grid-cols-7 gap-3 mb-8">
          {weekDays.map((day, index) => {
            const isAvailable = hasAvailableTimes(day)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isPastDay = day < new Date() && !isToday(day)
            const dayOfWeek = day.getDay()

            return (
              <div key={day.toISOString()} className="text-center">
                <div className="text-sm font-medium text-gray-500 mb-2">
                  {WEEKDAYS[dayOfWeek]}
                </div>
                <button
                  onClick={() => handleDateSelect(day)}
                  disabled={!isAvailable || isPastDay}
                  className={cn(
                    "w-full h-16 text-lg font-medium rounded-lg transition-colors",
                    "flex items-center justify-center border-2",
                    {
                      "text-gray-900 border-gray-200 hover:border-blue-300": 
                        isAvailable && !isSelected && !isPastDay,
                      "bg-blue-600 text-white border-blue-600": isSelected,
                      "cursor-not-allowed opacity-50 border-gray-100 text-gray-400": 
                        !isAvailable || isPastDay,
                    }
                  )}
                >
                  {format(day, "d")}
                </button>
              </div>
            )
          })}
        </div>

        {/* Time Slots - Below the calendar with pagination */}
        {selectedDate && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateTimeSlots('prev')}
                disabled={!canGoToPrevPage}
                className="p-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <h3 className="font-semibold text-center">
                {format(selectedDate, "EEEE, MMMM d")}
              </h3>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateTimeSlots('next')}
                disabled={!canGoToNextPage}
                className="p-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {availableTimesForDate.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {paginatedTimeSlots.map(time => (
                  <button
                    key={time.toISOString()}
                    onClick={() => handleTimeSelect(time)}
                    className={cn(
                      "px-4 py-3 rounded-lg border-2 transition-colors",
                      "text-center font-medium",
                      {
                        "bg-blue-600 text-white border-blue-600": 
                          selectedTime && time.getTime() === selectedTime.getTime(),
                        "border-gray-200 hover:border-blue-300 hover:bg-blue-50": 
                          !selectedTime || time.getTime() !== selectedTime?.getTime()
                      }
                    )}
                  >
                    {formatTimeString(time)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center">
                No available times for this date.
              </p>
            )}
            
            {/* Pagination indicator */}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2 mt-4">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setTimeSlotPage(i)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      {
                        "bg-blue-600": i === timeSlotPage,
                        "bg-gray-300": i !== timeSlotPage,
                      }
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 