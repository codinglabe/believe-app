"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  userInfo?: {
    name?: string
    email?: string
    role?: string
    roles?: { id: string; name: string }[]
  }
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
  userInfo,
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
    <div className="flex flex-1 overflow-hidden border rounded-lg bg-card">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          {/* User Info - Display Only in Single Card */}
          {userInfo ? (
            <Card className="p-4 mb-3">
              <div className="space-y-3">
                {userInfo.name !== undefined && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground min-w-[80px]">Name:</span>
                    <span className="text-sm font-semibold flex-1">{userInfo.name || "-"}</span>
                  </div>
                )}
                {userInfo.email !== undefined && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground min-w-[80px]">Email:</span>
                    <span className="text-sm font-semibold flex-1">{userInfo.email || "-"}</span>
                  </div>
                )}
                {userInfo.role !== undefined && userInfo.roles && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground min-w-[80px]">Primary Role:</span>
                    <span className="text-sm font-semibold flex-1">
                      {userInfo.roles.find(r => r.id === userInfo.role)?.name || "-"}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground min-w-[80px]">Custom Permissions:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-primary text-xs font-bold">{localSelected.length}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">selected</span>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <div className="mb-3">
              <h3 className="text-lg font-bold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground mb-3">Configure access permissions</p>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {localSelected.length} selected
            </Badge>
            <Badge variant="outline" className="text-xs">
              {permissions.length} total
            </Badge>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-3 border-b">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={isAllSelected}
              className="flex-1 flex items-center gap-2"
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
              className="flex-1 flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              None
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <Button
            variant={activeCategory === "all" ? "default" : "ghost"}
            onClick={() => setActiveCategory("all")}
            className="w-full justify-start text-left text-sm"
          >
            <Zap className="w-4 h-4 mr-2" />
            <span className="flex-1">All Permissions</span>
            <Badge variant="secondary" className="ml-2 text-xs">
              {permissions.length}
            </Badge>
          </Button>

          {categories.map((category) => {
            const Icon = categoryIcons[category as keyof typeof categoryIcons] || Shield
            const stats = getCategoryStats(category)
            const isActive = activeCategory === category
            const isFullySelected = stats.selected === stats.total
            return (
              <div key={category}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  onClick={() => setActiveCategory(category)}
                  className="w-full justify-start text-left text-sm"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${categoryColors[category as keyof typeof categoryColors] || "bg-gray-500"} mr-2`}
                  />
                  <Icon className="w-3.5 h-3.5 mr-2" />
                  <span className="flex-1 text-xs">{category}</span>
                  <Badge variant={isFullySelected ? "default" : "secondary"} className="text-xs">
                    {stats.selected}/{stats.total}
                  </Badge>
                </Button>

                {isActive && (
                  <div className="mt-1 ml-6">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCategorySelectAll(category)}
                      className="w-full text-xs h-7"
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
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          {activeCategory !== "all" && (
            <div className="mt-3 flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${categoryColors[activeCategory as keyof typeof categoryColors] || "bg-gray-500"}`}
              />
              <span className="text-sm font-medium">
                {activeCategory} Permissions
              </span>
              <Badge variant="outline" className="text-xs">
                {filteredPermissions.length} permissions
              </Badge>
            </div>
          )}
        </div>

        {/* Permissions Grid */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {filteredPermissions.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-3">
              {filteredPermissions.map((permission) => {
                const isSelected = localSelected.includes(permission.id)
                const Icon = categoryIcons[permission.category as keyof typeof categoryIcons] || Shield
                const categoryColor = categoryColors[permission.category as keyof typeof categoryColors] || "bg-gray-500"
                return (
                  <Card
                    key={permission.id}
                    className={`group relative overflow-hidden transition-all duration-200 cursor-pointer border-2 ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                    onClick={() => handlePermissionChange(permission.id, !isSelected)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl ${categoryColor} bg-opacity-15 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? "ring-2 ring-primary/20" : ""
                            }`}
                          >
                            <Icon className="w-5 h-5 text-foreground/70" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-semibold text-sm mb-1 ${
                              isSelected ? "text-primary" : "text-foreground"
                            }`}>
                              {permission.name}
                            </h4>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className="text-xs px-2 py-0.5 border-muted-foreground/30"
                              >
                                {permission.category}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          {isSelected ? (
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                              <XCircle className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="scale-90">
                            <AnimatedToggle
                              id={permission.id}
                              checked={isSelected}
                              onChange={(checked) => handlePermissionChange(permission.id, checked)}
                              label=""
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
              )
            })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Search className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No permissions found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or category filter</p>
            </div>
          )}
        </div>

        {/* Summary Footer */}
        {localSelected.length > 0 && (
          <div className="p-4 bg-muted border-t">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold mb-1">
                  {localSelected.length} Permission{localSelected.length !== 1 ? "s" : ""} Selected
                </h4>
                <p className="text-sm text-muted-foreground">
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
                        className={`w-7 h-7 rounded-full ${categoryColors[category as keyof typeof categoryColors] || "bg-gray-500"} bg-opacity-20 border-2 border-background flex items-center justify-center`}
                        title={`${category}: ${stats.selected}/${stats.total}`}
                      >
                        <span className="text-xs font-bold">{stats.selected}</span>
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
