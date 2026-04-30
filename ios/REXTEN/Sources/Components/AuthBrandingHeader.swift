import SwiftUI

/// Шапка экранов входа/регистрации: фирменный логотип из `Assets` (`REXTENLogo`), заголовок и подзаголовок.
struct AuthBrandingHeader: View {
    @Environment(\.appTheme) private var theme
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Image("REXTENLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: 220, maxHeight: 48)
                    .accessibilityLabel("REXTEN Marketplace")
                Text("MARKETPLACE")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(theme.textMuted)
                    .tracking(1.4)
            }
            Text(title)
                .font(.title2.bold())
                .foregroundStyle(theme.text)
            Text(subtitle)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(theme.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
