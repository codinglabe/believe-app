import React, { FormEventHandler } from 'react'
import { Head, Link, useForm } from '@inertiajs/react'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantInput } from '@/components/merchant-ui'
import { MerchantLabel } from '@/components/merchant-ui'
import { MerchantCard, MerchantCardContent } from '@/components/merchant-ui'
import { MerchantHeader, MerchantFooter } from '@/components/merchant'
import InputError from '@/components/input-error'
import { LoaderCircle, Shield, Zap, BarChart3, Users, ArrowLeft, ArrowRight, CheckCircle2, Store, Target, Gift } from 'lucide-react'
import { motion } from 'framer-motion'

export default function MerchantRegister() {
  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route('merchant.register'), {
      onFinish: () => reset('password', 'password_confirmation'),
    })
  }

  const benefits = [
    { icon: Store, text: 'Merchant Hub listing', color: 'from-blue-500 to-cyan-500' },
    { icon: Zap, text: 'Unlimited eligible items', color: 'from-yellow-500 to-orange-500' },
    { icon: Shield, text: 'Monthly discount enforcement', color: 'from-green-500 to-emerald-500' },
    { icon: BarChart3, text: 'QR-code redemption & tracking', color: 'from-purple-500 to-pink-500' },
    { icon: Users, text: 'Nonprofit & volunteer verification', color: 'from-pink-500 to-rose-500' },
    { icon: Gift, text: 'Ongoing platform support', color: 'from-[#FF1493] to-[#DC143C]' },
  ]

  return (
    <>
      <Head title="Join the 10% Discount Merchant Hub - Merchant Registration" />
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-pink-900 dark:from-black dark:via-gray-900 dark:to-pink-900 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-[#FF1493]/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-[#DC143C]/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px] bg-[#E97451]/10 rounded-full blur-3xl"></div>
        </div>
        
        {/* Header */}
        <MerchantHeader variant="public" className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 md:pt-32 pb-8 sm:pb-12 relative z-10">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 xl:gap-16"
            >
              {/* Left Side - Benefits & Info */}
              <div className="space-y-4 sm:space-y-5 flex flex-col justify-center">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <Link 
                    href="/" 
                    className="inline-flex items-center gap-2 text-gray-300 hover:text-white mb-4 sm:mb-5 transition-colors group"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm sm:text-base">Back to home</span>
                  </Link>
                  
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-3 sm:mb-4 leading-tight">
                    <span className="block bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                      Join the 10% Discount Merchant Hub
                    </span>
                  </h1>
                  <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-4 sm:mb-5 leading-relaxed">
                    Join thousands of merchants growing their business with Believe Points. Get started in minutes.
                  </p>
                </motion.div>

                {/* Benefits List */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <MerchantCard className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-2 border-gray-700/50 backdrop-blur-sm">
                    <MerchantCardContent className="p-4 sm:p-5 md:p-6">
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF1493]" />
                        What's Included:
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {benefits.map((benefit, index) => {
                          const Icon = benefit.icon
                          return (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                              className="flex items-start gap-2 sm:gap-3 group"
                            >
                              <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br ${benefit.color} rounded-lg flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                              </div>
                              <div className="flex-1 pt-0.5 sm:pt-1">
                                <p className="text-gray-200 text-xs sm:text-sm font-medium leading-snug">{benefit.text}</p>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </MerchantCardContent>
                  </MerchantCard>
                </motion.div>

                {/* Pricing Highlight */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <MerchantCard className="bg-gradient-to-r from-[#FF1493]/20 via-[#DC143C]/20 to-[#E97451]/20 border-2 border-[#FF1493]/40 backdrop-blur-sm shadow-2xl shadow-[#FF1493]/20">
                    <MerchantCardContent className="p-4 sm:p-5 md:p-6">
                      <div className="text-center">
                        <p className="text-xs sm:text-sm text-gray-300 mb-2 sm:mb-3 font-medium">Simple, Transparent Pricing</p>
                        <div className="flex items-baseline justify-center gap-2 mb-3 sm:mb-4">
                          <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] bg-clip-text text-transparent">
                            $9
                          </span>
                          <span className="text-base sm:text-lg md:text-xl text-gray-300">/month</span>
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                          <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                            <span>No commissions</span>
                          </p>
                          <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                            <span>No per-redemption fees</span>
                          </p>
                          <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                            <span>No hidden charges</span>
                          </p>
                        </div>
                        <p className="text-xs text-gray-300 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-[#FF1493]/30">
                          No credit card required • Cancel anytime
                        </p>
                      </div>
                    </MerchantCardContent>
                  </MerchantCard>
                </motion.div>
              </div>

              {/* Right Side - Registration Form */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex items-center"
              >
                <MerchantCard className="w-full shadow-2xl bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-2 border-gray-700/50 backdrop-blur-sm">
                  <MerchantCardContent className="p-6 sm:p-8 lg:p-10">
                    <div className="mb-6 sm:mb-8">
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3">
                        Create Your Account
                      </h2>
                      <p className="text-gray-300 text-sm sm:text-base md:text-lg">
                        Fill in your details to get started
                      </p>
                    </div>

                    <form onSubmit={submit} className="space-y-5 sm:space-y-6">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                      >
                        <MerchantLabel htmlFor="name" className="text-sm sm:text-base font-semibold text-gray-200">
                          Business Name <span className="text-[#FF1493]">*</span>
                        </MerchantLabel>
                        <MerchantInput
                          id="name"
                          type="text"
                          required
                          autoFocus
                          autoComplete="name"
                          value={data.name}
                          onChange={(e) => setData('name', e.target.value)}
                          placeholder="Enter your business name"
                          className="mt-2 sm:mt-3 text-base"
                        />
                        <InputError message={errors.name} />
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.35 }}
                      >
                        <MerchantLabel htmlFor="email" className="text-sm sm:text-base font-semibold text-gray-200">
                          Email Address <span className="text-[#FF1493]">*</span>
                        </MerchantLabel>
                        <MerchantInput
                          id="email"
                          type="email"
                          required
                          autoComplete="email"
                          value={data.email}
                          onChange={(e) => setData('email', e.target.value)}
                          placeholder="merchant@example.com"
                          className="mt-2 sm:mt-3 text-base"
                        />
                        <InputError message={errors.email} />
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                      >
                        <MerchantLabel htmlFor="password" className="text-sm sm:text-base font-semibold text-gray-200">
                          Password <span className="text-[#FF1493]">*</span>
                        </MerchantLabel>
                        <MerchantInput
                          id="password"
                          type="password"
                          required
                          autoComplete="new-password"
                          value={data.password}
                          onChange={(e) => setData('password', e.target.value)}
                          placeholder="Create a strong password"
                          className="mt-2 sm:mt-3 text-base"
                        />
                        <InputError message={errors.password} />
                        <p className="text-xs sm:text-sm text-gray-400 mt-2">
                          Must be at least 8 characters
                        </p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.45 }}
                      >
                        <MerchantLabel htmlFor="password_confirmation" className="text-sm sm:text-base font-semibold text-gray-200">
                          Confirm Password <span className="text-[#FF1493]">*</span>
                        </MerchantLabel>
                        <MerchantInput
                          id="password_confirmation"
                          type="password"
                          required
                          autoComplete="new-password"
                          value={data.password_confirmation}
                          onChange={(e) => setData('password_confirmation', e.target.value)}
                          placeholder="Confirm your password"
                          className="mt-2 sm:mt-3 text-base"
                        />
                        <InputError message={errors.password_confirmation} />
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.5 }}
                        className="pt-2 sm:pt-4"
                      >
                        <MerchantButton
                          type="submit"
                          size="lg"
                          className="w-full text-base sm:text-lg py-6 sm:py-7 shadow-2xl shadow-[#FF1493]/50 hover:shadow-[#FF1493]/70 transition-all duration-300"
                          disabled={processing}
                        >
                          {processing ? (
                            <>
                              <LoaderCircle className="w-5 h-5 mr-2 animate-spin" />
                              Creating Account...
                            </>
                          ) : (
                            <>
                              Create Account
                              <ArrowRight className="ml-2 w-5 h-5" />
                            </>
                          )}
                        </MerchantButton>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.55 }}
                        className="pt-4 sm:pt-6 border-t-2 border-[#FF1493]/30"
                      >
                        <p className="text-center text-sm sm:text-base text-gray-300">
                          Already have an account?{' '}
                          <Link
                            href={route('merchant.login')}
                            className="text-[#FF1493] hover:text-[#DC143C] font-semibold hover:underline transition-colors"
                          >
                            Sign in
                          </Link>
                        </p>
                      </motion.div>

                      <p className="text-xs sm:text-sm text-center text-gray-400 mt-4 sm:mt-6 leading-relaxed">
                        By creating an account, you agree to our Terms of Service and Privacy Policy
                      </p>
                    </form>
                  </MerchantCardContent>
                </MerchantCard>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <MerchantFooter />
      </div>
    </>
  )
}

