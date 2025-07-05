"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { useState, useEffect } from "react"
import { Search, MapPin, Star, CheckCircle, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select"
import { motion } from "framer-motion"
import { Link } from "@inertiajs/react"

// Mock organizations data
const mockOrganizations = [
  {
    id: 1,
    name: "Global Water Foundation",
    description:
      "Providing clean water access to communities worldwide through sustainable infrastructure projects and local partnerships.",
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
    description:
      "Building schools and providing educational resources to underserved communities globally with focus on sustainable development.",
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
    description:
      "Fighting hunger and food insecurity through local food programs, distribution centers, and community partnerships.",
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
  {
    id: 4,
    name: "Tech for Good Initiative",
    description:
      "Bridging the digital divide by providing technology access and training to underserved communities worldwide.",
    image: "/placeholder.svg?height=300&width=400&text=Technology+Access",
    category: "Technology",
    state: "WA",
    city: "Seattle",
    zipCode: "98101",
    verified: true,
    rating: 4.6,
    supporters: 7200,
    raised: "$1.1M",
    impact: "100K+ people trained",
  },
  {
    id: 5,
    name: "Human Rights Defenders",
    description:
      "Protecting human rights and advocating for justice through legal aid, advocacy, and community empowerment programs.",
    image: "/placeholder.svg?height=300&width=400&text=Human+Rights",
    category: "Human Rights",
    state: "DC",
    city: "Washington",
    zipCode: "20001",
    verified: true,
    rating: 4.8,
    supporters: 9800,
    raised: "$2.1M",
    impact: "50K+ cases supported",
  },
  {
    id: 6,
    name: "Climate Action Alliance",
    description:
      "Leading climate change mitigation efforts through renewable energy projects and environmental conservation initiatives.",
    image: "/placeholder.svg?height=300&width=400&text=Climate+Action",
    category: "Environment",
    state: "CO",
    city: "Denver",
    zipCode: "80201",
    verified: true,
    rating: 4.9,
    supporters: 11200,
    raised: "$2.8M",
    impact: "1M+ trees planted",
  },
]

const categories = ["All Categories", "Environment", "Education", "Health", "Technology", "Human Rights"]
const states = ["All States", "NY", "CA", "TX", "WA", "DC", "CO", "FL", "IL", "PA", "OH"]
const cities = [
  "All Cities",
  "New York",
  "Los Angeles",
  "Houston",
  "Seattle",
  "Washington",
  "Denver",
  "Miami",
  "Chicago",
  "Philadelphia",
  "Columbus",
]
const sortOptions = [
  { value: "relevance", label: "Most Relevant" },
  { value: "rating", label: "Highest Rated" },
  { value: "supporters", label: "Most Supporters" },
  { value: "raised", label: "Most Funds Raised" },
  { value: "newest", label: "Newest" },
]

export default function OrganizationsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [selectedState, setSelectedState] = useState("All States")
  const [selectedCity, setSelectedCity] = useState("All Cities")
  const [zipCode, setZipCode] = useState("")
  const [sortBy, setSortBy] = useState("relevance")
  const [resultsPerPage, setResultsPerPage] = useState(100)
  const [currentPage, setCurrentPage] = useState(1)
  const [filteredOrganizations, setFilteredOrganizations] = useState(mockOrganizations)

  // Get URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get("search")) setSearchQuery(urlParams.get("search") || "")
    if (urlParams.get("category")) setSelectedCategory(urlParams.get("category") || "All Categories")
    if (urlParams.get("state")) setSelectedState(urlParams.get("state") || "All States")
    if (urlParams.get("city")) setSelectedCity(urlParams.get("city") || "All Cities")
    if (urlParams.get("zip")) setZipCode(urlParams.get("zip") || "")
  }, [])

  // Filter organizations based on search criteria
  useEffect(() => {
    let filtered = mockOrganizations

    if (searchQuery) {
      filtered = filtered.filter(
        (org) =>
          org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          org.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          org.category.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (selectedCategory !== "All Categories") {
      filtered = filtered.filter((org) => org.category === selectedCategory)
    }

    if (selectedState !== "All States") {
      filtered = filtered.filter((org) => org.state === selectedState)
    }

    if (selectedCity !== "All Cities") {
      filtered = filtered.filter((org) => org.city === selectedCity)
    }

    if (zipCode) {
      filtered = filtered.filter((org) => org.zipCode.includes(zipCode))
    }

    // Sort organizations
    if (sortBy === "rating") {
      filtered.sort((a, b) => b.rating - a.rating)
    } else if (sortBy === "supporters") {
      filtered.sort((a, b) => b.supporters - a.supporters)
    } else if (sortBy === "raised") {
      filtered.sort(
        (a, b) => Number.parseFloat(b.raised.replace(/[$M]/g, "")) - Number.parseFloat(a.raised.replace(/[$M]/g, "")),
      )
    }

    setFilteredOrganizations(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [searchQuery, selectedCategory, selectedState, selectedCity, zipCode, sortBy])

  const handleSearch = () => {
    // Search is handled by useEffect, but we can add analytics or other actions here
    console.log("Search triggered")
  }

  const handleQuickFilter = (category: string) => {
    setSelectedCategory(category)
  }

  // Pagination calculations
  const totalResults = filteredOrganizations.length
  const totalPages = Math.ceil(totalResults / resultsPerPage)
  const startIndex = (currentPage - 1) * resultsPerPage
  const endIndex = Math.min(startIndex + resultsPerPage, totalResults)
  const currentOrganizations = filteredOrganizations.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleResultsPerPageChange = (value: string) => {
    const num = Number.parseInt(value) || 100
    setResultsPerPage(Math.max(1, num))
    setCurrentPage(1)
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    return pages
  }

    return (
    <FrontendLayout>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">Discover Organizations</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Find verified non-profit organizations making a real difference in communities worldwide.
          </p>
        </motion.div>

        {/* Enhanced Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <div className="relative group max-w-6xl mx-auto">
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
                    className="pl-12 pr-4 h-14 text-lg border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl"
                  />
                </div>
              </div>

              {/* Filters and Search Button */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl">
                    <SelectValue placeholder="All Categories" />
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
                  <SelectTrigger className="h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl">
                    <SelectValue placeholder="All States" />
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
                  <SelectTrigger className="h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl">
                    <SelectValue placeholder="All Cities" />
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
                  className="h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl"
                />

                <Button
                  onClick={handleSearch}
                  size="lg"
                  className="h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold rounded-xl"
                >
                  <Search className="mr-2 h-5 w-5" />
                  Search
                </Button>
              </div>

              {/* Popular Quick Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300 mr-2">Popular:</span>
                {["Education", "Environment", "Health", "Emergency Relief"].map((tag) => (
                  <Button
                    key={tag}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickFilter(tag)}
                    className="h-8 text-xs bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/30 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Results Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
        >
          <div className="flex items-center gap-4">
            <p className="text-gray-600 dark:text-gray-400">
              Showing{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {startIndex + 1}-{endIndex}
              </span>{" "}
              of <span className="font-semibold text-gray-900 dark:text-white">{totalResults}</span> organizations
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Results per page:</label>
              <Input
                type="number"
                min="1"
                value={resultsPerPage}
                onChange={(e) => handleResultsPerPageChange(e.target.value)}
                className="w-20 h-8 text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-gray-900 dark:text-white">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Organizations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {currentOrganizations.map((org, index) => (
            <motion.div
              key={org.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
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

                  <Link href={route("organization.show", org.id)}>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex justify-center items-center gap-2"
          >
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="flex gap-1">
              {getPageNumbers().map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  onClick={() => handlePageChange(page)}
                  className={
                    currentPage === page
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  }
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>

            <div className="ml-4 text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
          </motion.div>
        )}

        {/* No Results */}
        {filteredOrganizations.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No organizations found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Try adjusting your search criteria or browse all organizations to discover amazing causes.
            </p>
            <Button
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory("All Categories")
                setSelectedState("All States")
                setSelectedCity("All Cities")
                setZipCode("")
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Clear All Filters
            </Button>
          </motion.div>
        )}
      </div>
            </div>
    </FrontendLayout>
  )
}
