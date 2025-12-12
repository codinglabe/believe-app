"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { useState } from "react"
import { Search, Heart, Globe, ArrowRight, Star, CheckCircle, TrendingUp, Award, Shield, MapPin } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select"
import { motion } from "framer-motion"
import { Link, router, usePage } from "@inertiajs/react"
import SearchSection from "@/components/frontend/SearchSection"
import OrganizationCard from "@/components/frontend/OrganizationCard"

const stats = [
  { label: "Verified Organizations", value: "2,500+", icon: Shield, color: "text-blue-600" },
  { label: "Lives Impacted", value: "1.2M+", icon: Heart, color: "text-red-500" },
  { label: "Countries Reached", value: "85+", icon: Globe, color: "text-green-600" },
  { label: "Funds Raised", value: "$50M+", icon: TrendingUp, color: "text-purple-600" },
]

const features = [
  {
    icon: Shield,
    title: "Verified Organizations",
    description: "Every organization is thoroughly vetted for legitimacy and impact transparency",
  },
  {
    icon: Award,
    title: "Impact Tracking",
    description: "See exactly how your donations are used and the real-world impact they create",
  },
  {
    icon: Heart,
    title: "Secure Donations",
    description: "Bank-level security with 100% of your donation going to your chosen cause",
  },
]

interface PageProps {
    filters: {
      search?: string
      category?: string
      state?: string
      city?: string
      zip?: string
    }
    filterOptions: {
      categories: string[]
      states: string[]
      cities: string[]
    }
    featuredOrganizations?: any[]
  }

export default function HomePage() {
    const { filterOptions, filters, featuredOrganizations = [], posts = [], next_page_url, has_more = false } = usePage<PageProps>().props
    const [isLoading, setIsLoading] = useState(false)

    // Handle search from SearchSection component
    const handleSearch = (params: Record<string, string>) => {
      setIsLoading(true)
      const searchParams = new URLSearchParams()

      // Add all search parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value && value !== "All Categories" && value !== "All States" && value !== "All Cities") {
          searchParams.set(key, value)
        }
      })

      // Navigate to organizations page with search parameters
      const url = searchParams.toString() ? `/organizations?${searchParams.toString()}` : "/organizations"

      router.visit(url, {
        preserveState: false, // Don't preserve state when navigating to different page
        preserveScroll: false,
        onFinish: () => setIsLoading(false),
      })
    }

    // Clear all filters and go to organizations page
    const clearFilters = () => {
      router.visit("/organizations", {
        preserveState: false,
        preserveScroll: false,
      })
    }

    // Handle quick navigation to organizations page
    const handleViewAllOrganizations = () => {
      router.visit("/organizations")
    }

    return (
    <FrontendLayout>
    <div className="min-h-screen">
      {/* Professional Hero Section - Inspired by Global Network Theme */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/images/believe-hero.png)'
          }}
        >
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-purple-900/60 dark:bg-purple-900/80"></div>
        </div>

        {/* World Map Overlay */}
        <div className="absolute inset-0 opacity-10 z-10">
          <svg className="w-full h-full" viewBox="0 0 1200 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M200,300 Q300,250 400,300 T600,300" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none"/>
            <path d="M300,200 Q400,150 500,200 T700,200" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none"/>
            <path d="M400,400 Q500,350 600,400 T800,400" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none"/>
            <circle cx="200" cy="300" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="400" cy="300" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="600" cy="300" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="800" cy="300" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="300" cy="200" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="500" cy="200" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="700" cy="200" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="400" cy="400" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="600" cy="400" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="800" cy="400" r="3" fill="rgba(255,255,255,0.5)"/>
            <line x1="200" y1="300" x2="300" y2="200" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            <line x1="400" y1="300" x2="500" y2="200" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            <line x1="600" y1="300" x2="700" y2="200" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            <line x1="300" y1="200" x2="400" y2="300" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            <line x1="500" y1="200" x2="600" y2="300" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            <line x1="400" y1="300" x2="400" y2="400" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            <line x1="600" y1="300" x2="600" y2="400" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
          </svg>
        </div>

        {/* Network Pattern Overlay - Connected Dots */}
        <div className="absolute inset-0 opacity-20 z-10">
          <div className="absolute top-20 right-20 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-32 right-32 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-40 right-40 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-60 right-60 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-80 right-80 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute bottom-40 left-40 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute bottom-60 left-60 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute bottom-80 left-80 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-white rounded-full"></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="max-w-7xl mx-auto py-12 sm:py-16 md:py-24 lg:py-32 xl:py-40">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
              {/* Left Column - Text Content */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="text-left"
              >
                {/* Main Headline */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight"
                >
                  Everything Your Nonprofit Needs
                  <br className="hidden sm:block" />
                  <span className="bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent block sm:inline">
                    to Thrive & Grow
                  </span>
                </motion.h1>

                {/* Subheadline */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 mb-6 sm:mb-8 md:mb-10 leading-relaxed"
                >
                  From fundraising and events to AI-powered content and a vibrant global community — 
                  <span className="block mt-1 sm:mt-2">we've got everything you need to make a bigger impact, all beautifully organized in one place.</span>
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="flex flex-col sm:flex-row gap-3 sm:gap-4"
                >
                  <Link href="/register" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 w-full sm:w-auto"
                    >
                      Start Making Impact
                      <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </Link>
                  <Link href="/organizations" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      variant="outline"
                      className="bg-white text-gray-900 hover:bg-white/10 hover:text-white border-2 border-white font-bold px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 w-full sm:w-auto"
                    >
                      Find Organizations
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>

              {/* Right Column - Visual Elements */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="relative mt-8 lg:mt-0"
              >
                {/* Stats Grid with Icons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {stats.map((stat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-white/20 hover:bg-white/20 transition-all duration-300"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                          <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                          <div className="text-white/80 text-xs sm:text-sm font-medium leading-tight">{stat.label}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Additional Visual Elements */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.8 }}
                  className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 text-white/80"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-300 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">Verified Organizations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-300 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">Secure Platform</span>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>


      {/* Featured Organizations */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Featured Organizations
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Discover some of the most impactful organizations making a difference worldwide
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredOrganizations.map((org, index) => (
                <OrganizationCard key={org.id} organization={org} index={index} showRating={true} rating={4.8} />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Button
              onClick={handleSearch}
              variant="outline"
              size="lg"
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white bg-transparent font-semibold px-8"
            >
              View All Organizations
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Why Choose {import.meta.env.VITE_APP_NAME}?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              We make charitable giving transparent, secure, and impactful
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="text-center group"
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-900">
                  <CardContent className="pt-8 pb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{feature.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center text-white max-w-4xl mx-auto"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Make a Difference?</h2>
            <p className="text-xl md:text-2xl mb-12 opacity-90 leading-relaxed">
              Join thousands of supporters creating positive change. Start your impact journey today.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link href="/register">
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-4 text-lg"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button
                onClick={handleSearch}
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 bg-transparent font-semibold px-8 py-4 text-lg"
              >
                Explore Organizations
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
            </div>
    </FrontendLayout>
  )
}
