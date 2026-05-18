"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Briefcase, ExternalLink } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { router } from "@inertiajs/react"
import { Head } from "@inertiajs/react"
import { JobStatusBadge, JobTypeBadge, LocationTypeBadge } from "@/components/frontend/jobs/badge"
import OrganizationProfileLayout from "@/components/frontend/organization/OrganizationProfileLayout"

interface Job {
  id: number
  title: string
  description: string
  status: string
  type: string
  location_type: string
  salary_min?: number
  salary_max?: number
  position?: {
    title: string
  }
  organization?: {
    name: string
  }
}

interface Props {
  organization: any
  auth: any
  jobs: {
    data: Job[]
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export default function OrganizationJobs({ organization, auth, jobs }: Props) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <FrontendLayout>
      <Head title={`${organization.name} - Jobs`} />
      <OrganizationProfileLayout organization={organization} auth={auth}>
        {/* Jobs List */}
        <div>
          {jobs.data.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="inline-flex p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
                <Briefcase className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                No Jobs Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                This organization hasn't posted any job openings yet.
              </p>
            </motion.div>
          ) : (
            <>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                {jobs.data.map((job) => (
                  <motion.div key={job.id} variants={itemVariants}>
                    <Card className="hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-white dark:bg-gray-800 group">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-2xl mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {job.title}
                            </CardTitle>
                            {job.position && (
                              <CardDescription className="text-base mb-3">
                                {job.position.title}
                              </CardDescription>
                            )}
                            <div className="flex flex-wrap gap-2 mb-4">
                              <JobStatusBadge status={job.status} />
                              <JobTypeBadge type={job.type} />
                              <LocationTypeBadge locationType={job.location_type} />
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent>
                        <p className="text-gray-700 dark:text-gray-300 line-clamp-3 mb-4">
                          {job.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          {job.salary_min && job.salary_max && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              <span>${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>

                      <CardFooter>
                        <Button
                          className="group/btn"
                          onClick={() => router.visit(route('jobs.show', job.id))}
                        >
                          View Details
                          <ExternalLink className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              {jobs.last_page > 1 && (
                <div className="mt-12 flex justify-center gap-2">
                  {Array.from({ length: jobs.last_page }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={jobs.current_page === page ? "default" : "outline"}
                      onClick={() => router.get(route('organizations.jobs', organization.id), { page })}
                      className="min-w-[40px]"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </OrganizationProfileLayout>
    </FrontendLayout>
  )
}

