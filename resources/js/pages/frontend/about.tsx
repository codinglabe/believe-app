import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import {
  Heart,
  Users,
  Globe,
  Target,
  Eye,
  ShoppingBag,
  DollarSign,
  MessageCircle,
  Network,
  Brain,
  GraduationCap,
  Calendar,
  Briefcase,
  Newspaper,
  FileText,
  CheckCircle,
  Award,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Link } from "@inertiajs/react"

const stats = [
  { label: "Verified Nonprofits", value: "1.8M+", icon: Users },
  { label: "Countries", value: "85+", icon: Globe },
  { label: "Lives Impacted", value: "1M+", icon: Heart },
  { label: "Years Active", value: "8+", icon: Award },
]

const offerings = [
  {
    title: "Start or Grow Your Nonprofit",
    description:
      "Begin your nonprofit journey with confidence. Our guided system helps you establish, manage, and scale your organization with access to education, compliance tools, and community support.",
    tagline: "Empowering your purpose from day one.",
    icon: "Heart",
  },
  {
    title: "Nonprofit Marketplace",
    description:
      "Buy and sell with purpose. List merchandise, services, and fundraising items that give back. Supporters can shop with confidence, knowing every purchase funds a meaningful mission.",
    tagline: "Every product tells a story.",
    icon: "ShoppingBag",
  },
  {
    title: "Donations & Campaign Management",
    description:
      "Launch and manage donation campaigns with simplicity and transparency. Accept one-time or recurring donations, track progress in real time, and empower supporters with shareable donation links and updates.",
    tagline: "Fund your mission with trust.",
    icon: "DollarSign",
  },
  {
    title: "Peer-to-Peer Communication",
    description:
      "Connect directly with other nonprofit leaders, donors, and volunteers. Message one-on-one or form private chat groups to brainstorm ideas, share insights, or collaborate across organizations.",
    tagline: "Connection fuels impact.",
    icon: "MessageCircle",
  },
  {
    title: "Group Interest Channels",
    description:
      "Join or create groups based on shared causes and passions — from youth empowerment and education to healthcare, environment, and faith-based initiatives.",
    tagline: "Find your people. Grow your purpose.",
    icon: "Network",
  },
  {
    title: "AI-Powered Tools & Newsletters",
    description:
      "Let AI do the heavy lifting. Generate donor thank-you notes, newsletters, campaign updates, and impact reports instantly — saving time while strengthening engagement.",
    tagline: "Work smarter. Inspire faster.",
    icon: "Brain",
  },
  {
    title: "Courses & Virtual Events",
    description:
      "Learn, host, and engage through live or on-demand training. Our virtual classrooms help nonprofit teams sharpen their skills in leadership, fundraising, marketing, compliance, and impact storytelling.",
    tagline: "Education that builds legacies.",
    icon: "GraduationCap",
  },
  {
    title: "Event Management",
    description:
      "Plan, promote, and manage events — from community drives to galas and webinars. Built-in registration, ticketing, and analytics tools help make every event count.",
    tagline: "Create moments that move people.",
    icon: "Calendar",
  },
  {
    title: "Job & Volunteer Hub",
    description:
      "Where purpose meets opportunity. Organizations can post jobs, internships, or volunteer openings, while individuals can find meaningful work that changes lives.",
    tagline: "Because doing good is a full-time calling.",
    icon: "Briefcase",
  },
  {
    title: "Nonprofit News & Insights",
    description:
      "Stay informed with the latest stories shaping the nonprofit world. We publish daily updates, articles, and interviews covering philanthropy trends & data, grant and funding opportunities, policy updates & IRS changes, and success stories from leading organizations.",
    tagline: "Because knowledge is power — and power creates impact.",
    icon: "Newspaper",
  },
  {
    title: "Content & Community Hub",
    description:
      "Tell your story. Publish blogs, updates, and reports to inspire others and spotlight your impact. Engage with other nonprofits and supporters across a global feed of stories, campaigns, and news.",
    tagline: "Your voice matters. Share it.",
    icon: "FileText",
  },
]

const iconMap: Record<string, any> = {
  Heart,
  ShoppingBag,
  DollarSign,
  MessageCircle,
  Network,
  Brain,
  GraduationCap,
  Calendar,
  Briefcase,
  Newspaper,
  FileText,
}

const whyBelieveInUnity = [
  "1.8 Million Verified Nonprofits",
  "85+ Countries Represented",
  "Marketplace & Donation Integration",
  "Peer-to-Peer & Group Collaboration",
  "AI Tools for Automation & Growth",
  "Nonprofit News & Education Hub",
  "Courses, Events, and Global Network Access",
]

const team = [
  {
    name: "Sarah Johnson",
    role: "Founder & CEO",
    image: "/placeholder.svg?height=300&width=300",
    bio: "Former UN humanitarian coordinator with 15+ years in non-profit sector",
  },
  {
    name: "Michael Chen",
    role: "CTO",
    image: "/placeholder.svg?height=300&width=300",
    bio: "Tech entrepreneur passionate about using technology for social good",
  },
  {
    name: "Emily Rodriguez",
    role: "Head of Partnerships",
    image: "/placeholder.svg?height=300&width=300",
    bio: "Expert in building strategic partnerships with global organizations",
  },
]


export default function AboutPage() {
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0)
  const [currentOfferingIndex, setCurrentOfferingIndex] = useState(0)

  const nextTeamMember = () => {
    setCurrentTeamIndex((prev) => (prev + 1) % team.length)
  }

  const prevTeamMember = () => {
    setCurrentTeamIndex((prev) => (prev - 1 + team.length) % team.length)
  }

  const nextOffering = () => {
    setCurrentOfferingIndex((prev) => (prev + 1) % offerings.length)
  }

  const prevOffering = () => {
    setCurrentOfferingIndex((prev) => (prev - 1 + offerings.length) % offerings.length)
  }

  return (
<FrontendLayout>
      <div className="min-h-screen">
      <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              About BELIEVE IN UNITY
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Connecting 1.8 Million Nonprofits into One Global Network
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              BELIEVE IN UNITY is a digital ecosystem where nonprofits, donors, volunteers, and changemakers come
              together to collaborate, learn, and grow. From fundraising and events to AI tools, education, and
              nonprofit news — everything your organization needs to thrive lives here.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="space-y-8">
                <div>
                  <div className="flex items-center mb-4">
                    <Target className="h-8 w-8 text-blue-600 mr-3" />
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Our Mission</h2>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                    To unite and empower nonprofits through connection, collaboration, and technology — creating a
                    transparent, global space where giving becomes a shared experience.
                  </p>
                </div>
                <div>
                  <div className="flex items-center mb-4">
                    <Eye className="h-8 w-8 text-green-600 mr-3" />
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Our Vision</h2>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                    A connected world where every cause has access to the tools, people, and resources it needs to
                    succeed.
                  </p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <img
                src={"/images/nonprofits-working-together-global-network.jpg"}
                alt="Our mission"
                width={600}
                height={500}
                className="rounded-2xl shadow-lg"
              />
            </motion.div>
          </div>
        </div>
      </section>

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
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Together, we're building a global community of changemakers
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white dark:bg-gray-700 rounded-full shadow-lg mb-4">
                  <stat.icon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stat.value}</div>
                <div className="text-gray-600 dark:text-gray-300">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Everything your nonprofit needs to thrive in one place
            </p>
          </motion.div>

          <div className="relative max-w-6xl mx-auto">
            <div className="hidden md:block">
              <div className="grid grid-cols-3 gap-8">
                {[0, 1, 2].map((offset) => {
                  const index = (currentOfferingIndex + offset) % offerings.length
                  const offering = offerings[index]
                  const Icon = iconMap[offering.icon]
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 100 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: offset * 0.1 }}
                    >
                      <Card className="h-full hover:shadow-lg transition-shadow bg-white dark:bg-gray-800">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg mb-4">
                            <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{offering.title}</h3>
                          <p className="text-gray-600 dark:text-gray-300 mb-4">{offering.description}</p>
                          <p className="text-sm italic text-gray-500 dark:text-gray-400">{offering.tagline}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>

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
                  {offerings.map((_, index) => (
                    <button
                      key={index}
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
            </div>

            <div className="md:hidden">
              <div className="relative overflow-hidden">
                <motion.div
                  key={currentOfferingIndex}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.5 }}
                  className="w-full"
                >
                  {(() => {
                    const Icon = iconMap[offerings[currentOfferingIndex].icon]
                    return (
                      <Card className="h-full hover:shadow-lg transition-shadow bg-white dark:bg-gray-800">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg mb-4">
                            <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                            {offerings[currentOfferingIndex].title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300 mb-4">
                            {offerings[currentOfferingIndex].description}
                          </p>
                          <p className="text-sm italic text-gray-500 dark:text-gray-400">
                            {offerings[currentOfferingIndex].tagline}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  })()}
                </motion.div>
              </div>

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
                  {offerings.map((_, index) => (
                    <button
                      key={index}
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
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8 text-center">Our Story</h2>
            <div className="prose prose-lg mx-auto text-gray-600 dark:text-gray-300">
              <p className="text-xl leading-relaxed mb-6">
                BELIEVE IN UNITY was born from a simple observation: while there are countless amazing non-profit
                organizations doing incredible work around the world, it's often difficult for people to discover and
                connect with causes that align with their values and passions.
              </p>
              <p className="text-lg leading-relaxed mb-6">
                Founded in 2016 by a team of former humanitarian workers and tech entrepreneurs, we set out to bridge
                this gap by creating a platform that makes charitable giving more transparent, accessible, and
                impactful.
              </p>
              <p className="text-lg leading-relaxed">
                Today, BELIEVE IN UNITY serves as a trusted bridge between generous hearts and worthy causes, helping
                millions of people make informed decisions about their charitable giving while supporting organizations
                in amplifying their impact and reaching new supporters.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

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
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Passionate individuals dedicated to making charitable giving more impactful
            </p>
          </motion.div>

          <div className="relative max-w-4xl mx-auto">
            <div className="hidden md:grid md:grid-cols-3 gap-8">
              {team.map((member, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                >
                  <Card className="text-center hover:shadow-lg transition-shadow bg-white dark:bg-gray-800">
                    <CardContent className="pt-6">
                      <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden">
                        <img
                          src={member.image || "/placeholder.svg"}
                          alt={member.name}
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{member.name}</h3>
                      <p className="text-blue-600 font-medium mb-3">{member.role}</p>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">{member.bio}</p>
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
                        <img
                          src={team[currentTeamIndex].image || "/placeholder.svg"}
                          alt={team[currentTeamIndex].name}
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {team[currentTeamIndex].name}
                      </h3>
                      <p className="text-blue-600 font-medium mb-3">{team[currentTeamIndex].role}</p>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">{team[currentTeamIndex].bio}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

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
                  {team.map((_, index) => (
                    <button
                      key={index}
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
            </div>
          </div>
        </div>
      </section>

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
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Transparency",
                description:
                  "We believe in complete transparency in how donations are used and the impact they create.",
                icon: "🔍",
              },
              {
                title: "Trust",
                description: "Every organization on our platform is thoroughly vetted to ensure legitimacy and impact.",
                icon: "🤝",
              },
              {
                title: "Impact",
                description: "We focus on measurable outcomes and real-world change in communities worldwide.",
                icon: "🌍",
              },
              {
                title: "Accessibility",
                description: "Charitable giving should be accessible to everyone, regardless of donation size.",
                icon: "♿",
              },
              {
                title: "Innovation",
                description: "We continuously innovate to make charitable giving more effective and engaging.",
                icon: "💡",
              },
              {
                title: "Community",
                description: "We foster a global community of supporters working together for positive change.",
                icon: "👥",
              },
            ].map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow bg-white dark:bg-gray-800">
                  <CardContent className="pt-6">
                    <div className="text-4xl mb-4">{value.icon}</div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{value.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{value.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Why BELIEVE IN UNITY</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Join the world's most comprehensive nonprofit ecosystem
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {whyBelieveInUnity.map((reason, index) => (
              <motion.div
                key={index}
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
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-blue-600 to-green-600">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Join the Movement</h2>
            <p className="text-xl text-white/90 mb-8">
              Be part of a new era of nonprofit collaboration — one built on connection, trust, and unity. Create your
              profile today and start making a difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/register">Join the Community</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 text-white border-white hover:bg-white/20"
                asChild
              >
                <Link href="/campaigns">Start a Campaign</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 text-white border-white hover:bg-white/20"
                asChild
              >
                <Link href="/marketplace">Explore the Marketplace</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
</FrontendLayout>
  )
}
