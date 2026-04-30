import SwiftUI

/// Горизонтальный скролл плиток категорий с иконками (как на главном экране).
struct CategoryIconsView: View {
    @Environment(\.appTheme) private var theme
    @Binding var selectedCategoryId: String
    let categories: [Category]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                categoryTile(id: "all", name: "All", icon: "square.grid.2x2.fill")
                ForEach(categories) { cat in
                    categoryTile(id: cat.id, name: cat.name, icon: iconName(for: cat.name))
                }
            }
            .padding(.horizontal, REXLayout.Spacing.pagePadding)
            .padding(.vertical, REXLayout.Spacing.xs)
        }
        .padding(.horizontal, -REXLayout.Spacing.pagePadding)
    }

    private func categoryTile(id: String, name: String, icon: String) -> some View {
        let selected = selectedCategoryId == id
        return Button {
            selectedCategoryId = id
        } label: {
            VStack(spacing: 8) {
                ZStack {
                    RoundedRectangle(cornerRadius: 14)
                        .fill(selected ? theme.primary.opacity(0.12) : theme.backgroundSecondary)
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(selected ? theme.primary : theme.border, lineWidth: selected ? 1.5 : 1)
                        )
                        .frame(width: 60, height: 60)
                    Image(systemName: icon)
                        .font(.system(size: 22, weight: .medium))
                        .foregroundStyle(selected ? theme.primary : theme.textSecondary)
                }
                Text(name)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(selected ? theme.primary : theme.textSecondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .frame(width: 68)
            }
        }
        .buttonStyle(.plain)
    }

    private func iconName(for categoryName: String) -> String {
        let n = categoryName.lowercased()
        if n.contains("clean") || n.contains("клинин") { return "sparkles" }
        if n.contains("hvac") || n.contains("heat") || n.contains("cool") || n.contains("air") || n.contains("вентил") { return "snowflake" }
        if n.contains("beaut") || n.contains("salon") || n.contains("красот") || n.contains("hair") || n.contains("nail") { return "scissors" }
        if n.contains("auto") || n.contains("car") || n.contains("auto") || n.contains("автосер") { return "car.fill" }
        if n.contains("plumb") || n.contains("санте") { return "wrench.adjustable.fill" }
        if n.contains("electr") || n.contains("электр") { return "bolt.fill" }
        if n.contains("landscap") || n.contains("garden") || n.contains("ландш") || n.contains("газон") { return "leaf.fill" }
        if n.contains("health") || n.contains("medic") || n.contains("здоров") { return "heart.fill" }
        if n.contains("fit") || n.contains("sport") || n.contains("спорт") { return "figure.run" }
        if n.contains("pet") || n.contains("dog") || n.contains("питом") { return "pawprint.fill" }
        if n.contains("tech") || n.contains("it ") || n.contains("компьютер") { return "desktopcomputer" }
        if n.contains("tutoring") || n.contains("educat") || n.contains("обучен") { return "book.fill" }
        if n.contains("mov") || n.contains("перевоз") { return "shippingbox.fill" }
        if n.contains("photo") || n.contains("фото") { return "camera.fill" }
        if n.contains("event") || n.contains("мероприятие") { return "gift.fill" }
        return "tag.fill"
    }
}
