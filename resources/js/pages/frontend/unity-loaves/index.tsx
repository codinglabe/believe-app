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

/** Map + List/Map toggle: set `true` to show again (code stays in place). */
const UNITY_LOAVES_MAP_VIEW_ENABLED = false

// Map Component
const mapContainerStyle = { width: '100%', height: '500px', borderRadius: '0.75rem' }
const defaultCenter = { lat: 28.5383, lng: -81.3792 } // Orlando FL as placeholder center

function DirectoryMap({ locations, onMarkerClick }: { locations: LocationRow[], onMarkerClick: (l: LocationRow) => void }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  })

  const [activeMarker, setActiveMarker] = useState<number | null>(null);

  if (!isLoaded) return <div className="h-[500px] w-full bg-muted rounded-xl flex items-center justify-center text-muted-foreground">Loading Map...</div>

  // If no API key is set, show a friendly warning inside the box
  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="h-[500px] w-full bg-muted rounded-xl flex flex-col items-center justify-center text-muted-foreground p-8 text-center border-2 border-dashed border-border">
        <MapIcon className="w-12 h-12 mb-4 text-muted-foreground/70" />
        <h3 className="text-lg font-bold text-foreground">Map View Unavailable</h3>
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
                  <p className="text-xs text-muted-foreground mb-2">{loc.address}</p>
                  <Button size="sm" className="h-7 w-full text-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white" onClick={() => onMarkerClick(loc)}>
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
  <div className="bg-card text-card-foreground rounded-xl shadow-lg border border-border p-4 flex items-center gap-4 hover:-translate-y-1 transition-transform cursor-pointer dark:shadow-black/20">
    <div className="bg-muted p-3 rounded-full border border-border shrink-0">
      {icon}
    </div>
    <div>
      <h3 className="font-bold text-foreground leading-tight">{title}</h3>
      <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
    </div>
  </div>
)

/** Set to true when the monthly impact stats block should be visible again. */
const SHOW_IMPACT_SECTION = false

const ImpactStat = ({ value, label, icon }: { value: string, label: string, icon: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center p-4 text-center">
    <div className="flex items-center gap-3 mb-2">
      <div className="bg-muted p-2 rounded-full ring-4 ring-muted/60">{icon}</div>
      <span className="text-3xl font-extrabold text-foreground tracking-tight">{value}</span>
    </div>
    <span className="text-sm font-medium text-muted-foreground">{label}</span>
  </div>
)

const DirectoryCard = ({ location, onViewDetails }: { location: LocationRow, onViewDetails: (l: LocationRow) => void }) => {
  const isServing = location.meal_schedules.length > 0;
  const isDropoff = location.accepts_food_donations;

  return (
    <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border overflow-hidden flex flex-col hover:shadow-md transition dark:hover:shadow-black/25">
      <div className="relative h-32 bg-muted">
        {/* Placeholder image logic */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
        <img src={location.image_url || "/images/nonprofits-working-together-global-network.jpg"} alt={location.name} className="w-full h-full object-cover" />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 z-20 flex gap-2">
          {isServing && isDropoff ? (
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm">Serving & Drop-Off</span>
          ) : isDropoff ? (
            <span className="bg-amber-500 dark:bg-amber-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm">Drop-Off Open</span>
          ) : (
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm">Serving Today</span>
          )}
        </div>
        <button type="button" className="absolute top-3 right-3 z-20 text-white hover:text-destructive transition" aria-label="Favorite"><Heart className="w-5 h-5" /></button>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h4 className="font-bold text-foreground mb-1 line-clamp-1">{location.name}</h4>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{location.address}, {location.city}, {location.state} {location.zip}</p>

        <div className="space-y-2 mb-4 flex-1">
          {/* Meal Type Row */}
          <div className="flex items-center text-xs text-foreground/90">
             <UtensilsCrossed className="w-3.5 h-3.5 mr-2 text-purple-600 dark:text-purple-400 shrink-0" />
             <span className="font-medium">{location.meal_type_label}</span>
          </div>
          
          {/* Mock Schedules */}
          {location.meal_schedules[0] && (
             <div className="flex items-center text-xs text-muted-foreground">
               <Clock className="w-3.5 h-3.5 mr-2 text-muted-foreground shrink-0" />
               <span className="truncate">{location.meal_schedules[0].recurrence_text} • {location.meal_schedules[0].start_time} - {location.meal_schedules[0].end_time}</span>
             </div>
          )}
          {location.dropoff_schedules[0] && (
             <div className="flex items-center text-xs text-muted-foreground">
               <PackageOpen className="w-3.5 h-3.5 mr-2 text-amber-500 dark:text-amber-400 shrink-0" />
               <span className="truncate">Drop-off: {location.dropoff_schedules[0].start_time} - {location.dropoff_schedules[0].end_time}</span>
             </div>
          )}
        </div>

        <div className="flex justify-between items-end mb-4">
          <div className="flex flex-wrap gap-1">
            {location.needs_summary ? (
              <span className="bg-destructive/10 text-destructive border border-destructive/20 text-[10px] font-semibold px-2 py-0.5 rounded-full line-clamp-1 dark:bg-destructive/15">
                {location.needs_summary}
              </span>
            ) : (
              <span className="bg-purple-500/10 text-purple-800 border border-purple-500/25 text-[10px] font-semibold px-2 py-0.5 rounded-full dark:text-purple-200">
                Pantry Well Stocked
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">{location.distance || '0.0'} miles away</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-auto">
          <Button variant="outline" className="w-full text-xs h-8 border-border" onClick={() => onViewDetails(location)}>View Details</Button>
          <Button className="w-full text-xs h-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white" onClick={() => router.get(route('donate'))}>Donate</Button>
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
    location: initialFilters.location ?? "",
    serving_today: false,
    accepts_food_donations_check: false,
    has_current_needs: false,
    sort: initialFilters.sort ?? ""
  })
  
  const [viewMode, setViewMode] = useState<"list" | "map">("list")
  const [selectedLocation, setSelectedLocation] = useState<LocationRow | null>(null)

  const buildParams = (q: string, f: typeof filters) => {
    const p: Record<string, string> = {}
    if (q) p.q = q
    if (f.meal_type) p.meal_type = f.meal_type
    if (f.day) p.day = f.day
    if (f.food_donations) p.food_donations = f.food_donations
    if (f.service_type) p.service_type = f.service_type
    if (f.sort) p.sort = f.sort
    if (f.location) p.location = f.location
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
        meal_type: "", day: "", food_donations: "", service_type: "", location: "", sort: "",
        serving_today: false, accepts_food_donations_check: false, has_current_needs: false
    })
    setSearchQuery("")
    router.get(route('unity-loaves.index'), {}, { preserveState: true })
  }

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? "Unity Loaves Directory"} description={seo?.description} />
      
      <div className="bg-background pb-20 font-sans text-foreground">
        
        {/* Hero — medium scrim: photo still visible, not as pale as the previous pass */}
        <div className="relative pt-24 pb-32 overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-950 dark:from-purple-950 dark:via-indigo-950 dark:to-blue-950">
          <img 
            src="/images/nonprofits-working-together-global-network.jpg" 
            alt="Smiling girl with food" 
            className="absolute inset-0 w-full h-full object-cover opacity-55 dark:opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/70 via-indigo-900/55 to-blue-950/65 dark:from-purple-900/60 dark:via-indigo-900/50 dark:to-blue-900/55" />
          
          <div className="relative z-10 container mx-auto px-4">
            <div className="max-w-2xl text-white">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
                Find food. Give help.{' '}
                <span className="bg-gradient-to-r from-purple-200 to-blue-200 bg-clip-text text-transparent">Feed hope.</span>
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-8 max-w-lg font-medium">
                Discover feeding locations, donate, and drop off non-perishable food near you.
              </p>
              
              <form onSubmit={handleSearch} className="relative mb-12">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5 z-10" />
                <Input 
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, location, or zip code..." 
                  className="w-full pl-14 pr-36 py-7 rounded-full text-lg bg-card text-card-foreground shadow-2xl border border-border ring-4 ring-white/10 dark:ring-white/5 placeholder:text-muted-foreground"
                />
                <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-11 px-6 font-bold shadow-md text-white border-0">
                  <Navigation2 className="w-4 h-4 mr-2" /> Near Me
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Quick Actions (Overlapping Hero) */}
        <div className="container mx-auto px-4 relative -mt-14 z-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickActionCard icon={<Heart className="text-purple-600 dark:text-purple-400 w-6 h-6"/>} title="Donate a Loaf" desc="Give a meal today" />
            <QuickActionCard icon={<PackageOpen className="text-amber-500 dark:text-amber-400 w-6 h-6"/>} title="Drop Off Food" desc="Help restock shelves" />
            <QuickActionCard icon={<MapPin className="text-blue-600 dark:text-blue-400 w-6 h-6"/>} title="Find a Meal" desc="Get help near you" />
            <QuickActionCard icon={<Users className="text-purple-600 dark:text-purple-400 w-6 h-6"/>} title="Volunteer" desc="Give your time" />
          </div>
        </div>

        {SHOW_IMPACT_SECTION && (
          <div className="container mx-auto px-4 mt-10 mb-8">
            <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-6 md:p-8">
              <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                <h2 className="text-xl font-bold text-foreground">Our Impact This Month</h2>
                <Link href="#" className="text-sm font-bold text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 flex items-center">
                  View Full Impact &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:divide-x divide-border">
                <ImpactStat value="24,580" label="Meals Served" icon={<UtensilsCrossed className="w-7 h-7 text-purple-600 dark:text-purple-400" />} />
                <ImpactStat value="412" label="Active Organizations" icon={<Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />} />
                <ImpactStat value="188" label="Food Drop-Off Locations" icon={<PackageOpen className="w-7 h-7 text-amber-500 dark:text-amber-400" />} />
                <ImpactStat value="8,920" label="Families Helped" icon={<Users className="w-7 h-7 text-purple-600 dark:text-purple-400" />} />
              </div>
            </div>
          </div>
        )}

        {/* Main Directory Layout */}
        <div className={`container mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8${SHOW_IMPACT_SECTION ? "" : " mt-10"}`}>
          
          {/* Sidebar Filters */}
          <div className="lg:col-span-3">
            <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-6 sticky top-24">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-foreground">Filters</h3>
                <button type="button" onClick={clearFilters} className="text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 hover:underline font-bold">Clear All</button>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label htmlFor="ul-filter-location" className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Location</label>
                  <select 
                    id="ul-filter-location"
                    className="w-full border border-input rounded-lg p-2.5 text-sm bg-muted/50 text-foreground focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
                    value={filters.location} 
                    onChange={(e) => updateFilter('location', e.target.value)}
                  >
                    <option value="">Near Me (25 miles)</option>
                    <option value="Orlando">Orlando, FL</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ul-filter-meal-type" className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Meal Type</label>
                  <select 
                    id="ul-filter-meal-type"
                    className="w-full border border-input rounded-lg p-2.5 text-sm bg-muted/50 text-foreground focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
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
                  <label htmlFor="ul-filter-day" className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Day</label>
                  <select 
                    id="ul-filter-day"
                    className="w-full border border-input rounded-lg p-2.5 text-sm bg-muted/50 text-foreground focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
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
                  <label htmlFor="ul-filter-donations" className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Food Donations</label>
                  <select 
                    id="ul-filter-donations"
                    className="w-full border border-input rounded-lg p-2.5 text-sm bg-muted/50 text-foreground focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
                    value={filters.food_donations} 
                    onChange={(e) => updateFilter('food_donations', e.target.value)}
                  >
                    <option value="">All Locations</option>
                    <option value="yes">Accepts Food Donations</option>
                    <option value="no">Does Not Accept</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ul-filter-service" className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Service Type</label>
                  <select 
                    id="ul-filter-service"
                    className="w-full border border-input rounded-lg p-2.5 text-sm bg-muted/50 text-foreground focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
                    value={filters.service_type} 
                    onChange={(e) => updateFilter('service_type', e.target.value)}
                  >
                    <option value="">All Services</option>
                    <option value="Worship">Worship</option>
                    <option value="Youth Program">Youth Program</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-border">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Additional Filters</label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="serving_today" checked={filters.serving_today} onCheckedChange={(c) => updateFilter('serving_today', c===true)} className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600" />
                      <label htmlFor="serving_today" className="text-sm font-medium text-foreground leading-none cursor-pointer">Serving Today</label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox id="accepts_food" checked={filters.accepts_food_donations_check} onCheckedChange={(c) => updateFilter('accepts_food_donations_check', c===true)} className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600" />
                      <label htmlFor="accepts_food" className="text-sm font-medium text-foreground leading-none cursor-pointer">Accepts Food Donations</label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox id="has_needs" checked={filters.has_current_needs} onCheckedChange={(c) => updateFilter('has_current_needs', c===true)} className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600" />
                      <label htmlFor="has_needs" className="text-sm font-medium text-foreground leading-none cursor-pointer">Has Current Needs</label>
                    </div>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-2 border-2 border-purple-600 text-purple-700 hover:bg-purple-50 font-bold shadow-sm dark:border-purple-400 dark:text-purple-300 dark:hover:bg-purple-950/40" onClick={handleSearch}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Top Toolbar — Map tab + map canvas hidden when UNITY_LOAVES_MAP_VIEW_ENABLED is false */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card text-card-foreground p-3 rounded-2xl shadow-sm border border-border">
              <div className="flex bg-muted p-1 rounded-xl w-full sm:w-auto">
                <button type="button" onClick={() => setViewMode('list')} className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${viewMode === 'list' ? 'bg-card shadow-sm text-purple-800 dark:text-purple-200 border border-border' : 'text-muted-foreground hover:text-foreground'}`}>
                   List
                </button>
                {UNITY_LOAVES_MAP_VIEW_ENABLED && (
                  <button type="button" onClick={() => setViewMode('map')} className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${viewMode === 'map' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                     Map
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
                <span className="text-sm font-bold text-foreground">{locations.total} locations found</span>
                <select id="ul-sort" aria-label="Sort locations" className="text-sm font-semibold text-foreground bg-transparent border-none py-2 focus:ring-0 cursor-pointer text-right">
                  <option>Sort by Nearest</option>
                  <option>Most Loaves Served</option>
                  <option>Name A-Z</option>
                </select>
              </div>
            </div>

            {/* Map View (gated — flip UNITY_LOAVES_MAP_VIEW_ENABLED to restore) */}
            {UNITY_LOAVES_MAP_VIEW_ENABLED && viewMode === 'map' && (
              <div className="bg-card p-3 rounded-2xl shadow-sm border border-border relative">
                <DirectoryMap locations={locations.data} onMarkerClick={setSelectedLocation} />
                
                {/* Embedded Map Legend */}
                <div className="absolute bottom-6 left-6 bg-card/95 backdrop-blur-sm py-2 px-4 rounded-full shadow-lg border border-border flex gap-6 z-10 text-xs font-bold text-foreground">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 shadow-inner"></span> Serving Meals
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 dark:bg-amber-500 shadow-inner"></span> Drop-Off Location
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-amber-500 shadow-inner"></span> Both Services
                  </div>
                </div>
              </div>
            )}

            {/* Location Cards */}
            <div>
              <div className="flex justify-between items-center mb-5 mt-8">
                <h3 className="text-2xl font-extrabold text-foreground">Active Locations Near You</h3>
                <Link href="#" className="text-sm font-bold text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300">View All</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {locations.data.slice(0, 4).map(loc => <DirectoryCard key={loc.id} location={loc} onViewDetails={setSelectedLocation} />)}
              </div>
            </div>

            {/* Informational Blocks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12">
              <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-8">
                <div className="flex justify-between items-center mb-8 border-b border-border pb-4">
                  <h3 className="font-extrabold text-xl text-foreground">Community Services Available</h3>
                  <Link href="#" className="text-sm font-bold text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300">View All Services &rarr;</Link>
                </div>
                <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-purple-500/15 text-purple-700 dark:text-purple-300 p-2.5 rounded-lg border border-purple-500/25"><Church className="w-6 h-6"/></div>
                    <div><h4 className="font-bold text-sm text-foreground">Worship Services</h4><p className="text-xs text-muted-foreground mt-0.5">Sundays at 10:30 AM</p></div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-500/15 text-blue-700 dark:text-blue-300 p-2.5 rounded-lg border border-blue-500/25"><Users className="w-6 h-6"/></div>
                    <div><h4 className="font-bold text-sm text-foreground">Youth Program</h4><p className="text-xs text-muted-foreground mt-0.5">Fridays at 6:30 PM</p></div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-muted text-purple-600 dark:text-purple-400 p-2.5 rounded-lg border border-border"><BookOpen className="w-6 h-6"/></div>
                    <div><h4 className="font-bold text-sm text-foreground">Bible Study</h4><p className="text-xs text-muted-foreground mt-0.5">Wednesdays at 7:00 PM</p></div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-amber-500/15 text-amber-600 dark:text-amber-400 p-2.5 rounded-lg border border-amber-500/25"><UtensilsCrossed className="w-6 h-6"/></div>
                    <div><h4 className="font-bold text-sm text-foreground">Community Meal</h4><p className="text-xs text-muted-foreground mt-0.5">Tuesdays at 5:30 PM</p></div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-purple-500/10 text-blue-600 dark:text-blue-400 p-2.5 rounded-lg border border-border"><Shirt className="w-6 h-6"/></div>
                    <div><h4 className="font-bold text-sm text-foreground">Clothing Closet</h4><p className="text-xs text-muted-foreground mt-0.5">2nd & 4th Sat at 9:00 AM</p></div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-destructive/10 text-destructive p-2.5 rounded-lg border border-destructive/20"><HandHeart className="w-6 h-6"/></div>
                    <div><h4 className="font-bold text-sm text-foreground">Prayer Meeting</h4><p className="text-xs text-muted-foreground mt-0.5">Thursdays at 6:30 PM</p></div>
                  </div>
                </div>
              </div>

              <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-8 flex flex-col">
                <div className="flex justify-between items-center mb-8 border-b border-border pb-4">
                  <h3 className="font-extrabold text-xl text-foreground">Most Needed Items</h3>
                  <Link href="#" className="text-sm font-bold text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300">View All Needs &rarr;</Link>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-6 text-center mb-8">
                  <div className="flex flex-col items-center"><div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-2 shadow-inner border border-border"><img src="https://cdn-icons-png.flaticon.com/512/3014/3014529.png" className="w-6 opacity-70 dark:opacity-90" alt="Cans"/></div><span className="text-[11px] font-bold text-foreground">Canned Goods</span></div>
                  <div className="flex flex-col items-center"><div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-2 shadow-inner border border-border"><img src="https://cdn-icons-png.flaticon.com/512/5760/5760851.png" className="w-6 opacity-70 dark:opacity-90" alt="Rice"/></div><span className="text-[11px] font-bold text-foreground">Rice</span></div>
                  <div className="flex flex-col items-center"><div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-2 shadow-inner border border-border"><img src="https://cdn-icons-png.flaticon.com/512/3014/3014545.png" className="w-6 opacity-70 dark:opacity-90" alt="Pasta"/></div><span className="text-[11px] font-bold text-foreground">Pasta</span></div>
                  <div className="flex flex-col items-center"><div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-2 shadow-inner border border-border"><img src="https://cdn-icons-png.flaticon.com/512/7504/7504396.png" className="w-6 opacity-70 dark:opacity-90" alt="Peanut Butter"/></div><span className="text-[11px] font-bold text-foreground">Peanut Butter</span></div>
                  <div className="flex flex-col items-center"><div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-2 shadow-inner border border-border"><img src="https://cdn-icons-png.flaticon.com/512/3014/3014532.png" className="w-6 opacity-70 dark:opacity-90" alt="Cereal"/></div><span className="text-[11px] font-bold text-foreground">Cereal</span></div>
                </div>

                <div className="mt-auto bg-muted/60 rounded-xl p-5 border border-border flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-foreground mb-1">Can't find a location near you?</h4>
                    <p className="text-xs text-muted-foreground mb-3">Help us expand Unity Loaves to your community.</p>
                    <Button variant="outline" className="bg-card border-border font-bold h-8 text-xs">Recommend a Location</Button>
                  </div>
                  <div className="relative w-24 h-24 shrink-0 hidden sm:block">
                    <MapIcon className="w-full h-full text-purple-500/25 dark:text-purple-400/20" />
                    <MapPin className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-destructive w-10 h-10 opacity-90" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Call to Action */}
            <div className="mt-8 rounded-2xl shadow-xl overflow-hidden relative border border-purple-500/30 bg-gradient-to-br from-purple-950 via-indigo-950 to-blue-950">
              <div className="absolute top-0 right-0 p-12 opacity-10">
                <Heart className="w-64 h-64 text-white" />
              </div>
              <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6 text-white max-w-xl">
                  <div className="bg-white/10 p-4 rounded-full hidden sm:block border border-white/15">
                    <Heart className="w-10 h-10 text-purple-300" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold mb-2">Be the reason someone has a meal today.</h2>
                    <p className="text-white/85 font-medium">Your gift of $10 provides 1 meal and brings hope to a family in need.</p>
                  </div>
                </div>
                <div className="flex gap-4 w-full md:w-auto shrink-0">
                  <Button className="flex-1 md:flex-none h-12 px-8 bg-transparent border-2 border-purple-300/90 text-white hover:bg-white/10 font-bold text-base" onClick={() => router.get(route('donate'))}>
                    Donate a Loaf
                  </Button>
                  <Button className="flex-1 md:flex-none h-12 px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-base border-0" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
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
        <SheetContent className="w-full sm:max-w-md overflow-y-auto z-[100] bg-background text-foreground border-border">
          {selectedLocation && (
            <div className="space-y-6 mt-6">
              <SheetHeader>
                <SheetTitle className="text-xl font-bold text-foreground text-left">{selectedLocation.name}</SheetTitle>
                <SheetDescription className="text-sm text-left text-muted-foreground">
                  {selectedLocation.full_address}
                </SheetDescription>
              </SheetHeader>

              {/* Image */}
              <div className="relative h-48 rounded-xl overflow-hidden bg-muted">
                <img src={selectedLocation.image_url || "/images/nonprofits-working-together-global-network.jpg"} alt={selectedLocation.name} className="w-full h-full object-cover" />
              </div>

              {/* Badges / Contact */}
              <div className="flex flex-wrap gap-2">
                <span className="bg-purple-500/15 text-purple-800 dark:text-purple-200 text-xs font-bold px-2 py-1 rounded border border-purple-500/25">
                  {selectedLocation.meal_type_label}
                </span>
                {selectedLocation.accepts_food_donations && (
                  <span className="bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-bold px-2 py-1 rounded border border-amber-500/25">
                    Accepts Food Donations
                  </span>
                )}
              </div>

              {(selectedLocation.phone || selectedLocation.website) && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  {selectedLocation.phone && <p><strong className="text-foreground">Phone:</strong> <a href={`tel:${selectedLocation.phone}`} className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 hover:underline">{selectedLocation.phone}</a></p>}
                  {selectedLocation.website && <p><strong className="text-foreground">Website:</strong> <a href={selectedLocation.website} target="_blank" rel="noreferrer" className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 hover:underline">{selectedLocation.website}</a></p>}
                </div>
              )}

              <div className="space-y-4 text-sm text-foreground/90">
                <p>{selectedLocation.full_description || selectedLocation.description}</p>
              </div>

              {/* Schedules */}
              {selectedLocation.meal_schedules.length > 0 && (
                <div>
                  <h4 className="font-bold text-foreground mb-2 flex items-center gap-2"><UtensilsCrossed className="w-4 h-4 text-purple-600 dark:text-purple-400"/> Meal Schedules</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {selectedLocation.meal_schedules.map((s, i) => (
                      <li key={i}>{s.title ? s.title + ': ' : ''}{s.recurrence_text} • {s.start_time} - {s.end_time}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedLocation.dropoff_schedules.length > 0 && (
                <div>
                  <h4 className="font-bold text-foreground mb-2 flex items-center gap-2"><PackageOpen className="w-4 h-4 text-amber-500 dark:text-amber-400"/> Drop-off Schedules</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {selectedLocation.dropoff_schedules.map((s, i) => (
                      <li key={i}>{s.title ? s.title + ': ' : ''}{s.recurrence_text} • {s.start_time} - {s.end_time}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Needs */}
              {selectedLocation.current_needs.length > 0 && (
                <div>
                  <h4 className="font-bold text-foreground mb-2">Current Needs</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedLocation.current_needs.map((n, i) => (
                      <span key={i} className="bg-destructive/10 border border-destructive/25 text-destructive text-xs font-semibold px-2 py-1 rounded dark:bg-destructive/15">
                        {n.item_name} {n.quantity_needed ? `(${n.quantity_needed})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <Button className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white" onClick={() => router.get(route('donate'))}>
                  Donate
                </Button>
                {selectedLocation.phone && (
                  <Button variant="outline" className="flex-1 border-border" onClick={() => window.location.href = `tel:${selectedLocation.phone}`}>
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
