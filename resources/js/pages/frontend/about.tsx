"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Heart, Users, Globe, Award, Target, Eye } from "lucide-react"
import { Card, CardContent } from "@/components/frontend/ui/card"

const stats = [
  { label: "Organizations", value: "2,500+", icon: Users },
  { label: "Lives Impacted", value: "1M+", icon: Heart },
  { label: "Countries", value: "85+", icon: Globe },
  { label: "Years Active", value: "8+", icon: Award },
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
    return (
    <FrontendLayout>
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">About CareConnect</h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              We're on a mission to connect hearts with causes, making it easier than ever to discover and support
              verified non-profit organizations worldwide.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
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
                    To democratize charitable giving by creating a transparent, accessible platform where anyone can
                    discover verified non-profit organizations and make a meaningful impact in causes they care about.
                  </p>
                </div>
                <div>
                  <div className="flex items-center mb-4">
                    <Eye className="h-8 w-8 text-green-600 mr-3" />
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Our Vision</h2>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                    A world where every person has the power to create positive change, and every worthy cause has the
                    support it needs to thrive and make a lasting impact on communities worldwide.
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
                src="/placeholder.svg?height=500&width=600"
                alt="Our mission"
                width={600}
                height={500}
                className="rounded-2xl shadow-lg"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
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
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
                  <stat.icon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stat.value}</div>
                <div className="text-gray-600 dark:text-gray-300">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
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
                CareConnect was born from a simple observation: while there are countless amazing non-profit
                organizations doing incredible work around the world, it's often difficult for people to discover and
                connect with causes that align with their values and passions.
              </p>
              <p className="text-lg leading-relaxed mb-6">
                Founded in 2016 by a team of former humanitarian workers and tech entrepreneurs, we set out to bridge
                this gap by creating a platform that makes charitable giving more transparent, accessible, and
                impactful.
              </p>
              <p className="text-lg leading-relaxed">
                Today, CareConnect serves as a trusted bridge between generous hearts and worthy causes, helping
                millions of people make informed decisions about their charitable giving while supporting organizations
                in amplifying their impact and reaching new supporters.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Team */}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
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
        </div>
      </section>

      {/* Values */}
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
            </div>
    </FrontendLayout>
  )
}
