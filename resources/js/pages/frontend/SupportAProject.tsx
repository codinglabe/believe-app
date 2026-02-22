"use client";

/**
 * Support a Project — Choose how to participate: Give (Donation / FundMe) or Grow (Investment / Wefunder).
 */
import FrontendLayout from "@/layouts/frontend/frontend-layout";
import { PageHead } from "@/components/frontend/PageHead";
import { Link } from "@inertiajs/react";
import { motion } from "framer-motion";
import { Heart, TrendingUp, ArrowRight, Sparkles } from "lucide-react";

interface Props {
  seo?: { title: string; description?: string };
  fundMeUrl: string;
  investUrl: string;
  wefunderUrl: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function SupportAProjectPage({
  seo,
  fundMeUrl,
  investUrl,
  wefunderUrl,
}: Props) {
  return (
    <FrontendLayout>
      <PageHead
        title={seo?.title ?? "Support a Project"}
        description={seo?.description ?? "Choose how you'd like to participate: give a donation or invest and participate in project returns."}
      />

      {/* Background: subtle mesh + grid */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-indigo-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-sky-950/30" />
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] max-w-[800px] h-[400px] bg-sky-200/20 dark:bg-sky-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-[60%] max-w-[400px] h-[300px] bg-indigo-200/15 dark:bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <main className="relative min-h-screen">
        <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-5xl">
            {/* Header */}
            <motion.header
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12 sm:mb-16 lg:mb-20"
            >
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="inline-flex items-center gap-2 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 px-4 py-1.5 text-sm font-medium mb-6"
              >
                <Sparkles className="h-4 w-4" />
                Choose your path
              </motion.span>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-5xl lg:leading-tight">
                Support a Project
              </h1>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 sm:text-xl max-w-2xl mx-auto">
                Choose how you'd like to participate:
              </p>
            </motion.header>

            {/* Cards */}
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-8"
            >
              {/* Give (Donation) — FundMe */}
              <motion.div variants={item} className="min-h-[280px] sm:min-h-0">
                <Link
                  href={fundMeUrl}
                  className="group block h-full rounded-2xl sm:rounded-3xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-4 dark:focus-visible:ring-offset-gray-900"
                >
                  <div className="relative h-full min-h-[280px] sm:min-h-[320px] flex flex-col justify-between bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700 dark:from-orange-600 dark:via-orange-700 dark:to-amber-800 p-6 sm:p-8 lg:p-10 shadow-xl shadow-orange-500/20 dark:shadow-orange-900/30 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/25 hover:-translate-y-1 active:translate-y-0">
                    {/* Card shine overlay */}
                    <div className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent" />
                    <div className="relative">
                      <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-5 sm:mb-6">
                        <Heart className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Give</h2>
                      <p className="mt-1 text-white/90 text-sm sm:text-base font-medium">Donation</p>
                      <p className="mt-4 text-white/90 text-sm sm:text-base leading-relaxed max-w-sm">
                        Make a donation to support this mission.
                      </p>
                    </div>
                    <div className="relative mt-6 sm:mt-8">
                      <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-orange-700 shadow-lg shadow-orange-900/20 transition-all duration-200 group-hover:bg-white/95 group-hover:gap-3">
                        Believe FundMe
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* Grow (Investment) — Wefunder */}
              <motion.div variants={item} className="min-h-[280px] sm:min-h-0">
                <Link
                  href={investUrl}
                  className="group block h-full rounded-2xl sm:rounded-3xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-4 dark:focus-visible:ring-offset-gray-900"
                >
                  <div className="relative h-full min-h-[280px] sm:min-h-[320px] flex flex-col justify-between bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 dark:from-emerald-600 dark:via-green-700 dark:to-teal-800 p-6 sm:p-8 lg:p-10 shadow-xl shadow-emerald-500/20 dark:shadow-emerald-900/30 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/25 hover:-translate-y-1 active:translate-y-0">
                    <div className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent" />
                    <div className="relative">
                      <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-5 sm:mb-6">
                        <TrendingUp className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Grow</h2>
                      <p className="mt-1 text-white/90 text-sm sm:text-base font-medium">Investment</p>
                      <p className="mt-4 text-white/90 text-sm sm:text-base leading-relaxed max-w-sm">
                        Invest and participate in project returns through Wefunder.
                      </p>
                    </div>
                    <div className="relative mt-6 sm:mt-8">
                      <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-700 shadow-lg shadow-emerald-900/20 transition-all duration-200 group-hover:bg-white/95 group-hover:gap-3">
                        Wefunder
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            </motion.div>

            {/* Footer hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-10 sm:mt-12 text-center text-sm text-gray-500 dark:text-gray-400"
            >
              Both options help projects thrive. Choose what fits you best.
            </motion.p>
          </div>
        </section>
      </main>
    </FrontendLayout>
  );
}
