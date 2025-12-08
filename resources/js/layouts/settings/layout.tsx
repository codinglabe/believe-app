"use client"

import type { BreadcrumbItem, SharedData } from "@/types"
import { Head, Link, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/frontend/ui/tabs"
import { User, Lock, Shield, CreditCard, Globe } from "lucide-react"
import type { PropsWithChildren } from "react"
import { route } from "ziggy-js"

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Settings',
    href: '/settings/profile',
  },
];

interface SettingsLayoutProps extends PropsWithChildren {
  activeTab?: string
}

export default function SettingsLayout({ children, activeTab = "profile" }: SettingsLayoutProps) {
  const { auth } = usePage<SharedData>().props

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Settings" />

      <div className="space-y-6 p-4 sm:p-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1.5">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        {/* Settings Navigation & Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3">
            <Card className="border-gray-200 dark:border-gray-800">
              <CardContent className="p-0">
                {/* Mobile Tabs */}
                <div className="lg:hidden border-b border-gray-200 dark:border-gray-800">
                  <Tabs value={activeTab} className="w-full">
                    <TabsList className="w-full h-auto p-1 bg-transparent grid grid-cols-2 gap-1">
                      <TabsTrigger value="profile" asChild className="data-[state=active]:bg-primary/10 dark:data-[state=active]:bg-primary/20">
                        <Link href={route("profile.edit")} className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm">
                          <User className="h-4 w-4" />
                          <span className="hidden sm:inline">Profile</span>
                        </Link>
                      </TabsTrigger>
                      <TabsTrigger value="password" asChild className="data-[state=active]:bg-primary/10 dark:data-[state=active]:bg-primary/20">
                        <Link href={route("password.edit")} className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm">
                          <Lock className="h-4 w-4" />
                          <span className="hidden sm:inline">Security</span>
                        </Link>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Desktop Sidebar */}
                <nav className="hidden lg:block p-2">
                  <div className="space-y-1">
                    <div className="px-3 py-2 mb-2">
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account</h3>
                    </div>
                    <Link
                      href={route("profile.edit")}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                        activeTab === "profile"
                          ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <User className="h-4 w-4" />
                      Profile Information
                    </Link>
                    <Link
                      href={route("password.edit")}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                        activeTab === "password"
                          ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Lock className="h-4 w-4" />
                      Password & Security
                    </Link>
                    
                    {(auth.user.role === "admin" || auth.user.role !== "organization") && (
                      <>
                        <div className="px-3 py-2 mt-4 mb-2">
                          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Administration</h3>
                        </div>
                        {auth.user.role === "admin" && (
                          <Link
                            href="/settings/payment-methods"
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                              activeTab === "payment-methods"
                                ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                          >
                            <CreditCard className="h-4 w-4" />
                            Payment Methods
                          </Link>
                        )}
                        {auth.user.role !== "organization" && (
                          <Link
                            href={route("admin.webhooks.index")}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                              activeTab === "webhook-manage"
                                ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                          >
                            <Globe className="h-4 w-4" />
                            Webhook Management
                          </Link>
                        )}
                      </>
                    )}
                    
                    <div className="px-3 py-2 mt-4 mb-2">
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Billing</h3>
                    </div>
                    <Link
                      href={route("billing.index")}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                        activeTab === "billing"
                          ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      Billing & Wallet
                    </Link>
                    <Link
                      href={route("referral.edit")}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                        activeTab === "referral"
                          ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                      Referral Link
                    </Link>
                  </div>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9">
            {children}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
