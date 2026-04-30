import SwiftUI

struct TeamTabView: View {
    @Environment(\.appTheme) private var theme
    let team: [TeamMember]

    var body: some View {
        Group {
            if team.isEmpty {
                EmptyStateView(title: "Team", message: "No team members listed.", systemImage: "person.3")
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(team) { m in
                        HStack(spacing: 12) {
                            avatar(for: m)
                                .frame(width: 48, height: 48)
                                .clipShape(Circle())
                            VStack(alignment: .leading, spacing: 4) {
                                Text(m.name)
                                    .font(.subheadline.bold())
                                    .foregroundStyle(theme.text)
                                Text(m.role)
                                    .font(.caption.bold())
                                    .foregroundStyle(theme.textSecondary)
                                let bio = (m.description ?? m.bio)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                                if !bio.isEmpty {
                                    Text(bio)
                                        .font(.caption)
                                        .foregroundStyle(theme.textSecondary)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                                if let r = m.rating, r > 0 {
                                    RatingBadgeView(rating: r, reviewsCount: 0)
                                }
                            }
                            Spacer()
                        }
                        .padding()
                        .background(theme.card)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(theme.cardBorder, lineWidth: 1))
                    }
                }
                .padding()
            }
        }
    }

    @ViewBuilder
    private func avatar(for m: TeamMember) -> some View {
        let urlStr = m.avatarUrl ?? m.avatar
        if let url = ImageURL.absoluteURL(from: urlStr) {
            AsyncImage(url: url) { p in
                switch p {
                case .success(let i): i.resizable().scaledToFill()
                default: theme.backgroundSecondary
                }
            }
        } else {
            theme.backgroundSecondary
                .overlay(Text(String(m.name.prefix(1))).font(.headline.bold()).foregroundStyle(theme.primary))
        }
    }
}
