import SwiftUI

/// Универсальная карточка с фирменными border/radius/shadow.
struct REXCard<Content: View>: View {
    @Environment(\.appTheme) private var theme
    let content: Content
    var padding: CGFloat = REXLayout.Spacing.md

    init(padding: CGFloat = REXLayout.Spacing.md, @ViewBuilder content: () -> Content) {
        self.padding = padding
        self.content = content()
    }

    var body: some View {
        content
            .padding(padding)
            .background(theme.card)
            .clipShape(RoundedRectangle(cornerRadius: REXLayout.Radius.card))
            .overlay(
                RoundedRectangle(cornerRadius: REXLayout.Radius.card)
                    .stroke(theme.cardBorder, lineWidth: 1)
            )
            .rexCardShadow()
    }
}

/// Строка меню (профиль, настройки).
struct REXMenuRow: View {
    @Environment(\.appTheme) private var theme
    let title: String
    let systemImage: String
    var iconColor: Color? = nil
    var destructive: Bool = false

    var body: some View {
        HStack(spacing: REXLayout.Spacing.md) {
            Image(systemName: systemImage)
                .font(.system(size: REXLayout.Icon.md, weight: .semibold))
                .foregroundStyle(destructive ? theme.error : (iconColor ?? theme.primary))
                .frame(width: 32, height: 32)
                .background((destructive ? theme.errorLight : theme.primaryLight).opacity(0.7))
                .clipShape(RoundedRectangle(cornerRadius: REXLayout.Radius.sm))
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(destructive ? theme.error : theme.text)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption.weight(.bold))
                .foregroundStyle(theme.textMuted)
        }
        .padding(.horizontal, REXLayout.Spacing.lg)
        .padding(.vertical, REXLayout.Spacing.md)
        .background(theme.card)
        .clipShape(RoundedRectangle(cornerRadius: REXLayout.Radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: REXLayout.Radius.card)
                .stroke(theme.cardBorder, lineWidth: 1)
        )
    }
}

/// Секция с заголовком внутри ScrollView/VStack.
struct REXSection<Content: View>: View {
    @Environment(\.appTheme) private var theme
    let title: String
    var subtitle: String? = nil
    let content: Content

    init(_ title: String, subtitle: String? = nil, @ViewBuilder content: () -> Content) {
        self.title = title
        self.subtitle = subtitle
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: REXLayout.Spacing.sm) {
            HStack(alignment: .firstTextBaseline, spacing: REXLayout.Spacing.xs) {
                Text(title)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(theme.text)
                if let sub = subtitle {
                    Text(sub)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(theme.textMuted)
                }
            }
            content
        }
    }
}
