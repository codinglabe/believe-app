"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { FileText, MapPin, Building, Hash } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Head } from "@inertiajs/react"
import OrganizationProfileLayout from "@/components/frontend/organization/OrganizationProfileLayout"

interface Props {
  organization: any
  auth: any
}

export default function OrganizationDetails({ organization, auth }: Props) {
  const details = [
    { label: 'EIN', value: organization.ein, icon: Hash },
    { label: 'Classification', value: organization.classification || 'N/A', icon: Building },
    { label: 'NTEE Code', value: organization.ntee_code || 'N/A', icon: Hash },
    { label: 'Ruling Year', value: organization.ruling || 'N/A', icon: FileText },
    { label: 'Address', value: organization.street ? `${organization.street}, ${organization.city}, ${organization.state} ${organization.zip}` : 'N/A', icon: MapPin },
  ]

  return (
    <FrontendLayout>
      <Head title={`${organization.name} - Details`} />
      <OrganizationProfileLayout organization={organization} auth={auth}>
        <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Legal & Tax Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {details.map((detail, index) => {
                const Icon = detail.icon
                return (
                  <motion.div
                    key={detail.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                      <Icon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {detail.label}
                      </p>
                      <p className="text-gray-900 dark:text-white">
                        {detail.value}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </OrganizationProfileLayout>
    </FrontendLayout>
  )
}

