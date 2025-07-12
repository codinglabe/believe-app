import type React from "react"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { FormEventHandler } from 'react';
import { useState } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff, Mail, Lock, User, Heart, ArrowLeft, LoaderCircle } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Checkbox } from "@/components/frontend/ui/checkbox"
import { Link, useForm } from "@inertiajs/react"
import InputError from "@/components/input-error";
import { Icon } from '@iconify/react';

type RegisterForm = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  agreeToTerms: boolean;
  referralCode: string;
};

export default function UserRegisterPage({ referralCode }: { referralCode: string }) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  //   const [isSubmitting, setIsSubmitting] = useState(false)
  //   const [isSuccess, setIsSuccess] = useState(false)

  const { data, setData, post, processing, errors, reset } = useForm<Required<RegisterForm>>({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    agreeToTerms: false,
    referralCode: referralCode,
  });

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post(route('register'), {
      onFinish: () => reset('password', 'password_confirmation'),
    });
  };


  //   const handleInputChange = (field: string, value: string | boolean) => {
  //     setFormData((prev) => ({ ...prev, [field]: value }))
  //   }

  //   const handleSubmit = async (e: React.FormEvent) => {
  //     e.preventDefault()
  //     setIsSubmitting(true)

  //     // Simulate API call
  //     await new Promise((resolve) => setTimeout(resolve, 2000))

  //     setIsSubmitting(false)
  //     setIsSuccess(true)
  //   }

  //   if (isSuccess) {
  //     return (
  //       <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center py-12">
  //         <div className="container mx-auto px-4">
  //           <motion.div
  //             initial={{ opacity: 0, scale: 0.9 }}
  //             animate={{ opacity: 1, scale: 1 }}
  //             transition={{ duration: 0.6 }}
  //             className="max-w-md mx-auto"
  //           >
  //             <Card className="border-0 shadow-xl bg-white dark:bg-gray-800 text-center">
  //               <CardContent className="pt-8 pb-8">
  //                 <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
  //                   <CheckCircle className="h-8 w-8 text-green-600" />
  //                 </div>
  //                 <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Account Created Successfully!</h2>
  //                 <p className="text-gray-600 dark:text-gray-300 mb-6">
  //                   Welcome to CareConnect! We've sent a verification email to{" "}
  //                   <span className="font-medium text-blue-600">{formData.email}</span>
  //                 </p>
  //                 <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
  //                   <Send className="h-4 w-4 text-blue-600" />
  //                   <AlertDescription className="text-blue-700 dark:text-blue-400">
  //                     Please check your email and click the verification link to activate your account.
  //                   </AlertDescription>
  //                 </Alert>
  //                 <div className="space-y-3">
  //                   <Link href={route('login')}>
  //                     <Button className="w-full bg-blue-600 hover:bg-blue-700">Go to Sign In</Button>
  //                   </Link>
  //                   <Link href={route('home')}>
  //                     <Button variant="outline" className="w-full bg-transparent">
  //                       Continue Browsing
  //                     </Button>
  //                   </Link>
  //                 </div>
  //                 <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
  //                   Didn't receive the email?{" "}
  //                   <button className="text-blue-600 hover:underline">Resend verification</button>
  //                 </p>
  //               </CardContent>
  //             </Card>
  //           </motion.div>
  //         </div>
  //       </div>
  //     )
  //   }

  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-md mx-auto"
          >
            {/* Back Button */}
            <Link href={route("register", { ref: referralCode })} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to registration options
            </Link>

            {/* Logo */}
            <div className="text-center mb-8">
              <Link href={route('home')} className="inline-flex items-center space-x-2">
                <div className="bg-blue-600 p-3 rounded-xl">
                  <Heart className="h-8 w-8 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900">CareConnect</span>
              </Link>
            </div>

            <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-gray-900 dark:text-white">Create Your Account</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Join thousands of supporters making a difference worldwide
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={submit} className="space-y-4">

                  {referralCode && (
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Referral Code Applied
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        <div className="flex items-center justify-center">
                          <Icon icon="mdi:shield-check" className="h-4 w-4 text-green-600" />
                          <span className="font-bold text-green-600">{referralCode}</span>
                        </div>
                      </p>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="firstName" className="text-gray-900 dark:text-white">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        disabled={processing}
                        className="pl-10 h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        required
                      />
                      <InputError message={errors.name} className="mt-2" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-gray-900 dark:text-white">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        disabled={processing}
                        className="pl-10 h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        required
                      />
                      <InputError message={errors.email} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-gray-900 dark:text-white">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        disabled={processing}
                        className="pl-10 pr-10 h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                      <InputError message={errors.password} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="text-gray-900 dark:text-white">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        disabled={processing}
                        className="pl-10 pr-10 h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                      <InputError message={errors.password_confirmation} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="terms"
                        required
                        checked={data.agreeToTerms}
                        onCheckedChange={(checked) => setData("agreeToTerms", checked as boolean)}
                      />
                      <Label htmlFor="terms" className="text-sm text-gray-900 dark:text-white">
                        I agree to the{" "}
                        <Link href="/terms" className="text-blue-600 hover:underline">
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-blue-600 hover:underline">
                          Privacy Policy
                        </Link>
                      </Label>
                    </div>
                    {/* <div className="flex items-center space-x-2">
                    <Checkbox
                      id="newsletter"
                      checked={formData.subscribeNewsletter}
                      onCheckedChange={(checked) => handleInputChange("subscribeNewsletter", checked as boolean)}
                    />
                    <Label htmlFor="newsletter" className="text-sm text-gray-900 dark:text-white">
                      Subscribe to our newsletter for updates and impact stories
                    </Label>
                  </div> */}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>

                {/* <div className="relative">
                <Separator />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-white px-2 text-sm text-gray-500">Or sign up with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  variant="outline"
                  className="h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </Button>
              </div> */}

                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Already have an account?{" "}
                    <Link href={route('login')} className="text-blue-600 hover:underline font-medium">
                      Sign in
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </FrontendLayout>
  )
}
