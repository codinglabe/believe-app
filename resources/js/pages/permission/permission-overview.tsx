import { Shield, Users } from "lucide-react"
import AppLayout from "@/layouts/app-layout"
import { Link } from "@inertiajs/react"

export default function DashboardHome() {
    return (
        <AppLayout>
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
                <div className="mb-12 text-center animate-in fade-in-0 slide-in-from-top-4 duration-500">
                    <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                        Permission Management
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
                        Manage roles, users, and permissions with granular control across your organization
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Roles Card */}
                    <Link href={route('roles.list')}>
                        <div
                            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 cursor-pointer animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-200"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Shield className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">Role Management</h3>
                                <p className="text-slate-600 dark:text-slate-400 mb-6">
                                    Create and manage user roles with specific permissions. Define what each role can access and modify.
                                </p>
                                <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                                    Manage Roles
                                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Users Card */}
                    <Link href={route('users.list')}>
                        <div
                            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 cursor-pointer animate-in fade-in-0 slide-in-from-right-4 duration-500 delay-300"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Users className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">User Management</h3>
                                <p className="text-slate-600 dark:text-slate-400 mb-6">
                                    Manage individual users, assign roles, and set custom permissions beyond their assigned roles.
                                </p>
                                <div className="flex items-center text-green-600 dark:text-green-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                                    Manage Users
                                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Stats Section */}
                <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-500">
                    {[
                        { label: "Total Roles", value: "8", color: "text-blue-600" },
                        { label: "Active Users", value: "124", color: "text-green-600" },
                        { label: "Permissions", value: "32", color: "text-purple-600" },
                        { label: "Categories", value: "5", color: "text-orange-600" },
                    ].map((stat, index) => (
                        <div
                            key={stat.label}
                            className="text-center p-6 rounded-xl bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                            style={{ animationDelay: `${index * 100 + 600}ms` }}
                        >
                            <div className={`text-3xl font-bold ${stat.color} mb-2`}>{stat.value}</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    )
}
