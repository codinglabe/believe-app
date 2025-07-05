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
import { Link } from "@inertiajs/react"

const featuredOrganizations = [
  {
    id: 1,
    name: "Global Water Foundation",
    description: "Providing clean water access to communities worldwide through sustainable infrastructure",
    image: "/placeholder.svg?height=300&width=400&text=Clean+Water+Project",
    category: "Environment",
    state: "NY",
    city: "New York",
    zipCode: "10001",
    verified: true,
    rating: 4.9,
    supporters: 12500,
    raised: "$2.4M",
    impact: "250K+ people served",
  },
  {
    id: 2,
    name: "Education Without Borders",
    description: "Building schools and providing educational resources to underserved communities globally",
    image: "/placeholder.svg?height=300&width=400&text=Education+Initiative",
    category: "Education",
    state: "CA",
    city: "Los Angeles",
    zipCode: "90210",
    verified: true,
    rating: 4.8,
    supporters: 8900,
    raised: "$1.8M",
    impact: "150+ schools built",
  },
  {
    id: 3,
    name: "Hunger Relief Network",
    description: "Fighting hunger and food insecurity through local food programs and distribution",
    image: "/placeholder.svg?height=300&width=400&text=Food+Security",
    category: "Health",
    state: "TX",
    city: "Houston",
    zipCode: "77001",
    verified: true,
    rating: 4.7,
    supporters: 15600,
    raised: "$3.2M",
    impact: "500K+ meals provided",
  },
]

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

const categories = ["All Categories", "Environment", "Education", "Health", "Technology", "Human Rights"]
const states = ["All States", "NY", "CA", "TX", "FL", "WA"]
const cities = ["All Cities", "New York", "Los Angeles", "Houston", "Miami", "Seattle"]

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [selectedState, setSelectedState] = useState("All States")
  const [selectedCity, setSelectedCity] = useState("All Cities")
  const [zipCode, setZipCode] = useState("")

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchQuery) params.set("search", searchQuery)
    if (selectedCategory !== "All Categories") params.set("category", selectedCategory)
    if (selectedState !== "All States") params.set("state", selectedState)
    if (selectedCity !== "All Cities") params.set("city", selectedCity)
    if (zipCode) params.set("zip", zipCode)

    window.location.href = `/organizations?${params.toString()}`
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

            {/* Enhanced Search Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-6xl mx-auto mb-16"
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
                  {/* Main Search Bar */}
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        type="text"
                        placeholder="Search organizations by name, mission, or keywords..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                        className="pl-12 h-14 text-lg border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Advanced Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        {categories.map((category) => (
                          <SelectItem key={category} value={category} className="text-gray-900 dark:text-white">
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedState} onValueChange={setSelectedState}>
                      <SelectTrigger className="h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        {states.map((state) => (
                          <SelectItem key={state} value={state} className="text-gray-900 dark:text-white">
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger className="h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                        <SelectValue placeholder="City" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        {cities.map((city) => (
                          <SelectItem key={city} value={city} className="text-gray-900 dark:text-white">
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="text"
                      placeholder="Zip Code"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />

                    <Button
                      onClick={handleSearch}
                      size="lg"
                      className="h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold"
                    >
                      <Search className="mr-2 h-5 w-5" />
                      Search
                    </Button>
                  </div>

                  {/* Quick Filter Tags */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-300 mr-2">Popular:</span>
                    {["Education", "Environment", "Health", "Emergency Relief"].map((tag) => (
                      <Button
                        key={tag}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCategory(tag)
                          handleSearch()
                        }}
                        className="h-8 text-xs bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

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
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="group"
              >
                <Card className="h-full border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white dark:bg-gray-800 overflow-hidden">
                  <div className="relative overflow-hidden">
                    <img
                      src={org.image || "/placeholder.svg"}
                      alt={org.name}
                      width={400}
                      height={300}
                      className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute top-4 left-4">
                      <Badge variant="secondary" className="bg-white/90 text-gray-700 font-medium">
                        {org.category}
                      </Badge>
                    </div>
                    <div className="absolute top-4 right-4">
                      {org.verified && (
                        <div className="bg-white/90 rounded-full p-1.5">
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center justify-between text-white text-sm">
                        <span className="font-semibold">{org.raised} raised</span>
                        <span>{org.impact}</span>
                      </div>
                    </div>
                  </div>

                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {org.name}
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {org.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {org.city}, {org.state}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-semibold">{org.rating}</span>
                      </div>
                    </div>

                    <Link
                     href={`/organization/${org.id}`}>
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold">
                        Learn More
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
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
              Why Choose CareConnect?
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
