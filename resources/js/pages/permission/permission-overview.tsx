import { Shield, Users, ArrowRight } from "lucide-react"
import AppLayout from "@/layouts/app-layout"
import { Link, usePage } from "@inertiajs/react"
import { Card, CardContent } from "@/components/ui/card"

interface PageProps {
    statistics: {
        totalRoles: number
        activeUsers: number
        totalPermissions: number
        categories: number
    }
}

export default function DashboardHome() {
    const { statistics } = usePage<PageProps>().props
    return (
        <AppLayout>
            <div className="w-full p-4 md:p-6 lg:p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Permission Management</h1>
                    <p className="text-muted-foreground">
                        Manage roles, users, and permissions with granular control across your organization
                    </p>
                </div>

                {/* Main Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Roles Card */}
                    <Link href={route('roles.list')}>
                        <Card className="group relative overflow-hidden h-full transition-all duration-200 hover:shadow-lg hover:border-primary/50 cursor-pointer">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                                        <Shield className="w-7 h-7 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">Role Management</h3>
                                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                            Create and manage user roles with specific permissions. Define what each role can access and modify.
                                        </p>
                                        <div className="flex items-center text-primary font-medium text-sm group-hover:gap-2 transition-all">
                                            Manage Roles
                                            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Users Card */}
                    <Link href={route('users.list')}>
                        <Card className="group relative overflow-hidden h-full transition-all duration-200 hover:shadow-lg hover:border-primary/50 cursor-pointer">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                                        <Users className="w-7 h-7 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">User Management</h3>
                                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                            Manage individual users, assign roles, and set custom permissions beyond their assigned roles.
                                        </p>
                                        <div className="flex items-center text-primary font-medium text-sm group-hover:gap-2 transition-all">
                                            Manage Users
                                            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "Total Roles", value: statistics?.totalRoles || 0, iconBg: "bg-blue-500/10", iconColor: "text-blue-600" },
                        { label: "Active Users", value: statistics?.activeUsers || 0, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600" },
                        { label: "Permissions", value: statistics?.totalPermissions || 0, iconBg: "bg-purple-500/10", iconColor: "text-purple-600" },
                        { label: "Categories", value: statistics?.categories || 0, iconBg: "bg-amber-500/10", iconColor: "text-amber-600" },
                    ].map((stat, index) => (
                        <Card key={stat.label} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-10 h-10 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                                        <div className={`w-2 h-2 rounded-full ${stat.iconColor.replace("text-", "bg-")}`} />
                                    </div>
                                </div>
                                <div className={`text-2xl font-bold ${stat.iconColor} mb-1`}>{stat.value}</div>
                                <div className="text-xs text-muted-foreground">{stat.label}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </AppLayout>
    )
}
