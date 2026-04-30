import SwiftUI

/// Стилизованное поле поиска с иконкой — замена .roundedBorder TextField в каталоге.
struct REXSearchField: View {
    @Environment(\.appTheme) private var theme
    @Binding var text: String
    var placeholder: String = "Search"
    var onSubmit: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: REXLayout.Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(text.isEmpty ? theme.textMuted : theme.primary)
            TextField("", text: $text, prompt: Text(placeholder).foregroundStyle(theme.textMuted))
                .foregroundStyle(theme.text)
                .submitLabel(.search)
                .onSubmit { onSubmit?() }
            if !text.isEmpty {
                Button {
                    text = ""
                    onSubmit?()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(theme.textMuted)
                }
            }
        }
        .padding(.horizontal, REXLayout.Spacing.md)
        .padding(.vertical, 10)
        .background(theme.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: REXLayout.Radius.button))
        .overlay(
            RoundedRectangle(cornerRadius: REXLayout.Radius.button)
                .stroke(theme.border, lineWidth: 1)
        )
    }
}
