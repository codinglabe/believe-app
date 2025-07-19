"use client"

import { useState, useEffect, useMemo } from "react"
import { Head, Link, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Input } from "@/components/admin/ui/input"
import { Select } from "@/components/admin/ui/select"
import { Button } from "@/components/admin/ui/button"
import { Card, CardContent } from "@/components/admin/ui/card"
import { Badge } from "@/components/admin/ui/badge"
import { Search, Plus, Eye, Edit, Trash2, Filter, SortAsc, SortDesc } from "lucide-react"
import type { NodeBoss, NodeBossFilters, PaginatedNodeBoss } from "@/types/nodeboss"
import { useDebounce } from "@/hooks/useDebounce"

interface Props {
    nodeBosses: PaginatedNodeBoss
    filters: NodeBossFilters
}

export default function Index({ nodeBosses, filters }: Props) {
    const [search, setSearch] = useState(filters.search || "")
    const [status, setStatus] = useState(filters.status || "")
    const [sortBy, setSortBy] = useState(filters.sort_by || "created_at")
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">(filters.sort_order || "desc")
    const debouncedSearch = useDebounce(search, 300)

    // Auto-filter when values change
    useEffect(() => {
        const params: Record<string, any> = {}

        if (debouncedSearch) params.search = debouncedSearch
        if (status) params.status = status
        if (sortBy) params.sort_by = sortBy
        if (sortOrder) params.sort_order = sortOrder

        router.get(route("node-boss.index"), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        })
    }, [debouncedSearch, status, sortBy, sortOrder])

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this NodeBoss?")) {
            router.delete(route("node-boss.destroy", id))
        }
    }

    const clearFilters = () => {
        setSearch("")
        setStatus("")
        setSortBy("created_at")
        setSortOrder("desc")
    }

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case "active":
                return "default"
            case "inactive":
                return "secondary"
            case "draft":
                return "outline"
            default:
                return "secondary"
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "active":
                return "🟢"
            case "inactive":
                return "🟡"
            case "draft":
                return "📝"
            default:
                return "⚪"
        }
    }

    const hasActiveFilters = useMemo(() => {
        return search || status || sortBy !== "created_at" || sortOrder !== "desc"
    }, [search, status, sortBy, sortOrder])

    return (
        <AppLayout>
            <Head title="NodeBoss Management" />

            <Card className="m-6 p-2">
                <CardContent className="">
                    <div className="space-y-8">
                        {/* Header */}
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div className="space-y-2">
                                <h1 className="text-4xl font-bold tracking-tight text-foreground">NodeBoss Management</h1>
                                <p className="text-lg text-muted-foreground">Manage your investment opportunities and track performance</p>
                            </div>
                            <Link href={route("node-boss.create")}>
                                <Button size="lg" className="w-full lg:w-auto shadow-lg">
                                    <Plus className="mr-2 h-5 w-5" />
                                    Create New NodeBoss
                                </Button>
                            </Link>
                        </div>

                        {/* Advanced Filters */}
                        <Card className="shadow-lg border-0 bg-gradient-to-r from-background to-muted/20">
                            <CardContent className="p-8">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <Filter className="h-5 w-5 text-primary" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-foreground">Search & Filter</h3>
                                        {hasActiveFilters && (
                                            <Badge variant="secondary" className="ml-auto">
                                                {
                                                    [
                                                        search,
                                                        status,
                                                        sortBy !== "created_at" ? "sorted" : null,
                                                        sortOrder !== "desc" ? "custom order" : null,
                                                    ].filter(Boolean).length
                                                }{" "}
                                                active
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                            <Input
                                                placeholder="Search NodeBoss..."
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                className="pl-10 h-12 bg-background border-2 focus:border-primary"
                                            />
                                        </div>

                                        <Select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            className="h-12 bg-background border-2 focus:border-primary"
                                        >
                                            <option value="">All Status</option>
                                            <option value="active">🟢 Active</option>
                                            <option value="inactive">🟡 Inactive</option>
                                            <option value="draft">📝 Draft</option>
                                        </Select>

                                        <Select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="h-12 bg-background border-2 focus:border-primary"
                                        >
                                            <option value="created_at">Sort by Created</option>
                                            <option value="name">Sort by Name</option>
                                            <option value="status">Sort by Status</option>
                                            <option value="updated_at">Sort by Updated</option>
                                        </Select>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                                                className="flex-1 h-12 border-2 bg-background"
                                            >
                                                {sortOrder === "asc" ? <SortAsc className="mr-2 h-4 w-4" /> : <SortDesc className="mr-2 h-4 w-4" />}
                                                {sortOrder === "asc" ? "A-Z" : "Z-A"}
                                            </Button>

                                            {hasActiveFilters && (
                                                <Button variant="ghost" onClick={clearFilters} className="px-4 h-12">
                                                    Clear
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Results Summary */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-lg font-medium text-foreground">
                                    {nodeBosses.total} NodeBoss{nodeBosses.total !== 1 ? "es" : ""} found
                                </span>
                                {nodeBosses.data.length !== nodeBosses.total && (
                                    <span className="text-muted-foreground">(showing {nodeBosses.data.length})</span>
                                )}
                            </div>
                            {hasActiveFilters && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Filter className="h-4 w-4" />
                                    <span>Filters applied</span>
                                </div>
                            )}
                        </div>

                        {/* NodeBoss Grid */}
                        {nodeBosses.data.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {nodeBosses?.data.map((nodeBoss: NodeBoss) => (
                                    <Card
                                        key={nodeBoss.id}
                                        className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg overflow-hidden bg-gradient-to-br from-background to-muted/10"
                                    >
                                        {/* Image Section */}
                                        <div className="relative aspect-video bg-gradient-to-br from-muted/20 to-muted/40 overflow-hidden">
                                            {nodeBoss.image ? (
                                                <img
                                                    src={"/"+nodeBoss.image || "/placeholder.svg"}
                                                    alt={nodeBoss.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                                                    <div className="text-center text-muted-foreground">
                                                        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <span className="text-2xl">📊</span>
                                                        </div>
                                                        <p className="text-sm font-medium">No Image</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Status Badge Overlay */}
                                            <div className="absolute top-3 right-3">
                                                <Badge variant={getStatusBadgeVariant(nodeBoss.status)} className="shadow-lg backdrop-blur-sm">
                                                    {getStatusIcon(nodeBoss.status)} {nodeBoss.status}
                                                </Badge>
                                            </div>

                                            {/* Investment Status Overlay */}
                                            <div className="absolute bottom-3 left-3">
                                                <Badge
                                                    variant={nodeBoss.is_closed ? "destructive" : "default"}
                                                    className="shadow-lg backdrop-blur-sm"
                                                >
                                                    {nodeBoss.is_closed ? "🔒 Closed" : "🟢 Open"}
                                                </Badge>
                                            </div>
                                        </div>

                                        <CardContent className="p-6 space-y-4">
                                            {/* Header */}
                                            <div className="space-y-2">
                                                <h3 className="font-bold text-xl text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                                                    {nodeBoss.name}
                                                </h3>
                                                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{nodeBoss.description}</p>
                                            </div>

                                            {/* Suggested Amounts */}
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                    Investment Options
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {JSON.parse(nodeBoss?.suggested_amounts || "[]")?.slice(0, 4)?.map((amount, index) => (
                                                        <Badge
                                                            key={index}
                                                            variant="outline"
                                                            className="text-xs font-medium bg-primary/5 border-primary/20"
                                                        >
                                                            ${amount}
                                                        </Badge>
                                                    ))}
                                                    {nodeBoss.suggested_amounts.length > 4 && (
                                                        <Badge variant="outline" className="text-xs bg-muted/50">
                                                            +{nodeBoss.suggested_amounts.length - 4}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Meta Information */}
                                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                                                <span className="flex items-center gap-1">
                                                    📅 {new Date(nodeBoss.created_at).toLocaleDateString()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    🕒 {new Date(nodeBoss.updated_at).toLocaleDateString()}
                                                </span>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="grid grid-cols-3 gap-2 pt-4">
                                                <Link href={route("node-boss.show", nodeBoss.id)}>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full bg-transparent hover:bg-primary/5 border-primary/20"
                                                    >
                                                        <Eye className="h-3 w-3" />
                                                    </Button>
                                                </Link>
                                                <Link href={route("node-boss.edit", nodeBoss.id)}>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full bg-transparent hover:bg-primary/5 border-primary/20"
                                                    >
                                                        <Edit className="h-3 w-3" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(nodeBoss.id)}
                                                    className="w-full bg-transparent hover:bg-destructive/5 border-destructive/20 text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="shadow-lg border-0">
                                <CardContent className="p-16">
                                    <div className="text-center space-y-6">
                                        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                                            <Search className="h-12 w-12 text-primary" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-2xl font-bold text-foreground">No NodeBoss Found</h3>
                                            <p className="text-muted-foreground text-lg max-w-md mx-auto">
                                                {hasActiveFilters
                                                    ? "No results match your current filters. Try adjusting your search criteria."
                                                    : "Get started by creating your first NodeBoss investment opportunity."}
                                            </p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                            {hasActiveFilters ? (
                                                <Button variant="outline" onClick={clearFilters} size="lg">
                                                    <Filter className="mr-2 h-5 w-5" />
                                                    Clear All Filters
                                                </Button>
                                            ) : (
                                                <Link href={route("node-boss.create")}>
                                                    <Button size="lg" className="shadow-lg">
                                                        <Plus className="mr-2 h-5 w-5" />
                                                        Create Your First NodeBoss
                                                    </Button>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Enhanced Pagination */}
                        {nodeBosses.links && nodeBosses.links.length > 3 && (
                            <Card className="shadow-lg border-0">
                                <CardContent className="p-6">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="text-sm text-muted-foreground">
                                            Showing <span className="font-medium text-foreground">{nodeBosses.data.length}</span> of{" "}
                                            <span className="font-medium text-foreground">{nodeBosses.total}</span> results
                                        </div>

                                        <nav className="flex items-center space-x-2">
                                            {nodeBosses.links.map((link, index) => (
                                                <Link
                                                    key={index}
                                                    href={link.url || "#"}
                                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${link.active
                                                            ? "bg-primary text-primary-foreground shadow-lg"
                                                            : link.url
                                                                ? "bg-background text-foreground hover:bg-muted border border-border hover:shadow-md"
                                                                : "bg-muted text-muted-foreground cursor-not-allowed"
                                                        }`}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            ))}
                                        </nav>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </CardContent>
            </Card>
        </AppLayout>
    )
}
