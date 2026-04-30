import SwiftUI

/// Токены фирменной палитры REXTEN, синхронизированы с frontend/src/assets/styles/tailwind/index.css
struct AppTheme {
    let background: Color
    let backgroundSecondary: Color
    let card: Color
    let cardBorder: Color
    let text: Color
    let textSecondary: Color
    let textMuted: Color
    let primary: Color
    let primaryLight: Color
    let border: Color
    let success: Color
    let successLight: Color
    let error: Color
    let errorLight: Color
    let warning: Color
    let warningLight: Color
    let buttonText: Color

    static let light = AppTheme(
        background: Color(hex: 0xFFFFFF),
        backgroundSecondary: Color(hex: 0xF5F5F5),
        card: Color(hex: 0xFFFFFF),
        cardBorder: Color(hex: 0xE5E5E5),
        text: Color(hex: 0x111827),
        textSecondary: Color(hex: 0x6B7280),
        textMuted: Color(hex: 0xA3A3A3),
        primary: Color(hex: 0x2A85FF),
        primaryLight: Color(hex: 0x2A85FF, alpha: 0.12),
        border: Color(hex: 0xE5E5E5),
        success: Color(hex: 0x10B981),
        successLight: Color(hex: 0x10B981, alpha: 0.12),
        error: Color(hex: 0xFF6A55),
        errorLight: Color(hex: 0xFF6A55, alpha: 0.12),
        warning: Color(hex: 0xF59E0B),
        warningLight: Color(hex: 0xF59E0B, alpha: 0.12),
        buttonText: Color(hex: 0xFFFFFF)
    )

    static let dark = AppTheme(
        background: Color(hex: 0x0A0A0A),
        backgroundSecondary: Color(hex: 0x171717),
        card: Color(hex: 0x171717),
        cardBorder: Color(hex: 0x404040),
        text: Color(hex: 0xFAFAFA),
        textSecondary: Color(hex: 0xA3A3A3),
        textMuted: Color(hex: 0x737373),
        primary: Color(hex: 0x2A85FF),
        primaryLight: Color(red: 42 / 255, green: 133 / 255, blue: 1, opacity: 0.12),
        border: Color(hex: 0x404040),
        success: Color(hex: 0x10B981),
        successLight: Color(hex: 0x052E26),
        error: Color(hex: 0xFF6A55),
        errorLight: Color(hex: 0x451A1A),
        warning: Color(hex: 0xF59E0B),
        warningLight: Color(hex: 0x422006),
        buttonText: Color(hex: 0xFFFFFF)
    )
}

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >> 8) & 0xFF) / 255
        let b = Double(hex & 0xFF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: alpha)
    }
}

final class ThemeManager: ObservableObject {
    static let shared = ThemeManager()
    @Published var colorScheme: ColorScheme = .light

    var theme: AppTheme {
        colorScheme == .dark ? .dark : .light
    }

    func resolve(_ scheme: ColorScheme) {
        colorScheme = scheme
    }
}

struct ThemeEnvironmentKey: EnvironmentKey {
    static let defaultValue: AppTheme = .light
}

extension EnvironmentValues {
    var appTheme: AppTheme {
        get { self[ThemeEnvironmentKey.self] }
        set { self[ThemeEnvironmentKey.self] = newValue }
    }
}

struct AppThemeModifier: ViewModifier {
    @ObservedObject private var manager = ThemeManager.shared
    @Environment(\.colorScheme) private var systemScheme

    func body(content: Content) -> some View {
        content
            .onAppear { manager.resolve(systemScheme) }
            .onChange(of: systemScheme) { _, new in manager.resolve(new) }
            .environment(\.appTheme, manager.theme)
    }
}

extension View {
    func withAppTheme() -> some View {
        modifier(AppThemeModifier())
    }
}
