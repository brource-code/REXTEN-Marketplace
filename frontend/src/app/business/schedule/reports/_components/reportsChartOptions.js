import { COLOR_1, COLOR_2, COLOR_4, COLORS } from '@/constants/chart.constant'

/** Hex colors aligned with booking status palette (ScheduleEventContent) */
export const REPORT_STATUS_CHART_COLORS = {
    new: '#0ea5e9',
    pending: '#f59e0b',
    confirmed: '#f97316',
    completed: '#10b981',
    cancelled: '#fb7185',
}

export function statusKeyToChartColor(status) {
    const key = String(status || 'new').toLowerCase()
    return REPORT_STATUS_CHART_COLORS[key] || COLORS[0]
}

export function getReportsLineChartOptions({ color = COLOR_1, isDark = false } = {}) {
    const labelColor = isDark ? '#94a3b8' : '#64748b'
    const gridColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.2)'
    return {
        colors: [color],
        chart: {
            toolbar: { show: false },
            zoom: { enabled: false },
            fontFamily: 'inherit',
        },
        stroke: {
            width: 3,
            curve: 'smooth',
            lineCap: 'round',
        },
        markers: {
            size: 4,
            strokeWidth: 2,
            hover: { size: 7 },
        },
        grid: {
            borderColor: gridColor,
            strokeDashArray: 4,
            padding: { left: 8, right: 8 },
        },
        xaxis: {
            labels: {
                style: { colors: labelColor, fontWeight: 700, fontSize: '11px' },
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: {
                style: { colors: labelColor, fontWeight: 700, fontSize: '11px' },
            },
        },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            x: { show: true },
        },
        legend: { show: false },
        dataLabels: { enabled: false },
    }
}

export function getReportsAreaChartOptions({ color = COLOR_1, isDark = false } = {}) {
    const base = getReportsLineChartOptions({ color, isDark })
    return {
        ...base,
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: isDark ? 0.35 : 0.45,
                opacityTo: 0.02,
                stops: [0, 90, 100],
            },
        },
    }
}

export function getReportsBarChartOptions({ color = COLOR_4, isDark = false } = {}) {
    const labelColor = isDark ? '#94a3b8' : '#64748b'
    const gridColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.2)'
    return {
        colors: [color],
        chart: {
            toolbar: { show: false },
            zoom: { enabled: false },
            fontFamily: 'inherit',
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '52%',
                borderRadius: 8,
                borderRadiusApplication: 'end',
            },
        },
        grid: {
            borderColor: gridColor,
            strokeDashArray: 4,
            padding: { left: 8, right: 8 },
        },
        xaxis: {
            labels: {
                style: { colors: labelColor, fontWeight: 700, fontSize: '11px' },
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: {
                style: { colors: labelColor, fontWeight: 700, fontSize: '11px' },
            },
        },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
        },
        legend: { show: false },
        dataLabels: { enabled: false },
    }
}

export function getReportsDonutChartOptions({
    labels,
    statusKeys,
    isDark = false,
    totalCenterLabel = '',
} = {}) {
    const colors = (statusKeys || []).map((s) => statusKeyToChartColor(s))
    const labelColor = isDark ? '#94a3b8' : '#64748b'
    return {
        colors: colors.length ? colors : [...COLORS],
        labels: labels || [],
        chart: {
            fontFamily: 'inherit',
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '72%',
                    labels: {
                        show: true,
                        name: { show: true, color: labelColor, fontWeight: 600, fontSize: '12px' },
                        value: {
                            show: true,
                            fontWeight: 700,
                            fontSize: '22px',
                            color: isDark ? '#f1f5f9' : '#0f172a',
                        },
                        total: {
                            show: true,
                            showAlways: true,
                            label: totalCenterLabel,
                            color: labelColor,
                            fontSize: '11px',
                            fontWeight: 600,
                            formatter(w) {
                                return w.globals.seriesTotals.reduce((a, b) => a + b, 0)
                            },
                        },
                    },
                },
            },
        },
        stroke: { colors: [isDark ? '#1f2937' : '#ffffff'], width: 2 },
        dataLabels: { enabled: false },
        legend: {
            show: true,
            position: 'bottom',
            fontWeight: 700,
            fontSize: '12px',
            labels: { colors: labelColor },
            markers: { width: 10, height: 10, radius: 3 },
        },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            y: { formatter: (val) => `${val}` },
        },
    }
}

export function getReportsRevenueYAxisFormatter() {
    return (val) => {
        if (val == null || Number.isNaN(Number(val))) return ''
        const n = Number(val)
        if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
        if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
        return `$${Math.round(n)}`
    }
}
