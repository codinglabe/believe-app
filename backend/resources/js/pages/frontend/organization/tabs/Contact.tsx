"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Mail, Globe, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Head } from "@inertiajs/react"
import OrganizationProfileLayout from "@/components/frontend/organization/OrganizationProfileLayout"

interface Props {
  organization: any
  auth: any
}

const socialAccounts = (organization: any) => organization?.social_accounts && typeof organization.social_accounts === 'object' ? organization.social_accounts : {}

export default function OrganizationContact({ organization, auth }: Props) {
  const social = socialAccounts(organization)
  const contactInfo = [
    { label: 'Website', value: organization.website, icon: Globe, href: organization.website ? (organization.website.startsWith('http') ? organization.website : `https://${organization.website}`) : null },
    { label: 'Email', value: organization.email, icon: Mail, href: organization.email ? `mailto:${organization.email}` : null },
    { label: 'Facebook', value: social.facebook || null, icon: ExternalLink, href: social.facebook ? (social.facebook.startsWith('http') ? social.facebook : `https://${social.facebook}`) : null },
    { label: 'Instagram', value: social.instagram || null, icon: ExternalLink, href: social.instagram ? (social.instagram.startsWith('http') ? social.instagram : `https://${social.instagram}`) : null },
    { label: 'YouTube', value: social.youtube || organization.youtube_channel_url || null, icon: ExternalLink, href: (() => { const u = social.youtube || organization.youtube_channel_url; return u ? (u.startsWith('http') ? u : `https://${u}`) : null; })() },
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

