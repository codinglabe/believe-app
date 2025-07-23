import React from 'react'
import { Card, CardContent } from '../ui/card'
import { Activity, BarChart3, CheckCircle, DollarSign, Target, TrendingUp, Users } from 'lucide-react'
interface Statistics {
    total_target_amount: number
    total_sold_amount: number
    remaining_amount: number
    progress_percentage: number
    total_projects: number
    total_investors: number
}
interface StatisticProps{
    statistics:Statistics
}
export default function NodebossStatistic({ statistics }: StatisticProps) {
    return (
        <>
            {/* Statistics Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-in slide-in-from-bottom duration-700">
                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Target</p>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                                    ${statistics.total_target_amount.toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 bg-green-500 rounded-full">
                                <Target className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <div className="mt-4 h-2 w-full bg-green-200 dark:bg-green-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 rounded-full transition-all duration-1000"
                                style={{ width: `${statistics.progress_percentage}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                            {statistics.progress_percentage.toFixed(1)}% funded
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Raised</p>
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                    ${statistics.total_sold_amount.toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 bg-blue-500 rounded-full">
                                <DollarSign className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                            <span className="text-xs text-blue-600 dark:text-blue-400">
                                ${statistics.remaining_amount.toLocaleString()} remaining
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Active Projects</p>
                                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                                    {statistics.total_projects}
                                </p>
                            </div>
                            <div className="p-3 bg-purple-500 rounded-full">
                                <BarChart3 className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-purple-600" />
                            <span className="text-xs text-purple-600 dark:text-purple-400">All projects active</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Total Investors</p>
                                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                                    {statistics.total_investors}
                                </p>
                            </div>
                            <div className="p-3 bg-orange-500 rounded-full">
                                <Users className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-orange-600" />
                            <span className="text-xs text-orange-600 dark:text-orange-400">Active community</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    )
}
