import SwiftUI

/// Кнопка «Google» как на вебе: светлая плашка, рамка, логотип слева.
struct GoogleSignInButton: View {
    @Environment(\.appTheme) private var theme
    let title: String
    var isLoading: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if isLoading {
                    ProgressView()
                        .tint(theme.text)
                } else {
                    Image("GoogleLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 25, height: 25)
                }
                Text(title)
                    .font(.headline.bold())
                    .foregroundStyle(theme.text)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity)
            .background(theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(theme.border, lineWidth: 1)
            )
        }
        .disabled(isLoading)
    }
}
