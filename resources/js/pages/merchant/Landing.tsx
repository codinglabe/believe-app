import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantCard, MerchantCardContent } from '@/components/merchant-ui'
import { MerchantHeader, MerchantFooter } from '@/components/merchant'
import { Gift, TrendingUp, Users, Shield, Zap, ArrowRight, CheckCircle2, Star, Store } from 'lucide-react'
import { motion } from 'framer-motion'

export default function MerchantLanding() {
  return (
    <>
      <Head title={`${import.meta.env.VITE_APP_NAME || 'Believe'} Merchant Program - Join Today`} />
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-pink-900 dark:from-black dark:via-gray-900 dark:to-pink-900">
        {/* Header */}
        <MerchantHeader variant="public" />

        {/* Hero Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 drop-shadow-[0_0_20px_rgba(255,20,147,0.5)]">
              Grow Your Business with
              <span className="bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] bg-clip-text text-transparent animate-pulse"> Believe Points</span>
            </h1>
            <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
              Join thousands of merchants offering products and services through our points-based loyalty program. 
              Reach engaged supporters and grow your customer base.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <MerchantButton size="lg" className="text-lg px-8 py-6">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </MerchantButton>
              </Link>
              <Link href="/hub">
                <MerchantButton size="lg" variant="outline" className="text-lg px-8 py-6">
                  Browse Offers
                </MerchantButton>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4 px-4 sm:px-0">
              Why Choose {import.meta.env.VITE_APP_NAME || 'Believe'} Merchant?
            </h2>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto px-4 sm:px-0">
              Everything you need to grow your business with a points-based loyalty system
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: <Gift className="w-8 h-8" />,
                title: 'Points-Based Redemptions',
                description: 'Accept points for your products and services. Supporters earn points through volunteering and digital actions.'
              },
              {
                icon: <TrendingUp className="w-8 h-8" />,
                title: 'Grow Your Audience',
                description: 'Reach engaged supporters who are actively participating in the Believe community.'
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: 'Engaged Customers',
                description: 'Connect with customers who value community impact and social responsibility.'
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: 'Secure & Verified',
                description: 'QR code verification system ensures secure redemptions and prevents fraud.'
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: 'Easy Management',
                description: 'Simple dashboard to create offers, track redemptions, and view analytics.'
              },
              {
                icon: <Store className="w-8 h-8" />,
                title: 'Low Monthly Fee',
                description: 'Just $9/month to participate. No transaction fees, no hidden costs.'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <MerchantCard className="transition-all duration-300 hover:scale-105">
                  <MerchantCardContent className="p-6">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#FF1493] via-[#DC143C] to-[#E97451] rounded-lg flex items-center justify-center text-white mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-200">
                      {feature.description}
                    </p>
                  </MerchantCardContent>
                </MerchantCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4 px-4 sm:px-0">
              Choose Your Plan
            </h2>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto px-4 sm:px-0">
              Simple, transparent pricing. No hidden fees. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-6 sm:gap-8 max-w-md mx-auto">
            {/* Starter Plan */}
            {/* <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <MerchantCard className="h-full flex flex-col transition-all duration-300 hover:scale-105">
                <MerchantCardContent className="p-6 sm:p-8 flex flex-col flex-1">
                  <div className="text-center mb-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                      Starter
                    </h3>
                    <div className="flex items-baseline justify-center gap-2 mb-4">
                      <span className="text-4xl sm:text-5xl font-bold text-white">
                        $5
                      </span>
                      <span className="text-lg text-gray-300">/month</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                      Perfect for small businesses
                    </p>
                  </div>

                  <div className="space-y-3 mb-6 flex-1">
                    {[
                      'Up to 10 active offers',
                      'Basic analytics',
                      'QR code verification',
                      'Email support',
                      'Dashboard access'
                    ].map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF1493]" />
                        </div>
                        <span className="text-gray-200 text-xs sm:text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t-2 border-[#FF1493]/30 mt-auto">
                    <Link href="/register" className="block">
                      <MerchantButton variant="outline" className="w-full text-sm sm:text-base py-5">
                        Get Started
                      </MerchantButton>
                    </Link>
                  </div>
                </MerchantCardContent>
              </MerchantCard>
            </motion.div> */}

            {/* Professional Plan - Most Popular */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <MerchantCard className="h-full flex flex-col relative overflow-hidden transition-all duration-300 hover:scale-105 border-2 border-[#FF1493]/50">
                {/* Popular Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <div className="flex items-center gap-1 bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] px-3 py-1 rounded-full shadow-lg">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 text-white fill-white" />
                    <span className="text-xs font-semibold text-white">Popular</span>
                  </div>
                </div>

                <MerchantCardContent className="p-6 sm:p-8 flex flex-col flex-1">
                  <div className="text-center mb-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                      Professional
                    </h3>
                    <div className="flex items-baseline justify-center gap-2 mb-4">
                      <span className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] bg-clip-text text-transparent">
                        $9
                      </span>
                      <span className="text-lg text-gray-300">/month</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                      Best for growing businesses
                    </p>
                  </div>

                  <div className="space-y-3 mb-6 flex-1">
                    {[
                      'Unlimited offers',
                      'Advanced analytics',
                      'QR code verification',
                      'Priority support',
                      'Dashboard & reporting',
                      'No transaction fees',
                      'API access'
                    ].map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF1493]" />
                        </div>
                        <span className="text-gray-200 text-xs sm:text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t-2 border-[#FF1493]/30 mt-auto">
                    <Link href="/register" className="block">
                      <MerchantButton className="w-full text-sm sm:text-base py-5">
                        Get Started
                        <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                      </MerchantButton>
                    </Link>
                    <p className="text-center text-gray-400 text-xs mt-3">
                      Most popular choice
                    </p>
                  </div>
                </MerchantCardContent>
              </MerchantCard>
            </motion.div>

            {/* Enterprise Plan */}
            {/* <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <MerchantCard className="h-full flex flex-col transition-all duration-300 hover:scale-105">
                <MerchantCardContent className="p-6 sm:p-8 flex flex-col flex-1">
                  <div className="text-center mb-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                      Enterprise
                    </h3>
                    <div className="flex items-baseline justify-center gap-2 mb-4">
                      <span className="text-4xl sm:text-5xl font-bold text-white">
                        $29
                      </span>
                      <span className="text-lg text-gray-300">/month</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                      For large-scale operations
                    </p>
                  </div>

                  <div className="space-y-3 mb-6 flex-1">
                    {[
                      'Everything in Professional',
                      'Multi-location support',
                      'Custom integrations',
                      'Dedicated account manager',
                      'Advanced security features',
                      'White-label options',
                      '24/7 priority support',
                      'Custom reporting'
                    ].map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF1493]" />
                        </div>
                        <span className="text-gray-200 text-xs sm:text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t-2 border-[#FF1493]/30 mt-auto">
                    <Link href="/register" className="block">
                      <MerchantButton variant="outline" className="w-full text-sm sm:text-base py-5">
                        Contact Sales
                      </MerchantButton>
                    </Link>
                  </div>
                </MerchantCardContent>
              </MerchantCard>
            </motion.div> */}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 text-center text-white shadow-2xl"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 opacity-90 px-4 sm:px-0">
              Join the {import.meta.env.VITE_APP_NAME || 'Believe'} Merchant Program today and start reaching engaged supporters
            </p>
            <Link href="/register" className="inline-block">
              <MerchantButton size="lg" variant="secondary" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 bg-white/20 hover:bg-white/30 text-white border-white/30">
                Create Your Account
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
              </MerchantButton>
            </Link>
          </motion.div>
        </section>

        {/* Footer */}
        <MerchantFooter />
      </div>
    </>
  )
}

