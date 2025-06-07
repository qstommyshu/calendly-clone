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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"
import { meetingFormSchema } from "@/schema/meetings"
import {
  formatTimeString,
  formatTimezoneOffset,
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
import { useMemo, useState, useEffect, useCallback } from "react"
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
  const [initialLoad, setInitialLoad] = useState(true)

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
  const hasAvailableTimes = useCallback((date: Date) => {
    return validTimesInTimezone.some(time => isSameDay(time, date))
  }, [validTimesInTimezone])

  // Auto-select today if it has available times
  useEffect(() => {
    if (selectedDate === null && validTimesInTimezone.length > 0 && initialLoad) {
      const today = new Date()
      console.log('Auto-selection check:', {
        today: today.toDateString(),
        hasAvailableToday: hasAvailableTimes(today),
        validTimesCount: validTimesInTimezone.length,
        weekDaysCount: weekDays.length
      })
      
      // First try to select today regardless of current week view
      if (hasAvailableTimes(today)) {
        console.log('Selecting today:', today.toDateString())
        setSelectedDate(today)
        setInitialLoad(false)
        return
      }
      
      // If today doesn't have available times, find first available date in current week
      const availableDates = weekDays.filter(date => hasAvailableTimes(date))
      if (availableDates.length > 0) {
        console.log('Selecting first available date:', availableDates[0].toDateString())
        setSelectedDate(availableDates[0])
        setInitialLoad(false)
      }
    }
  }, [validTimesInTimezone, selectedDate, hasAvailableTimes, weekDays, initialLoad])

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
      {/* Timezone Selector */}
      <div className="p-3 border-b bg-gray-50">
        <Form {...form}>
          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Timezone</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Intl.supportedValuesOf("timeZone").map(timezone => (
                      <SelectItem key={timezone} value={timezone}>
                        {timezone}
                        {` (${formatTimezoneOffset(timezone)})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between p-3 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('prev')}
          className="p-1"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center space-x-2">
          <h2 className="text-base font-semibold">
            {format(centerDate, "MMMM").toUpperCase()}
          </h2>
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('next')}
          className="p-1"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3">
        {/* Week Calendar - 7 days centered around current date */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {weekDays.map((day, index) => {
            const isAvailable = hasAvailableTimes(day)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isPastDay = day < new Date() && !isToday(day)
            const dayOfWeek = day.getDay()

            return (
              <div key={day.toISOString()} className="text-center">
                <div className="text-xs font-medium text-gray-500 mb-1">
                  {WEEKDAYS[dayOfWeek]}
                </div>
                <button
                  onClick={() => handleDateSelect(day)}
                  disabled={!isAvailable || isPastDay}
                  className={cn(
                    "w-full h-12 text-sm font-medium rounded-lg transition-colors",
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateTimeSlots('prev')}
                disabled={!canGoToPrevPage}
                className="p-1"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              
              <h3 className="font-medium text-center text-sm">
                {format(selectedDate, "EEEE, MMMM d")}
              </h3>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateTimeSlots('next')}
                disabled={!canGoToNextPage}
                className="p-1"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
            
            {availableTimesForDate.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {paginatedTimeSlots.map(time => (
                  <button
                    key={time.toISOString()}
                    onClick={() => handleTimeSelect(time)}
                    className={cn(
                      "px-3 py-2 rounded-lg border-2 transition-colors",
                      "text-center text-sm font-medium",
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
              <p className="text-gray-500 text-xs text-center">
                No available times for this date.
              </p>
            )}
            
            {/* Pagination indicator */}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-1 mt-2">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setTimeSlotPage(i)}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-colors",
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