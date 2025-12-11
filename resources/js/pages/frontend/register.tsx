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
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
        {/* Background Image Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{
            backgroundImage: 'url(/images/believe-hero.png)'
          }}
        >
          {/* Dark overlay for better content readability */}
          <div className="absolute inset-0 bg-purple-900/70 dark:bg-purple-900/80"></div>
        </div>

        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-12 sm:py-16 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8 sm:mb-12"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">Join {import.meta.env.VITE_APP_NAME || 'Believe In Unity'}</h1>
            <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto">
              Choose how you'd like to get started and make a difference today
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {/* User Registration */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="h-full"
            >
              <Card className="h-full border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md overflow-hidden group">
                {/* Gradient Header */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-6 sm:p-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="mx-auto bg-white/20 backdrop-blur-sm w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <Users className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                    </div>
                    <CardTitle className="text-2xl sm:text-3xl font-bold text-white mb-2">I'm a Supporter</CardTitle>
                    <CardDescription className="text-base text-white/90 max-w-sm">
                      Join as an individual to discover and support amazing causes
                    </CardDescription>
                  </div>
                </div>
                <CardContent className="p-6 sm:p-8">
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed">Discover verified organizations</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed">Make secure donations</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed">Track your impact</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed">Connect with like-minded supporters</span>
                    </li>
                  </ul>
                  <Link href={referralCode ? `/register/user?ref=${referralCode}` : '/register/user'} className="block">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold h-12 sm:h-14 text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
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
              whileHover={{ y: -8, scale: 1.02 }}
              className="h-full"
            >
              <Card className="h-full border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md overflow-hidden group">
                {/* Gradient Header */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 p-6 sm:p-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="mx-auto bg-white/20 backdrop-blur-sm w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                    </div>
                    <CardTitle className="text-2xl sm:text-3xl font-bold text-white mb-2">I'm an Organization</CardTitle>
                    <CardDescription className="text-base text-white/90 max-w-sm">
                      Register your non-profit to reach more supporters and grow your impact
                    </CardDescription>
                  </div>
                </div>
                <CardContent className="p-6 sm:p-8">
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed">Create your organization profile</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed">Receive donations and support</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed">Sell products for your cause</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed">Access analytics and insights</span>
                    </li>
                  </ul>
                  <Link href={referralCode ? `/register/organization?ref=${referralCode}` : '/register/organization'} className="block">
                    <Button className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold h-12 sm:h-14 text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
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
            className="text-center mt-8 sm:mt-12"
          >
            <p className="text-white/90 mb-4">Already have an account?</p>
            <Link href="/login">
              <Button variant="outline" size="lg" className="border-2 border-white text-white hover:bg-white hover:text-purple-600 bg-transparent">
                Sign In
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </FrontendLayout>
  )
}
