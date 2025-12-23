"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Mail, Phone, Globe, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Head } from "@inertiajs/react"
import OrganizationProfileLayout from "@/components/frontend/organization/OrganizationProfileLayout"

interface Props {
  organization: any
  auth: any
}

export default function OrganizationContact({ organization, auth }: Props) {
  const contactInfo = [
    { label: 'Email', value: organization.email, icon: Mail, href: organization.email ? `mailto:${organization.email}` : null },
    { label: 'Phone', value: organization.phone, icon: Phone, href: organization.phone ? `tel:${organization.phone}` : null },
    { label: 'Website', value: organization.website, icon: Globe, href: organization.website || null },
    { label: 'Contact Person', value: organization.contact_name ? `${organization.contact_name}${organization.contact_title ? ` - ${organization.contact_title}` : ''}` : null, icon: User },
  ].filter(item => item.value)

  return (
    <FrontendLayout>
      <Head title={`${organization.name} - Contact`} />
      <OrganizationProfileLayout organization={organization} auth={auth}>
        <div className="max-w-4xl">
          {contactInfo.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contactInfo.map((info, index) => {
                const Icon = info.icon
                return (
                  <motion.div
                    key={info.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="border-0 shadow-lg bg-white dark:bg-gray-800 hover:shadow-xl transition-shadow">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                            <Icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                          </div>
                          <CardTitle className="text-lg">{info.label}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {info.href ? (
                          <a
                            href={info.href}
                            target={info.label === 'Website' ? '_blank' : undefined}
                            rel={info.label === 'Website' ? 'noopener noreferrer' : undefined}
                            className="text-violet-600 dark:text-violet-400 hover:underline"
                          >
                            {info.value}
                          </a>
                        ) : (
                          <p className="text-gray-900 dark:text-white">{info.value}</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
              <CardContent className="py-12 text-center">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Contact information is not available at this time.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </OrganizationProfileLayout>
    </FrontendLayout>
  )
}

