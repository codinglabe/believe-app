"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Info, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Head } from "@inertiajs/react"
import OrganizationProfileLayout from "@/components/frontend/organization/OrganizationProfileLayout"

interface Props {
  organization: any
  auth: any
}

export default function OrganizationAbout({ organization, auth }: Props) {
  return (
    <FrontendLayout>
      <Head title={`${organization.name} - About`} />
      <OrganizationProfileLayout organization={organization} auth={auth}>
        <div className="space-y-6">
          {organization.description && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-2xl">Our Story</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {organization.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {organization.mission && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <CardTitle className="text-2xl">Our Mission</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {organization.mission}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {!organization.description && !organization.mission && (
            <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
              <CardContent className="py-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  No information available at this time.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </OrganizationProfileLayout>
    </FrontendLayout>
  )
}

