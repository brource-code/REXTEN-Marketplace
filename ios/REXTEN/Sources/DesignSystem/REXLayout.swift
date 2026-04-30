import SwiftUI

/// Константы spacing/radius/shadow, синхронизированные с rounded-xl/2xl и gap-* веба REXTEN.
enum REXLayout {
    enum Radius {
        static let xs: CGFloat = 6
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 20
        static let card: CGFloat = 16
        static let button: CGFloat = 12
        static let chip: CGFloat = 100
        static let avatar: CGFloat = 100
    }

    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 20
        static let xxl: CGFloat = 24
        static let xxxl: CGFloat = 32
        static let pagePadding: CGFloat = 16
    }

    enum Icon {
        static let sm: CGFloat = 16
        static let md: CGFloat = 20
        static let lg: CGFloat = 24
    }
}

// MARK: - Тень карточки

struct REXCardShadow: ViewModifier {
    @Environment(\.colorScheme) private var cs
    func body(content: Content) -> some View {
        content.shadow(
            color: cs == .dark ? .black.opacity(0.3) : .black.opacity(0.06),
            radius: 8, x: 0, y: 2
        )
    }
}

extension View {
    func rexCardShadow() -> some View {
        modifier(REXCardShadow())
    }
}
