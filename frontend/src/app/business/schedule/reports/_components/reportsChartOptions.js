import { COLOR_1, COLOR_2, COLOR_4, COLORS } from '@/constants/chart.constant'

/** Hex colors aligned with booking status palette (ScheduleEventContent) */
export const REPORT_STATUS_CHART_COLORS = {
    new: '#114fee',
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
    const muted = isDark ? '#94a3b8' : '#64748b'
    const centerTitle = isDark ? '#cbd5e1' : '#475569'
    const centerValue = isDark ? '#f8fafc' : '#0f172a'
    /** Зазор между сегментами — как фон карточки отчёта */
    const gapStroke = isDark ? 'rgba(30,41,59,0.92)' : 'rgba(249,250,251,0.95)'

    return {
        colors: colors.length ? colors : [...COLORS],
        labels: labels || [],
        chart: {
            fontFamily: 'inherit',
            foreColor: muted,
            dropShadow: {
                enabled: true,
                top: 1,
                left: 0,
                blur: 6,
                opacity: isDark ? 0.35 : 0.12,
                color: '#000000',
            },
        },
        plotOptions: {
            pie: {
                expandOnClick: false,
                offsetY: 2,
                donut: {
                    size: '62%',
                    labels: {
                        show: true,
                        /** В режиме total Apex рисует подпись (total.label) и число отдельно; у подписи размер total.fontSize. */
                        name: {
                            show: true,
                            color: centerTitle,
                            fontWeight: 600,
                            offsetY: isDark ? 2 : 0,
                        },
                        value: {
                            show: true,
                            fontWeight: 700,
                            fontSize: '17px',
                            color: centerValue,
                            offsetY: 8,
                        },
                        total: {
                            show: true,
                            showAlways: true,
                            label: totalCenterLabel,
                            color: centerTitle,
                            fontSize: '10px',
                            fontWeight: 600,
                            formatter(w) {
                                return w.globals.seriesTotals.reduce((a, b) => a + b, 0)
                            },
                        },
                    },
                },
            },
        },
        stroke: {
            show: true,
            width: 3,
            lineCap: 'round',
            colors: [gapStroke],
        },
        dataLabels: { enabled: false },
        states: {
            hover: { filter: { type: 'lighten', value: 0.08 } },
            active: { filter: { type: 'none', value: 0 } },
        },
        legend: {
            show: true,
            position: 'right',
            horizontalAlign: 'center',
            floating: true,
            offsetX: isDark ? -4 : -6,
            offsetY: 0,
            fontWeight: 600,
            fontSize: '11px',
            labels: { colors: muted },
            markers: {
                width: 9,
                height: 9,
                radius: 3,
                offsetX: -2,
                offsetY: 0,
            },
            itemMargin: { vertical: 5 },
        },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            y: { formatter: (val) => `${val}` },
        },
        responsive: [
            {
                breakpoint: 640,
                options: {
                    chart: { dropShadow: { enabled: false } },
                    legend: {
                        position: 'bottom',
                        floating: false,
                        offsetX: 0,
                        horizontalAlign: 'center',
                        fontSize: '11px',
                    },
                    plotOptions: {
                        pie: {
                            offsetY: 0,
                            donut: { size: '58%' },
                        },
                    },
                },
            },
        ],
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
