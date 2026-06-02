"use client"

import { FormEventHandler } from "react"
import { Head, useForm } from "@inertiajs/react"
import { ExternalLink, LoaderCircle, Lock, User } from "lucide-react"
import InputError from "@/components/input-error"
import { PageHead } from "@/components/frontend/PageHead"
import { BelieveInUnityBrandMark } from "@/components/site-title"

type LoginForm = {
  email: string
  password: string
  remember: boolean
}

interface DevLoginProps {
  seo?: { title: string; description?: string }
  status?: string | null
  devHost: string
  productionUrl: string
}

export default function DevLoginPage({ seo, status, devHost, productionUrl }: DevLoginProps) {
  const { data, setData, post, processing, errors, reset } = useForm<Required<LoginForm>>({
    email: "",
    password: "",
    remember: false,
  })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post("/login", {
      onFinish: () => reset("password"),
    })
  }

  const year = new Date().getFullYear()

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700 text-white">
      <PageHead
        title={seo?.title ?? "Developer Access"}
        description={seo?.description ?? "Sign in to the Believe In Unity development environment."}
      />
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Background — matches consumer login / site hero */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: "url(/images/believe-hero.png)" }}
        >
          <div className="absolute inset-0 bg-purple-900/70" />
        </div>
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute -left-32 top-1/4 h-[28rem] w-[28rem] rounded-full bg-purple-500/25 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-[24rem] w-[24rem] rounded-full bg-blue-500/20 blur-3xl" />
      </div>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex flex-col items-center gap-3">
            <BelieveInUnityBrandMark
              className="flex-col items-center gap-3 [&_img]:h-16 [&_img]:w-16 sm:[&_img]:h-20 sm:[&_img]:w-20"
              imageClassName="h-16 w-16 sm:h-20 sm:w-20 brightness-0 invert"
              wordmarkClassName="bg-gradient-to-r from-purple-100 to-blue-100 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl"
            />
            <p className="bg-gradient-to-r from-purple-200 to-blue-200 bg-clip-text text-sm font-medium tracking-wide text-transparent">
              {devHost}
            </p>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Developing For Purpose</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-purple-100/90 sm:text-base">
            Building technology that helps nonprofits serve more people.
          </p>

          {status && (
            <div className="mt-6 rounded-lg border border-blue-300/30 bg-white/10 px-4 py-3 text-sm text-blue-50">
              {status}
            </div>
          )}

          <form className="mt-8 space-y-4 text-left" onSubmit={submit}>
            <div>
              <label htmlFor="email" className="sr-only">
                Email Address
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-200/70" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder="Email Address"
                  value={data.email}
                  onChange={(e) => setData("email", e.target.value)}
                  className="h-12 w-full rounded-lg border border-white/20 bg-white/10 pl-11 pr-4 text-white placeholder:text-purple-100/50 outline-none backdrop-blur-sm transition focus:border-blue-300/60 focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
              <InputError message={errors.email} className="mt-1.5 text-red-200" />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-200/70" />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Password"
                  value={data.password}
                  onChange={(e) => setData("password", e.target.value)}
                  className="h-12 w-full rounded-lg border border-white/20 bg-white/10 pl-11 pr-4 text-white placeholder:text-purple-100/50 outline-none backdrop-blur-sm transition focus:border-blue-300/60 focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
              <InputError message={errors.password} className="mt-1.5 text-red-200" />
            </div>

            <button
              type="submit"
              disabled={processing}
              className="flex h-12 w-full items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-base font-semibold text-white shadow-lg transition hover:from-purple-700 hover:to-blue-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
            >
              {processing ? (
                <>
                  <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            <span className="text-xs uppercase tracking-wider text-purple-100/60">or</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </div>

          <a
            href={productionUrl}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-purple-200/40 bg-white/5 text-sm font-medium text-white backdrop-blur-sm transition hover:border-blue-200/50 hover:bg-white/10"
          >
            Go to Believe In Unity
            <ExternalLink className="h-4 w-4 text-blue-200/80" />
          </a>
        </div>
      </main>

      <footer className="relative z-10 pb-8 text-center text-xs text-purple-100/60">
        © {year} Believe In Unity | Developer Access Only
      </footer>
    </div>
  )
}
