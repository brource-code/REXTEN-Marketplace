import SwiftUI

/// Бейдж статуса бронирования — улучшенная версия StatusBadgeView.
struct REXStatusBadge: View {
    @Environment(\.appTheme) private var theme
    let status: String

    private var config: (label: String, fg: Color, bg: Color) {
        switch status.lowercased() {
        case "confirmed":       return ("Confirmed",  theme.success,  theme.successLight)
        case "pending":         return ("Pending",    theme.warning,  theme.warningLight)
        case "cancelled":       return ("Cancelled",  theme.error,    theme.errorLight)
        case "completed":       return ("Completed",  theme.primary,  theme.primaryLight)
        case "no_show", "no-show": return ("No-show", theme.textMuted, theme.backgroundSecondary)
        default:                return (status.capitalized, theme.textSecondary, theme.backgroundSecondary)
        }
    }

    var body: some View {
        let c = config
        Text(c.label)
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(c.fg)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(c.bg)
            .clipShape(Capsule())
    }
}
