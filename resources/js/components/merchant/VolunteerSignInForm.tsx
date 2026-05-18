import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FileText, Clock } from 'lucide-react'
import { useForm } from 'react-hook-form'

interface SignInFormData {
  eventId: string
  hoursLogged: number
  activities: string
  notes?: string
}

interface VolunteerSignInFormProps {
  eventId: string
  eventName: string
  onSubmit: (data: SignInFormData) => void
  onClose?: () => void
  minHours?: number
  maxHours?: number
}

export function VolunteerSignInForm({
  eventId,
  eventName,
  onSubmit,
  onClose,
  minHours = 0,
  maxHours = 24
}: VolunteerSignInFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<SignInFormData>({
    defaultValues: {
      eventId,
      hoursLogged: 0,
      activities: '',
      notes: ''
    }
  })

  const onSubmitForm = (data: SignInFormData) => {
    onSubmit(data)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Volunteer Sign-In
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {eventName}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div>
            <Label htmlFor="hoursLogged">
              Hours Logged <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="hoursLogged"
                type="number"
                step="0.5"
                min={minHours}
                max={maxHours}
                {...register('hoursLogged', {
                  required: 'Hours logged is required',
                  min: { value: minHours, message: `Minimum ${minHours} hours required` },
                  max: { value: maxHours, message: `Maximum ${maxHours} hours allowed` }
                })}
                className="pl-10"
              />
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            {errors.hoursLogged && (
              <p className="text-sm text-red-500 mt-1">{errors.hoursLogged.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Between {minHours} and {maxHours} hours
            </p>
          </div>

          <div>
            <Label htmlFor="activities">
              Activities Performed <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="activities"
              {...register('activities', {
                required: 'Please describe the activities you performed',
                minLength: { value: 20, message: 'Please provide at least 20 characters' }
              })}
              placeholder="Describe what you did during this volunteer session..."
              rows={4}
            />
            {errors.activities && (
              <p className="text-sm text-red-500 mt-1">{errors.activities.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any additional information..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-4">
            {onClose && (
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button type="submit" className="flex-1">
              Submit Sign-In
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Your submission will be reviewed before points are awarded.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

