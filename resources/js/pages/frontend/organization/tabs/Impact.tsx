"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { TrendingUp, ArrowLeft, Award, Users, Heart, Globe } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Link } from "@inertiajs/react"
import { Head } from "@inertiajs/react"

interface Props {
  organization: {
    id: number
    name: string
    ein: string
  }
  impactScore?: {
    score: number
    metrics?: any
  }
}

export default function OrganizationImpact({ organization, impactScore }: Props) {
  return (
    <FrontendLayout>
      <Head title={`${organization.name} - Impact`} />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-600 via-orange-600 to-red-600">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative container mx-auto px-4 py-12">
            <Link
              href={route('organizations.show', organization.id)}
              className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Organization</span>
            </Link>

            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3"
            >
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Impact</h1>
                <p className="text-white/90 text-lg">{organization.name}</p>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12 max-w-4xl">
          {impactScore ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-amber-600" />
                      Impact Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-5xl font-bold text-amber-600 mb-2">
                      {impactScore.score || 'N/A'}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Overall impact rating
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {impactScore.metrics && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
                    <CardHeader>
                      <CardTitle>Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {Object.entries(impactScore.metrics).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400 capitalize">
                            {key.replace('_', ' ')}
                          </span>
                          <span className="font-semibold">{value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          ) : (
            <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Impact data is being calculated. Please check back soon.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}

