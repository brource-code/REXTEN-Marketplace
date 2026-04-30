import SwiftUI

struct PrimaryButton: View {
    @Environment(\.appTheme) private var theme
    let title: String
    var isLoading: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                if isLoading { ProgressView().tint(theme.buttonText) }
                Text(title)
                    .font(.headline.bold())
                    .foregroundStyle(theme.buttonText)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(theme.primary)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .disabled(isLoading)
    }
}
