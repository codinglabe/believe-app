"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  LayoutGrid,
  Upload,
  Building,
  Code,
  Shield,
  MessageSquare,
  Folder,
  Settings,
  BarChart3,
  Zap,
  CheckSquare,
  Square,
  Users,
  List,
  CreditCard,
  Briefcase,
  HeartHandshake,
  Info,
  Package,
  Phone,
  Star,
  Wallet,
  FileText,
  Award,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { AnimatedToggle } from "./animated-toggle"

interface Permission {
  id: string
  name: string
  category: string
}

interface PermissionSelectorProps {
  permissions: Permission[]
  selectedPermissions: string[]
  onChange: (permissions: string[]) => void
  title?: string
}

const categoryIcons = {
  Dashbord: LayoutGrid,
  User: Users,
  Upload: Upload,
  Management: Building,
  Code: Code,
  Classification: List,
  Status: List,
  Deductibility: List,
  Profile: Users,
  Payment: CreditCard,
  Organization: Briefcase,
  Supporter: HeartHandshake,
  About: Info,
  Impact: BarChart3, // Reusing BarChart3 for Impact
  Details: Info,
  Products: Package,
  Contact: Phone,
  Donation: HeartHandshake,
  Favorite: Star,
  Withdraw: Wallet,
  Rating: Star,
  Review: Star,
  Payments: CreditCard,
  Permission: FileText,
  Role: Award,
  Job: Briefcase,
  // Existing categories (if any, ensure they are here or add them if missing from your list)
  Channels: Shield,
  Messages: MessageSquare,
  Files: Folder,
  Settings: Settings,
  Reports: BarChart3,
}

const categoryColors = {
  Dashbord: "bg-blue-500",
  User: "bg-purple-500",
  Upload: "bg-green-500",
  Management: "bg-yellow-500",
  Code: "bg-orange-500",
  Classification: "bg-teal-500",
  Status: "bg-cyan-500",
  Deductibility: "bg-lime-500",
  Profile: "bg-fuchsia-500",
  Payment: "bg-rose-500",
  Organization: "bg-emerald-500",
  Supporter: "bg-indigo-500",
  About: "bg-amber-500",
  Impact: "bg-red-500",
  Details: "bg-violet-500",
  Products: "bg-pink-500",
  Contact: "bg-sky-500",
  Donation: "bg-orange-600",
  Favorite: "bg-yellow-600",
  Withdraw: "bg-green-600",
  Rating: "bg-purple-600",
  Review: "bg-blue-600",
  Payments: "bg-rose-600",
  Permission: "bg-teal-600",
  Role: "bg-indigo-600",
  Job: "bg-green-700",
  // Existing categories (if any, ensure they are here or add them if missing from your list)
  Channels: "bg-blue-500",
  Messages: "bg-green-500",
  Files: "bg-orange-500",
  Settings: "bg-gray-500",
  Reports: "bg-pink-500",
}

export default function PermissionSelector({
  permissions,
  selectedPermissions,
  onChange,
  title = "Permissions",
}: PermissionSelectorProps) {
  const [localSelected, setLocalSelected] = useState<string[]>(selectedPermissions)
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    setLocalSelected(selectedPermissions)
  }, [selectedPermissions])
  const groupedPermissions = permissions.reduce(
    (acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = []
      }
      acc[permission.category].push(permission)
      return acc
    },
    {} as Record<string, Permission[]>,
  )

  const categories = Object.keys(groupedPermissions)

  const filteredPermissions = permissions.filter((permission) => {
    const matchesCategory = activeCategory === "all" || permission.category === activeCategory
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })



  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    const newSelected = checked ? [...localSelected, permissionId] : localSelected.filter((id) => id !== permissionId)
    setLocalSelected(newSelected)
    onChange(newSelected)
  }

  const handleSelectAll = () => {
    const allPermissionIds = permissions.map((p) => p.id)
    setLocalSelected(allPermissionIds)
    onChange(allPermissionIds)
  }

  const handleDeselectAll = () => {
    setLocalSelected([])
    onChange([])
  }

  const handleCategorySelectAll = (category: string) => {
    const categoryPermissions = groupedPermissions[category].map((p) => p.id)
    const newSelected = [...new Set([...localSelected, ...categoryPermissions])]
    setLocalSelected(newSelected)
    onChange(newSelected)
  }

  const getCategoryStats = (category: string) => {
    const categoryPerms = groupedPermissions[category]
    const selected = categoryPerms.filter((p) => localSelected.includes(p.id)).length
    return { selected, total: categoryPerms.length }
  }

  const isAllSelected = localSelected.length === permissions.length
  const isNoneSelected = localSelected.length === 0

  return (
    <div className="flex h-[800px] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Sidebar */}
      <div className="w-80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Configure access permissions for this role</p>
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="secondary" className="text-sm font-medium">
              {localSelected.length} selected
            </Badge>
            <Badge variant="outline" className="text-sm">
              {permissions.length} total
            </Badge>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={isAllSelected}
              className="flex-1 flex items-center gap-2 transition-all duration-200 hover:scale-105 bg-white/50 dark:bg-slate-800/50"
            >
              <CheckSquare className="w-4 h-4" />
              All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              disabled={isNoneSelected}
              className="flex-1 flex items-center gap-2 transition-all duration-200 hover:scale-105 bg-white/50 dark:bg-slate-800/50"
            >
              <Square className="w-4 h-4" />
              None
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <Button
            variant={activeCategory === "all" ? "default" : "ghost"}
            onClick={() => setActiveCategory("all")}
            className="w-full justify-start text-left transition-all duration-200 hover:scale-105"
          >
            <Zap className="w-4 h-4 mr-3" />
            <span className="flex-1">All Permissions</span>
            <Badge variant="secondary" className="ml-2">
              {permissions.length}
            </Badge>
          </Button>

          {categories.map((category, index) => {
            const Icon = categoryIcons[category as keyof typeof categoryIcons] || Shield
            const stats = getCategoryStats(category)
            const isActive = activeCategory === category
            const isFullySelected = stats.selected === stats.total
            return (
              <div
                key={category}
                className="animate-in fade-in-0 slide-in-from-left-4"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Button
                  variant={isActive ? "default" : "ghost"}
                  onClick={() => setActiveCategory(category)}
                  className="w-full justify-start text-left transition-all duration-200 hover:scale-105 group"
                >
                  <div
                    className={`w-3 h-3 rounded-full ${categoryColors[category as keyof typeof categoryColors] || "bg-gray-500"} mr-3`}
                  />
                  <Icon className="w-4 h-4 mr-2" />
                  <span className="flex-1">{category}</span>
                  <div className="flex items-center gap-1">
                    <Badge variant={isFullySelected ? "default" : "secondary"} className="text-xs">
                      {stats.selected}/{stats.total}
                    </Badge>
                  </div>
                </Button>

                {isActive && (
                  <div className="mt-2 ml-4 animate-in fade-in-0 slide-in-from-left-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCategorySelectAll(category)}
                      className="w-full text-xs transition-all duration-200 hover:scale-105 bg-white/50 dark:bg-slate-800/50"
                    >
                      Select All {category}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Search Header */}
        <div className="p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button variant="outline" size="sm" className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          {activeCategory !== "all" && (
            <div className="mt-4 flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${categoryColors[activeCategory as keyof typeof categoryColors] || "bg-gray-500"}`}
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {activeCategory} Permissions
              </span>
              <Badge variant="outline" className="text-xs">
                {filteredPermissions.length} permissions
              </Badge>
            </div>
          )}
        </div>

        {/* Permissions Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4">
            {filteredPermissions.map((permission, index) => {
              const isSelected = localSelected.includes(permission.id)
              const Icon = categoryIcons[permission.category as keyof typeof categoryIcons] || Shield
              return (
                <Card
                  key={permission.id}
                  className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer animate-in fade-in-0 slide-in-from-bottom-4 ${isSelected
                    ? "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700"
                    : "bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800"
                    }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => handlePermissionChange(permission.id, !isSelected)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="">
                          <div
                            className={`w-10 h-10 rounded-xl ${categoryColors[permission.category as keyof typeof categoryColors] || "bg-gray-500"} bg-opacity-10 flex items-center justify-center`}
                          >
                            <Icon
                              className={`w-5 h-5`}
                            />
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                            {permission.name}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{permission.category}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge variant={isSelected ? "default" : "outline"} className="text-xs">
                        {isSelected ? "Granted" : "Denied"}
                      </Badge>

                      <div className="scale-75">
                        <AnimatedToggle
                          id={permission.id}
                          checked={isSelected}
                          onChange={(checked) => handlePermissionChange(permission.id, checked)}
                          label=""
                          size="sm"
                        />
                      </div>
                    </div>
                  </CardContent>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Card>
              )
            })}
          </div>

          {filteredPermissions.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">No permissions found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-500">Try adjusting your search or category filter</p>
            </div>
          )}
        </div>

        {/* Summary Footer */}
        {localSelected.length > 0 && (
          <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-t border-slate-200/50 dark:border-slate-700/50 animate-in fade-in-0 slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  {localSelected.length} Permission{localSelected.length !== 1 ? "s" : ""} Selected
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  These permissions will be granted to the user/role
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {categories.slice(0, 4).map((category) => {
                    const stats = getCategoryStats(category)
                    if (stats.selected === 0) return null

                    return (
                      <div
                        key={category}
                        className={`w-8 h-8 rounded-full ${categoryColors[category as keyof typeof categoryColors] || "bg-gray-500"} bg-opacity-20 border-2 border-white dark:border-slate-800 flex items-center justify-center`}
                        title={`${category}: ${stats.selected}/${stats.total}`}
                      >
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{stats.selected}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
