import React, { FormEventHandler } from 'react'
import { Head, Link, useForm } from '@inertiajs/react'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantInput } from '@/components/merchant-ui'
import { MerchantLabel } from '@/components/merchant-ui'
import { MerchantCard, MerchantCardContent } from '@/components/merchant-ui'
import InputError from '@/components/input-error'
import { LoaderCircle, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { MerchantHeader } from '@/components/merchant'

interface ForgotPasswordProps {
  status?: string
}

export default function MerchantForgotPassword({ status }: ForgotPasswordProps) {
  const { data, setData, post, processing, errors } = useForm({
    email: '',
  })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route('merchant.password.email'))
  }

  return (
    <>
      <Head title={`Forgot Password - ${import.meta.env.VITE_APP_NAME || 'Believe'} Merchant`} />
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-pink-900 dark:from-black dark:via-gray-900 dark:to-pink-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 pointer-events-none"></div>
        <MerchantHeader variant="public" />
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
              Forgot Password?
            </h1>
            <p className="text-gray-300">
              No worries, we'll send you reset instructions
            </p>
          </div>

          {/* Status Message */}
          {status && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
              {status}
            </div>
          )}

          {/* Form */}
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

                <MerchantButton
                  type="submit"
                  className="w-full"
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </MerchantButton>
              </form>
            </MerchantCardContent>
          </MerchantCard>

          <div className="mt-6 text-center">
            <Link
              href={route('merchant.login')}
              className="text-sm text-[#FF1493] hover:text-[#DC143C] hover:underline flex items-center justify-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </motion.div>
        </div>
      </div>
    </>
  )
}

