import { Head, Link } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Calendar, DollarSign, Users, TrendingUp, Eye, Share2 } from "lucide-react"
import type { NodeBoss } from "@/types/nodeboss"
import { ReactElement, JSXElementConstructor, ReactNode, ReactPortal, Key } from "react"

interface Props {
  auth: any
  nodeBoss: NodeBoss
}

export default function Show({ auth, nodeBoss }: Props) {
  // JSON.parse from here nodeBoss.suggested_amounts
  const suggestedAmounts = typeof nodeBoss.suggested_amounts === "string"
    ? JSON.parse(nodeBoss.suggested_amounts)
    : nodeBoss.suggested_amounts || [10, 25, 50, 100]
  return (
    <AppLayout>
      <Head title={`NodeBoss - ${nodeBoss.name}`} />

      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 m-10">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-start sm:justify-between gap-4 animate-in slide-in-from-top duration-700">
          <div className="flex items-start gap-3 sm:gap-4 flex-1">
            <Link href={route("node-boss.index")}>
              <Button
                variant="outline"
                size="sm"
                className="hover:scale-105 transition-transform duration-200 bg-transparent"
              >
                <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl animate-pulse">
                <Eye className="h-5 w-5 sm:h-7 sm:w-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white break-words">
                  {nodeBoss.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-3">
                  <Badge
                    variant={
                      nodeBoss.status === "active"
                        ? "default"
                        : nodeBoss.status === "inactive"
                          ? "secondary"
                          : "outline"
                    }
                    className="animate-in zoom-in duration-300"
                  >
                    {nodeBoss.status === "active" ? "🟢" : nodeBoss.status === "inactive" ? "🟡" : "📝"}{" "}
                    {nodeBoss.status}
                  </Badge>
                  <Badge
                    variant={nodeBoss.is_closed ? "destructive" : "default"}
                    className="animate-in zoom-in duration-500"
                  >
                    {nodeBoss.is_closed ? "🔒 Closed" : "🟢 Open"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 animate-in slide-in-from-right duration-700">
            <Button variant="outline" size="sm" className="hover:scale-105 transition-all duration-200 bg-transparent">
              <Share2 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Link href={route("node-boss.edit", nodeBoss.id)}>
              <Button className="w-full sm:w-auto hover:scale-105 transition-all duration-200 shadow-lg">
                <Edit className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Edit NodeBoss</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Image */}
        <Card className=" shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-top duration-500">
          <CardContent className="p-4 sm:p-6">
            {nodeBoss.image ? (
              <div className="flex justify-center">
                <div className="relative group">
                  <img
                    src={"/" + nodeBoss.image || "/placeholder.svg"}
                    alt={nodeBoss.name}
                    className="rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 transition-transform duration-300 group-hover:scale-105 max-w-full h-auto"
                    style={{ maxWidth: "436px", maxHeight: "196px", objectFit: "cover" }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 rounded-lg"></div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-full max-w-md h-32 sm:h-48 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 rounded-lg flex items-center justify-center border border-gray-300 dark:border-gray-500 animate-pulse">
                  <div className="text-center text-gray-400 dark:text-gray-500">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 rounded-full bg-gray-300 dark:bg-gray-500 flex items-center justify-center">
                      <span className="text-2xl sm:text-3xl">📊</span>
                    </div>
                    <p className="text-sm font-medium">No Image Available</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Basic Information */}
          <Card className=" shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-left duration-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-white">
                <TrendingUp className="h-5 w-5 text-blue-600 animate-pulse" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="space-y-2 animate-in fade-in duration-500">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Name</label>
                <p className="text-gray-900 dark:text-white font-medium text-sm sm:text-base break-words">
                  {nodeBoss.name}
                </p>
              </div>
              <div className="space-y-2 animate-in fade-in duration-700">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
                <Badge
                  variant={
                    nodeBoss.status === "active" ? "default" : nodeBoss.status === "inactive" ? "secondary" : "outline"
                  }
                  className="hover:scale-105 transition-transform duration-200"
                >
                  {nodeBoss.status === "active" ? "🟢" : nodeBoss.status === "inactive" ? "🟡" : "📝"} {nodeBoss.status}
                </Badge>
              </div>
              <div className="space-y-2 animate-in fade-in duration-900">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Investment Status</label>
                <Badge
                  variant={nodeBoss.is_closed ? "destructive" : "default"}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  {nodeBoss.is_closed ? "🔒 Closed for Investment" : "🟢 Open for Investment"}
                </Badge>
              </div>
              <div className="space-y-2 animate-in fade-in duration-1000">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Created</label>
                <div className="flex items-center gap-2 text-gray-900 dark:text-white text-sm sm:text-base">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  {new Date(nodeBoss.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
              <div className="space-y-2 animate-in fade-in duration-1100">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Last Updated</label>
                <div className="flex items-center gap-2 text-gray-900 dark:text-white text-sm sm:text-base">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  {new Date(nodeBoss.updated_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Investment Options */}
          <Card className=" shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-right duration-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-white">
                <DollarSign className="h-5 w-5 text-green-600 animate-pulse" />
                Investment Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Suggested Amounts</label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {suggestedAmounts.map((amount: number, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-center p-3 sm:p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800 rounded-lg hover:scale-105 transition-all duration-200 animate-in zoom-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <span className="text-base sm:text-lg font-semibold text-green-600 dark:text-green-400">
                        ${amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-600 space-y-2 animate-in fade-in duration-1000">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Price:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{"$" + nodeBoss.price}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Sell:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{suggestedAmounts.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Options:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{suggestedAmounts.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-bottom duration-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-white">
              <Users className="h-5 w-5 text-purple-600 animate-pulse" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm sm:prose max-w-none dark:prose-invert">
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                {nodeBoss.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Bar */}
        <div className="flex flex-col justify-end sm:flex-row gap-3 sm:gap-4 pt-6 border-t border-gray-200 dark:border-gray-600 animate-in slide-in-from-bottom duration-500">
          <Link href={route("node-boss.edit", nodeBoss.id)} className="flex-1 sm:flex-none">
            <Button className="w-full sm:w-auto hover:scale-105 transition-all duration-200 shadow-lg cursor-pointer">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            className="flex-1 sm:flex-none hover:scale-105 transition-all duration-200 bg-transparent cursor-pointer"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Link href={route("node-boss.index")} className="flex-1 sm:flex-none">
            <Button
              variant="outline"
              className="w-full sm:w-auto hover:scale-105 transition-all duration-200 bg-transparent cursor-pointer"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
