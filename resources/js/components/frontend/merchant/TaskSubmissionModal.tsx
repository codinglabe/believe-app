import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/frontend/ui/dialog'
import { Button } from '@/components/frontend/ui/button'
import { Input } from '@/components/ui/input'
import { ImageUploadDropzone } from '@/components/ImageUploadDropzone'
import { X, Upload, Link as LinkIcon, Camera, Loader2 } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface TaskSubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  task: {
    id: string
    category: string
    subcategory: string
  }
  onSubmit: (data: {
    taskId: string
    proofType: 'screenshot' | 'link' | 'both'
    screenshot?: string
    link?: string
    notes?: string
  }) => Promise<void>
}

export function TaskSubmissionModal({ isOpen, onClose, task, onSubmit }: TaskSubmissionModalProps) {
  const [proofType, setProofType] = useState<'screenshot' | 'link' | 'both'>('screenshot')
  const [screenshot, setScreenshot] = useState<string>('')
  const [link, setLink] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    // Validation
    if (proofType === 'screenshot' && !screenshot) {
      showErrorToast('Please upload a screenshot as proof')
      return
    }
    if (proofType === 'link' && !link.trim()) {
      showErrorToast('Please provide a link as proof')
      return
    }
    if (proofType === 'both' && (!screenshot || !link.trim())) {
      showErrorToast('Please provide both screenshot and link as proof')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        taskId: task.id,
        proofType,
        screenshot: proofType === 'screenshot' || proofType === 'both' ? screenshot : undefined,
        link: proofType === 'link' || proofType === 'both' ? link.trim() : undefined,
        notes: notes.trim() || undefined,
      })
      showSuccessToast('Task submission sent! Your proof will be reviewed.')
      handleClose()
    } catch (error) {
      showErrorToast('Failed to submit task. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setProofType('screenshot')
    setScreenshot('')
    setLink('')
    setNotes('')
    setIsSubmitting(false)
    onClose()
  }

  const getProofTypeLabel = (type: string) => {
    switch (type) {
      case 'screenshot':
        return 'Screenshot'
      case 'link':
        return 'Link/URL'
      case 'both':
        return 'Both Screenshot & Link'
      default:
        return type
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Submit Proof for Task</DialogTitle>
          <DialogDescription>
            Complete the task: <span className="font-semibold">{task.subcategory}</span>
            <br />
            Category: <span className="text-muted-foreground">{task.category}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Proof Type Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Proof Type</label>
            <div className="grid grid-cols-3 gap-3">
              {(['screenshot', 'link', 'both'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setProofType(type)}
                  className={`
                    p-3 rounded-lg border-2 transition-all text-sm font-medium
                    ${proofType === type
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground'
                    }
                  `}
                >
                  {type === 'screenshot' && <Camera className="w-4 h-4 mx-auto mb-1" />}
                  {type === 'link' && <LinkIcon className="w-4 h-4 mx-auto mb-1" />}
                  {type === 'both' && <Upload className="w-4 h-4 mx-auto mb-1" />}
                  {getProofTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          {/* Screenshot Upload */}
          {(proofType === 'screenshot' || proofType === 'both') && (
            <div>
              <ImageUploadDropzone
                label="Screenshot Proof"
                value={screenshot}
                onChange={setScreenshot}
                required={proofType === 'screenshot' || proofType === 'both'}
                maxSizeMB={5}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Upload a screenshot showing you completed the task (e.g., showing you liked, commented, shared, etc.)
              </p>
            </div>
          )}

          {/* Link Input */}
          {(proofType === 'link' || proofType === 'both') && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Link/URL Proof {proofType === 'link' || proofType === 'both' ? <span className="text-red-500">*</span> : ''}
              </label>
              <Input
                type="url"
                placeholder="https://example.com/your-post"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Provide a link to the post, comment, or content where you completed the task
              </p>
            </div>
          )}

          {/* Additional Notes */}
          <div>
            <label className="text-sm font-medium mb-2 block">Additional Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional information about your submission..."
              className="w-full min-h-[100px] p-3 border border-border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Submit Proof
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
