import SwiftUI

/// Поле с подписью как FormItem на вебе (label + поле).
struct AuthLabeledField<Content: View>: View {
    @Environment(\.appTheme) private var theme
    let label: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(theme.textSecondary)
            content()
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(theme.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(theme.border, lineWidth: 1)
                )
        }
    }
}
