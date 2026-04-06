"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link, Head, router, usePage } from "@inertiajs/react"
import { 
    ArrowLeft,
    Edit,
    Heart,
    FileText,
    Calendar,
    MapPin,
    Tag,
    DollarSign,
    CheckCircle,
    User,
    Activity,
    Scale,
    Palette,
    Baby,
    TrendingUp,
    Link as LinkIcon,
    Image as ImageIcon,
    Users,
    ShoppingBag
} from "lucide-react"
import { format } from "date-fns"
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Livestock", href: "#" },
    { title: "Animals", href: route('animals.index') },
    { title: "Animal Details", href: "#" },
]

interface HealthRecord {
    id: number
    record_type: string
    description: string
    medication: string | null
    vet_name: string | null
    record_date: string
}

interface ParentLink {
    father?: { id: number; breed: string; ear_tag: string | null }
    mother?: { id: number; breed: string; ear_tag: string | null }
}

interface OwnershipHistoryItem {
    id: number
    transfer_date: string
    method: string
    notes: string | null
    previous_owner?: { 
        id: number
        name: string
        seller_profile?: { farm_name: string } | null
        buyer_profile?: { farm_name: string } | null
    } | null
    new_owner?: { 
        id: number
        name: string
        seller_profile?: { farm_name: string } | null
        buyer_profile?: { farm_name: string } | null
    } | null
}

interface Animal {
    id: number
    species: string
    breed: string
    sex: string
    ear_tag: string | null
    original_ear_tag: string | null
    date_of_birth: string | null
    age_months: number | null
    weight_kg: number | null
    color_markings: string | null
    location: string | null
    health_status: string
    fertility_status: string
    original_purchase_price: number | null
    current_market_value: number | null
    status: string
    notes: string | null
    photos: Array<{ id: number; url: string; is_primary: boolean }>
    health_records: HealthRecord[]
    parent_link: ParentLink | null
    seller?: { id: number; name: string } | null
    current_owner?: { id: number; name: string } | null
    listing: { id: number; title: string; price: number; status: string } | null
    ownership_history?: OwnershipHistoryItem[]
}

interface BreedingEvent {
    id: number
    male_id: number
    female_id: number
    breeding_method: string
    breeding_date: string
    expected_kidding_date: string | null
    actual_kidding_date: string | null
    number_of_kids: number | null
    male?: { id: number; breed: string; ear_tag: string | null }
    female?: { id: number; breed: string; ear_tag: string | null }
    offspring?: Array<{ child: { id: number; breed: string; ear_tag: string | null; sex: string; photos?: Array<{ id: number; url: string }> } }>
}

interface OffspringAnimal {
    id: number
    species: string
    breed: string
    sex: string
    ear_tag: string | null
    date_of_birth: string | null
    photos?: Array<{ id: number; url: string; is_primary?: boolean }>
}

interface FractionalPurchaser {
    user_id: number
    user_name: string
    user_email: string
    tokens: number
    amount: number
    order_number: string | null
    purchased_at: string
}

interface FractionalPurchaserGroup {
    tag_number: string
    purchasers: FractionalPurchaser[]
}

interface ShowProps {
    animal: Animal
    breeding_events?: BreedingEvent[]
    offspring?: OffspringAnimal[]
    fractional_listing?: {
        id: number
        tag_number: string
        status: string
        country_code: string
    } | null
    fractional_purchasers?: FractionalPurchaserGroup[]
}

export default function AnimalShow({ animal, breeding_events = [], offspring = [], fractional_listing = null, fractional_purchasers = [] }: ShowProps) {
    const primaryPhoto = animal.photos.find(p => p.is_primary) || animal.photos[0]
    const { auth } = usePage().props as any
    const currentUserId = auth?.user?.id

    // Check if this is a purchased animal (current owner is the user, but seller is different)
    const isPurchased = currentUserId && 
                       animal.current_owner?.id === currentUserId && 
                       animal.seller?.id !== currentUserId &&
                       animal.status === 'sold'

    // Check if user is a buyer (has buyer profile)
    const isBuyer = auth?.user?.buyer_profile !== null && auth?.user?.buyer_profile !== undefined

    // Get display status
    const displayStatus = isPurchased ? 'Purchased' : animal.status

    return (
        <LivestockDashboardLayout breadcrumbs={breadcrumbs}>
            <Head title={`${animal.breed} - Animal Details`} />
            
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Link href={route('animals.index')}>
                        <Button variant="outline" className="border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Animals
                        </Button>
                    </Link>
                    <Link href={route('animals.edit', animal.id)}>
                        <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Animal
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Photos */}
                        <div>
                            {primaryPhoto ? (
                                <img
                                    src={primaryPhoto.url}
                                    alt={animal.breed}
                                    className="w-full h-96 object-cover rounded-lg"
                                />
                            ) : (
                                <div className="w-full h-96 bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-lg">
                                    <Heart className="h-24 w-24 text-gray-400" />
                                </div>
                            )}
                            {animal.photos.length > 1 && (
                                <div className="mt-4 grid grid-cols-4 gap-2">
                                    {animal.photos.filter(p => !p.is_primary).map((photo) => (
                                        <img
                                            key={photo.id}
                                            src={photo.url}
                                            alt={animal.breed}
                                            className="w-full h-20 object-cover rounded"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Basic Information */}
                        <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded">
                                        <Tag className="h-4 w-4 text-white" />
                                    </div>
                                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-white pb-2">Basic Information</CardTitle>
                                </div>
                                <CardDescription>Essential details about the animal</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Species</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">{animal.species}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Breed</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">{animal.breed}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Sex</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">{animal.sex}</p>
                                    </div>
                                    {animal.ear_tag && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ear Tag</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">{animal.ear_tag}</p>
                                        </div>
                                    )}
                                    {animal.original_ear_tag && animal.original_ear_tag !== animal.ear_tag && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Original Seller Tag</p>
                                            <p className="font-semibold text-gray-700 dark:text-gray-300 italic">{animal.original_ear_tag}</p>
                                        </div>
                                    )}
                                    {animal.date_of_birth && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Date of Birth</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                {format(new Date(animal.date_of_birth), 'MMM dd, yyyy')}
                                            </p>
                                        </div>
                                    )}
                                    {animal.age_months && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Age</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">{animal.age_months} months</p>
                                        </div>
                                    )}
                                    {animal.weight_kg && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Weight</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">{animal.weight_kg} kg</p>
                                        </div>
                                    )}
                                    {animal.color_markings && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Color/Markings</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">{animal.color_markings}</p>
                                        </div>
                                    )}
                                    {animal.location && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Location</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">{animal.location}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Health Records */}
                        {animal.health_records.length > 0 && (
                            <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded">
                                            <Activity className="h-4 w-4 text-white" />
                                        </div>
                                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white pb-2">Health Records</CardTitle>
                                    </div>
                                    <CardDescription>Medical history and health information</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {animal.health_records.map((record) => (
                                            <div key={record.id} className="border-l-4 border-amber-500 pl-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge 
                                                        variant="outline"
                                                        className="border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                                                    >
                                                        {record.record_type}
                                                    </Badge>
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        {format(new Date(record.record_date), 'MMM dd, yyyy')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                                                    {record.description}
                                                </p>
                                                {record.medication && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                        Medication: {record.medication}
                                                    </p>
                                                )}
                                                {record.vet_name && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                        Vet: {record.vet_name}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Notes */}
                        {animal.notes && (
                            <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded">
                                            <FileText className="h-4 w-4 text-white" />
                                        </div>
                                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white pb-2">Notes</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                                        {animal.notes}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Breeding Events */}
                        {breeding_events && breeding_events.length > 0 && (
                            <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                                <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded">
                                            <Heart className="h-4 w-4 text-white" />
                                        </div>
                                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white pb-2">Breeding Events</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="space-y-4">
                                        {breeding_events.map((event) => (
                                            <div key={event.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Badge variant="outline" className="text-xs capitalize">
                                                                {event.breeding_method}
                                                            </Badge>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                {format(new Date(event.breeding_date), 'MMM dd, yyyy')}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-gray-700 dark:text-gray-300">
                                                            <span className="font-medium">
                                                                {animal.sex === 'male' ? 'With' : 'With'}
                                                            </span>
                                                            {' '}
                                                            {animal.sex === 'male' 
                                                                ? `${event.female?.breed || 'N/A'} (Female)`
                                                                : `${event.male?.breed || 'N/A'} (Male)`
                                                            }
                                                        </div>
                                                        {event.expected_kidding_date && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                Expected: {format(new Date(event.expected_kidding_date), 'MMM dd, yyyy')}
                                                            </p>
                                                        )}
                                                        {event.actual_kidding_date && (
                                                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                                                Actual: {format(new Date(event.actual_kidding_date), 'MMM dd, yyyy')}
                                                            </p>
                                                        )}
                                                        {event.number_of_kids !== null && (
                                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                                                                {event.number_of_kids} kid{event.number_of_kids !== 1 ? 's' : ''}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Link href={`/breeding/${event.id}`} className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300">
                                                        <LinkIcon className="h-4 w-4" />
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Offspring */}
                        {offspring && offspring.length > 0 && (
                            <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                                <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded">
                                            <Baby className="h-4 w-4 text-white" />
                                        </div>
                                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white pb-2">Offspring</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {offspring.map((child) => (
                                            <Link
                                                key={child.id}
                                                href={`/animals/${child.id}`}
                                                className="group p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700 transition-all"
                                            >
                                                <div className="flex flex-col sm:flex-row items-start gap-3">
                                                    {child.photos && child.photos.length > 0 ? (
                                                        <img
                                                            src={child.photos[0].url}
                                                            alt={child.breed}
                                                            className="w-full sm:w-16 h-32 sm:h-16 rounded-lg object-cover border border-amber-200 dark:border-amber-800"
                                                        />
                                                    ) : (
                                                        <div className="w-full sm:w-16 h-32 sm:h-16 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                                                            <ImageIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                                                        <p className="font-semibold text-gray-900 dark:text-white capitalize truncate text-sm sm:text-base">
                                                            {child.breed}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                                            <Badge variant="outline" className="text-xs capitalize">
                                                                {child.sex}
                                                            </Badge>
                                                            {child.ear_tag && (
                                                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                    Tag: {child.ear_tag}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {child.date_of_birth && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                Born: {format(new Date(child.date_of_birth), 'MMM dd, yyyy')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Status Card */}
                        <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded">
                                        <CheckCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-white pb-2">Status</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Status</p>
                                    <Badge 
                                        variant={animal.status === 'available' ? 'default' : isPurchased ? 'default' : 'secondary'}
                                        className={
                                            animal.status === 'available' 
                                                ? 'bg-green-500 hover:bg-green-600 text-white' 
                                                : isPurchased
                                                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                                : ''
                                        }
                                    >
                                        {displayStatus}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Health Status</p>
                                    <Badge 
                                        variant="outline"
                                        className="border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                                    >
                                        {animal.health_status}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Fertility Status</p>
                                    <Badge 
                                        variant="outline"
                                        className="border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                                    >
                                        {animal.fertility_status}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Financial Info */}
                        <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded">
                                        <DollarSign className="h-4 w-4 text-white" />
                                    </div>
                                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-white pb-2">Financial Information</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {animal.original_purchase_price && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Purchase Price</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                            ${animal.original_purchase_price.toLocaleString()}
                                        </p>
                                    </div>
                                )}
                                {animal.current_market_value && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Market Value</p>
                                        <p className="text-lg font-semibold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                            ${animal.current_market_value.toLocaleString()}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Ownership */}
                        <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                        <User className="h-5 w-5 text-white" />
                                    </div>
                                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Ownership</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                {animal.current_owner && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Owner</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {animal.current_owner.name || 'N/A'}
                                        </p>
                                    </div>
                                )}
                                {animal.seller && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Original Seller</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {animal.seller.name || 'N/A'}
                                        </p>
                                    </div>
                                )}

                                {/* Ownership History */}
                                {animal.ownership_history && animal.ownership_history.length > 0 && (
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Ownership History</p>
                                        <div className="space-y-3">
                                            {animal.ownership_history.map((history) => (
                                                <div key={history.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {history.method === 'sale' ? 'Sale' : 
                                                                     history.method === 'gift' ? 'Gift' :
                                                                     history.method === 'admin_transfer' ? 'Admin Transfer' : 'Inheritance'}
                                                                </Badge>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {format(new Date(history.transfer_date), 'MMM dd, yyyy')}
                                                                </span>
                                                            </div>
                                                            <div className="text-sm text-gray-700 dark:text-gray-300">
                                                                <span className="text-gray-600 dark:text-gray-400">From: </span>
                                                                <span className="font-medium">
                                                                    {history.previous_owner?.seller_profile?.farm_name || history.previous_owner?.buyer_profile?.farm_name || 'N/A'}
                                                                </span>
                                                                <span className="mx-2 text-gray-400">→</span>
                                                                <span className="text-gray-600 dark:text-gray-400">To: </span>
                                                                <span className="font-medium">
                                                                    {history.new_owner?.seller_profile?.farm_name || history.new_owner?.buyer_profile?.farm_name || 'N/A'}
                                                                </span>
                                                            </div>
                                                            {history.notes && (
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{history.notes}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Listing */}
                        {animal.listing ? (
                            <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded">
                                            <TrendingUp className="h-4 w-4 text-white" />
                                        </div>
                                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white pb-2">
                                            {animal.listing.status === 'active' ? 'Active Listing' : 'Listing'}
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {animal.listing.title}
                                        </p>
                                        <p className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                            ${animal.listing.price.toLocaleString()}
                                        </p>
                                        <Badge variant={animal.listing.status === 'active' ? 'default' : 'secondary'}>
                                            {animal.listing.status}
                                        </Badge>
                                        <div className="flex gap-2 mt-2">
                                            <Link href={route('marketplace.show', animal.listing.id)} className="flex-1">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="w-full border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:border-amber-300 dark:hover:border-amber-700"
                                                >
                                                    View Listing
                                                </Button>
                                            </Link>
                                            {animal.listing.status === 'active' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (confirm('Are you sure you want to remove this listing?')) {
                                                            router.delete(route('animals.listings.destroy', [animal.id, animal.listing.id]))
                                                        }
                                                    }}
                                                    className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300 dark:hover:border-red-700"
                                                >
                                                    Remove
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded">
                                            <TrendingUp className="h-4 w-4 text-white" />
                                        </div>
                                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white pb-2">No Listing</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        Create a listing to sell this animal on the marketplace.
                                    </p>
                                    <Link href={route('animals.listings.create', animal.id)}>
                                        <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                                            Create Listing
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        )}

                        {/* Parent Information */}
                        {animal.parent_link && (animal.parent_link.father || animal.parent_link.mother) && (
                            <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded">
                                            <Baby className="h-4 w-4 text-white" />
                                        </div>
                                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white pb-2">Parent Information</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {animal.parent_link.father && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Father</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                {animal.parent_link.father.breed}
                                                {animal.parent_link.father.ear_tag && ` (${animal.parent_link.father.ear_tag})`}
                                            </p>
                                        </div>
                                    )}
                                    {animal.parent_link.mother && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Mother</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                {animal.parent_link.mother.breed}
                                                {animal.parent_link.mother.ear_tag && ` (${animal.parent_link.mother.ear_tag})`}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Fractional Purchasers - Only visible to buyers */}
                        {isBuyer && fractional_listing && fractional_purchasers && fractional_purchasers.length > 0 && (
                            <Card className="border border-purple-200 dark:border-purple-800/50 shadow-lg hover:shadow-xl transition-shadow">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-gradient-to-r from-purple-600 to-purple-700 rounded">
                                            <Users className="h-4 w-4 text-white" />
                                        </div>
                                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white pb-2">
                                            Fractional Purchasers
                                        </CardTitle>
                                    </div>
                                    <CardDescription>
                                        All purchasers for Tag: <span className="font-semibold">{fractional_listing.tag_number}</span>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {fractional_purchasers.map((group) => (
                                        <div key={group.tag_number} className="space-y-3">
                                            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                                                <Tag className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                                <span className="font-semibold text-purple-600 dark:text-purple-400">
                                                    Tag: {group.tag_number}
                                                </span>
                                                <Badge variant="outline" className="ml-auto border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300">
                                                    {group.purchasers.length} {group.purchasers.length === 1 ? 'Purchaser' : 'Purchasers'}
                                                </Badge>
                                            </div>
                                            <div className="space-y-2">
                                                {group.purchasers.map((purchaser, index) => (
                                                    <div 
                                                        key={`${purchaser.user_id}-${index}`}
                                                        className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
                                                    >
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                                                    <span className="font-semibold text-gray-900 dark:text-white">
                                                                        {purchaser.user_name}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                                                                    {purchaser.user_email}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                                                                    {purchaser.tokens} {purchaser.tokens === 1 ? 'Token' : 'Tokens'}
                                                                </p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                    ${purchaser.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                            <span>
                                                                Purchased: {format(new Date(purchaser.purchased_at), 'MMM dd, yyyy')}
                                                            </span>
                                                            {purchaser.order_number && (
                                                                <span className="font-mono">
                                                                    {purchaser.order_number}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </LivestockDashboardLayout>
    )
}

