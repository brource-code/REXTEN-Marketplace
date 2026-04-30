import SwiftUI

struct EmptyStateView: View {
    @Environment(\.appTheme) private var theme
    let title: String
    let message: String
    var systemImage: String = "tray"

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 44))
                .foregroundStyle(theme.textMuted)
            Text(title)
                .font(.title3.bold())
                .foregroundStyle(theme.text)
            Text(message)
                .font(.subheadline.bold())
                .foregroundStyle(theme.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(32)
    }
}
