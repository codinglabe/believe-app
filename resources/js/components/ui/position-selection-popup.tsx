// components/frontend/organization/position-selection-popup.tsx
import { useState, useEffect } from "react"
import { useForm } from "@inertiajs/react"
import { X, Plus, Trash2, Search } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/frontend/ui/dialog"
import { Label } from "@/components/frontend/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select"

interface Position {
  id: number
  name: string
  description?: string
  category: string
}

interface UserPosition {
  id?: number
  follower_position_id: number
  experience_level: 'beginner' | 'intermediate' | 'expert'
  years_of_experience: number
  skills: string
  portfolio_url: string
  is_primary: boolean
  follower_position?: Position
}

interface PositionSelectionPopupProps {
  isOpen: boolean
  onClose: () => void
  organizationId: number
  onSuccess: () => void
  allPositions: Record<string, Position[]>
  userPositions: UserPosition[]
}

export default function PositionSelectionPopup({
  isOpen,
  onClose,
  organizationId,
  onSuccess,
  allPositions,
  userPositions
}: PositionSelectionPopupProps) {
  const [positions, setPositions] = useState<UserPosition[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const { post, processing, errors } = useForm()

  // Initialize with user's existing positions or empty array
  useEffect(() => {
    if (userPositions && userPositions.length > 0) {
      setPositions(userPositions.map(up => ({
        follower_position_id: up.follower_position_id,
        experience_level: up.experience_level,
        years_of_experience: up.years_of_experience,
        skills: up.skills || '',
        portfolio_url: up.portfolio_url || '',
        is_primary: up.is_primary,
        follower_position: up.follower_position
      })))
    } else {
      // Start with one empty position
      setPositions([{
        follower_position_id: 0,
        experience_level: 'intermediate',
        years_of_experience: 0,
        skills: '',
        portfolio_url: '',
        is_primary: true
      }])
    }

  }, [userPositions])

  const filteredPositions = Object.entries(allPositions).reduce((acc, [category, categoryPositions]) => {
    if (selectedCategory === "all" || category === selectedCategory) {
      const filtered = categoryPositions.filter(position =>
        position.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      if (filtered.length > 0) {
        acc[category] = filtered
      }
    }
    return acc
  }, {} as Record<string, Position[]>)

  const addPosition = () => {
    setPositions(prev => [...prev, {
      follower_position_id: 0,
      experience_level: 'intermediate',
      years_of_experience: 0,
      skills: '',
      portfolio_url: '',
      is_primary: false
    }])
  }

  const removePosition = (index: number) => {
    setPositions(prev => prev.filter((_, i) => i !== index))
  }

  const updatePosition = (index: number, field: string, value: any) => {
    setPositions(prev => prev.map((pos, i) =>
      i === index ? { ...pos, [field]: value } : pos
    ))
  }

  const handleSubmit = async () => {
  // Validate
  const hasEmptyPositions = positions.some(pos => !pos.follower_position_id)
  if (hasEmptyPositions) {
    alert("Please select a position for all entries")
    return
  }

  try {
    const response = await fetch(route('user.organizations.save-positions-and-follow', organizationId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        positions: positions,
      }),
    })

    const data = await response.json()

    if (data.success) {
      onSuccess(organizationId)
      onClose()
    } else {
      alert(data.message || 'Failed to save positions and follow organization')
    }
  } catch (error) {
    console.error('Error saving positions:', error)
    alert('An error occurred while saving your positions. Please try again.')
  }
}

  const getAvailablePositions = (currentIndex: number) => {
    const selectedIds = positions
      .filter((_, index) => index !== currentIndex)
      .map(pos => pos.follower_position_id)
      .filter(id => id !== 0)

    return Object.values(allPositions).flat().filter(pos =>
      !selectedIds.includes(pos.id)
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Your Positions</DialogTitle>
          <p className="text-sm text-gray-600">
            Tell us about your roles and expertise before following this organization
          </p>
        </DialogHeader>

        {/* Search and Filter */}
        <div className="space-y-4">
          {/* <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search positions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.keys(allPositions).map(category => (
                  <SelectItem key={category} value={category}>
                    {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div> */}

          {/* Position Forms */}
          <div className="space-y-6">
            {positions.map((position, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Position #{index + 1}</h3>
                  {positions.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePosition(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`position-${index}`}>Position *</Label>
                    <Select
                      value={position.follower_position_id.toString()}
                      onValueChange={(value) => updatePosition(index, 'follower_position_id', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a position" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailablePositions(index).map(pos => (
                          <SelectItem key={pos.id} value={pos.id.toString()}>
                            {pos.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`experience-${index}`}>Experience Level *</Label>
                    <Select
                      value={position.experience_level}
                      onValueChange={(value: 'beginner' | 'intermediate' | 'expert') =>
                        updatePosition(index, 'experience_level', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
                        <SelectItem value="intermediate">Intermediate (2-5 years)</SelectItem>
                        <SelectItem value="expert">Expert (5+ years)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`years-${index}`}>Years of Experience *</Label>
                    <Input
                      type="number"
                      min="0"
                      value={position.years_of_experience}
                      onChange={(e) => updatePosition(index, 'years_of_experience', parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`skills-${index}`}>Skills</Label>
                    <Input
                      placeholder="e.g., Leadership, Teaching, Management"
                      value={position.skills}
                      onChange={(e) => updatePosition(index, 'skills', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`portfolio-${index}`}>Portfolio URL</Label>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={position.portfolio_url}
                      onChange={(e) => updatePosition(index, 'portfolio_url', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`primary-${index}`}
                    checked={position.is_primary}
                    onChange={(e) => updatePosition(index, 'is_primary', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor={`primary-${index}`} className="text-sm">
                    This is my primary position
                  </Label>
                </div>
              </div>
            ))}
          </div>

          {/* Add More Button */}
          <Button
            type="button"
            variant="outline"
            onClick={addPosition}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Position
          </Button>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={processing || positions.length === 0}
            >
              {processing ? "Saving..." : "Save Positions & Follow"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
