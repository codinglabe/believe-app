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
import { Link, router, useForm, Head } from "@inertiajs/react"
import { useState } from "react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

export default function CreateSellerProfile() {
  const { data, setData, post, processing, errors } = useForm({
    profile_image: null as File | null,
    bio: '',
    location: '',
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

  const [newSkill, setNewSkill] = useState("")
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const handleAddSkill = () => {
    if (newSkill.trim() && !data.skills.includes(newSkill.trim())) {
      setData('skills', [...data.skills, newSkill.trim()])
      setNewSkill("")
    }
  }

  const handleRemoveSkill = (skill: string) => {
    setData('skills', data.skills.filter((s) => s !== skill))
  }

  const handleAddLanguage = () => {
    setData('languages', [...data.languages, { name: '', level: 'basic' }])
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setData('profile_image', file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const formData = new FormData()

    // Handle profile image
    if (data.profile_image) {
      formData.append('profile_image', data.profile_image)
    }

    // Handle basic fields
    formData.append('bio', data.bio)
    if (data.location) formData.append('location', data.location)
    if (data.timezone) formData.append('timezone', data.timezone)
    if (data.phone) formData.append('phone', data.phone)
    if (data.response_time) formData.append('response_time', data.response_time)
    if (data.website) formData.append('website', data.website)
    if (data.linkedin) formData.append('linkedin', data.linkedin)
    if (data.twitter) formData.append('twitter', data.twitter)
    if (data.facebook) formData.append('facebook', data.facebook)
    if (data.instagram) formData.append('instagram', data.instagram)

    // Handle skills array
    if (data.skills.length > 0) {
      data.skills.forEach((skill) => {
        formData.append('skills[]', skill)
      })
    }

    // Handle languages array (only include valid entries)
    const validLanguages = data.languages.filter(lang => lang.name && lang.name.trim() !== '')
    validLanguages.forEach((lang, index) => {
      formData.append(`languages[${index}][name]`, lang.name)
      formData.append(`languages[${index}][level]`, lang.level)
    })

    // Handle education array (only include valid entries)
    const validEducation = data.education.filter(edu => edu.institution && edu.institution.trim() !== '' && edu.degree && edu.degree.trim() !== '')
    validEducation.forEach((edu, index) => {
      formData.append(`education[${index}][institution]`, edu.institution)
      formData.append(`education[${index}][degree]`, edu.degree)
      if (edu.year) {
        formData.append(`education[${index}][year]`, edu.year.toString())
      }
    })

    // Handle experience array (only include valid entries)
    const validExperience = data.experience.filter(exp => exp.company && exp.company.trim() !== '' && exp.position && exp.position.trim() !== '' && exp.duration && exp.duration.trim() !== '')
    validExperience.forEach((exp, index) => {
      formData.append(`experience[${index}][company]`, exp.company)
      formData.append(`experience[${index}][position]`, exp.position)
      formData.append(`experience[${index}][duration]`, exp.duration)
    })

    router.post('/service-hub/seller-profile', formData, {
      forceFormData: true,
      onSuccess: () => {
        showSuccessToast("Seller profile created successfully!")
      },
      onError: () => {
        showErrorToast("Failed to create seller profile. Please check all fields.")
      },
    })
  }

  const getError = (fieldName: string): string | null => {
    if (!errors) return null
    const error = (errors as any)[fieldName]
    if (!error) return null
    return Array.isArray(error) ? error[0] : error
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

            {/* Skills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Skills
                  </CardTitle>
                  <CardDescription>Add your top skills and expertise areas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill (e.g., Logo Design, Web Development)"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                    />
                    <Button type="button" onClick={handleAddSkill}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {data.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="gap-2 text-sm py-1 px-3">
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  {getError('skills') && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                      {getError('skills')}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Languages */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Languages className="h-5 w-5" />
                    Languages
                  </CardTitle>
                  <CardDescription>Add languages you speak</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.languages.map((lang, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input
                          placeholder="Language (e.g., English)"
                          value={lang.name}
                          onChange={(e) => handleUpdateLanguage(index, 'name', e.target.value)}
                          className={getError(`languages.${index}.name`) ? 'border-red-500' : ''}
                        />
                        <select
                          value={lang.level}
                          onChange={(e) => handleUpdateLanguage(index, 'level', e.target.value)}
                          className={`px-3 py-2 rounded-md border bg-background ${getError(`languages.${index}.level`) ? 'border-red-500' : ''}`}
                        >
                          <option value="basic">Basic</option>
                          <option value="conversational">Conversational</option>
                          <option value="fluent">Fluent</option>
                          <option value="native">Native</option>
                        </select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLanguage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={handleAddLanguage} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Language
                  </Button>
                  {getError('languages') && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {getError('languages')}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Education */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
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
                    <div key={index} className="p-4 border rounded-lg space-y-3">
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label>Institution *</Label>
                          <Input
                            placeholder="University/School name"
                            value={edu.institution}
                            onChange={(e) => handleUpdateEducation(index, 'institution', e.target.value)}
                            className={getError(`education.${index}.institution`) ? 'border-red-500' : ''}
                          />
                        </div>
                        <div>
                          <Label>Degree *</Label>
                          <Input
                            placeholder="Degree/Certification"
                            value={edu.degree}
                            onChange={(e) => handleUpdateEducation(index, 'degree', e.target.value)}
                            className={getError(`education.${index}.degree`) ? 'border-red-500' : ''}
                          />
                        </div>
                        <div>
                          <Label>Year</Label>
                          <Input
                            type="number"
                            placeholder="Graduation year"
                            value={edu.year || ''}
                            onChange={(e) => handleUpdateEducation(index, 'year', e.target.value ? parseInt(e.target.value) : null)}
                            className={getError(`education.${index}.year`) ? 'border-red-500' : ''}
                          />
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

            {/* Experience */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
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
                    <div key={index} className="p-4 border rounded-lg space-y-3">
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label>Company *</Label>
                          <Input
                            placeholder="Company name"
                            value={exp.company}
                            onChange={(e) => handleUpdateExperience(index, 'company', e.target.value)}
                            className={getError(`experience.${index}.company`) ? 'border-red-500' : ''}
                          />
                        </div>
                        <div>
                          <Label>Position *</Label>
                          <Input
                            placeholder="Job title"
                            value={exp.position}
                            onChange={(e) => handleUpdateExperience(index, 'position', e.target.value)}
                            className={getError(`experience.${index}.position`) ? 'border-red-500' : ''}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Duration *</Label>
                          <Input
                            placeholder="e.g., Jan 2020 - Present, 2 years"
                            value={exp.duration}
                            onChange={(e) => handleUpdateExperience(index, 'duration', e.target.value)}
                            className={getError(`experience.${index}.duration`) ? 'border-red-500' : ''}
                          />
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

            {/* Social Links */}
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
                  <CardDescription>Add links to your portfolio and social media</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="website">
                      <Globe className="h-4 w-4 inline mr-2" />
                      Website/Portfolio
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://yourwebsite.com"
                      value={data.website}
                      onChange={(e) => setData('website', e.target.value)}
                      className={`mt-2 ${getError('website') ? 'border-red-500' : ''}`}
                    />
                    {getError('website') && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {getError('website')}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="linkedin">LinkedIn</Label>
                      <Input
                        id="linkedin"
                        type="url"
                        placeholder="https://linkedin.com/in/yourprofile"
                        value={data.linkedin}
                        onChange={(e) => setData('linkedin', e.target.value)}
                        className={`mt-2 ${getError('linkedin') ? 'border-red-500' : ''}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="twitter">Twitter</Label>
                      <Input
                        id="twitter"
                        type="url"
                        placeholder="https://twitter.com/yourhandle"
                        value={data.twitter}
                        onChange={(e) => setData('twitter', e.target.value)}
                        className={`mt-2 ${getError('twitter') ? 'border-red-500' : ''}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="facebook">Facebook</Label>
                      <Input
                        id="facebook"
                        type="url"
                        placeholder="https://facebook.com/yourpage"
                        value={data.facebook}
                        onChange={(e) => setData('facebook', e.target.value)}
                        className={`mt-2 ${getError('facebook') ? 'border-red-500' : ''}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="instagram">Instagram</Label>
                      <Input
                        id="instagram"
                        type="url"
                        placeholder="https://instagram.com/yourhandle"
                        value={data.instagram}
                        onChange={(e) => setData('instagram', e.target.value)}
                        className={`mt-2 ${getError('instagram') ? 'border-red-500' : ''}`}
                      />
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

