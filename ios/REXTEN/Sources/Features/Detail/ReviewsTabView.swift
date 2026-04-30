import SwiftUI

struct ReviewsTabView: View {
    @Environment(\.appTheme) private var theme
    let reviews: [Review]

    var body: some View {
        Group {
            if reviews.isEmpty {
                EmptyStateView(title: "No reviews yet", message: "Be the first to book this business.", systemImage: "bubble.left")
            } else {
                LazyVStack(alignment: .leading, spacing: 12) {
                    ForEach(reviews) { r in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(r.displayName)
                                    .font(.subheadline.bold())
                                    .foregroundStyle(theme.text)
                                Spacer()
                                RatingBadgeView(rating: r.rating, reviewsCount: 0)
                            }
                            if let d = r.date {
                                Text(d)
                                    .font(.caption2.bold())
                                    .foregroundStyle(theme.textMuted)
                            }
                            Text(r.body)
                                .font(.caption.bold())
                                .foregroundStyle(theme.textSecondary)
                        }
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
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
