"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Textarea } from "@/components/frontend/ui/textarea"
import { Label } from "@/components/frontend/ui/label"
import { Badge } from "@/components/frontend/ui/badge"
import {
  ArrowLeft,
  Upload,
  X,
  Plus,
  User,
  MapPin,
  Phone,
  Globe,
  Clock,
  GraduationCap,
  Briefcase,
  Languages,
  Award,
  Link as LinkIcon,
  Save,
} from "lucide-react"
import { Link, router, useForm, Head, usePage } from "@inertiajs/react"
import { useState } from "react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface State {
  state: string
  state_code: string
  base_sales_tax_rate: number
}

interface PageProps {
  states?: State[]
  all_skills: string[]
  all_languages: string[]
}

export default function CreateSellerProfile() {
  const { states = [], all_skills = [], all_languages = [] } = usePage<PageProps>().props

  const { data, setData, post, processing, errors } = useForm({
    profile_image: null as File | null,
    bio: '',
    location: '',
    state: '',
    timezone: '',
    phone: '',
    skills: [] as string[],
    languages: [] as Array<{ name: string; level: string }>,
    education: [] as Array<{ institution: string; degree: string; year: number | null }>,
    experience: [] as Array<{ company: string; position: string; duration: string }>,
    response_time: '',
    website: '',
    linkedin: '',
    twitter: '',
    facebook: '',
    instagram: '',
  })

  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // ── Language Add State (duplicate prevention) ──────────────────────
  const [newLanguageName, setNewLanguageName] = useState("")
  const [newLanguageLevel, setNewLanguageLevel] = useState("basic")
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  // ── Improved getError (supports array fields like education.0.institution) ──
  const getError = (fieldName: string): string | null => {
    if (!errors) return null

    // Direct match
    if ((errors as any)[fieldName]) {
      const err = (errors as any)[fieldName]
      return Array.isArray(err) ? err[0] : err
    }

    // Array field match (education.0.institution, etc.)
    const keys = Object.keys(errors as any)
    const matching = keys.find(k => k === fieldName || k.startsWith(fieldName + '.'))
    if (matching) {
      const err = (errors as any)[matching]
      return Array.isArray(err) ? err[0] : err
    }

    return null
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setData('profile_image', file)
      const reader = new FileReader()
      reader.onloadend = () => setPreviewImage(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleAddNewLanguage = () => {
    if (!newLanguageName || !newLanguageLevel) return

    const isDuplicate = data.languages.some(lang => lang.name === newLanguageName)

    if (isDuplicate) {
      setDuplicateWarning(`"${newLanguageName}" is already added. Each language can only be added once.`)
      setTimeout(() => setDuplicateWarning(null), 5000)
      return
    }

    setData('languages', [
      ...data.languages,
      { name: newLanguageName, level: newLanguageLevel }
    ])

    setNewLanguageName("")
    setNewLanguageLevel("basic")
    setDuplicateWarning(null)
  }

  const handleUpdateLanguage = (index: number, field: 'name' | 'level', value: string) => {
    const updated = data.languages.map((lang, i) =>
      i === index ? { ...lang, [field]: value } : lang
    )
    setData('languages', updated)
  }

  const handleRemoveLanguage = (index: number) => {
    setData('languages', data.languages.filter((_, i) => i !== index))
  }

  // ── Education & Experience handlers remain the same ──
  const handleAddEducation = () => {
    setData('education', [...data.education, { institution: '', degree: '', year: null }])
  }

  const handleUpdateEducation = (index: number, field: string, value: string | number | null) => {
    const updated = data.education.map((edu, i) =>
      i === index ? { ...edu, [field]: value } : edu
    )
    setData('education', updated)
  }

  const handleRemoveEducation = (index: number) => {
    setData('education', data.education.filter((_, i) => i !== index))
  }

  const handleAddExperience = () => {
    setData('experience', [...data.experience, { company: '', position: '', duration: '' }])
  }

  const handleUpdateExperience = (index: number, field: string, value: string) => {
    const updated = data.experience.map((exp, i) =>
      i === index ? { ...exp, [field]: value } : exp
    )
    setData('experience', updated)
  }

  const handleRemoveExperience = (index: number) => {
    setData('experience', data.experience.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const formData = new FormData()

    if (data.profile_image) {
      formData.append('profile_image', data.profile_image)
    }

    formData.append('bio', data.bio)
    if (data.location) formData.append('location', data.location)
    formData.append('state', data.state)
    if (data.timezone) formData.append('timezone', data.timezone)
    if (data.phone) formData.append('phone', data.phone)
    if (data.response_time) formData.append('response_time', data.response_time)

    // Social links
    if (data.website) formData.append('website', data.website)
    if (data.linkedin) formData.append('linkedin', data.linkedin)
    if (data.twitter) formData.append('twitter', data.twitter)
    if (data.facebook) formData.append('facebook', data.facebook)
    if (data.instagram) formData.append('instagram', data.instagram)

    // Skills
    data.skills.forEach(skill => formData.append('skills[]', skill))

    // Languages (send all - backend will handle)
    data.languages.forEach((lang, i) => {
      formData.append(`languages[${i}][name]`, lang.name)
      formData.append(`languages[${i}][level]`, lang.level)
    })

    // Education (send all - backend validates)
    data.education.forEach((edu, i) => {
      formData.append(`education[${i}][institution]`, edu.institution || '')
      formData.append(`education[${i}][degree]`, edu.degree || '')
      if (edu.year !== null && edu.year !== undefined) {
        formData.append(`education[${i}][year]`, edu.year.toString())
      }
    })

    // Experience (send all)
    data.experience.forEach((exp, i) => {
      formData.append(`experience[${i}][company]`, exp.company || '')
      formData.append(`experience[${i}][position]`, exp.position || '')
      formData.append(`experience[${i}][duration]`, exp.duration || '')
    })

    post('/service-hub/seller-profile', {
      forceFormData: true,
      onSuccess: () => {
        showSuccessToast("Seller profile created successfully!")
      },
      onError: (err) => {
        console.log("Validation errors:", err) // debug
        showErrorToast("Please check the form for errors")
      },
    })
  }

  return (
    <FrontendLayout>
      <Head title="Create Seller Profile - Service Hub" />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/service-hub">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Create Your Seller Profile</h1>
                <p className="text-sm text-muted-foreground">Tell buyers about yourself and your expertise</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
            {/* Profile Image */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Picture
                  </CardTitle>
                  <CardDescription>Add a professional profile picture</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full overflow-hidden bg-muted border-4 border-background shadow-lg">
                        {previewImage ? (
                          <img src={previewImage} alt="Profile preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="h-16 w-16 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="profile_image">Upload Profile Picture</Label>
                      <Input
                        id="profile_image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="mt-2"
                      />
                      {getError('profile_image') && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {getError('profile_image')}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-2">
                        JPG, PNG or GIF. Max size 2MB
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Bio */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    About You
                  </CardTitle>
                  <CardDescription>Tell buyers about yourself and your experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="bio">
                      Bio <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell buyers about yourself, your expertise, and what makes you unique..."
                      value={data.bio}
                      onChange={(e) => setData('bio', e.target.value)}
                      className={`mt-2 ${getError('bio') ? 'border-red-500' : ''}`}
                      rows={6}
                    />
                    {getError('bio') && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {getError('bio')}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">
                        <MapPin className="h-4 w-4 inline mr-2" />
                        Location
                      </Label>
                      <Input
                        id="location"
                        placeholder="e.g., New York, USA"
                        value={data.location}
                        onChange={(e) => setData('location', e.target.value)}
                        className={`mt-2 ${getError('location') ? 'border-red-500' : ''}`}
                      />
                      {getError('location') && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {getError('location')}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="state">
                        State <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id="state"
                        value={data.state}
                        onChange={(e) => setData('state', e.target.value)}
                        className={`mt-2 w-full px-3 py-2 rounded-md border bg-background ${getError('state') ? 'border-red-500' : ''}`}
                        required
                      >
                        <option value="">Select your state</option>
                        {states.map((state) => (
                          <option key={state.state_code} value={state.state_code}>
                            {state.state}
                          </option>
                        ))}
                      </select>
                      {getError('state') && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {getError('state')}
                        </p>
                      )}
                      {/* {data.state && (
                        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                            <strong>Sales Tax Rate:</strong> {states.find(s => s.state_code === data.state)?.base_sales_tax_rate || 0}%
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                            This rate will be applied to all orders you receive. Buyers will pay this sales tax on top of the service price.
                          </p>
                        </div>
                      )} */}
                    </div>

                    <div>
                      <Label htmlFor="phone">
                        <Phone className="h-4 w-4 inline mr-2" />
                        Phone
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={data.phone}
                        onChange={(e) => setData('phone', e.target.value)}
                        className={`mt-2 ${getError('phone') ? 'border-red-500' : ''}`}
                      />
                      {getError('phone') && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {getError('phone')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="response_time">
                      <Clock className="h-4 w-4 inline mr-2" />
                      Response Time
                    </Label>
                    <select
                      id="response_time"
                      value={data.response_time}
                      onChange={(e) => setData('response_time', e.target.value)}
                      className={`mt-2 w-full px-3 py-2 rounded-md border bg-background ${getError('response_time') ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select response time</option>
                      <option value="Within 1 hour">Within 1 hour</option>
                      <option value="Within 2 hours">Within 2 hours</option>
                      <option value="Within 24 hours">Within 24 hours</option>
                      <option value="Within 2-3 days">Within 2-3 days</option>
                    </select>
                    {getError('response_time') && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {getError('response_time')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Skills - Checkbox grid + selected pills */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Skills
                  </CardTitle>
                  <CardDescription>Select all skills that apply to you</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Selected pills */}
                    <div>
                      <Label className="text-base font-medium">Selected Skills</Label>
                      <div className="flex flex-wrap gap-2 mt-3 min-h-[44px]">
                        {data.skills.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">No skills selected yet</p>
                        ) : (
                          data.skills.map(skill => (
                            <Badge
                              key={skill}
                              variant="secondary"
                              className="px-3 py-1.5 text-sm gap-2 bg-primary/10 hover:bg-primary/20 transition-colors"
                            >
                              {skill}
                              <button
                                type="button"
                                onClick={() => setData("skills", data.skills.filter(s => s !== skill))}
                                className="text-primary hover:text-primary/70"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Checkbox grid */}
                    <div>
                      <Label className="text-base font-medium mb-3 block">
                        Choose your skills ({data.skills.length} / {all_skills.length} selected)
                      </Label>
                      <div className="max-h-[380px] overflow-y-auto pr-2 border rounded-lg p-4 bg-muted/30">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {all_skills.map(skill => (
                            <label
                              key={skill}
                              htmlFor={`skill-${skill}`}
                              className={`
                                flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-all
                                ${data.skills.includes(skill) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}
                              `}
                            >
                              <input
                                type="checkbox"
                                id={`skill-${skill}`}
                                checked={data.skills.includes(skill)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setData("skills", [...data.skills, skill])
                                  } else {
                                    setData("skills", data.skills.filter(s => s !== skill))
                                  }
                                }}
                                className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                              />
                              <span className="text-sm">{skill}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {errors.skills && (
                    <p className="text-sm text-red-600 mt-4">{errors.skills}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Languages - Duplicate safe + nice list */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Languages className="h-5 w-5" />
                    Languages You Speak
                  </CardTitle>
                  <CardDescription>
                    Add languages you speak fluently or professionally (each only once)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Selected languages */}
                  {data.languages.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Added Languages</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {data.languages.map((lang, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                          >
                            <div>
                              <span className="font-medium">{lang.name}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                • {lang.level.charAt(0).toUpperCase() + lang.level.slice(1)}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRemoveLanguage(index)}
                            >
                              <X className="h-5 w-5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add new */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div>
                      <Label>Language</Label>
                      <select
                        value={newLanguageName}
                        onChange={e => setNewLanguageName(e.target.value)}
                        className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select language</option>
                        {all_languages
                          .filter(lang => !data.languages.some(l => l.name === lang))
                          .map(name => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <Label>Proficiency Level</Label>
                      <select
                        value={newLanguageLevel}
                        onChange={e => setNewLanguageLevel(e.target.value)}
                        className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <option value="basic">Basic</option>
                        <option value="conversational">Conversational</option>
                        <option value="fluent">Fluent</option>
                        <option value="native">Native</option>
                      </select>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={handleAddNewLanguage}
                      disabled={!newLanguageName || !newLanguageLevel}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Language
                    </Button>
                  </div>

                  {duplicateWarning && (
                    <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                      {duplicateWarning}
                    </p>
                  )}

                  {errors.languages && (
                    <p className="text-sm text-red-600 mt-2">
                      {typeof errors.languages === 'string' ? errors.languages : 'Please check language entries'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Education - with per-field errors */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Education
                  </CardTitle>
                  <CardDescription>Add your educational background</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.education.map((edu, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-4 bg-muted/20">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold">Education #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEducation(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Institution</Label>
                          <Input
                            placeholder="University/School name"
                            value={edu.institution}
                            onChange={e => handleUpdateEducation(index, 'institution', e.target.value)}
                            className={`mt-1 ${getError(`education.${index}.institution`) ? 'border-red-500 focus:ring-red-500' : ''}`}
                          />
                          {getError(`education.${index}.institution`) && (
                            <p className="text-xs text-red-600 mt-1">
                              {getError(`education.${index}.institution`)}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label>Degree</Label>
                          <Input
                            placeholder="Degree/Certification"
                            value={edu.degree}
                            onChange={e => handleUpdateEducation(index, 'degree', e.target.value)}
                            className={`mt-1 ${getError(`education.${index}.degree`) ? 'border-red-500 focus:ring-red-500' : ''}`}
                          />
                          {getError(`education.${index}.degree`) && (
                            <p className="text-xs text-red-600 mt-1">
                              {getError(`education.${index}.degree`)}
                            </p>
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <Label>Year (Optional)</Label>
                          <Input
                            type="number"
                            placeholder="e.g., 2023"
                            min="1900"
                            max={new Date().getFullYear()}
                            value={edu.year || ''}
                            onChange={e => handleUpdateEducation(index, 'year', e.target.value ? parseInt(e.target.value) : null)}
                            className={`mt-1 ${getError(`education.${index}.year`) ? 'border-red-500 focus:ring-red-500' : ''}`}
                          />
                          {getError(`education.${index}.year`) && (
                            <p className="text-xs text-red-600 mt-1">
                              {getError(`education.${index}.year`)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button type="button" variant="outline" onClick={handleAddEducation} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Education
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Experience - with per-field errors */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Professional Experience
                  </CardTitle>
                  <CardDescription>Add your work experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.experience.map((exp, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-4 bg-muted/20">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold">Experience #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveExperience(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Company</Label>
                          <Input
                            placeholder="Company name"
                            value={exp.company}
                            onChange={e => handleUpdateExperience(index, 'company', e.target.value)}
                            className={`mt-1 ${getError(`experience.${index}.company`) ? 'border-red-500 focus:ring-red-500' : ''}`}
                          />
                          {getError(`experience.${index}.company`) && (
                            <p className="text-xs text-red-600 mt-1">
                              {getError(`experience.${index}.company`)}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label>Position</Label>
                          <Input
                            placeholder="Job title"
                            value={exp.position}
                            onChange={e => handleUpdateExperience(index, 'position', e.target.value)}
                            className={`mt-1 ${getError(`experience.${index}.position`) ? 'border-red-500 focus:ring-red-500' : ''}`}
                          />
                          {getError(`experience.${index}.position`) && (
                            <p className="text-xs text-red-600 mt-1">
                              {getError(`experience.${index}.position`)}
                            </p>
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <Label>Duration</Label>
                          <Input
                            placeholder="e.g., Jan 2020 - Present, 2 years"
                            value={exp.duration}
                            onChange={e => handleUpdateExperience(index, 'duration', e.target.value)}
                            className={`mt-1 ${getError(`experience.${index}.duration`) ? 'border-red-500 focus:ring-red-500' : ''}`}
                          />
                          {getError(`experience.${index}.duration`) && (
                            <p className="text-xs text-red-600 mt-1">
                              {getError(`experience.${index}.duration`)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button type="button" variant="outline" onClick={handleAddExperience} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Experience
                  </Button>
                </CardContent>
              </Card>
            </motion.div>


{/* Social Links Section */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.45 }}
>
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <LinkIcon className="h-5 w-5" />
        Social Links & Portfolio
      </CardTitle>
      <CardDescription>
        Just enter username or domain (we will add https:// automatically)
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div>
        <Label htmlFor="website">
          <Globe className="h-4 w-4 inline mr-2" />
          Website / Portfolio
        </Label>
        <Input
          id="website"
          type="text"  // ← url এর বদলে text করা যায়, কারণ আমরা নিজেরা https যোগ করব
          placeholder="believeinunity.org"
          value={data.website}
          onChange={(e) => setData('website', e.target.value.trim())}
          className={`mt-2 ${getError('website') ? 'border-red-500' : ''}`}
        />
        {data.website && !data.website.startsWith('http') && (
          <p className="text-xs text-muted-foreground mt-1">
            Will be saved as: https://{data.website}
          </p>
        )}
        {getError('website') && (
          <p className="text-sm text-red-600 mt-1">{getError('website')}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="linkedin">LinkedIn</Label>
          <Input
            id="linkedin"
            type="text"
            placeholder="in/yourusername"
            value={data.linkedin}
            onChange={(e) => setData('linkedin', e.target.value.trim())}
            className={`mt-2 ${getError('linkedin') ? 'border-red-500' : ''}`}
          />
          {data.linkedin && !data.linkedin.startsWith('http') && (
            <p className="text-xs text-muted-foreground mt-1">
              Will be saved as: https://linkedin.com/{data.linkedin}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="twitter">Twitter / X</Label>
          <Input
            id="twitter"
            type="text"
            placeholder="yourhandle"
            value={data.twitter}
            onChange={(e) => setData('twitter', e.target.value.trim())}
            className={`mt-2 ${getError('twitter') ? 'border-red-500' : ''}`}
          />
          {data.twitter && (
            <p className="text-xs text-muted-foreground mt-1">
              Will be saved as: https://twitter.com/{data.twitter.replace('@', '')}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="facebook">Facebook</Label>
          <Input
            id="facebook"
            type="text"
            placeholder="yourpage"
            value={data.facebook}
            onChange={(e) => setData('facebook', e.target.value.trim())}
            className={`mt-2 ${getError('facebook') ? 'border-red-500' : ''}`}
          />
          {data.facebook && (
            <p className="text-xs text-muted-foreground mt-1">
              Will be saved as: https://facebook.com/{data.facebook}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="instagram">Instagram</Label>
          <Input
            id="instagram"
            type="text"
            placeholder="yourhandle"
            value={data.instagram}
            onChange={(e) => setData('instagram', e.target.value.trim())}
            className={`mt-2 ${getError('instagram') ? 'border-red-500' : ''}`}
          />
          {data.instagram && (
            <p className="text-xs text-muted-foreground mt-1">
              Will be saved as: https://instagram.com/{data.instagram}
            </p>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
</motion.div>
            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex justify-end gap-4"
            >
              <Link href="/service-hub">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" size="lg" disabled={processing} className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Save className="mr-2 h-5 w-5" />
                {processing ? 'Creating...' : 'Create Profile'}
              </Button>
            </motion.div>
          </form>
        </div>
      </div>
    </FrontendLayout>
  )
}

