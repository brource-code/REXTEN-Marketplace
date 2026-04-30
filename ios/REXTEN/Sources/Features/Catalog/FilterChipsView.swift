import SwiftUI

struct FilterChipsView: View {
    @Environment(\.appTheme) private var theme
    @Binding var selectedCategoryId: String
    let categories: [Category]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: REXLayout.Spacing.sm) {
                chip("all", label: "All")
                ForEach(categories) { cat in
                    chip(cat.id, label: cat.name)
                }
            }
            .padding(.horizontal, REXLayout.Spacing.xs)
            .padding(.vertical, REXLayout.Spacing.xs)
        }
    }

    private func chip(_ id: String, label: String) -> some View {
        let on = selectedCategoryId == id
        return Button { selectedCategoryId = id } label: {
            Text(label)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(on ? theme.buttonText : theme.textSecondary)
                .padding(.horizontal, 14)
                .padding(.vertical, REXLayout.Spacing.sm)
                .background(on ? theme.primary : theme.backgroundSecondary)
                .clipShape(Capsule())
                .overlay(
                    Capsule().stroke(on ? theme.primary : theme.border, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}
