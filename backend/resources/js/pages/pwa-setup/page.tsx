"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, AlertCircle, Download, Smartphone, Zap } from "lucide-react"

export default function PWASetupPage() {
  const [activeTab, setActiveTab] = useState<"android" | "ios" | "desktop">("android")

  const tabs = [
    { id: "android", label: "Android", icon: "🤖" },
    { id: "ios", label: "iOS", icon: "🍎" },
    { id: "desktop", label: "Desktop", icon: "💻" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">PWA ইনস্টলেশন গাইড</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">আপনার ডিভাইসে অ্যাপ ইনস্টল করুন</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-blue-500" />
                দ্রুত অ্যাক্সেস
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-400">
              হোম স্ক্রিনে শর্টকাট যোগ করুন এবং তাৎক্ষণিক অ্যাক্সেস পান
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                অফলাইন মোড
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-400">
              ইন্টারনেট ছাড়াই অ্যাপ ব্যবহার করুন এবং সিঙ্ক করুন
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-green-500" />
                নেটিভ অভিজ্ঞতা
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-400">
              নেটিভ অ্যাপের মতো অভিজ্ঞতা পান ব্রাউজার ছাড়াই
            </CardContent>
          </Card>
        </div>

        {/* Installation Instructions */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>ইনস্টলেশন নির্দেশাবলী</CardTitle>
            <CardDescription>আপনার ডিভাইস অনুযায়ী নির্বাচন করুন</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === tab.id
                      ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Android Instructions */}
            {activeTab === "android" && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Chrome ব্রাউজার</h3>
                  <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">1.</span>
                      <span>এই সাইটটি Chrome এ খুলুন</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">2.</span>
                      <span>উপরের ডানদিকে তিন ডট মেনু ক্লিক করুন</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">3.</span>
                      <span>"অ্যাপ ইনস্টল করুন" বা "হোম স্ক্রিনে যোগ করুন" নির্বাচন করুন</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">4.</span>
                      <span>নিশ্চিত করুন এবং হোম স্ক্রিনে অ্যাপটি খুঁজুন</span>
                    </li>
                  </ol>
                </div>

                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3">Firefox ব্রাউজার</h3>
                  <ol className="space-y-2 text-sm text-green-800 dark:text-green-200">
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">1.</span>
                      <span>Firefox এ সাইটটি খুলুন</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">2.</span>
                      <span>উপরের ডানদিকে তিন লাইন মেনু ক্লিক করুন</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">3.</span>
                      <span>"হোম স্ক্রিনে যোগ করুন" নির্বাচন করুন</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">4.</span>
                      <span>নিশ্চিত করুন এবং হোম স্ক্রিনে অ্যাপটি খুঁজুন</span>
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* iOS Instructions */}
            {activeTab === "ios" && (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-950 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Safari ব্রাউজার</h3>
                  <ol className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">1.</span>
                      <span>Safari এ এই সাইটটি খুলুন</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">2.</span>
                      <span>নীচের শেয়ার বাটন (বক্স থেকে তীর) ট্যাপ করুন</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">3.</span>
                      <span>"হোম স্ক্রিনে যোগ করুন" নির্বাচন করুন</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">4.</span>
                      <span>অ্যাপের নাম নিশ্চিত করুন এবং যোগ করুন</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">5.</span>
                      <span>হোম স্ক্রিনে অ্যাপটি খুঁজুন এবং খুলুন</span>
                    </li>
                  </ol>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <p className="font-semibold mb-1">নোট:</p>
                      <p>iOS এ সম্পূর্ণ PWA সমর্থন সীমিত। অ্যাপটি হোম স্ক্রিন শর্টকাট হিসাবে কাজ করবে।</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Instructions */}
            {activeTab === "desktop" && (
              <div className="space-y-4">
                <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">Chrome/Edge ব্রাউজার</h3>
                  <ol className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">1.</span>
                      <span>ব্রাউজারে সাইটটি খুলুন</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">2.</span>
                      <span>ঠিকানা বারের ডানদিকে ইনস্টল আইকন খুঁজুন</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">3.</span>
                      <span>ইনস্টল আইকন ক্লিক করুন</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">4.</span>
                      <span>নিশ্চিত করুন এবং অ্যাপটি খুলবে</span>
                    </li>
                  </ol>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-950 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-3">Firefox ব্রাউজার</h3>
                  <ol className="space-y-2 text-sm text-indigo-800 dark:text-indigo-200">
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">1.</span>
                      <span>Firefox এ সাইটটি খুলুন</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">2.</span>
                      <span>ঠিকানা বারের ডানদিকে ইনস্টল আইকন খুঁজুন</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">3.</span>
                      <span>ইনস্টল আইকন ক্লিক করুন</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold flex-shrink-0">4.</span>
                      <span>নিশ্চিত করুন এবং অ্যাপটি খুলবে</span>
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features After Installation */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>ইনস্টলেশনের পরে কী পাবেন</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">পুশ নোটিফিকেশন</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  রিয়েল-টাইম নোটিফিকেশন পান এমনকি অ্যাপ বন্ধ থাকলেও
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">অফলাইন অ্যাক্সেস</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">ইন্টারনেট ছাড়াই অ্যাপ ব্যবহার করুন</p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">দ্রুত লোডিং</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">ক্যাশ করা কন্টেন্ট থেকে তাৎক্ষণিক লোডিং</p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">স্বয়ংক্রিয় আপডেট</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">নতুন সংস্করণ উপলব্ধ হলে স্বয়ংক্রিয় আপডেট</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle>সমস্যা সমাধান</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-2">ইনস্টল বাটন দেখা যাচ্ছে না?</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                নিশ্চিত করুন যে আপনি HTTPS ব্যবহার করছেন এবং ব্রাউজার PWA সমর্থন করে। পেজ রিফ্রেশ করুন এবং আবার চেষ্টা করুন।
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-2">নোটিফিকেশন পাচ্ছি না?</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                ব্রাউজার সেটিংসে নোটিফিকেশন অনুমতি দিয়েছেন কিনা চেক করুন। ডিভাইস সেটিংসে নোটিফিকেশন সক্ষম আছে কিনা দেখুন।
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-2">অফলাইন মোড কাজ করছে না?</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                প্রথমে অনলাইনে অ্যাপটি ব্যবহার করুন যাতে কন্টেন্ট ক্যাশ হয়। তারপর অফলাইনে চেষ্টা করুন।
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
