"use client"

import React, { useState, useCallback } from "react"
import { Link, router, usePage } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Checkbox } from "@/components/frontend/ui/checkbox"
import { 
  Search, MapPin, Navigation, Heart, Clock, Map as MapIcon, 
  List, UtensilsCrossed, PackageOpen, Users, Church, BookOpen, 
  Shirt, CheckCircle, Flame, Baby, Milk, Navigation2, HandHeart,
  X
} from "lucide-react"
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose 
} from "@/components/frontend/ui/sheet"

// Interfaces
interface Schedule { title: string; start_time?: string; end_time?: string; day_of_week?: string; recurrence_text?: string }
interface Need { item_name: string; category?: string; priority_level: string; quantity_needed?: number }
interface Impact { loaves_served: number; families_helped: number; total_loaves_year: number }

interface LocationRow {
  id: number; name: string; description?: string; full_description?: string;
  address?: string; city?: string; state?: string; zip?: string; full_address?: string;
  latitude?: number; longitude?: number; phone?: string; website?: string;
  image_url?: string; meal_type: string; meal_type_label: string;
  accepts_food_donations: boolean; dropoff_instructions?: string;
  distance?: number; needs_summary?: string;
  meal_schedules: Schedule[]; dropoff_schedules: Schedule[]; service_schedules: Schedule[];
  current_needs: Need[]; impact?: Impact;
}

interface PaginatedLocations {
  data: LocationRow[]; current_page: number; next_page_url: string | null; total: number;
}

interface PageProps {
  seo?: { title: string; description?: string }
  locations: PaginatedLocations
  searchQuery: string
  filters: {
    meal_type: string; day: string; food_donations: string; service_type: string; location: string; sort: string;
  }
}

// Map Component
const mapContainerStyle = { width: '100%', height: '500px', borderRadius: '0.75rem' }
const defaultCenter = { lat: 28.5383, lng: -81.3792 } // Orlando FL as placeholder center

function DirectoryMap({ locations, onMarkerClick }: { locations: LocationRow[], onMarkerClick: (l: LocationRow) => void }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  })

  const [activeMarker, setActiveMarker] = useState<number | null>(null);

  if (!isLoaded) return <div className="h-[500px] w-full bg-gray-100 rounded-xl flex items-center justify-center text-gray-500">Loading Map...</div>

  // If no API key is set, show a friendly warning inside the box
  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="h-[500px] w-full bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-500 p-8 text-center border-2 border-dashed border-gray-300">
        <MapIcon className="w-12 h-12 mb-4 text-gray-400" />
        <h3 className="text-lg font-bold text-gray-700">Map View Unavailable</h3>
        <p className="mt-2 text-sm">Please provide a valid Google Maps API Key in your environment variables to enable the interactive map.</p>
      </div>
    )
  }

  const center = locations.length > 0 && locations[0].latitude && locations[0].longitude
    ? { lat: Number(locations[0].latitude), lng: Number(locations[0].longitude) }
    : defaultCenter

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={11}
      options={{ streetViewControl: false, mapTypeControl: false }}
    >
      {locations.map(loc => {
        if (!loc.latitude || !loc.longitude) return null;
        
        // Determine pin color based on services
        let iconUrl = "http://maps.google.com/mapfiles/ms/icons/green-dot.png"; // Default serving
        if (loc.accepts_food_donations && loc.meal_schedules.length > 0) {
          iconUrl = "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png"; // Both
        } else if (loc.accepts_food_donations) {
          iconUrl = "http://maps.google.com/mapfiles/ms/icons/orange-dot.png"; // Dropoff only
        }

        return (
          <Marker
            key={loc.id}
            position={{ lat: Number(loc.latitude), lng: Number(loc.longitude) }}
            icon={iconUrl}
            onClick={() => setActiveMarker(loc.id)}
          >
            {activeMarker === loc.id && (
              <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                <div className="p-2 max-w-[200px]">
                  <h4 className="font-bold text-sm mb-1">{loc.name}</h4>
                  <p className="text-xs text-gray-600 mb-2">{loc.address}</p>
                  <Button size="sm" className="h-7 w-full text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => onMarkerClick(loc)}>
                    View Details
                  </Button>
                </div>
              </InfoWindow>
            )}
          </Marker>
        )
      })}
    </GoogleMap>
  )
}

// Reusable UI components
const QuickActionCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 flex items-center gap-4 hover:-translate-y-1 transition-transform cursor-pointer">
    <div className="bg-gray-50 p-3 rounded-full border border-gray-100 shrink-0">
      {icon}
    </div>
    <div>
      <h3 className="font-bold text-gray-900 leading-tight">{title}</h3>
      <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
    </div>
  </div>
)

const ImpactStat = ({ value, label, icon }: { value: string, label: string, icon: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center p-4 text-center">
    <div className="flex items-center gap-3 mb-2">
      <div className="bg-gray-50 p-2 rounded-full ring-4 ring-gray-50/50">{icon}</div>
      <span className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</span>
    </div>
    <span className="text-sm font-medium text-gray-500">{label}</span>
  </div>
)

const DirectoryCard = ({ location, onViewDetails }: { location: LocationRow, onViewDetails: (l: LocationRow) => void }) => {
  const isServing = location.meal_schedules.length > 0;
  const isDropoff = location.accepts_food_donations;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition">
      <div className="relative h-32 bg-gray-200">
        {/* Placeholder image logic */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
        <img src={location.image_url || "/images/nonprofits-working-together-global-network.jpg"} alt={location.name} className="w-full h-full object-cover" />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 z-20 flex gap-2">
          {isServing && isDropoff ? (
            <span className="bg-emerald-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded">Serving & Drop-Off</span>
          ) : isDropoff ? (
            <span className="bg-orange-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded">Drop-Off Open</span>
          ) : (
            <span className="bg-emerald-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded">Serving Today</span>
          )}
        </div>
        <button className="absolute top-3 right-3 z-20 text-white hover:text-red-400 transition"><Heart className="w-5 h-5" /></button>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h4 className="font-bold text-gray-900 mb-1 line-clamp-1">{location.name}</h4>
        <p className="text-xs text-gray-500 mb-3 line-clamp-1">{location.address}, {location.city}, {location.state} {location.zip}</p>

        <div className="space-y-2 mb-4 flex-1">
          {/* Meal Type Row */}
          <div className="flex items-center text-xs text-gray-700">
             <UtensilsCrossed className="w-3.5 h-3.5 mr-2 text-emerald-600" />
             <span className="font-medium">{location.meal_type_label}</span>
          </div>
          
          {/* Mock Schedules */}
          {location.meal_schedules[0] && (
             <div className="flex items-center text-xs text-gray-600">
               <Clock className="w-3.5 h-3.5 mr-2 text-gray-400" />
               <span className="truncate">{location.meal_schedules[0].recurrence_text} • {location.meal_schedules[0].start_time} - {location.meal_schedules[0].end_time}</span>
             </div>
          )}
          {location.dropoff_schedules[0] && (
             <div className="flex items-center text-xs text-gray-600">
               <PackageOpen className="w-3.5 h-3.5 mr-2 text-orange-500" />
               <span className="truncate">Drop-off: {location.dropoff_schedules[0].start_time} - {location.dropoff_schedules[0].end_time}</span>
             </div>
          )}
        </div>

        <div className="flex justify-between items-end mb-4">
          <div className="flex flex-wrap gap-1">
            {location.needs_summary ? (
              <span className="bg-red-50 text-red-700 border border-red-100 text-[10px] font-semibold px-2 py-0.5 rounded-full line-clamp-1">
                {location.needs_summary}
              </span>
            ) : (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Pantry Well Stocked
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium text-gray-400">{location.distance || '0.0'} miles away</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-auto">
          <Button variant="outline" className="w-full text-xs h-8" onClick={() => onViewDetails(location)}>View Details</Button>
          <Button className="w-full text-xs h-8 bg-emerald-800 hover:bg-emerald-900 text-white" onClick={() => router.get(route('donate'))}>Donate</Button>
        </div>
      </div>
    </div>
  )
}

export default function UnityLoavesDirectory() {
  const { seo, locations: initialLocations, searchQuery: initialQuery, filters: initialFilters } = usePage<PageProps>().props
  
  const [locations] = useState(initialLocations)
  const [searchQuery, setSearchQuery] = useState(initialQuery ?? "")
  const [filters, setFilters] = useState({
    meal_type: initialFilters.meal_type ?? "",
    day: initialFilters.day ?? "",
    food_donations: initialFilters.food_donations ?? "",
    service_type: initialFilters.service_type ?? "",
    serving_today: false,
    accepts_food_donations_check: false,
    has_current_needs: false,
    sort: initialFilters.sort ?? ""
  })
  
  const [viewMode, setViewMode] = useState<"list" | "map">("map")
  const [selectedLocation, setSelectedLocation] = useState<LocationRow | null>(null)

  const buildParams = (q: string, f: typeof filters) => {
    const p: Record<string, string> = {}
    if (q) p.q = q
    if (f.meal_type) p.meal_type = f.meal_type
    if (f.day) p.day = f.day
    if (f.food_donations) p.food_donations = f.food_donations
    if (f.service_type) p.service_type = f.service_type
    if (f.sort) p.sort = f.sort
    return p
  }

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    router.get(route('unity-loaves.index'), buildParams(searchQuery, filters), { preserveState: true })
  }

  const updateFilter = (key: keyof typeof filters, value: string | boolean) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    // For selects, instantly submit. For checkboxes, maybe let them click apply.
    if (typeof value === 'string') {
        router.get(route('unity-loaves.index'), buildParams(searchQuery, next), { preserveState: true })
    }
  }

  const clearFilters = () => {
    setFilters({
        meal_type: "", day: "", food_donations: "", service_type: "", sort: "",
        serving_today: false, accepts_food_donations_check: false, has_current_needs: false
    })
    setSearchQuery("")
    router.get(route('unity-loaves.index'), {}, { preserveState: true })
  }

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? "Unity Loaves Directory"} description={seo?.description} />
      
      <div className="bg-gray-50 pb-20 font-sans">
        
        {/* Hero Section */}
        <div className="relative pt-24 pb-32 overflow-hidden bg-emerald-900">
          <img 
            src="/images/nonprofits-working-together-global-network.jpg" 
            alt="Smiling girl with food" 
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-900/60 to-transparent" />
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl text-white">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
                Find food. Give help. <span className="text-emerald-400">Feed hope.</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-100 mb-8 max-w-lg font-medium">
                Discover feeding locations, donate, and drop off non-perishable food near you.
              </p>
              
              <form onSubmit={handleSearch} className="relative mb-12">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input 
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, location, or zip code..." 
                  className="w-full pl-14 pr-36 py-7 rounded-full text-lg text-gray-900 bg-white shadow-2xl border-0 ring-4 ring-white/20 placeholder:text-gray-400"
                />
                <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-emerald-600 hover:bg-emerald-700 h-11 px-6 font-bold shadow-md">
                  <Navigation2 className="w-4 h-4 mr-2" /> Near Me
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Quick Actions (Overlapping Hero) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative -mt-14 z-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickActionCard icon={<Heart className="text-emerald-600 w-6 h-6"/>} title="Donate a Loaf" desc="Give a meal today" />
            <QuickActionCard icon={<PackageOpen className="text-orange-500 w-6 h-6"/>} title="Drop Off Food" desc="Help restock shelves" />
            <QuickActionCard icon={<MapPin className="text-blue-600 w-6 h-6"/>} title="Find a Meal" desc="Get help near you" />
            <QuickActionCard icon={<Users className="text-purple-600 w-6 h-6"/>} title="Volunteer" desc="Give your time" />
          </div>
        </div>

        {/* Impact Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-900">Our Impact This Month</h2>
              <Link href="#" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center">
                View Full Impact &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:divide-x divide-gray-100">
              <ImpactStat value="24,580" label="Meals Served" icon={<UtensilsCrossed className="w-7 h-7 text-emerald-600" />} />
              <ImpactStat value="412" label="Active Organizations" icon={<Users className="w-7 h-7 text-orange-500" />} />
              <ImpactStat value="188" label="Food Drop-Off Locations" icon={<PackageOpen className="w-7 h-7 text-emerald-600" />} />
              <ImpactStat value="8,920" label="Families Helped" icon={<Users className="w-7 h-7 text-blue-600" />} />
            </div>
          </div>
        </div>

        {/* Main Directory Layout */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar Filters */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-gray-900">Filters</h3>
                <button onClick={clearFilters} className="text-sm text-emerald-600 hover:underline font-bold">Clear All</button>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Location</label>
                  <select 
                    className="w-full border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 focus:ring-emerald-500 focus:border-emerald-500" 
                    value={filters.location} 
                    onChange={(e) => updateFilter('location', e.target.value)}
                  >
                    <option value="">Near Me (25 miles)</option>
                    <option value="Orlando">Orlando, FL</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Meal Type</label>
                  <select 
                    className="w-full border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 focus:ring-emerald-500 focus:border-emerald-500" 
                    value={filters.meal_type} 
                    onChange={(e) => updateFilter('meal_type', e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option value="food_pantry">Food Pantry</option>
                    <option value="hot_meals">Hot Meals</option>
                    <option value="community_meal">Community Meal</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Day</label>
                  <select 
                    className="w-full border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 focus:ring-emerald-500 focus:border-emerald-500" 
                    value={filters.day} 
                    onChange={(e) => updateFilter('day', e.target.value)}
                  >
                    <option value="">Any Day</option>
                    <option value="monday">Monday</option>
                    <option value="tuesday">Tuesday</option>
                    <option value="wednesday">Wednesday</option>
                    <option value="thursday">Thursday</option>
                    <option value="friday">Friday</option>
                    <option value="saturday">Saturday</option>
                    <option value="sunday">Sunday</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Food Donations</label>
                  <select 
                    className="w-full border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 focus:ring-emerald-500 focus:border-emerald-500" 
                    value={filters.food_donations} 
                    onChange={(e) => updateFilter('food_donations', e.target.value)}
                  >
                    <option value="">All Locations</option>
                    <option value="yes">Accepts Food Donations</option>
                    <option value="no">Does Not Accept</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Service Type</label>
                  <select 
                    className="w-full border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 focus:ring-emerald-500 focus:border-emerald-500" 
                    value={filters.service_type} 
                    onChange={(e) => updateFilter('service_type', e.target.value)}
                  >
                    <option value="">All Services</option>
                    <option value="Worship">Worship</option>
                    <option value="Youth Program">Youth Program</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Additional Filters</label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="serving_today" checked={filters.serving_today} onCheckedChange={(c) => updateFilter('serving_today', c===true)} className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
                      <label htmlFor="serving_today" className="text-sm font-medium text-gray-700 leading-none cursor-pointer">Serving Today</label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox id="accepts_food" checked={filters.accepts_food_donations_check} onCheckedChange={(c) => updateFilter('accepts_food_donations_check', c===true)} className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
                      <label htmlFor="accepts_food" className="text-sm font-medium text-gray-700 leading-none cursor-pointer">Accepts Food Donations</label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox id="has_needs" checked={filters.has_current_needs} onCheckedChange={(c) => updateFilter('has_current_needs', c===true)} className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
                      <label htmlFor="has_needs" className="text-sm font-medium text-gray-700 leading-none cursor-pointer">Has Current Needs</label>
                    </div>
                  </div>
                </div>

                <Button className="w-full mt-2 bg-white border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold shadow-sm" onClick={handleSearch}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                <button onClick={() => setViewMode('list')} className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-emerald-800' : 'text-gray-500 hover:text-gray-700'}`}>
                   List
                </button>
                <button onClick={() => setViewMode('map')} className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${viewMode === 'map' ? 'bg-emerald-800 shadow-sm text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                   Map
                </button>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
                <span className="text-sm font-bold text-gray-900">{locations.total} locations found</span>
                <select className="text-sm font-semibold text-gray-700 bg-transparent border-none py-2 focus:ring-0 cursor-pointer text-right">
                  <option>Sort by Nearest</option>
                  <option>Most Loaves Served</option>
                  <option>Name A-Z</option>
                </select>
              </div>
            </div>

            {/* Map View */}
            {viewMode === 'map' && (
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 relative">
                <DirectoryMap locations={locations.data} onMarkerClick={setSelectedLocation} />
                
                {/* Embedded Map Legend */}
                <div className="absolute bottom-6 left-6 bg-white py-2 px-4 rounded-full shadow-lg border border-gray-100 flex gap-6 z-10 text-xs font-bold text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-inner"></span> Serving Meals
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-orange-500 shadow-inner"></span> Drop-Off Location
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-orange-500 shadow-inner"></span> Both Services
                  </div>
                </div>
              </div>
            )}

            {/* Location Cards */}
            <div>
              <div className="flex justify-between items-center mb-5 mt-8">
                <h3 className="text-2xl font-extrabold text-gray-900">Active Locations Near You</h3>
                <Link href="#" className="text-sm font-bold text-emerald-600 hover:text-emerald-700">View All</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {locations.data.slice(0, 4).map(loc => <DirectoryCard key={loc.id} location={loc} onViewDetails={setSelectedLocation} />)}
              </div>
            </div>

            {/* Informational Blocks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-4">
                  <h3 className="font-extrabold text-xl text-gray-900">Community Services Available</h3>
                  <Link href="#" className="text-sm font-bold text-emerald-600 hover:text-emerald-700">View All Services &rarr;</Link>
                </div>
                <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-green-50 text-green-600 p-2.5 rounded-lg"><Church className="w-6 h-6"/></div>
                    <div><h4 className="font-bold text-sm text-gray-900">Worship Services</h4><p className="text-xs text-gray-500 mt-0.5">Sundays at 10:30 AM</p></div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-purple-50 text-purple-600 p-2.5 rounded-lg"><Users className="w-6 h-6"/></div>
                    <div><h4 className="font-bold text-sm text-gray-900">Youth Program</h4><p className="text-xs text-gray-500 mt-0.5">Fridays at 6:30 PM</p></div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-lg"><BookOpen className="w-6 h-6"/></div>
                    <div><h4 className="font-bold text-sm text-gray-900">Bible Study</h4><p className="text-xs text-gray-500 mt-0.5">Wednesdays at 7:00 PM</p></div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-orange-50 text-orange-500 p-2.5 rounded-lg"><UtensilsCrossed className="w-6 h-6"/></div>
                    <div><h4 className="font-bold text-sm text-gray-900">Community Meal</h4><p className="text-xs text-gray-500 mt-0.5">Tuesdays at 5:30 PM</p></div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-50 text-blue-500 p-2.5 rounded-lg"><Shirt className="w-6 h-6"/></div>
                    <div><h4 className="font-bold text-sm text-gray-900">Clothing Closet</h4><p className="text-xs text-gray-500 mt-0.5">2nd & 4th Sat at 9:00 AM</p></div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-pink-50 text-pink-500 p-2.5 rounded-lg"><HandHeart className="w-6 h-6"/></div>
                    <div><h4 className="font-bold text-sm text-gray-900">Prayer Meeting</h4><p className="text-xs text-gray-500 mt-0.5">Thursdays at 6:30 PM</p></div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col">
                <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-4">
                  <h3 className="font-extrabold text-xl text-gray-900">Most Needed Items</h3>
                  <Link href="#" className="text-sm font-bold text-emerald-600 hover:text-emerald-700">View All Needs &rarr;</Link>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-6 text-center mb-8">
                  <div className="flex flex-col items-center"><div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2 shadow-inner"><img src="https://cdn-icons-png.flaticon.com/512/3014/3014529.png" className="w-6 opacity-70" alt="Cans"/></div><span className="text-[11px] font-bold text-gray-700">Canned Goods</span></div>
                  <div className="flex flex-col items-center"><div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2 shadow-inner"><img src="https://cdn-icons-png.flaticon.com/512/5760/5760851.png" className="w-6 opacity-70" alt="Rice"/></div><span className="text-[11px] font-bold text-gray-700">Rice</span></div>
                  <div className="flex flex-col items-center"><div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2 shadow-inner"><img src="https://cdn-icons-png.flaticon.com/512/3014/3014545.png" className="w-6 opacity-70" alt="Pasta"/></div><span className="text-[11px] font-bold text-gray-700">Pasta</span></div>
                  <div className="flex flex-col items-center"><div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2 shadow-inner"><img src="https://cdn-icons-png.flaticon.com/512/7504/7504396.png" className="w-6 opacity-70" alt="Peanut Butter"/></div><span className="text-[11px] font-bold text-gray-700">Peanut Butter</span></div>
                  <div className="flex flex-col items-center"><div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2 shadow-inner"><img src="https://cdn-icons-png.flaticon.com/512/3014/3014532.png" className="w-6 opacity-70" alt="Cereal"/></div><span className="text-[11px] font-bold text-gray-700">Cereal</span></div>
                </div>

                <div className="mt-auto bg-gray-50 rounded-xl p-5 border border-gray-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Can't find a location near you?</h4>
                    <p className="text-xs text-gray-500 mb-3">Help us expand Unity Loaves to your community.</p>
                    <Button variant="outline" className="bg-white font-bold h-8 text-xs">Recommend a Location</Button>
                  </div>
                  <div className="relative w-24 h-24 shrink-0 hidden sm:block">
                    <MapIcon className="w-full h-full text-emerald-100" />
                    <MapPin className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 w-10 h-10 fill-red-100" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Call to Action */}
            <div className="mt-8 bg-emerald-950 rounded-2xl shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-12 opacity-10">
                <Heart className="w-64 h-64 text-white" />
              </div>
              <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6 text-white max-w-xl">
                  <div className="bg-emerald-800/50 p-4 rounded-full hidden sm:block">
                    <Heart className="w-10 h-10 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold mb-2">Be the reason someone has a meal today.</h2>
                    <p className="text-emerald-100 font-medium">Your gift of $10 provides 1 meal and brings hope to a family in need.</p>
                  </div>
                </div>
                <div className="flex gap-4 w-full md:w-auto shrink-0">
                  <Button className="flex-1 md:flex-none h-12 px-8 bg-transparent border-2 border-emerald-500 text-emerald-50 hover:bg-emerald-800 font-bold text-base" onClick={() => router.get(route('donate'))}>
                    Donate a Loaf
                  </Button>
                  <Button className="flex-1 md:flex-none h-12 px-8 bg-white text-emerald-900 hover:bg-gray-100 font-bold text-base" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    Drop Off Food
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Detail Slide-in Panel */}
      <Sheet open={!!selectedLocation} onOpenChange={(open) => !open && setSelectedLocation(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto z-[100] bg-white">
          {selectedLocation && (
            <div className="space-y-6 mt-6">
              <SheetHeader>
                <SheetTitle className="text-xl font-bold text-gray-900 text-left">{selectedLocation.name}</SheetTitle>
                <SheetDescription className="text-sm text-left">
                  {selectedLocation.full_address}
                </SheetDescription>
              </SheetHeader>

              {/* Image */}
              <div className="relative h-48 rounded-xl overflow-hidden bg-gray-100">
                <img src={selectedLocation.image_url || "/images/nonprofits-working-together-global-network.jpg"} alt={selectedLocation.name} className="w-full h-full object-cover" />
              </div>

              {/* Badges / Contact */}
              <div className="flex flex-wrap gap-2">
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded">
                  {selectedLocation.meal_type_label}
                </span>
                {selectedLocation.accepts_food_donations && (
                  <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded">
                    Accepts Food Donations
                  </span>
                )}
              </div>

              {(selectedLocation.phone || selectedLocation.website) && (
                <div className="space-y-1 text-sm text-gray-600">
                  {selectedLocation.phone && <p><strong>Phone:</strong> <a href={`tel:${selectedLocation.phone}`} className="text-emerald-600 hover:underline">{selectedLocation.phone}</a></p>}
                  {selectedLocation.website && <p><strong>Website:</strong> <a href={selectedLocation.website} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline">{selectedLocation.website}</a></p>}
                </div>
              )}

              <div className="space-y-4 text-sm text-gray-700">
                <p>{selectedLocation.full_description || selectedLocation.description}</p>
              </div>

              {/* Schedules */}
              {selectedLocation.meal_schedules.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><UtensilsCrossed className="w-4 h-4 text-emerald-600"/> Meal Schedules</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {selectedLocation.meal_schedules.map((s, i) => (
                      <li key={i}>{s.title ? s.title + ': ' : ''}{s.recurrence_text} • {s.start_time} - {s.end_time}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedLocation.dropoff_schedules.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><PackageOpen className="w-4 h-4 text-orange-500"/> Drop-off Schedules</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {selectedLocation.dropoff_schedules.map((s, i) => (
                      <li key={i}>{s.title ? s.title + ': ' : ''}{s.recurrence_text} • {s.start_time} - {s.end_time}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Needs */}
              {selectedLocation.current_needs.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Current Needs</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedLocation.current_needs.map((n, i) => (
                      <span key={i} className="bg-red-50 border border-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded">
                        {n.item_name} {n.quantity_needed ? `(${n.quantity_needed})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => router.get(route('donate'))}>
                  Donate
                </Button>
                {selectedLocation.phone && (
                  <Button variant="outline" className="flex-1" onClick={() => window.location.href = `tel:${selectedLocation.phone}`}>
                    Call
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </FrontendLayout>
  )
}
