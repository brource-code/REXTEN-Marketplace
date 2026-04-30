import SwiftUI

struct RatingBadgeView: View {
    @Environment(\.appTheme) private var theme
    let rating: Double
    let reviewsCount: Int

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "star.fill")
                .font(.caption2)
                .foregroundStyle(theme.warning)
            Text(String(format: "%.1f", rating))
                .font(.caption.bold())
                .foregroundStyle(theme.text)
            if reviewsCount > 0 {
                Text("(\(reviewsCount))")
                    .font(.caption.bold())
                    .foregroundStyle(theme.textSecondary)
            }
        }
    }
}
