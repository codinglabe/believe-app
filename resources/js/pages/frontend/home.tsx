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
    const { filterOptions, filters, featuredOrganizations = [] } = usePage<PageProps>().props
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
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-20 md:py-32">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-5xl mx-auto"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
              <Award className="w-4 h-4 mr-2" />
              Trusted by 2,500+ verified organizations
            </div>

            <h1 className="text-4xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Discover & Support
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block">
                Amazing Causes
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Connect with verified non-profit organizations making a real difference. Find causes you care about and
              create lasting impact in communities worldwide.
            </p>

            {/* Search Section Component */}
            <SearchSection
                filters={filters}
                filterOptions={filterOptions}
                hasActiveFilters={false}
                onSearch={handleSearch}
                onClearFilters={clearFilters}
                isLoading={isLoading}
                showQuickFilters={true}
                quickFilterTags={["Education", "Environment", "Health", "Emergency Relief"]}
              />

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center group">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300">
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">{stat.value}</div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
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
              <Link href={route('register')}>
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
