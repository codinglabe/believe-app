"use client"

import React, { useState, useCallback, useMemo } from "react"
import { Link, router, usePage } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Search, MapPin, ChevronDown, Check, Heart, Clock, Calendar, Info, X, Navigation, Utensils, Box } from "lucide-react"

interface Schedule { title: string; start_time?: string; end_time?: string; day_of_week?: string; recurrence_text?: string }
interface Need { item_name: string; category?: string; priority_level: string; quantity_needed?: number }
interface Impact { loaves_served: number; families_helped: number; total_loaves_year: number }

interface LocationRow {
  id: number; name: string; description?: string; full_description?: string;
  address?: string; city?: string; state?: string; zip?: string; full_address?: string;
  latitude?: number; longitude?: number; phone?: string; website?: string;
  image_url?: string; meal_type: string; meal_type_label: string;
  accepts_food_donations: boolean; dropoff_instructions?: string;
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

export default function UnityLoavesDirectory() {
  const { seo, locations: initialLocations, searchQuery: initialQuery, filters: initialFilters } = usePage<PageProps>().props
  
  const [locations] = useState(initialLocations)
  const [searchQuery, setSearchQuery] = useState(initialQuery ?? "")
  const [filters, setFilters] = useState(initialFilters)
  const [viewMode, setViewMode] = useState<"list" | "map">("list")
  const [selectedLocation, setSelectedLocation] = useState<LocationRow | null>(null)

  const buildParams = (q: string, f: typeof filters) => {
    const p: Record<string, string> = {}
    if (q) p.q = q
    if (f.meal_type) p.meal_type = f.meal_type
    if (f.day) p.day = f.day
    if (f.food_donations) p.food_donations = f.food_donations
    if (f.service_type) p.service_type = f.service_type
    if (f.location) p.location = f.location
    if (f.sort) p.sort = f.sort
    return p
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.get(route('unity-loaves.index'), buildParams(searchQuery, filters), { preserveState: true })
  }

  const updateFilter = (key: keyof typeof filters, value: string) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    router.get(route('unity-loaves.index'), buildParams(searchQuery, next), { preserveState: true })
  }

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? "Unity Loaves Directory"} description={seo?.description} />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        
        {/* Hero */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 py-16 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Find food. Give help. Feed hope.</h1>
          <p className="text-lg opacity-90 mb-8">Discover feeding locations, donate, and drop off food near you.</p>
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto px-4 relative">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, location, or zip code..." 
              className="pl-12 py-6 rounded-full text-lg text-black bg-white shadow-lg"
            />
          </form>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Filters */}
          <aside className="space-y-6">
            <Card>
              <CardContent className="p-5 space-y-6">
                <h3 className="font-bold text-lg border-b pb-2">Filters</h3>
                
                <div>
                  <label className="text-sm font-semibold mb-2 block">Meal Type</label>
                  <select 
                    className="w-full border rounded p-2" 
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
                  <label className="text-sm font-semibold mb-2 block">Day</label>
                  <select 
                    className="w-full border rounded p-2" 
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
                  <label className="text-sm font-semibold mb-2 block">Food Donations</label>
                  <select 
                    className="w-full border rounded p-2" 
                    value={filters.food_donations} 
                    onChange={(e) => updateFilter('food_donations', e.target.value)}
                  >
                    <option value="">All Locations</option>
                    <option value="yes">Accepts Food Donations</option>
                    <option value="no">Does Not Accept</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">Service Type</label>
                  <select 
                    className="w-full border rounded p-2" 
                    value={filters.service_type} 
                    onChange={(e) => updateFilter('service_type', e.target.value)}
                  >
                    <option value="">All Services</option>
                    <option value="Worship">Worship</option>
                    <option value="Youth Program">Youth Program</option>
                    <option value="Bible Study">Bible Study</option>
                    <option value="Clothing Closet">Clothing Closet</option>
                    <option value="Prayer Meeting">Prayer Meeting</option>
                    <option value="Community Meal">Community Meal</option>
                  </select>
                </div>

              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">
            
            {/* View Toggle */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{locations.total} Locations Found</h2>
              <div className="flex bg-white rounded-lg shadow border p-1">
                <button 
                  onClick={() => setViewMode('list')} 
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100'}`}
                >List</button>
                <button 
                  onClick={() => setViewMode('map')} 
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${viewMode === 'map' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100'}`}
                >Map</button>
              </div>
            </div>

            {viewMode === 'map' ? (
              <div className="bg-gray-200 rounded-xl h-[600px] flex items-center justify-center border-2 border-dashed border-gray-400">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-600">Map View Placeholder</p>
                  <p className="text-sm text-gray-500 mt-2">Interactive map will be integrated here.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {locations.data.map(loc => (
                  <Card key={loc.id} className="hover:shadow-lg transition cursor-pointer" onClick={() => setSelectedLocation(loc)}>
                    <CardContent className="p-0 flex flex-col md:flex-row">
                      <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{loc.name}</h3>
                          <button className="text-gray-400 hover:text-red-500"><Heart className="w-5 h-5" /></button>
                        </div>
                        <p className="text-gray-600 flex items-center gap-1.5 mb-3 text-sm">
                          <MapPin className="w-4 h-4" /> {loc.full_address}
                        </p>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-200">
                            {loc.meal_type_label}
                          </span>
                          {loc.accepts_food_donations && (
                            <span className="px-2.5 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full border border-orange-200">
                              Accepts Food Donations
                            </span>
                          )}
                        </div>

                        {loc.impact && (
                          <p className="text-sm text-gray-500 flex items-center gap-1.5 mb-4">
                            <Utensils className="w-4 h-4" /> {loc.impact.loaves_served.toLocaleString()} loaves served
                          </p>
                        )}

                        <div className="flex flex-wrap gap-3">
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedLocation(loc) }}>View Details</Button>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={(e) => { e.stopPropagation(); }}>Donate</Button>
                          {loc.accepts_food_donations && (
                            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={(e) => { e.stopPropagation(); }}>Drop Off</Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {locations.next_page_url && (
                  <div className="text-center pt-4">
                    <Button variant="outline" onClick={() => router.get(locations.next_page_url!)}>Load More</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Slide-in Detail Panel */}
      {selectedLocation && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedLocation(null)} />
          <div className="w-full max-w-md bg-white h-full overflow-y-auto relative z-10 shadow-2xl animate-in slide-in-from-right duration-300">
            <button 
              className="absolute top-4 right-4 bg-white/80 p-2 rounded-full hover:bg-gray-100"
              onClick={() => setSelectedLocation(null)}
            ><X className="w-5 h-5" /></button>
            
            <div className="h-48 bg-gray-200 bg-cover bg-center" style={{ backgroundImage: selectedLocation.image_url ? `url(${selectedLocation.image_url})` : undefined }} />
            
            <div className="p-6 space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-2">{selectedLocation.name}</h2>
                <p className="text-gray-600 flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5" /> {selectedLocation.full_address}
                </p>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">Donate</Button>
                {selectedLocation.accepts_food_donations && (
                  <Button className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">Drop Off Food</Button>
                )}
              </div>

              {selectedLocation.full_description && (
                <div>
                  <h3 className="font-bold text-lg mb-2">About</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{selectedLocation.full_description}</p>
                </div>
              )}

              {selectedLocation.meal_schedules.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg border-b pb-2 mb-3 text-emerald-700">Meals Provided</h3>
                  <ul className="space-y-3">
                    {selectedLocation.meal_schedules.map((s, i) => (
                      <li key={i} className="text-sm">
                        <div className="font-medium text-gray-900">{s.title}</div>
                        <div className="text-gray-600 flex items-center gap-1.5 mt-1"><Calendar className="w-3.5 h-3.5"/> {s.recurrence_text}</div>
                        {(s.start_time || s.end_time) && <div className="text-gray-600 flex items-center gap-1.5 mt-0.5"><Clock className="w-3.5 h-3.5"/> {s.start_time} - {s.end_time}</div>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedLocation.accepts_food_donations && (
                <div>
                  <h3 className="font-bold text-lg border-b pb-2 mb-3 text-orange-600">Drop-off Information</h3>
                  {selectedLocation.dropoff_instructions && <p className="text-sm text-gray-700 mb-3 bg-orange-50 p-3 rounded-lg border border-orange-100">{selectedLocation.dropoff_instructions}</p>}
                  
                  {selectedLocation.current_needs.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-sm mb-2 text-gray-900">Current Needs:</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedLocation.current_needs.map((n, i) => (
                          <span key={i} className={`px-2 py-1 text-xs rounded-full border ${n.priority_level === 'urgent' || n.priority_level === 'high' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            {n.item_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedLocation.service_schedules.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg border-b pb-2 mb-3">Community Services</h3>
                  <ul className="space-y-3">
                    {selectedLocation.service_schedules.map((s, i) => (
                      <li key={i} className="text-sm">
                        <div className="font-medium text-gray-900">{s.title}</div>
                        <div className="text-gray-600 flex items-center gap-1.5 mt-1"><Calendar className="w-3.5 h-3.5"/> {s.recurrence_text}</div>
                        {(s.start_time || s.end_time) && <div className="text-gray-600 flex items-center gap-1.5 mt-0.5"><Clock className="w-3.5 h-3.5"/> {s.start_time} - {s.end_time}</div>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </FrontendLayout>
  )
}
