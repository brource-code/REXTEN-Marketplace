import SwiftUI

struct StatusBadgeView: View {
    @Environment(\.appTheme) private var theme
    let status: String

    private var color: Color {
        switch status.lowercased() {
        case "confirmed": return theme.success
        case "completed": return theme.primary
        case "cancelled": return theme.error
        default: return theme.warning
        }
    }

    var body: some View {
        Text(status.capitalized)
            .font(.caption2.bold())
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.15))
            .clipShape(Capsule())
    }
}
