import SwiftUI

/// Список позиций прайса — блок «Доступные услуги» как в `ServiceDetailsScreen.tsx` / вкладка Services на вебе.
struct ServicesListTabView: View {
    @Environment(\.appTheme) private var theme
    let items: [ServiceItem]

    var body: some View {
        Group {
            if items.isEmpty {
                EmptyStateView(
                    title: "No services",
                    message: "This listing has no priced services yet.",
                    systemImage: "list.bullet.rectangle"
                )
            } else {
                LazyVStack(alignment: .leading, spacing: 0) {
                    ForEach(items) { item in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(alignment: .top) {
                                Text(item.name)
                                    .font(.body.weight(.semibold))
                                    .foregroundStyle(theme.text)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                if let price = item.price, !price.isEmpty {
                                    Text(price)
                                        .font(.body.weight(.semibold))
                                        .foregroundStyle(theme.text)
                                }
                            }
                            if let d = item.description, !d.isEmpty {
                                Text(d)
                                    .font(.subheadline)
                                    .foregroundStyle(theme.textSecondary)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            if let dur = item.duration, !dur.isEmpty {
                                HStack(spacing: 6) {
                                    Image(systemName: "clock")
                                        .font(.caption)
                                        .foregroundStyle(theme.textMuted)
                                    Text(dur)
                                        .font(.caption.bold())
                                        .foregroundStyle(theme.textSecondary)
                                }
                            }
                        }
                        .padding(.vertical, 16)
                        Divider().background(theme.cardBorder)
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 24)
            }
        }
    }
}
