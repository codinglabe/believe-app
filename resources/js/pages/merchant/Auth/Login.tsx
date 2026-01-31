import React, { FormEventHandler } from 'react'
import { Head, Link, useForm } from '@inertiajs/react'
import InputError from '@/components/input-error'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantInput } from '@/components/merchant-ui'
import { MerchantLabel } from '@/components/merchant-ui'
import { MerchantCard, MerchantCardContent } from '@/components/merchant-ui'
import { Checkbox } from '@/components/ui/checkbox'
import { LoaderCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { MerchantHeader, MerchantFooter } from '@/components/merchant'

interface LoginProps {
  status?: string
  canResetPassword: boolean
}

export default function MerchantLogin({ status, canResetPassword }: LoginProps) {
  const { data, setData, post, processing, errors, reset } = useForm({
    email: '',
    password: '',
    remember: false,
  })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route('merchant.login'), {
      onFinish: () => reset('password'),
    })
  }

  return (
    <>
      <Head title="Merchant Login - Believe" />
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-pink-900 dark:from-black dark:via-gray-900 dark:to-pink-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 pointer-events-none"></div>
        <MerchantHeader variant="public" className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur" />
        <div className="flex items-center justify-center min-h-screen pt-24 pb-8 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md relative z-10"
          >
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <img 
                src="/merchant/merchant.png" 
                alt={`${import.meta.env.VITE_APP_NAME || 'Believe'} Merchant`} 
                className="w-12 h-12 object-contain"
              />
              <span className="text-2xl font-bold text-white">
                {import.meta.env.VITE_APP_NAME || 'Believe'} Merchant
              </span>
            </Link>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-300">
              Sign in to your merchant account
            </p>
          </div>

          {/* Status Message */}
          {status && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
              {status}
            </div>
          )}

          {/* Login Form */}
          <MerchantCard className="shadow-2xl">
            <MerchantCardContent className="p-8">
              <form onSubmit={submit} className="space-y-6">
                <div>
                  <MerchantLabel htmlFor="email">Email address</MerchantLabel>
                  <MerchantInput
                    id="email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    placeholder="merchant@example.com"
                    className="mt-1"
                  />
                  <InputError message={errors.email} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <MerchantLabel htmlFor="password">Password</MerchantLabel>
                    {canResetPassword && (
                      <Link
                        href={route('merchant.password.request')}
                        className="text-sm text-[#FF1493] hover:text-[#DC143C] hover:underline transition-colors"
                      >
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  <MerchantInput
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    placeholder="Enter your password"
                    className="mt-1"
                  />
                  <InputError message={errors.password} />
                </div>

                <div className="flex items-center">
                  <Checkbox
                    id="remember"
                    checked={data.remember}
                    onCheckedChange={(checked) => setData('remember', checked as boolean)}
                  />
                  <MerchantLabel htmlFor="remember" className="ml-2 text-sm">
                    Remember me
                  </MerchantLabel>
                </div>

                <MerchantButton
                  type="submit"
                  className="w-full"
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </MerchantButton>
              </form>
            </MerchantCardContent>
          </MerchantCard>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-300">
              Don't have an account?{' '}
              <Link
                href={route('merchant.register')}
                className="text-[#FF1493] hover:text-[#DC143C] font-semibold hover:underline transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </motion.div>
        </div>

        {/* Footer */}
        <MerchantFooter />
      </div>
    </>
  )
}

