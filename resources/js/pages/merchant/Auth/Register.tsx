import React, { FormEventHandler } from 'react'
import { Head, Link, useForm } from '@inertiajs/react'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantInput } from '@/components/merchant-ui'
import { MerchantLabel } from '@/components/merchant-ui'
import { MerchantCard, MerchantCardContent } from '@/components/merchant-ui'
import { MerchantHeader, MerchantFooter } from '@/components/merchant'
import InputError from '@/components/input-error'
import { LoaderCircle, Shield, Zap, BarChart3, Users, ArrowLeft } from 'lucide-react'
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
    { icon: <Zap className="w-5 h-5" />, text: 'Unlimited offers creation' },
    { icon: <BarChart3 className="w-5 h-5" />, text: 'Advanced analytics & reporting' },
    { icon: <Shield className="w-5 h-5" />, text: 'Secure QR code verification' },
    { icon: <Users className="w-5 h-5" />, text: 'Reach engaged supporters' },
  ]

  return (
    <>
      <Head title="Merchant Registration - Believe" />
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-pink-900 dark:from-black dark:via-gray-900 dark:to-pink-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 pointer-events-none"></div>
        
        {/* Header */}
        <MerchantHeader variant="public" className="relative z-50 bg-black/50 backdrop-blur" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8 sm:pb-12">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12"
            >
              {/* Left Side - Benefits & Info */}
              <div className="space-y-6">
                <div>
                  <Link href="/" className="inline-flex items-center gap-2 text-gray-300 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm">Back to home</span>
                  </Link>
                  
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                    Start Your Merchant Journey
                  </h1>
                  <p className="text-lg text-gray-300 mb-8">
                    Join thousands of merchants growing their business with Believe Points. Get started in minutes.
                  </p>
                </div>

                {/* Benefits List */}
                <MerchantCard>
                  <MerchantCardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">What's Included:</h3>
                    <div className="space-y-4">
                      {benefits.map((benefit, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#FF1493] via-[#DC143C] to-[#E97451] rounded-lg flex items-center justify-center text-white">
                            {benefit.icon}
                          </div>
                          <div className="flex-1 pt-2">
                            <p className="text-gray-200 text-sm sm:text-base">{benefit.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </MerchantCardContent>
                </MerchantCard>

                {/* Pricing Highlight */}
                <MerchantCard className="bg-gradient-to-r from-[#FF1493]/20 via-[#DC143C]/20 to-[#E97451]/20 border-2 border-[#FF1493]/30">
                  <MerchantCardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-300 mb-2">Starting at just</p>
                      <div className="flex items-baseline justify-center gap-2 mb-4">
                        <span className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] bg-clip-text text-transparent">
                          $9
                        </span>
                        <span className="text-lg text-gray-300">/month</span>
                      </div>
                      <p className="text-sm text-gray-300">
                        No credit card required • Cancel anytime
                      </p>
                    </div>
                  </MerchantCardContent>
                </MerchantCard>
              </div>

              {/* Right Side - Registration Form */}
              <div className="flex items-center">
                <MerchantCard className="w-full shadow-2xl">
                  <MerchantCardContent className="p-6 sm:p-8 lg:p-10">
                    <div className="mb-6">
                      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        Create Your Account
                      </h2>
                      <p className="text-gray-300 text-sm sm:text-base">
                        Fill in your details to get started
                      </p>
                    </div>

                    <form onSubmit={submit} className="space-y-5">
                      <div>
                        <MerchantLabel htmlFor="name" className="text-sm font-medium">
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
                          className="mt-2"
                        />
                        <InputError message={errors.name} />
                      </div>

                      <div>
                        <MerchantLabel htmlFor="email" className="text-sm font-medium">
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
                          className="mt-2"
                        />
                        <InputError message={errors.email} />
                      </div>

                      <div>
                        <MerchantLabel htmlFor="password" className="text-sm font-medium">
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
                          className="mt-2"
                        />
                        <InputError message={errors.password} />
                        <p className="text-xs text-gray-400 mt-1">
                          Must be at least 8 characters
                        </p>
                      </div>

                      <div>
                        <MerchantLabel htmlFor="password_confirmation" className="text-sm font-medium">
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
                          className="mt-2"
                        />
                        <InputError message={errors.password_confirmation} />
                      </div>

                      <div className="pt-4">
                        <MerchantButton
                          type="submit"
                          className="w-full text-base sm:text-lg py-6"
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
                              <ArrowLeft className="ml-2 w-5 h-5 rotate-180" />
                            </>
                          )}
                        </MerchantButton>
                      </div>

                      <div className="pt-4 border-t-2 border-[#FF1493]/30">
                        <p className="text-center text-sm text-gray-300">
                          Already have an account?{' '}
                          <Link
                            href={route('merchant.login')}
                            className="text-[#FF1493] hover:text-[#DC143C] font-semibold hover:underline transition-colors"
                          >
                            Sign in
                          </Link>
                        </p>
                      </div>

                      <p className="text-xs text-center text-gray-400 mt-4">
                        By creating an account, you agree to our Terms of Service and Privacy Policy
                      </p>
                    </form>
                  </MerchantCardContent>
                </MerchantCard>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  )
}

