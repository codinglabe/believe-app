"use client";

/**
 * Org-only: Support Community Projects — Choose project type (Donation vs Investment / Wefunder).
 * Matches the screenshot: Step 1 Choose/Create project, Step 2 Donation Project | Investment Project (Powered by Wefunder).
 */
import FrontendLayout from "@/layouts/frontend/frontend-layout";
import { PageHead } from "@/components/frontend/PageHead";
import { Button } from "@/components/frontend/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card";
import { Link } from "@inertiajs/react";
import { motion } from "framer-motion";
import { Heart, TrendingUp, Plus, Check } from "lucide-react";

interface Project {
  id: number;
  title: string;
  slug: string;
  status: string;
}

interface Props {
  seo?: { title: string; description?: string };
  wefunderUrl: string;
  fundraiseApplyUrl: string;
  projects: Project[];
  fundMeCreateUrl: string;
  fundMeIndexUrl: string;
}

export default function FundraiseCommunityProjectsPage({
  seo,
  wefunderUrl,
  fundraiseApplyUrl,
  projects = [],
  fundMeCreateUrl,
  fundMeIndexUrl,
}: Props) {
  return (
    <FrontendLayout>
      <PageHead
        title={seo?.title ?? "Support Community Projects"}
        description={seo?.description ?? "Create or choose a project and how your organization will support it."}
      />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-10"
          >
            <header className="text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Support Community Projects
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Create or choose a project and how your organization will support it.
              </p>
            </header>

            {/* Choose Project Type — Create and View on each card */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Choose Project Type</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Orange: Donation — Organizations can create FundMe + view donation projects */}
                <Card className="border-2 border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-800 overflow-hidden shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 mb-2">
                      <Heart className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-orange-700 dark:text-orange-400 text-xl">Donation Project</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-300">Projects seeking tax-deductible donations.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" /> Charitable contributions</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" /> No financial return</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" /> Organization rewards</li>
                    </ul>
                    <div className="flex flex-col gap-2">
                      <Link href={fundMeCreateUrl} className="block">
                        <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                          <Plus className="w-4 h-4 mr-2" />
                          Create New Project
                        </Button>
                      </Link>
                      <Link href={fundMeIndexUrl} className="block">
                        <Button variant="outline" className="w-full border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                          View Projects
                        </Button>
                      </Link>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <Link href={fundMeIndexUrl} className="text-orange-600 dark:text-orange-400 hover:underline">Where does it go?</Link>
                    </p>
                  </CardContent>
                </Card>
                {/* Green: Investment — Create (apply to raise) + View investment projects */}
                <Card className="border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 overflow-hidden shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-2">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-green-700 dark:text-green-400 text-xl">Investment Project</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-300">Projects seeking investment through crowdfunding.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" /> Potential financial upside</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" /> Risks involved (capital at risk)</li>
                      <li className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400"><Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" /> Powered by Wefunder</li>
                    </ul>
                    <div className="flex flex-col gap-2">
                      <Link href={fundraiseApplyUrl} className="block">
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Project
                        </Button>
                      </Link>
                      <a href={wefunderUrl} target="_blank" rel="noopener noreferrer" className="block">
                        <Button variant="outline" className="w-full border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20">
                          View Projects
                        </Button>
                      </a>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <a href={wefunderUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 dark:text-green-400 hover:underline">What will we invest in?</a>
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <div className="text-center space-y-1 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-300">Projects are either donation-based or investment-based.</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Organization accounts only — supporters cannot participate.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </FrontendLayout>
  );
}
