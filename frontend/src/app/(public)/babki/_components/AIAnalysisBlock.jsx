'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { PiSparkle } from 'react-icons/pi'
import LaravelAxios from '@/services/axios/LaravelAxios'

export default function AIAnalysisBlock({ period, safeMinBalance, summary }) {
    const [analysis, setAnalysis] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleGetAnalysis = async () => {
        setLoading(true)
        setError(null)
        setAnalysis(null)

        try {
            // Используем Laravel API endpoint
            // Передаём summary с готовыми сценариями (ИИ не должен считать сам!)
            const response = await LaravelAxios.post('/family-budget/ai-report', {
                period,
                safeMinBalance,
                summary: {
                    startBalance: summary.startBalance,
                    endingBalance: summary.endingBalance,
                    balanceChange: summary.balanceChange,
                    totalIncome: summary.totalIncome,
                    totalExpense: summary.totalExpense,
                    totalFixed: summary.totalFixed,
                    totalFlexible: summary.totalFlexible,
                    daysNegative: summary.daysNegative || summary.negativeDays?.length || 0,
                    // Готовые сценарии (уже посчитаны!)
                    scenarios: summary.scenarios,
                },
                flexiblePayments: summary.flexiblePayments || [],
                fixedPayments: summary.fixedPayments || [],
                criticalPeriods: summary.criticalPeriods || [],
            })

            setAnalysis(response.data.analysis)
        } catch (err) {
            console.error('Error getting AI analysis:', err)
            const errorMessage = err.response?.data?.error || err.message || 'Не удалось получить анализ'
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <div className="p-4 md:p-4 space-y-3 md:space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <h4 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">
                        ИИ-анализ
                    </h4>
                    <Button
                        variant="solid"
                        size="sm"
                        icon={<PiSparkle />}
                        onClick={handleGetAnalysis}
                        loading={loading}
                        disabled={loading}
                        className="w-full sm:w-auto"
                    >
                        <span className="hidden sm:inline">Получить анализ</span>
                        <span className="sm:hidden">Анализ</span>
                    </Button>
                </div>

                {error && (
                    <div className="p-3 md:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="text-xs md:text-sm font-bold text-red-700 dark:text-red-400">
                            Ошибка: {error}
                        </div>
                    </div>
                )}

                {analysis && (
                    <div className="p-3 md:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <div className="text-xs md:text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                                {analysis}
                            </div>
                        </div>
                    </div>
                )}

                {!analysis && !error && !loading && (
                    <div className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 text-center py-3 md:py-4">
                        <span className="hidden sm:inline">Нажмите кнопку, чтобы получить анализ бюджета от ИИ</span>
                        <span className="sm:hidden">Нажмите кнопку для анализа</span>
                    </div>
                )}
            </div>
        </Card>
    )
}
