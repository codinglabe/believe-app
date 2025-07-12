"use client"
import { useEffect, useState } from 'react';
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Users, Building2, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { Link } from "@inertiajs/react"

export default function RegisterPage() {


  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref);
    }
  }, []);


  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Join CareConnect</h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Choose how you'd like to get started and make a difference today
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* User Registration */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              whileHover={{ y: -5 }}
            >
              <Card className="h-full border-2 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 hover:shadow-xl bg-white dark:bg-gray-800">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto bg-blue-100 dark:bg-blue-900 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-2xl text-gray-900 dark:text-white">I'm a Supporter</CardTitle>
                  <CardDescription className="text-base text-gray-600 dark:text-gray-300">
                    Join as an individual to discover and support amazing causes
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                      Discover verified organizations
                    </li>
                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                      Make secure donations
                    </li>
                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                      Track your impact
                    </li>
                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                      Connect with like-minded supporters
                    </li>
                  </ul>
                  <Link href={route('register.user', { ref: referralCode })} className="block">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg">
                      Register as Supporter
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Organization Registration */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              whileHover={{ y: -5 }}
            >
              <Card className="h-full border-2 hover:border-green-300 transition-all duration-300 hover:shadow-xl bg-white dark:bg-gray-800">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                    <Building2 className="h-8 w-8 text-green-600" />
                  </div>
                  <CardTitle className="text-2xl text-gray-900 dark:text-white">I'm an Organization</CardTitle>
                  <CardDescription className="text-base text-gray-600 dark:text-gray-300">
                    Register your non-profit to reach more supporters and grow your impact
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                      <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                      Create your organization profile
                    </li>
                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                      <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                      Receive donations and support
                    </li>
                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                      <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                      Sell products for your cause
                    </li>
                    <li className="flex items-center text-gray-600 dark:text-gray-300">
                      <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                      Access analytics and insights
                    </li>
                  </ul>
                  <Link href={route('register.organization', { ref: referralCode })} className="block">
                    <Button className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg">
                      Register Organization
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-center mt-12"
          >
            <p className="text-gray-600 dark:text-gray-300 mb-4">Already have an account?</p>
            <Link href={route("login")}>
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </FrontendLayout>
  )
}
