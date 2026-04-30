import SwiftUI

struct PortfolioTabView: View {
    @Environment(\.appTheme) private var theme
    let items: [PortfolioItem]

    private let cols = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        Group {
            if items.isEmpty {
                EmptyStateView(title: "Portfolio", message: "No portfolio items.", systemImage: "photo.on.rectangle")
            } else {
                LazyVGrid(columns: cols, spacing: 12) {
                    ForEach(items) { item in
                        VStack(alignment: .leading, spacing: 6) {
                            if let url = ImageURL.absoluteURL(from: item.imageUrl) {
                                AsyncImage(url: url) { p in
                                    switch p {
                                    case .success(let i):
                                        i.resizable().scaledToFill()
                                    default:
                                        theme.backgroundSecondary
                                    }
                                }
                                .frame(height: 120)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                            Text(item.title ?? "")
                                .font(.caption.bold())
                                .foregroundStyle(theme.text)
                                .lineLimit(2)
                        }
                        .padding(8)
                        .background(theme.card)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(theme.cardBorder, lineWidth: 1))
                    }
                }
                .padding()
            }
        }
    }
}
