import { useEffect, useMemo, useState } from "react"
import type { ComponentType, SVGProps } from "react"
import { Link, usePage } from "@inertiajs/react"
import { motion } from "framer-motion"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Award,
  Brain,
  Briefcase,
  Calendar,
  CheckCircle,
  DollarSign,
  Eye,
  FileText,
  Globe,
  GraduationCap,
  Heart,
  MessageCircle,
  Network,
  Newspaper,
  ShoppingBag,
  Target,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

// Mapping of icon keys returned from the backend to Lucide icon components
const iconMap: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  Award,
  Brain,
  Briefcase,
  Calendar,
  CheckCircle,
  DollarSign,
  Eye,
  FileText,
  Globe,
  GraduationCap,
  Heart,
  MessageCircle,
  Network,
  Newspaper,
  ShoppingBag,
  Target,
  Users,
}

type IconName = keyof typeof iconMap

interface StatItem {
  label: string
  value: string
  icon?: IconName | null
}

interface OfferingItem {
  title: string
  description: string
  tagline?: string | null
  icon?: IconName | null
}

interface StorySection {
  title: string
  paragraphs?: string[] | null
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
    icon?: IconName | null
    image?: string | null
  }
  vision: {
    title: string
    description?: string | null
    icon?: IconName | null
  }
  stats?: StatItem[] | null
  offerings?: OfferingItem[] | null
  story?: StorySection | null
  team?: TeamMember[] | null
  values?: ValueItem[] | null
  reasons?: string[] | null
  cta: {
    title: string
    subtitle?: string | null
    description?: string | null
    buttons?: CtaButton[] | null
  }
}

const resolveIcon = (icon?: string | null) => {
  if (!icon) return null
  return iconMap[icon as IconName] ?? null
}

const getButtonVariant = (variant?: CtaButton["variant"]) => {
  switch (variant) {
    case "secondary":
      return "secondary" as const
    case "outline":
      return "outline" as const
    default:
      return "default" as const
  }
}

const getButtonClassName = (variant?: CtaButton["variant"]) => {
  if (variant === "outline") {
    return "bg-white/10 text-white border-white hover:bg-white/20"
  }

  return undefined
}

const resolveImageUrl = (image?: string | null) => {
  if (!image) return null

  if (/^(https?:)?\/\//i.test(image) || image.startsWith("data:")) {
    return image
  }

  if (image.startsWith("/")) {
    return image
  }

  return `/${image.replace(/^\/+/, "")}`
}

export default function AboutPage() {
  const page = usePage()
  const { content } = page.props as { content?: AboutPageContentProps | null }

  const aboutContent = useMemo<AboutPageContentProps | null>(() => {
    if (!content) {
      return null
    }

    return {
      hero: {
        title: content.hero?.title?.trim() ?? "",
        subtitle: content.hero?.subtitle?.trim() ?? "",
        description: content.hero?.description?.trim() ?? "",
        background_image: content.hero?.background_image ?? null,
      },
      mission: {
        title: content.mission?.title?.trim() ?? "",
        description: content.mission?.description?.trim() ?? "",
        icon: content.mission?.icon ?? null,
        image: content.mission?.image ?? null,
      },
      vision: {
        title: content.vision?.title?.trim() ?? "",
        description: content.vision?.description?.trim() ?? "",
        icon: content.vision?.icon ?? null,
      },
      stats: Array.isArray(content.stats) ? content.stats : [],
      offerings: Array.isArray(content.offerings) ? content.offerings : [],
      story: {
        title: content.story?.title?.trim() ?? "",
        paragraphs: Array.isArray(content.story?.paragraphs) ? content.story?.paragraphs : [],
      },
      team: Array.isArray(content.team) ? content.team : [],
      values: Array.isArray(content.values) ? content.values : [],
      reasons: Array.isArray(content.reasons) ? content.reasons : [],
      cta: {
        title: content.cta?.title?.trim() ?? "",
        subtitle: content.cta?.subtitle?.trim() ?? "",
        description: content.cta?.description?.trim() ?? "",
        buttons: Array.isArray(content.cta?.buttons) ? content.cta?.buttons : [],
      },
    }
  }, [content])

  const [currentTeamIndex, setCurrentTeamIndex] = useState(0)
  const [currentOfferingIndex, setCurrentOfferingIndex] = useState(0)

  const stats = aboutContent?.stats ?? []
  const offerings = aboutContent?.offerings ?? []
  const teamMembers = aboutContent?.team ?? []
  const values = aboutContent?.values ?? []
  const reasons = aboutContent?.reasons ?? []
  const storyParagraphs = aboutContent?.story?.paragraphs ?? []
  const ctaButtons = (aboutContent?.cta.buttons ?? []).filter((button) => button.text?.trim())

  const heroBackgroundUrl = aboutContent ? resolveImageUrl(aboutContent.hero.background_image) : null
  const missionImageUrl = resolveImageUrl(aboutContent?.mission.image) ?? null

  const hasHeroContent = Boolean(
    aboutContent && (aboutContent.hero.title || aboutContent.hero.subtitle || aboutContent.hero.description || heroBackgroundUrl)
  )
  const hasMissionContent = Boolean(aboutContent && (aboutContent.mission.title || aboutContent.mission.description))
  const hasVisionContent = Boolean(aboutContent && (aboutContent.vision.title || aboutContent.vision.description))
  const hasMissionSection = Boolean(hasMissionContent || hasVisionContent || missionImageUrl)
  const hasStatsContent = stats.length > 0
  const hasOfferingsContent = offerings.length > 0
  const hasTeamContent = teamMembers.length > 0
  const hasStoryContent = Boolean(aboutContent && (aboutContent.story?.title || storyParagraphs.length))
  const hasValuesContent = values.length > 0
  const hasReasonsContent = reasons.length > 0
  const hasCtaContent = Boolean(
    aboutContent && (aboutContent.cta.title || aboutContent.cta.subtitle || aboutContent.cta.description || ctaButtons.length)
  )

  useEffect(() => {
    setCurrentTeamIndex((prev) => (prev >= teamMembers.length ? 0 : prev))
  }, [teamMembers.length])

  useEffect(() => {
    setCurrentOfferingIndex((prev) => (prev >= offerings.length ? 0 : prev))
  }, [offerings.length])

  if (!aboutContent) {
    return (
      <FrontendLayout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              About page content has not been configured yet.
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Please visit the admin dashboard to create the About page content.
            </p>
          </div>
        </div>
      </FrontendLayout>
    )
  }

  const nextTeamMember = () => {
    if (!teamMembers.length) return
    setCurrentTeamIndex((prev) => (prev + 1) % teamMembers.length)
  }

  const prevTeamMember = () => {
    if (!teamMembers.length) return
    setCurrentTeamIndex((prev) => (prev - 1 + teamMembers.length) % teamMembers.length)
  }

  const nextOffering = () => {
    if (!offerings.length) return
    setCurrentOfferingIndex((prev) => (prev + 1) % offerings.length)
  }

  const prevOffering = () => {
    if (!offerings.length) return
    setCurrentOfferingIndex((prev) => (prev - 1 + offerings.length) % offerings.length)
  }

  return (
    <FrontendLayout>
      <div className="min-h-screen">
        {hasHeroContent && (
          <section className="relative overflow-hidden py-20">
            {heroBackgroundUrl && (
              <div className="absolute inset-0">
                <img
                  src={heroBackgroundUrl}
                  alt="About hero background"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-blue-900/60 to-emerald-800/70 dark:from-black/80 dark:via-black/70 dark:to-black/80" />
              </div>
            )}
            {!heroBackgroundUrl && (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
            )}

            <div className="relative container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="text-center max-w-4xl mx-auto space-y-6"
              >
                {aboutContent.hero.title && (
                  <h1
                    className={`text-4xl md:text-6xl font-bold ${
                      heroBackgroundUrl ? "text-white" : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {aboutContent.hero.title}
                  </h1>
                )}
                {aboutContent.hero.subtitle && (
                  <p className={`text-xl ${heroBackgroundUrl ? "text-white/90" : "text-gray-600 dark:text-gray-300"}`}>
                    {aboutContent.hero.subtitle}
                  </p>
                )}
                {aboutContent.hero.description && (
                  <p className={`text-lg ${heroBackgroundUrl ? "text-white/80" : "text-gray-600 dark:text-gray-300"}`}>
                    {aboutContent.hero.description}
                  </p>
                )}
              </motion.div>
            </div>
          </section>
        )}

        {hasMissionSection && (
          <section className="py-20 bg-white dark:bg-gray-900">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {(hasMissionContent || hasVisionContent) && (
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                  >
                    <div className="space-y-8">
                      {hasMissionContent && (
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            {(() => {
                              const Icon = resolveIcon(aboutContent.mission.icon)
                              return Icon ? <Icon className="h-8 w-8 text-blue-600" /> : null
                            })()}
                            {aboutContent.mission.title && (
                              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {aboutContent.mission.title}
                              </h2>
                            )}
                          </div>
                          {aboutContent.mission.description && (
                            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                              {aboutContent.mission.description}
                            </p>
                          )}
                        </div>
                      )}
                      {hasVisionContent && (
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            {(() => {
                              const Icon = resolveIcon(aboutContent.vision.icon)
                              return Icon ? <Icon className="h-8 w-8 text-green-600" /> : null
                            })()}
                            {aboutContent.vision.title && (
                              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {aboutContent.vision.title}
                              </h2>
                            )}
                          </div>
                          {aboutContent.vision.description && (
                            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                              {aboutContent.vision.description}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
                {missionImageUrl && (
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                  >
                    <img
                      src={missionImageUrl}
                      alt="Our mission"
                      width={600}
                      height={500}
                      loading="lazy"
                      className="w-full rounded-2xl object-cover shadow-lg"
                    />
                  </motion.div>
                )}
              </div>
            </div>
          </section>
        )}

        {hasStatsContent && (
          <section className="py-20 bg-gray-50 dark:bg-gray-800">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Our Impact in Numbers</h2>
              </motion.div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map((stat, index) => {
                  const Icon = resolveIcon(stat.icon)
                  return (
                    <motion.div
                      key={`${stat.label}-${index}`}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="text-center"
                    >
                      {Icon && (
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white dark:bg-gray-700 rounded-full shadow-lg mb-4">
                          <Icon className="h-8 w-8 text-blue-600" />
                        </div>
                      )}
                      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stat.value}</div>
                      <div className="text-gray-600 dark:text-gray-300">{stat.label}</div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {hasOfferingsContent && (
          <section className="py-20 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">What We Offer</h2>
            </motion.div>

            {offerings.length ? (
              <div className="relative max-w-6xl mx-auto">
                <div className="hidden md:block">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[0, 1, 2].map((offset) => {
                      if (!offerings.length) {
                        return null
                      }

                      const index = (currentOfferingIndex + offset) % offerings.length
                      const offering = offerings[index]
                      const Icon = resolveIcon(offering.icon)

                      return (
                        <motion.div
                          key={`${offering.title}-${index}`}
                          initial={{ opacity: 0, x: 100 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: offset * 0.1 }}
                        >
                          <Card className="h-full hover:shadow-lg transition-shadow bg-white dark:bg-gray-800">
                            <CardContent className="pt-6">
                              {Icon && (
                                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg mb-4">
                                  <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                              )}
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{offering.title}</h3>
                              <p className="text-gray-600 dark:text-gray-300 mb-4">{offering.description}</p>
                              {offering.tagline && (
                                <p className="text-sm italic text-gray-500 dark:text-gray-400">{offering.tagline}</p>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </div>

                  {offerings.length > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-8">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={prevOffering}
                        className="rounded-full bg-transparent"
                        aria-label="Previous offerings"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>

                      <div className="flex gap-2">
                        {offerings.map((offering, index) => (
                          <button
                            key={`${offering.title}-${index}`}
                            onClick={() => setCurrentOfferingIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              index === currentOfferingIndex ? "bg-blue-600 w-6" : "bg-gray-300 dark:bg-gray-600"
                            }`}
                            aria-label={`Go to offering ${index + 1}`}
                          />
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={nextOffering}
                        className="rounded-full bg-transparent"
                        aria-label="Next offerings"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="md:hidden">
                  <div className="relative overflow-hidden">
                    {offerings.length ? (
                      <motion.div
                        key={currentOfferingIndex}
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.5 }}
                        className="w-full"
                      >
                        {(() => {
                          const currentOffering = offerings[currentOfferingIndex]
                          const Icon = resolveIcon(currentOffering.icon)
                          return (
                            <Card className="h-full hover:shadow-lg transition-shadow bg-white dark:bg-gray-800">
                              <CardContent className="pt-6">
                                {Icon && (
                                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg mb-4">
                                    <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                  </div>
                                )}
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                  {currentOffering.title}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 mb-4">{currentOffering.description}</p>
                                {currentOffering.tagline && (
                                  <p className="text-sm italic text-gray-500 dark:text-gray-400">
                                    {currentOffering.tagline}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          )
                        })()}
                      </motion.div>
                    ) : null}
                  </div>

                  {offerings.length > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={prevOffering}
                        className="rounded-full bg-transparent"
                        aria-label="Previous offering"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>

                      <div className="flex gap-2">
                        {offerings.map((offering, index) => (
                          <button
                            key={`${offering.title}-${index}`}
                            onClick={() => setCurrentOfferingIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              index === currentOfferingIndex ? "bg-blue-600 w-6" : "bg-gray-300 dark:bg-gray-600"
                            }`}
                            aria-label={`Go to offering ${index + 1}`}
                          />
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={nextOffering}
                        className="rounded-full bg-transparent"
                        aria-label="Next offering"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </section>
        )}

        {hasStoryContent && (
          <section className="py-20 bg-white dark:bg-gray-900">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="max-w-4xl mx-auto"
              >
                {aboutContent.story?.title && (
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                    {aboutContent.story.title}
                  </h2>
                )}
                <div className="prose prose-lg mx-auto text-gray-600 dark:text-gray-300">
                  {storyParagraphs.length
                    ? storyParagraphs.map((paragraph, index) => (
                        <p
                          key={`${paragraph.slice(0, 20)}-${index}`}
                          className={`leading-relaxed ${index === 0 ? "text-xl mb-6" : "text-lg mb-6 last:mb-0"}`}
                        >
                          {paragraph}
                        </p>
                      ))
                    : null}
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {hasTeamContent && (
          <section className="py-20 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Meet Our Team</h2>
            </motion.div>

            {teamMembers.length ? (
              <div className="relative max-w-4xl mx-auto">
                <div className="hidden md:grid md:grid-cols-3 gap-8">
                  {teamMembers.map((member, index) => (
                    <motion.div
                      key={`${member.name}-${index}`}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      whileHover={{ y: -5 }}
                    >
                      <Card className="text-center hover:shadow-lg transition-shadow bg-white dark:bg-gray-800">
                        <CardContent className="pt-6">
                          <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden">
                            {(() => {
                              const imageUrl = resolveImageUrl(member.image)
                              if (imageUrl) {
                                return (
                                  <img
                                    src={imageUrl}
                                    alt={member.name}
                                    width={128}
                                    height={128}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                )
                              }

                              const initials = member.name
                                ?.split(" ")
                                .map((part) => part.charAt(0))
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)

                              return (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-emerald-500 text-white text-3xl font-semibold">
                                  {initials || "?"}
                                </div>
                              )
                            })()}
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{member.name}</h3>
                          {member.role && <p className="text-blue-600 font-medium mb-3">{member.role}</p>}
                          {member.bio && <p className="text-gray-600 dark:text-gray-300 text-sm">{member.bio}</p>}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <div className="md:hidden">
                  <div className="relative overflow-hidden">
                    <motion.div
                      key={currentTeamIndex}
                      initial={{ opacity: 0, x: 100 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: 0.5 }}
                      className="w-full"
                    >
                      <Card className="text-center hover:shadow-lg transition-shadow bg-white dark:bg-gray-800">
                        <CardContent className="pt-6">
                          <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden">
                            {(() => {
                              const currentMember = teamMembers[currentTeamIndex]
                              const imageUrl = resolveImageUrl(currentMember.image)
                              if (imageUrl) {
                                return (
                                  <img
                                    src={imageUrl}
                                    alt={currentMember.name}
                                    width={128}
                                    height={128}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                )
                              }

                              const initials = currentMember.name
                                ?.split(" ")
                                .map((part) => part.charAt(0))
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)

                              return (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-emerald-500 text-white text-3xl font-semibold">
                                  {initials || "?"}
                                </div>
                              )
                            })()}
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            {teamMembers[currentTeamIndex].name}
                          </h3>
                          {teamMembers[currentTeamIndex].role && (
                            <p className="text-blue-600 font-medium mb-3">{teamMembers[currentTeamIndex].role}</p>
                          )}
                          {teamMembers[currentTeamIndex].bio && (
                            <p className="text-gray-600 dark:text-gray-300 text-sm">
                              {teamMembers[currentTeamIndex].bio}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </div>

                  {teamMembers.length > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={prevTeamMember}
                        className="rounded-full bg-transparent"
                        aria-label="Previous team member"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>

                      <div className="flex gap-2">
                        {teamMembers.map((member, index) => (
                          <button
                            key={`${member.name}-${index}`}
                            onClick={() => setCurrentTeamIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              index === currentTeamIndex ? "bg-blue-600 w-6" : "bg-gray-300 dark:bg-gray-600"
                            }`}
                            aria-label={`Go to team member ${index + 1}`}
                          />
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={nextTeamMember}
                        className="rounded-full bg-transparent"
                        aria-label="Next team member"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </section>
        )}

        {hasValuesContent && (
          <section className="py-20 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Our Values</h2>
            </motion.div>

            {values.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {values.map((value, index) => (
                  <motion.div
                    key={`${value.title}-${index}`}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -5 }}
                  >
                    <Card className="h-full hover:shadow-lg transition-shadow bg-white dark:bg-gray-800">
                      <CardContent className="pt-6">
                        {value.icon && <div className="text-4xl mb-4">{value.icon}</div>}
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{value.title}</h3>
                        {value.description && (
                          <p className="text-gray-600 dark:text-gray-300">{value.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
        )}

        {hasReasonsContent && (
          <section className="py-20 bg-gray-50 dark:bg-gray-800">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Why BELIEVE IN UNITY
                </h2>
              </motion.div>

              {reasons.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  {reasons.map((reason, index) => (
                    <motion.div
                      key={`${reason}-${index}`}
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-start gap-3"
                    >
                      <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                      <p className="text-lg text-gray-700 dark:text-gray-300">{reason}</p>
                    </motion.div>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        )}

        {hasCtaContent && (
          <section className="py-20 bg-gradient-to-br from-blue-600 to-green-600">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="text-center max-w-3xl mx-auto"
              >
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">{aboutContent.cta.title}</h2>
                {aboutContent.cta.subtitle && (
                  <p className="text-xl text-white/90 mb-4">{aboutContent.cta.subtitle}</p>
                )}
                {aboutContent.cta.description && (
                  <p className="text-xl text-white/90 mb-8">{aboutContent.cta.description}</p>
                )}
                {ctaButtons.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {ctaButtons.map((button, index) => {
                      const href = button.href?.trim()
                      if (!href) {
                        return null
                      }

                      return (
                        <Button
                          key={`${button.text}-${index}`}
                          size="lg"
                          variant={getButtonVariant(button.variant)}
                          className={getButtonClassName(button.variant)}
                          asChild
                        >
                          <Link href={href}>{button.text}</Link>
                        </Button>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            </div>
          </section>
        )}
      </div>
    </FrontendLayout>
  )
}
