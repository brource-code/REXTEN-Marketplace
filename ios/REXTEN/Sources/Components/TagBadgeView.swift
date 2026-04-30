import SwiftUI

struct TagBadgeView: View {
    @Environment(\.appTheme) private var theme
    let text: String

    var body: some View {
        Text(text)
            .font(.caption2.bold())
            .foregroundStyle(theme.textSecondary)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(theme.backgroundSecondary)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(theme.cardBorder, lineWidth: 1))
    }
}
