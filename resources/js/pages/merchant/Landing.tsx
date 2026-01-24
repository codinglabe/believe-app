import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantCard, MerchantCardContent } from '@/components/merchant-ui'
import { MerchantHeader, MerchantFooter } from '@/components/merchant'
import { 
  TrendingUp, 
  Shield, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  Store,
  BarChart3,
  X,
  Star,
  Target,
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function MerchantLanding() {
  return (
    <>
      <Head title="The 10% Discount Merchant Hub - Turn Community Service Into New Customers" />
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-pink-900 dark:from-black dark:via-gray-900 dark:to-pink-900">
        {/* Header */}
        <MerchantHeader variant="public" />

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-[#FF1493]/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-[#DC143C]/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px] bg-[#E97451]/10 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 md:pt-40 lg:pt-48 pb-16 sm:pb-20 md:pb-24 lg:pb-32 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-5xl mx-auto text-center"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-[#FF1493]/20 via-[#DC143C]/20 to-[#E97451]/20 border border-[#FF1493]/30 mb-6 sm:mb-8"
              >
                <Target className="w-3 h-3 sm:w-4 sm:h-4 text-[#FF1493]" />
                <span className="text-xs sm:text-sm font-medium text-gray-200">Simple • Transparent • Merchant-Friendly</span>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold text-white mb-4 sm:mb-6 leading-tight px-2">
                <span className="block bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                  The 10% Discount Merchant Hub
                </span>
              </h1>
              
              <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-gray-200 mb-4 sm:mb-6 max-w-4xl mx-auto font-light leading-relaxed px-2">
                Turn Community Service Into New Customers
              </p>
              
              <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed px-2">
                <span className="text-white font-semibold">On Your Terms</span> — Partner with nonprofits and churches to reward verified volunteers with a simple 10% discount, while staying in full control of what's offered, how often it's redeemed, and how much it costs.
              </p>
              
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-2"
              >
                <Link href="/register" className="w-full sm:w-auto">
                  <MerchantButton size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 md:px-10 py-5 sm:py-6 md:py-7 shadow-2xl shadow-[#FF1493]/50 hover:shadow-[#FF1493]/70 transition-all duration-300">
                    Join the 10% Discount Merchant Hub
                    <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                </MerchantButton>
              </Link>
                <Link href="/hub" className="w-full sm:w-auto">
                  <MerchantButton size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 md:px-10 py-5 sm:py-6 md:py-7">
                  Browse Offers
                </MerchantButton>
              </Link>
              </motion.div>
            </motion.div>
            </div>
        </section>

        {/* The One Rule - Centerpiece */}
        <section className="relative py-12 sm:py-16 md:py-24 lg:py-32 xl:py-40 overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-[#FF1493]/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-[#DC143C]/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] md:w-[600px] md:h-[600px] lg:w-[700px] lg:h-[700px] xl:w-[800px] xl:h-[800px] bg-[#E97451]/5 rounded-full blur-3xl"></div>
          </div>

          {/* Decorative Lines */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF1493]/50 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF1493]/50 to-transparent"></div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="max-w-6xl mx-auto"
            >
              {/* Header Section */}
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
                  className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-[#FF1493] via-[#DC143C] to-[#E97451] rounded-2xl sm:rounded-3xl mb-4 sm:mb-6 md:mb-8 shadow-2xl shadow-[#FF1493]/50 relative"
                >
                  <Target className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
                  <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#FF1493] via-[#DC143C] to-[#E97451] opacity-0 hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                </motion.div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white mb-4 sm:mb-6 tracking-tight px-2">
                  <span className="block bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                    The One Rule
                  </span>
            </h2>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-300 font-medium px-2">How the Discount Works</p>
              </div>
              
              {/* Rules List */}
              <div className="space-y-4 sm:space-y-5 md:space-y-6 mb-8 sm:mb-10 md:mb-12">
                {[
                  { text: 'Volunteers earn points by serving nonprofits and churches', highlight: false, icon: CheckCircle2 },
                  { text: 'Each volunteer may redeem up to 100 points per merchant, per month', highlight: true, icon: CheckCircle2 },
                  { text: '100 points = 10% off one eligible purchase', highlight: true, icon: CheckCircle2 },
                  { text: 'One redemption per volunteer, per merchant, per month', highlight: false, icon: CheckCircle2 },
                ].map((item, index) => {
                  const Icon = item.icon
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -40 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.3 + index * 0.1, type: "spring" }}
                      className={`relative group ${
                        item.highlight 
                          ? 'bg-gradient-to-r from-[#FF1493]/20 via-[#DC143C]/20 to-[#E97451]/20 border-l-4 border-[#FF1493]' 
                          : 'bg-gray-900/40 border-l-4 border-gray-700'
                      } rounded-r-xl sm:rounded-r-2xl p-4 sm:p-5 md:p-6 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4 md:gap-6">
                        <div className={`shrink-0 mt-1 ${
                          item.highlight 
                            ? 'w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FF1493] to-[#DC143C] shadow-lg shadow-[#FF1493]/50' 
                            : 'w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl bg-gray-800 border border-gray-700'
                        } flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${item.highlight ? 'text-white' : 'text-gray-400'}`} />
                        </div>
                        <p className={`text-base sm:text-lg md:text-xl lg:text-2xl leading-relaxed pt-1 ${
                          item.highlight 
                            ? 'text-white font-bold' 
                            : 'text-gray-300'
                        }`}>
                          {item.text}
                        </p>
                      </div>
                      {item.highlight && (
                        <div className="absolute inset-0 rounded-r-xl sm:rounded-r-2xl bg-gradient-to-r from-[#FF1493]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                      )}
                    </motion.div>
                  )
                })}
                
                <motion.div
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.7, type: "spring" }}
                  className="relative bg-gradient-to-r from-red-900/30 via-red-800/30 to-red-900/30 border-l-4 border-red-500 rounded-r-xl sm:rounded-r-2xl p-4 sm:p-5 md:p-6 backdrop-blur-sm"
                >
                  <div className="flex items-start gap-3 sm:gap-4 md:gap-6">
                    <div className="shrink-0 mt-1 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center">
                      <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-400" />
                    </div>
                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-200 font-semibold leading-relaxed pt-1">
                      No stacking. No tiers. No exceptions.
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Bottom Statement */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.9 }}
                className="relative"
              >
                <div className="relative bg-gradient-to-r from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 lg:p-16 border-2 border-[#FF1493]/30 backdrop-blur-xl">
                  <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#FF1493]/5 via-transparent to-[#E97451]/5"></div>
                  <div className="relative text-center">
                    <div className="inline-block mb-4 sm:mb-6">
                      <div className="h-1 w-16 sm:w-20 md:w-24 bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] rounded-full mx-auto"></div>
                    </div>
                    <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white italic leading-tight px-2">
                      <span className="bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] bg-clip-text text-transparent">
                        That's the entire program.
                      </span>
                    </p>
                    <div className="inline-block mt-4 sm:mt-6">
                      <div className="h-1 w-16 sm:w-20 md:w-24 bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] rounded-full mx-auto"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* You Control the Offer */}
        <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-10 sm:mb-12 md:mb-16"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 sm:mb-6 px-2">
                You Control the Offer
                <span className="block text-2xl sm:text-3xl md:text-4xl text-[#FF1493] mt-2">Completely</span>
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed px-2">
                As a Merchant Partner, <span className="text-white font-semibold">you decide everything that matters</span>
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto mb-8 sm:mb-10 md:mb-12">
              {[
                {
                  icon: <Store className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
                  title: 'Eligible Items & Services',
                  description: 'Choose any number of items or services to qualify for the 10% discount. Merchandise, services, or both. Update or remove items at any time.',
                  gradient: 'from-[#FF1493] via-[#DC143C] to-[#E97451]',
                },
                {
                  icon: <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
                  title: 'Quantity Limits (Optional)',
                  description: 'Limit how many times an item can be redeemed. Example: "Only the first 100 redemptions available." When the limit is reached, the item is automatically removed.',
                  gradient: 'from-[#DC143C] via-[#E97451] to-[#FF1493]',
                },
                {
                  icon: <Shield className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
                  title: 'Discount Amount Cap (Optional)',
                  description: 'Cap how much the discount can be worth. Example: "10% off, up to a maximum of $20."',
                  gradient: 'from-[#E97451] via-[#FF1493] to-[#DC143C]',
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                >
                  <MerchantCard className="h-full group relative overflow-hidden border border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 hover:border-[#FF1493]/50 transition-all duration-500 hover:shadow-2xl hover:shadow-[#FF1493]/20">
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                    <MerchantCardContent className="relative p-6 sm:p-7 md:p-8">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br ${feature.gradient} rounded-lg sm:rounded-xl flex items-center justify-center text-white mb-4 sm:mb-5 md:mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        {feature.icon}
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4 group-hover:text-[#FF1493] transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                        {feature.description}
                      </p>
                    </MerchantCardContent>
                  </MerchantCard>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-center"
            >
              <MerchantCard className="max-w-3xl mx-auto border-2 border-[#FF1493]/40 bg-gradient-to-r from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 backdrop-blur-sm">
                <MerchantCardContent className="p-6 sm:p-7 md:p-8">
                  <p className="text-xl sm:text-2xl md:text-3xl text-white font-semibold italic px-2">
                    You always control your exposure — by item, by quantity, and by cost.
                  </p>
                </MerchantCardContent>
              </MerchantCard>
            </motion.div>
          </div>
        </section>

        {/* Why Merchants Like This Model */}
        <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32 bg-gradient-to-b from-transparent via-gray-900/30 to-transparent">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-10 sm:mb-12 md:mb-16"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 sm:mb-6 px-2">
                Why Merchants Like This Model
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto mb-8 sm:mb-10 md:mb-12">
              {[
              {
                icon: <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
                title: 'Predictable',
                description: 'One discount. One visit. Once per month.',
                iconBg: 'from-blue-500 to-cyan-500',
                cardHover: 'from-blue-500/10 to-cyan-500/10',
              },
              {
                icon: <Shield className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
                title: 'Protected',
                description: 'No coupon abuse. No repeat redemptions. No margin surprises.',
                iconBg: 'from-green-500 to-emerald-500',
                cardHover: 'from-green-500/10 to-emerald-500/10',
              },
              {
                icon: <Zap className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
                title: 'Simple',
                description: 'No training complexity. No negotiations. No ad spend.',
                iconBg: 'from-yellow-500 to-orange-500',
                cardHover: 'from-yellow-500/10 to-orange-500/10',
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
              >
                <MerchantCard className="h-full group relative overflow-hidden border border-gray-700/50 bg-gradient-to-br from-gray-900/90 to-gray-800/90 hover:border-[#FF1493]/50 transition-all duration-500 hover:shadow-2xl hover:shadow-[#FF1493]/20">
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.cardHover} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  <MerchantCardContent className="relative p-6 sm:p-7 md:p-8 text-center">
                    <div className={`w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-gradient-to-br ${feature.iconBg} rounded-xl sm:rounded-2xl flex items-center justify-center text-white mb-4 sm:mb-5 md:mb-6 mx-auto shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4 group-hover:text-[#FF1493] transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
                      {feature.description}
                    </p>
                  </MerchantCardContent>
                </MerchantCard>
              </motion.div>
            ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-center"
            >
              <MerchantCard className="max-w-3xl mx-auto border-2 border-[#FF1493]/40 bg-gradient-to-r from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 backdrop-blur-sm">
                <MerchantCardContent className="p-6 sm:p-7 md:p-8">
                  <p className="text-xl sm:text-2xl md:text-3xl text-white font-semibold italic px-2">
                    This feels like customer acquisition — not a giveaway.
                  </p>
                </MerchantCardContent>
              </MerchantCard>
            </motion.div>
          </div>
        </section>

        {/* Why This Works Better Than Coupons */}
        <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-5xl mx-auto"
            >
              <div className="text-center mb-10 sm:mb-12 md:mb-16">
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 sm:mb-6 px-2">
                  Why This Works Better Than Coupons
                </h2>
                <p className="text-lg sm:text-xl md:text-2xl text-gray-300 font-medium px-2">
                  These aren't random deal-seekers.
                    </p>
                  </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-8 sm:mb-10">
                {[
                  'Volunteers earned their reward through real service',
                  'Redemptions are verified',
                  'Customers arrive with positive intent',
                  'Community trust is built in',
                ].map((point, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    <MerchantCard className="h-full group border border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 hover:border-[#FF1493]/50 transition-all duration-300">
                      <MerchantCardContent className="p-5 sm:p-6">
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#FF1493] to-[#DC143C] flex items-center justify-center group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                          <p className="text-gray-200 text-base sm:text-lg leading-relaxed pt-1">{point}</p>
                        </div>
                      </MerchantCardContent>
                    </MerchantCard>
                  </motion.div>
                ))}
              </div>

              <MerchantCard className="border-2 border-[#FF1493]/40 bg-gradient-to-br from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 backdrop-blur-sm">
                <MerchantCardContent className="p-6 sm:p-8 md:p-10">
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8 text-center">This leads to:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                    {[
                      'Higher-quality customers',
                      'Better repeat behavior',
                      'Stronger brand loyalty',
                    ].map((benefit, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                        className="flex flex-col items-center text-center p-3 sm:p-4 rounded-lg bg-gray-900/50 hover:bg-gray-900/70 transition-colors"
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#FF1493] to-[#DC143C] flex items-center justify-center mb-2 sm:mb-3">
                          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <p className="text-gray-200 font-semibold text-base sm:text-lg">{benefit}</p>
                      </motion.div>
                    ))}
                  </div>
                </MerchantCardContent>
              </MerchantCard>
            </motion.div>
          </div>
        </section>

        {/* How Redemption Works */}
        <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32 bg-gradient-to-b from-transparent via-gray-900/30 to-transparent">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-5xl mx-auto"
            >
              <div className="text-center mb-10 sm:mb-12 md:mb-16">
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 sm:mb-6 px-2">
                  How Redemption Works
                </h2>
              </div>

              <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
                {[
                  'Volunteer selects your business in the Merchant Hub',
                  'System checks monthly eligibility',
                  'QR code is generated',
                  'You apply 10% off to an eligible item',
                  'Redemption is logged automatically',
                ].map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    <MerchantCard className="group border border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 hover:border-[#FF1493]/50 transition-all duration-300">
                      <MerchantCardContent className="p-4 sm:p-5 md:p-6">
                        <div className="flex items-center gap-4 sm:gap-5 md:gap-6">
                          <div className="shrink-0 w-12 h-12 sm:w-13 sm:h-13 md:w-14 md:h-14 bg-gradient-to-br from-[#FF1493] via-[#DC143C] to-[#E97451] rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                            {index + 1}
                          </div>
                          <p className="text-base sm:text-lg md:text-xl text-gray-200 leading-relaxed">{step}</p>
                      </div>
                      </MerchantCardContent>
                    </MerchantCard>
                  </motion.div>
                    ))}
                  </div>

              <MerchantCard className="border-2 border-red-500/40 bg-gradient-to-br from-red-900/20 to-red-800/20 backdrop-blur-sm">
                <MerchantCardContent className="p-6 sm:p-7 md:p-8">
                  <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center justify-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center">
                      <X className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                    </div>
                    <p className="text-lg sm:text-xl md:text-2xl text-gray-200 font-semibold">No cash. No coupons. No confusion.</p>
                  </div>
                </MerchantCardContent>
              </MerchantCard>
            </motion.div>
          </div>
        </section>

        {/* What You Don't Have to Do */}
        <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-5xl mx-auto"
            >
              <div className="text-center mb-10 sm:mb-12 md:mb-16">
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 sm:mb-6 px-2">
                  What You Don't Have to Do
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-8 sm:mb-10 md:mb-12">
                {[
                  'Track points',
                  'Manage volunteers',
                  'Verify nonprofits',
                  'Run promotions',
                  'Spend on ads',
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                    whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="h-full"
                  >
                    <MerchantCard className="text-center group border border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 hover:border-red-500/50 transition-all duration-300 h-full flex flex-col">
                      <MerchantCardContent className="p-4 sm:p-5 md:p-6 flex flex-col flex-1 items-center justify-center">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 group-hover:bg-red-500/30 transition-all">
                          <X className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                        </div>
                        <p className="text-xs sm:text-sm md:text-base text-gray-200 font-medium leading-tight">{item}</p>
                      </MerchantCardContent>
                    </MerchantCard>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-center"
              >
                <MerchantCard className="max-w-3xl mx-auto border-2 border-[#FF1493]/50 bg-gradient-to-br from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 backdrop-blur-sm">
                  <MerchantCardContent className="p-6 sm:p-8 md:p-10">
                    <p className="text-xl sm:text-2xl md:text-3xl text-white font-bold mb-3 sm:mb-4 px-2">
                      Believe In Unity handles the platform.
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl text-gray-200 font-medium px-2">
                      You just honor the discount.
                    </p>
                  </MerchantCardContent>
                </MerchantCard>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32 bg-gradient-to-b from-transparent via-gray-900/30 to-transparent">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-10 sm:mb-12 md:mb-16"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 sm:mb-6 px-2">
                Simple, Transparent Pricing
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-3 sm:mb-4 font-medium px-2">
                Platform Subscription (Covers Operating Costs)
              </p>
              <p className="text-base sm:text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed px-2">
                We charge a small subscription fee to maintain the platform, verification systems, and merchant tools.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto mb-8 sm:mb-10 md:mb-12">
              {[
                {
                  period: 'Monthly',
                  price: '$9',
                  description: 'per month',
                  popular: false,
                },
                {
                  period: 'Annual',
                  price: '$100',
                  description: 'per year (save $8 annually)',
                  popular: true,
                }
              ].map((plan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                >
                  <MerchantCard className={`h-full flex flex-col relative overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-2xl ${
                    plan.popular 
                      ? 'border-2 border-[#FF1493]/60 bg-gradient-to-br from-gray-900/95 to-gray-800/95 shadow-2xl shadow-[#FF1493]/30' 
                      : 'border border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80'
                  }`}>
                    {plan.popular && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451]"></div>
                    )}
                    {plan.popular && (
                      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
                        <div className="flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] px-3 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 text-white fill-white" />
                          <span className="text-xs font-bold text-white">Best Value</span>
                  </div>
                </div>
                    )}
                    <MerchantCardContent className="p-6 sm:p-8 md:p-10 flex flex-col flex-1">
                      <div className="text-center mb-6 sm:mb-8">
                        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
                          {plan.period}
                    </h3>
                        <div className="flex items-baseline justify-center gap-2 mb-2 sm:mb-3">
                          <span className={plan.popular 
                            ? 'text-5xl sm:text-6xl md:text-7xl font-extrabold bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] bg-clip-text text-transparent' 
                            : 'text-5xl sm:text-6xl md:text-7xl font-extrabold text-white'
                          }>
                            {plan.price}
                      </span>
                    </div>
                        <p className="text-gray-300 text-sm sm:text-base font-medium">
                          {plan.description}
                        </p>
                      </div>
                      <div className="mt-auto">
                        <Link href="/register" className="block">
                          <MerchantButton variant={plan.popular ? "default" : "outline"} className="w-full py-4 sm:py-5 md:py-6 text-sm sm:text-base font-semibold">
                            Get Started
                            <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                          </MerchantButton>
                        </Link>
                      </div>
                    </MerchantCardContent>
                  </MerchantCard>
                </motion.div>
              ))}
                  </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="max-w-4xl mx-auto"
            >
              <MerchantCard className="border-2 border-[#FF1493]/40 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm">
                <MerchantCardContent className="p-6 sm:p-8 md:p-10">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-6 sm:mb-8 text-center">What's Included</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    {[
                      'Merchant Hub listing',
                      'Unlimited eligible items',
                      'Monthly discount enforcement',
                      'QR-code redemption',
                      'Redemption tracking & controls',
                      'Nonprofit & volunteer verification',
                      'Ongoing platform support',
                    ].map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.4 + index * 0.05 }}
                        className="flex items-start gap-3 p-2 sm:p-3 rounded-lg hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-[#FF1493] to-[#DC143C] flex items-center justify-center mt-0.5">
                          <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </div>
                        <span className="text-gray-200 text-sm sm:text-base leading-relaxed">{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                  <div className="pt-6 sm:pt-8 border-t-2 border-[#FF1493]/30">
                    <p className="text-lg sm:text-xl md:text-2xl text-white font-bold text-center mb-2 sm:mb-3 px-2">
                      No commissions. No per-redemption fees. No hidden charges.
                    </p>
                    <p className="text-gray-300 text-center text-base sm:text-lg italic px-2">
                      This fee exists only to support platform operations.
                    </p>
                  </div>
                </MerchantCardContent>
              </MerchantCard>
            </motion.div>
          </div>
        </section>

        {/* Who This Is For */}
        <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-6xl mx-auto"
            >
              <div className="text-center mb-10 sm:mb-12 md:mb-16">
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 sm:mb-6 px-2">
                  Who This Is For
                </h2>
                <p className="text-lg sm:text-xl md:text-2xl text-gray-300 font-medium px-2">
                  The 10% Discount Merchant Hub works especially well for:
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10 md:mb-12">
                {[
                  'Restaurants & cafés',
                  'Barbershops & salons',
                  'Auto & home services',
                  'Gyms & wellness providers',
                  'Professional services',
                  'Digital & creative businesses',
                  'Faith-owned businesses',
                  'Minority-owned businesses',
                ].map((business, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  >
                    <MerchantCard className="text-center h-full group border border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 hover:border-[#FF1493]/50 transition-all duration-300 hover:shadow-lg">
                      <MerchantCardContent className="p-4 sm:p-5 md:p-6">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FF1493] to-[#DC143C] flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          <Store className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <p className="text-xs sm:text-sm md:text-base text-gray-200 font-medium leading-relaxed">{business}</p>
                      </MerchantCardContent>
                    </MerchantCard>
                  </motion.div>
                ))}
                    </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-center"
              >
                <MerchantCard className="max-w-3xl mx-auto border-2 border-[#FF1493]/40 bg-gradient-to-r from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 backdrop-blur-sm">
                  <MerchantCardContent className="p-6 sm:p-7 md:p-8">
                    <p className="text-lg sm:text-xl md:text-2xl text-white font-semibold px-2">
                      If you serve your local community, this fits your business.
                    </p>
                  </MerchantCardContent>
                </MerchantCard>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Trust & Accountability */}
        <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32 bg-gradient-to-b from-transparent via-gray-900/30 to-transparent">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-5xl mx-auto"
            >
              <div className="text-center mb-10 sm:mb-12 md:mb-16">
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 sm:mb-6 px-2">
                  Trust & Accountability
                </h2>
                  </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-8 sm:mb-10">
                {[
                  'Nonprofits are reviewed before participating',
                  'Volunteer activity is verified',
                  'Redemptions are limited and logged',
                  'No cash transactions — points only',
                ].map((point, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    <MerchantCard className="h-full group border border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 hover:border-[#FF1493]/50 transition-all duration-300">
                      <MerchantCardContent className="p-5 sm:p-6">
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FF1493] to-[#DC143C] flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                          <p className="text-gray-200 text-base sm:text-lg leading-relaxed pt-1 sm:pt-2">{point}</p>
                        </div>
                      </MerchantCardContent>
                    </MerchantCard>
                  </motion.div>
                    ))}
                  </div>

              <MerchantCard className="border-2 border-[#FF1493]/40 bg-gradient-to-r from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 backdrop-blur-sm">
                <MerchantCardContent className="p-6 sm:p-7 md:p-8">
                  <p className="text-center text-lg sm:text-xl md:text-2xl text-white font-semibold px-2">
                    This keeps the system fair, secure, and abuse-resistant.
                  </p>
                </MerchantCardContent>
              </MerchantCard>
            </motion.div>
          </div>
        </section>

        {/* Why Believe In Unity Exists */}
        <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-5xl mx-auto"
            >
              <div className="text-center mb-8 sm:mb-10 md:mb-12">
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 sm:mb-6 px-2">
                  Why Believe In Unity Exists
                </h2>
              </div>

              <MerchantCard className="border-2 border-[#FF1493]/50 bg-gradient-to-br from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF1493]/5 via-transparent to-[#E97451]/5"></div>
                <MerchantCardContent className="relative p-6 sm:p-8 md:p-10 lg:p-12">
                  <div className="space-y-4 sm:space-y-5 md:space-y-6 text-center">
                    <p className="text-xl sm:text-2xl md:text-3xl text-gray-200 mb-6 sm:mb-8 font-medium px-2">We believe:</p>
                    <div className="space-y-3 sm:space-y-4 max-w-3xl mx-auto">
                      {[
                        'Service should be rewarded',
                        'Businesses should grow without predatory advertising',
                        'Communities thrive when everyone participates',
                      ].map((belief, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                          className="flex items-center justify-center gap-2 sm:gap-3"
                        >
                          <div className="w-2 h-2 rounded-full bg-[#FF1493] shrink-0"></div>
                          <p className="text-lg sm:text-xl md:text-2xl text-white font-semibold px-2">{belief}</p>
                        </motion.div>
                      ))}
                    </div>
                    <div className="mt-8 sm:mt-10 md:mt-12 pt-6 sm:pt-8 md:pt-10 border-t-2 border-[#FF1493]/30">
                      <p className="text-xl sm:text-2xl md:text-3xl text-white font-bold italic mb-2 sm:mb-3 px-2">
                        We don't sell discounts.
                      </p>
                      <p className="text-xl sm:text-2xl md:text-3xl text-white font-bold italic px-2">
                        We convert service into loyalty.
                      </p>
                    </div>
                  </div>
                </MerchantCardContent>
              </MerchantCard>
            </motion.div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF1493]/20 via-[#DC143C]/20 to-[#E97451]/20"></div>
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-[#FF1493]/30 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-[#DC143C]/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 lg:p-16 text-center text-white shadow-2xl max-w-5xl mx-auto relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <div className="relative z-10">
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold mb-4 sm:mb-6 leading-tight px-2">
                  Ready to Join the 10% Discount Merchant Hub?
            </h2>
                <div className="space-y-1 sm:space-y-2 mb-6 sm:mb-8 md:mb-10 text-base sm:text-lg md:text-xl lg:text-2xl font-medium px-2">
                  <p>Support your community.</p>
                  <p>Attract new customers.</p>
                  <p>Stay in control.</p>
                </div>
                <Link href="/register" className="inline-block w-full sm:w-auto">
                  <MerchantButton 
                    size="lg" 
                    variant="secondary" 
                    className="w-full sm:w-auto text-base sm:text-lg md:text-xl px-6 sm:px-8 md:px-10 py-4 sm:py-5 md:py-7 bg-white/20 hover:bg-white/30 text-white border-2 border-white/40 shadow-xl hover:shadow-2xl transition-all duration-300"
                  >
                    <span className="block sm:inline">Join for $9/month or $100/year</span>
                    <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 inline-block" />
              </MerchantButton>
            </Link>
              </div>
          </motion.div>
          </div>
        </section>

        {/* Footer */}
        <MerchantFooter />
      </div>
    </>
  )
}
