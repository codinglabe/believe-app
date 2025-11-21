"use client"

import { useEffect, useMemo, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import type { LucideIcon } from "lucide-react"
import { Head, useForm, usePage } from "@inertiajs/react"
import { route } from "ziggy-js"
import {
  Plus,
  Save,
  Target,
  Sparkles,
  Users,
  Layers,
  Info,
  ListChecks,
  LayoutList,
  BookOpen,
  HeartHandshake,
  Star,
  Flag,
  ArrowRightCircle,
  XCircle,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/admin/ui/button"
import { Input } from "@/components/admin/ui/input"
import { Textarea } from "@/components/admin/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface StatItem {
  label: string
  value: string
  icon?: string | null
}

interface OfferingItem {
  title: string
  description: string
  tagline?: string | null
  icon?: string | null
}

interface StorySection {
  title: string
  paragraphs: string[]
}

interface TeamMember {
  name: string
  role?: string | null
  image?: string | null
  bio?: string | null
}

interface ValueItem {
  title: string
  description?: string | null
  icon?: string | null
}

interface CtaButton {
  text: string
  href?: string | null
  variant?: "primary" | "secondary" | "outline" | null
}

interface AboutPageContentProps {
  hero: {
    title: string
    subtitle?: string | null
    description?: string | null
    background_image?: string | null
  }
  mission: {
    title: string
    description?: string | null
    icon?: string | null
    image?: string | null
  }
  vision: {
    title: string
    description?: string | null
    icon?: string | null
  }
  stats: StatItem[]
  offerings: OfferingItem[]
  story: StorySection
  team: TeamMember[]
  values: ValueItem[]
  reasons: string[]
  cta: {
    title: string
    subtitle?: string | null
    description?: string | null
    buttons: CtaButton[]
  }
}

interface AdminAboutPageProps {
  content: AboutPageContentProps
  iconOptions: string[]
}

const navItems = [
  { id: "hero", label: "Hero & Intro", icon: Sparkles },
  { id: "mission-vision", label: "Mission & Vision", icon: Target },
  { id: "stats", label: "Impact Stats", icon: Users },
  { id: "offerings", label: "Offerings", icon: Layers },
  { id: "story", label: "Story", icon: BookOpen },
  { id: "team", label: "Team", icon: HeartHandshake },
  { id: "values", label: "Values", icon: Star },
  { id: "reasons", label: "Reasons to Join", icon: Flag },
  { id: "cta", label: "Call to Action", icon: ArrowRightCircle },
] as const

const defaultButton: CtaButton = { text: "", href: "", variant: "primary" }
const NONE_OPTION = "__none__"

const SectionHeader = ({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) => (
  <div className="flex items-start gap-3">
    <div className="rounded-lg bg-primary/10 p-2">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
)

export default function AdminAboutEditPage() {
  const page = usePage()
  const { content, iconOptions } = page.props as unknown as AdminAboutPageProps
  const [activeSection, setActiveSection] = useState<string>(navItems[0]?.id ?? "hero")

  const { data, setData, submit, transform, processing, errors, reset } = useForm<{
    content: AboutPageContentProps
    hero_background_image: File | null
    mission_image: File | null
    team_images: Record<string, File | null>
    _method: "PUT"
  }>({
    content,
    hero_background_image: null,
    mission_image: null,
    team_images: {},
    _method: "PUT"
  })

  const stats = useMemo(() => data.content.stats ?? [], [data.content.stats])
  const offerings = useMemo(() => data.content.offerings ?? [], [data.content.offerings])
  const team = useMemo(() => data.content.team ?? [], [data.content.team])
  const values = useMemo(() => data.content.values ?? [], [data.content.values])
  const reasons = useMemo(() => data.content.reasons ?? [], [data.content.reasons])
  const ctaButtons = useMemo(() => data.content.cta.buttons ?? [], [data.content.cta.buttons])
  const storyParagraphs = useMemo(() => data.content.story.paragraphs ?? [], [data.content.story.paragraphs])

  const updateContent = <K extends keyof AboutPageContentProps>(section: K, value: AboutPageContentProps[K]) => {
    setData("content", {
      ...data.content,
      [section]: value,
    })
  }

  const setStats = (updater: (items: StatItem[]) => StatItem[]) => updateContent("stats", updater(stats))
  const setOfferings = (updater: (items: OfferingItem[]) => OfferingItem[]) =>
    updateContent("offerings", updater(offerings))
  const setTeam = (updater: (items: TeamMember[]) => TeamMember[]) => updateContent("team", updater(team))
  const setValues = (updater: (items: ValueItem[]) => ValueItem[]) => updateContent("values", updater(values))
  const setReasons = (updater: (items: string[]) => string[]) => updateContent("reasons", updater(reasons))
  const setStory = (updater: (story: StorySection) => StorySection) => updateContent("story", updater(data.content.story))
  const setCtaButtons = (updater: (items: CtaButton[]) => CtaButton[]) =>
    updateContent("cta", { ...data.content.cta, buttons: updater(ctaButtons) })

  const updateStatField = (index: number, field: keyof StatItem, value: string | null) =>
    setStats((items) => items.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  const removeStat = (index: number) => setStats((items) => items.filter((_, i) => i !== index))

  const updateOfferingField = (index: number, field: keyof OfferingItem, value: string | null) =>
    setOfferings((items) => items.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  const removeOffering = (index: number) => setOfferings((items) => items.filter((_, i) => i !== index))

  const updateTeamField = (index: number, field: keyof TeamMember, value: string | null) =>
    setTeam((items) => items.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  const removeTeamMember = (index: number) => {
    const updatedImages: Record<string, File | null> = {}
    Object.entries(data.team_images ?? {}).forEach(([key, file]) => {
      const numericIndex = Number(key)
      if (Number.isNaN(numericIndex)) {
        return
      }
      if (numericIndex === index) {
        return
      }
      const nextIndex = numericIndex > index ? numericIndex - 1 : numericIndex
      updatedImages[nextIndex] = file ?? null
    })
    setData("team_images", updatedImages)
    setTeam((items) => items.filter((_, i) => i !== index))
  }

  const addTeamMember = () => {
    setTeam((items) => [...items, { name: "", role: "", image: null, bio: "" }])
  }

  const flattenForFormData = (value: unknown, keyPrefix: string, target: Record<string, unknown>) => {
    if (value === null || value === undefined) {
      target[keyPrefix] = value ?? ""
      return
    }

    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        flattenForFormData(entry, `${keyPrefix}[${index}]`, target)
      })
      return
    }

    if (typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) => {
        flattenForFormData(childValue, `${keyPrefix}[${childKey}]`, target)
      })
      return
    }

    target[keyPrefix] = value
  }

  const handleHeroImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setData("hero_background_image", file)
  }

  const clearHeroImageUpload = () => {
    setData("hero_background_image", null)
  }

  const clearHeroImage = () => {
    clearHeroImageUpload()
    updateContent("hero", { ...data.content.hero, background_image: null })
  }

  const handleMissionImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setData("mission_image", file)
  }

  const clearMissionImageUpload = () => {
    setData("mission_image", null)
  }

  const clearMissionImage = () => {
    clearMissionImageUpload()
    updateContent("mission", { ...data.content.mission, image: null })
  }

  const handleTeamImageChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    const nextImages = { ...data.team_images }

    if (file) {
      nextImages[index] = file
    } else {
      delete nextImages[index]
    }

    setData("team_images", nextImages)
  }

  const clearTeamImageUpload = (index: number) => {
    const nextImages = { ...data.team_images }
    delete nextImages[index]
    setData("team_images", nextImages)
  }

  const clearTeamImage = (index: number) => {
    clearTeamImageUpload(index)
    updateTeamField(index, "image", null)
  }

  const updateValueField = (index: number, field: keyof ValueItem, value: string | null) =>
    setValues((items) => items.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  const removeValue = (index: number) => setValues((items) => items.filter((_, i) => i !== index))

  const updateReason = (index: number, value: string) =>
    setReasons((items) => items.map((item, i) => (i === index ? value : item)))
  const removeReason = (index: number) => setReasons((items) => items.filter((_, i) => i !== index))

  const updateStoryParagraph = (index: number, value: string) =>
    setStory((story) => ({ ...story, paragraphs: storyParagraphs.map((item, i) => (i === index ? value : item)) }))
  const removeStoryParagraph = (index: number) =>
    setStory((story) => ({ ...story, paragraphs: storyParagraphs.filter((_, i) => i !== index) }))

  const updateCtaButtonField = (index: number, field: keyof CtaButton, value: string | null) =>
    setCtaButtons((items) => items.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  const removeCtaButton = (index: number) => setCtaButtons((items) => items.filter((_, i) => i !== index))

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el))

    if (!sections.length) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible.length) {
          setActiveSection(visible[0].target.id)
        }
      },
      {
        rootMargin: "-40% 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    )

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    transform((formValues) => {
      const payload: Record<string, unknown> = {
        _method: "PUT",
      }

      flattenForFormData(formValues.content, "content", payload)

      if (formValues.hero_background_image instanceof File) {
        payload.hero_background_image = formValues.hero_background_image
      }

      if (formValues.mission_image instanceof File) {
        payload.mission_image = formValues.mission_image
      }

      Object.entries(formValues.team_images ?? {}).forEach(([index, file]) => {
        if (file instanceof File) {
          payload[`team_images[${index}]`] = file
        }
      })

      return payload
    })

    submit("post", route("admin.about.update"), {
      preserveScroll: true,
      forceFormData: true,
      onSuccess: () => {
        toast.success("About page updated successfully.")
        reset("hero_background_image", "mission_image", "team_images")
      },
    })
  }

  return (
    <AppLayout>
      <Head title="Manage About Page" />

      <div className="relative m-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 rounded-xl border bg-card shadow-sm lg:fixed lg:left-[18rem] lg:top-24 lg:w-72 lg:flex-none">
          <nav className="space-y-1 p-4">
            {navItems.map(({ id, label, icon: Icon }) => {
              const isActive = activeSection === id
              return (
              <a
                key={id}
                href={`#${id}`}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </a>
            )
          })}
          </nav>
        </aside>

        <div className="flex-1 space-y-10 lg:ml-[22rem]">
          <form onSubmit={handleSubmit} className="space-y-10">
          <section id="hero" className="space-y-4 rounded-xl border bg-card/60 p-6 shadow-sm">
            <SectionHeader
              icon={Sparkles}
              title="Hero & Intro"
              description="Control the hero headline, supporting copy, and featured background image."
            />
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="hero-title">Title</Label>
                      <Input
                        id="hero-title"
                        value={data.content.hero.title}
                        onChange={(e) => updateContent("hero", { ...data.content.hero, title: e.target.value })}
                        placeholder="Enter the main headline"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hero-subtitle">Subtitle</Label>
                      <Input
                        id="hero-subtitle"
                        value={data.content.hero.subtitle ?? ""}
                        onChange={(e) => updateContent("hero", { ...data.content.hero, subtitle: e.target.value })}
                        placeholder="Optional supporting line"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hero-description">Description</Label>
                      <Textarea
                        id="hero-description"
                        value={data.content.hero.description ?? ""}
                        onChange={(e) => updateContent("hero", { ...data.content.hero, description: e.target.value })}
                        placeholder="Add descriptive copy that introduces your organisation."
                        className="min-h-[120px]"
                      />
                    </div>
                  </div>
                  <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
                    <Label htmlFor="hero-image">Background image</Label>
                    <Input
                      key={
                        data.hero_background_image
                          ? `hero-${data.hero_background_image.name}`
                          : `hero-${data.content.hero.background_image ?? "none"}`
                      }
                      id="hero-image"
                      type="file"
                      accept="image/*"
                      onChange={handleHeroImageChange}
                    />
                    {data.hero_background_image && (
                      <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                        <p className="text-sm text-muted-foreground truncate" title={data.hero_background_image.name}>
                          Selected: {data.hero_background_image.name}
                        </p>
                        <Button type="button" variant="ghost" size="sm" onClick={clearHeroImageUpload}>
                          Clear
                        </Button>
                      </div>
                    )}
                    {data.content.hero.background_image && (
                      <div className="flex items-center gap-3 rounded-md border border-dashed border-muted-foreground/30 p-3">
                        <img
                          src={data.content.hero.background_image}
                          alt="Hero background"
                          className="h-16 w-16 rounded-md object-cover"
                        />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">Current image</p>
                          <p className="break-all text-xs text-muted-foreground">
                            {data.content.hero.background_image}
                          </p>
                          <Button type="button" size="sm" variant="outline" onClick={clearHeroImage}>
                            Remove current image
                          </Button>
                        </div>
                      </div>
                    )}
                    {errors.hero_background_image && (
                      <p className="text-sm text-destructive">{errors.hero_background_image}</p>
                    )}
                  </div>
                </div>
              </div>
          </section>

          <section id="mission-vision" className="space-y-4 rounded-xl border bg-card/60 p-6 shadow-sm">
            <SectionHeader
              icon={Target}
              title="Mission & Vision"
              description="Share your mission, supporting description, key icon, and optional imagery. Pair it with your organisational vision."
            />
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
                    <div className="space-y-2">
                      <Label htmlFor="mission-title">Mission title</Label>
                      <Input
                        id="mission-title"
                        value={data.content.mission.title}
                        onChange={(e) => updateContent("mission", { ...data.content.mission, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mission-description">Mission description</Label>
                      <Textarea
                        id="mission-description"
                        value={data.content.mission.description ?? ""}
                        onChange={(e) =>
                          updateContent("mission", { ...data.content.mission, description: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mission icon</Label>
                      <Select
                        value={data.content.mission.icon ?? NONE_OPTION}
                        onValueChange={(value) =>
                          updateContent("mission", {
                            ...data.content.mission,
                            icon: value === NONE_OPTION ? null : value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_OPTION}>None</SelectItem>
                          {iconOptions.map((icon: string) => (
                            <SelectItem key={icon} value={icon}>
                              {icon}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mission-image">Supporting image</Label>
                      <Input
                        key={
                          data.mission_image
                            ? `mission-${data.mission_image.name}`
                            : `mission-${data.content.mission.image ?? "none"}`
                        }
                        id="mission-image"
                        type="file"
                        accept="image/*"
                        onChange={handleMissionImageChange}
                      />
                      {data.mission_image && (
                        <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                          <p className="text-sm text-muted-foreground truncate" title={data.mission_image.name}>
                            Selected: {data.mission_image.name}
                          </p>
                          <Button type="button" variant="ghost" size="sm" onClick={clearMissionImageUpload}>
                            Clear
                          </Button>
                        </div>
                      )}
                      {data.content.mission.image && (
                        <div className="flex items-center gap-3 rounded-md border border-dashed border-muted-foreground/30 p-3">
                          <img
                            src={data.content.mission.image}
                            alt="Mission"
                            className="h-16 w-16 rounded-md object-cover"
                          />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">Current image</p>
                            <p className="break-all text-xs text-muted-foreground">{data.content.mission.image}</p>
                            <Button type="button" size="sm" variant="outline" onClick={clearMissionImage}>
                              Remove current image
                            </Button>
                          </div>
                        </div>
                      )}
                      {errors.mission_image && <p className="text-sm text-destructive">{errors.mission_image}</p>}
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
                    <div className="space-y-2">
                      <Label htmlFor="vision-title">Vision title</Label>
                      <Input
                        id="vision-title"
                        value={data.content.vision.title}
                        onChange={(e) => updateContent("vision", { ...data.content.vision, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vision-description">Vision description</Label>
                      <Textarea
                        id="vision-description"
                        value={data.content.vision.description ?? ""}
                        onChange={(e) =>
                          updateContent("vision", { ...data.content.vision, description: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Vision icon</Label>
                      <Select
                        value={data.content.vision.icon ?? NONE_OPTION}
                        onValueChange={(value) =>
                          updateContent("vision", {
                            ...data.content.vision,
                            icon: value === NONE_OPTION ? null : value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_OPTION}>None</SelectItem>
                          {iconOptions.map((icon: string) => (
                            <SelectItem key={icon} value={icon}>
                              {icon}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
          </section>

          <section id="stats" className="space-y-4 rounded-xl border bg-card/60 p-6 shadow-sm">
            <SectionHeader
              icon={Users}
              title="Impact Statistics"
              description="Track headline numbers that appear on the public page. Add as many metrics as you need."
            />
              <div className="space-y-4">
              {stats.map((stat, index) => (
                <div
                  key={`stat-${index}`}
                  className="grid gap-4 rounded-lg border bg-muted/10 p-4 md:grid-cols-[minmax(0,1.5fr)_repeat(2,minmax(0,1fr))_auto] md:items-end"
                >
                  <div className="space-y-2">
                    <Label htmlFor={`stat-label-${index}`}>Label</Label>
                    <Input
                      id={`stat-label-${index}`}
                      value={stat.label}
                      onChange={(e) => updateStatField(index, "label", e.target.value)}
                      placeholder="e.g. Verified Nonprofits"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`stat-value-${index}`}>Value</Label>
                    <Input
                      id={`stat-value-${index}`}
                      value={stat.value}
                      onChange={(e) => updateStatField(index, "value", e.target.value)}
                      placeholder="e.g. 1.8M+"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <Select
                      value={stat.icon ?? NONE_OPTION}
                      onValueChange={(value) => updateStatField(index, "icon", value === NONE_OPTION ? null : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select icon" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_OPTION}>None</SelectItem>
                        {iconOptions.map((icon: string) => (
                          <SelectItem key={icon} value={icon}>
                            {icon}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeStat(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStats((items) => [...items, { label: "", value: "", icon: null }])}
              >
                <Plus className="mr-2 h-4 w-4" /> Add stat
              </Button>
              </div>
          </section>

          <section id="offerings" className="space-y-4 rounded-xl border bg-card/60 p-6 shadow-sm">
            <SectionHeader
              icon={Layers}
              title="What We Offer"
              description="List the products, services, and programmes highlighted on the About page."
            />
              <div className="space-y-4">
              {offerings.map((offering, index) => (
                <div key={`offering-${index}`} className="space-y-3 rounded-lg border bg-muted/10 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`offering-title-${index}`}>Title</Label>
                      <Input
                        id={`offering-title-${index}`}
                        value={offering.title}
                        onChange={(e) => updateOfferingField(index, "title", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <Select
                        value={offering.icon ?? NONE_OPTION}
                        onValueChange={(value) => updateOfferingField(index, "icon", value === NONE_OPTION ? null : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Icon" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_OPTION}>None</SelectItem>
                          {iconOptions.map((icon: string) => (
                            <SelectItem key={icon} value={icon}>
                              {icon}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`offering-description-${index}`}>Description</Label>
                    <Textarea
                      id={`offering-description-${index}`}
                      value={offering.description}
                      onChange={(e) => updateOfferingField(index, "description", e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`offering-tagline-${index}`}>Tagline</Label>
                      <Input
                        id={`offering-tagline-${index}`}
                        value={offering.tagline ?? ""}
                        onChange={(e) => updateOfferingField(index, "tagline", e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeOffering(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setOfferings((items) => [
                    ...items,
                    { title: "", description: "", tagline: "", icon: null },
                  ])
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Add offering
              </Button>
              </div>
          </section>

          <section id="story" className="space-y-4 rounded-xl border bg-card/60 p-6 shadow-sm">
            <SectionHeader
              icon={Info}
              title="Our Story"
              description="Craft the narrative that appears on the About page. Use multiple paragraphs to build momentum."
            />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="story-title">Story title</Label>
                  <Input
                    id="story-title"
                    value={data.content.story.title}
                    onChange={(e) => setStory((story) => ({ ...story, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-3">
                  {(storyParagraphs.length ? storyParagraphs : [""]).map((paragraph, index) => (
                    <div key={`story-paragraph-${index}`} className="space-y-2 rounded-lg border bg-muted/10 p-4">
                      <Label htmlFor={`story-paragraph-${index}`}>Paragraph {index + 1}</Label>
                      <Textarea
                        id={`story-paragraph-${index}`}
                        value={paragraph}
                        onChange={(e) => updateStoryParagraph(index, e.target.value)}
                      />
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStoryParagraph(index)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Remove paragraph
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStory((story) => ({ ...story, paragraphs: [...storyParagraphs, ""] }))}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add paragraph
                </Button>
              </div>
          </section>

          <section id="team" className="space-y-4 rounded-xl border bg-card/60 p-6 shadow-sm">
            <SectionHeader
              icon={Users}
              title="Team Members"
              description="Introduce the people behind your mission. Add roles, bios, and profile images for each team member."
            />
              <div className="space-y-4">
                {team.length ? (
                  team.map((member, index) => {
                    const selectedUpload = data.team_images[index] ?? null
                    const teamImageError = errors[`team_images.${index}`]

                    return (
                      <div key={`team-${index}`} className="space-y-4 rounded-xl border bg-muted/5 p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`team-name-${index}`}>Name</Label>
                            <Input
                              id={`team-name-${index}`}
                              value={member.name}
                              onChange={(e) => updateTeamField(index, "name", e.target.value)}
                              placeholder="e.g. Jane Doe"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`team-role-${index}`}>Role</Label>
                            <Input
                              id={`team-role-${index}`}
                              value={member.role ?? ""}
                              onChange={(e) => updateTeamField(index, "role", e.target.value)}
                              placeholder="e.g. Partnerships Lead"
                            />
                          </div>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-2 rounded-lg border bg-muted/10 p-4">
                            <Label htmlFor={`team-image-${index}`}>Profile image</Label>
                            <Input
                              key={
                                selectedUpload
                                  ? `team-${index}-${selectedUpload.name}`
                                  : `team-${index}-${member.image ?? "none"}`
                              }
                              id={`team-image-${index}`}
                              type="file"
                              accept="image/*"
                              onChange={(event) => handleTeamImageChange(index, event)}
                            />
                            {selectedUpload && (
                              <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                                <p className="text-sm text-muted-foreground truncate" title={selectedUpload.name}>
                                  Selected: {selectedUpload.name}
                                </p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => clearTeamImageUpload(index)}
                                >
                                  Clear
                                </Button>
                              </div>
                            )}
                            {member.image && (
                              <div className="flex items-center gap-3 rounded-md border border-dashed border-muted-foreground/30 p-3">
                                <img
                                  src={member.image}
                                  alt={`${member.name ?? "Team member"} avatar`}
                                  className="h-16 w-16 rounded-md object-cover"
                                />
                                <div className="flex-1 space-y-1">
                                  <p className="text-sm font-medium">Current image</p>
                                  <p className="break-all text-xs text-muted-foreground">{member.image}</p>
                                  <Button type="button" size="sm" variant="outline" onClick={() => clearTeamImage(index)}>
                                    Remove current image
                                  </Button>
                                </div>
                              </div>
                            )}
                            {teamImageError && <p className="text-sm text-destructive">{teamImageError}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`team-bio-${index}`}>Short bio</Label>
                            <Textarea
                              id={`team-bio-${index}`}
                              value={member.bio ?? ""}
                              onChange={(e) => updateTeamField(index, "bio", e.target.value)}
                              placeholder="Share a brief background or responsibilities."
                              className="min-h-[140px]"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeTeamMember(index)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Remove member
                          </Button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No team members added yet.</p>
                )}
                <Button type="button" variant="outline" size="sm" onClick={addTeamMember}>
                  <Plus className="mr-2 h-4 w-4" /> Add team member
                </Button>
              </div>
          </section>

          <section id="values" className="space-y-4 rounded-xl border bg-card/60 p-6 shadow-sm">
            <SectionHeader
              icon={ListChecks}
              title="Core Values"
              description="Highlight the principles that guide your organisation. Emojis or short text work well for icons."
            />
              <div className="space-y-4">
                {values.length ? (
                  values.map((value, index) => (
                    <div
                      key={`value-${index}`}
                      className="space-y-4 rounded-2xl border border-muted bg-background p-6 shadow-sm transition hover:border-primary/50"
                    >
                      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
                        <div className="space-y-2">
                          <Label htmlFor={`value-title-${index}`}>Title</Label>
                          <Input
                            id={`value-title-${index}`}
                            value={value.title}
                            onChange={(e) => updateValueField(index, "title", e.target.value)}
                            placeholder="e.g. Transparency"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`value-icon-${index}`}>Icon (emoji or short text)</Label>
                          <Input
                            id={`value-icon-${index}`}
                            value={value.icon ?? ""}
                            onChange={(e) => updateValueField(index, "icon", e.target.value)}
                            placeholder="e.g. 🔍"
                          />
                          <p className="text-xs text-muted-foreground">
                            Use a single emoji or brief keyword to pair with this value.
                          </p>
                        </div>
                        <div className="flex items-center justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => removeValue(index)}
                          >
                            <XCircle className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`value-description-${index}`}>Description</Label>
                        <Textarea
                          id={`value-description-${index}`}
                          value={value.description ?? ""}
                          onChange={(e) => updateValueField(index, "description", e.target.value)}
                          placeholder="Explain how this value shows up in your work."
                          className="min-h-[110px]"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No values configured.</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setValues((items) => [...items, { title: "", description: "", icon: "" }])}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add value
                </Button>
              </div>
          </section>

          <section id="reasons" className="space-y-4 rounded-xl border bg-card/60 p-6 shadow-sm">
            <SectionHeader
              icon={LayoutList}
              title="Reasons to Join"
              description="List the selling points that encourage visitors to get involved."
            />
              <div className="space-y-4">
                {reasons.length ? (
                  reasons.map((reason, index) => (
                    <div key={`reason-${index}`} className="flex items-center gap-4 rounded-lg border bg-muted/10 p-4">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor={`reason-${index}`}>Reason {index + 1}</Label>
                        <Input
                          id={`reason-${index}`}
                          value={reason}
                          onChange={(e) => updateReason(index, e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removeReason(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No reasons listed.</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReasons((items) => [...items, ""])}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add reason
                </Button>
              </div>
          </section>

          <section id="cta" className="space-y-4 rounded-xl border bg-card/60 p-6 shadow-sm">
            <SectionHeader
              icon={Save}
              title="Call to Action"
              description="Configure the closing call to action, including supporting copy and buttons."
            />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cta-title">Title</Label>
                  <Input
                    id="cta-title"
                    value={data.content.cta.title}
                    onChange={(e) => updateContent("cta", { ...data.content.cta, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cta-subtitle">Subtitle</Label>
                  <Input
                    id="cta-subtitle"
                    value={data.content.cta.subtitle ?? ""}
                    onChange={(e) => updateContent("cta", { ...data.content.cta, subtitle: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cta-description">Description</Label>
                  <Textarea
                    id="cta-description"
                    value={data.content.cta.description ?? ""}
                    onChange={(e) => updateContent("cta", { ...data.content.cta, description: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  {(ctaButtons.length ? ctaButtons : [defaultButton]).map((button, index) => (
                    <div
                      key={`cta-button-${index}`}
                      className="grid gap-4 rounded-lg border bg-muted/10 p-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-end"
                    >
                      <div className="space-y-2">
                        <Label htmlFor={`cta-button-text-${index}`}>Text</Label>
                        <Input
                          id={`cta-button-text-${index}`}
                          value={button.text}
                          onChange={(e) => updateCtaButtonField(index, "text", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`cta-button-link-${index}`}>Link</Label>
                        <Input
                          id={`cta-button-link-${index}`}
                          value={button.href ?? ""}
                          onChange={(e) => updateCtaButtonField(index, "href", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Variant</Label>
                        <Select
                          value={button.variant ?? "primary"}
                          onValueChange={(value) => updateCtaButtonField(index, "variant", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Variant" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary">Primary</SelectItem>
                            <SelectItem value="secondary">Secondary</SelectItem>
                            <SelectItem value="outline">Outline</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCtaButton(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <XCircle className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCtaButtons((items) => [...items, { ...defaultButton }])}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add CTA button
                </Button>
              </div>
          </section>

          <div className="flex justify-end gap-3">
            <Button type="submit" disabled={processing}>
              <Save className="mr-2 h-4 w-4" /> Save changes
            </Button>
          </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
