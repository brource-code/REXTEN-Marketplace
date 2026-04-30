import SwiftUI

private enum MarketplaceDetailTab: Int, CaseIterable {
    case about
    case services
    case reviews
    case team
    case portfolio

    func title(for profile: ServiceProfile) -> String {
        switch self {
        case .about: return "About"
        case .services: return "Services"
        case .reviews: return "Reviews (\(profile.reviews.count))"
        case .team: return "Team (\(profile.team.count))"
        case .portfolio: return "Portfolio (\(profile.portfolio.count))"
        }
    }
}

struct ServiceDetailView: View {
    @Environment(\.appTheme) private var theme
    @Environment(\.colorScheme) private var colorScheme
    @EnvironmentObject private var auth: AuthManager
    @StateObject private var model: ServiceDetailViewModel
    @State private var tab: MarketplaceDetailTab = .about

    init(slug: String) {
        _model = StateObject(wrappedValue: ServiceDetailViewModel(slug: slug))
    }

    var body: some View {
        Group {
            if model.isLoading && model.profile == nil {
                VStack { LoaderView() }
            } else if let err = model.errorMessage, model.profile == nil {
                EmptyStateView(title: "Error", message: err, systemImage: "exclamationmark.triangle")
            } else if let p = model.profile {
                ScrollView {
                    VStack(spacing: 0) {
                        listingHeader(p)
                        tabBar(for: p)
                        tabContent(for: p)
                            .frame(maxWidth: .infinity)
                    }
                }
                .scrollIndicators(.visible)
            }
        }
        .background(theme.background.ignoresSafeArea())
        .navigationTitle(model.profile?.service.name ?? "Detail")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                if auth.isLoggedIn {
                    Button {
                        Task { await model.toggleFavorite(loggedIn: true) }
                    } label: {
                        if model.favoriteBusy {
                            ProgressView()
                        } else {
                            Image(systemName: model.isFavorite ? "heart.fill" : "heart")
                                .foregroundStyle(model.isFavorite ? theme.error : theme.primary)
                        }
                    }
                    .disabled(model.favoriteBusy || model.advertisementIdForAPI() == nil)
                }
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if let p = model.profile, p.canShowBookCTA {
                VStack(spacing: 0) {
                    Rectangle()
                        .fill(theme.cardBorder.opacity(0.6))
                        .frame(height: 1)
                    NavigationLink {
                        BookingView(profile: p)
                    } label: {
                        HStack(spacing: REXLayout.Spacing.sm) {
                            Image(systemName: "calendar.badge.plus")
                                .font(.system(size: 17, weight: .semibold))
                            Text("Book appointment")
                                .font(.headline.bold())
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(theme.primary)
                        .foregroundStyle(theme.buttonText)
                        .clipShape(RoundedRectangle(cornerRadius: REXLayout.Radius.button, style: .continuous))
                    }
                    .padding(.horizontal, REXLayout.Spacing.pagePadding)
                    .padding(.vertical, REXLayout.Spacing.md)
                    .background(theme.background)
                }
            }
        }
        .task {
            await model.load()
        }
        .onChange(of: auth.isLoggedIn) { _, loggedIn in
            if loggedIn { Task { await model.refreshFavoriteState() } }
        }
    }

    @ViewBuilder
    private func listingHeader(_ profile: ServiceProfile) -> some View {
        let s = profile.service
        VStack(alignment: .leading, spacing: 0) {
            heroImage(s)
            VStack(alignment: .leading, spacing: 14) {
                    Text(s.categoryDisplayLine.uppercased())
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(theme.primary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(theme.primaryLight)
                        .clipShape(Capsule())

                    Text(s.name)
                        .font(.title.weight(.bold))
                        .foregroundStyle(theme.text)
                        .fixedSize(horizontal: false, vertical: true)

                    HStack(alignment: .center, spacing: 8) {
                        RatingBadgeView(rating: averageRating(profile), reviewsCount: profile.reviews.isEmpty ? s.reviewsCount : profile.reviews.count)
                        if !s.location.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            Text("·")
                                .foregroundStyle(theme.textMuted)
                            HStack(spacing: 4) {
                                Image(systemName: "mappin.and.ellipse")
                                    .font(.caption)
                                    .foregroundStyle(theme.textSecondary)
                                Text(s.location)
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(theme.textSecondary)
                                    .lineLimit(2)
                            }
                        }
                    }

                    if !s.tags.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(Array(s.tags.prefix(8)), id: \.self) { tag in
                                    TagBadgeView(text: MarketplaceTagPill.label(for: tag))
                                }
                            }
                        }
                    }

                    if let first = profile.servicesList.first, let price = first.price, !price.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(price)
                                .font(.title2.weight(.bold))
                                .foregroundStyle(theme.text)
                            if let dur = first.duration, !dur.isEmpty {
                                HStack(spacing: 6) {
                                    Image(systemName: "clock")
                                        .font(.caption)
                                        .foregroundStyle(theme.textMuted)
                                    Text(dur)
                                        .font(.subheadline)
                                        .foregroundStyle(theme.textSecondary)
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 18)
                .padding(.bottom, 12)
        }
    }

    private func averageRating(_ profile: ServiceProfile) -> Double {
        let reviews = profile.reviews
        guard !reviews.isEmpty else { return profile.service.rating }
        let sum = reviews.reduce(0.0) { $0 + $1.rating }
        return sum / Double(reviews.count)
    }

    @ViewBuilder
    private func heroImage(_ s: Service) -> some View {
        let bottomCurve = UnevenRoundedRectangle(
            cornerRadii: RectangleCornerRadii(topLeading: 0, bottomLeading: 20, bottomTrailing: 20, topTrailing: 0),
            style: .continuous
        )
        if let url = ImageURL.absoluteURL(from: s.imageUrl) {
            ZStack(alignment: .bottom) {
                AsyncImage(url: url) { ph in
                    switch ph {
                    case .success(let i):
                        i.resizable().scaledToFill()
                    default:
                        theme.backgroundSecondary
                    }
                }
                .frame(height: 272)
                .frame(maxWidth: .infinity)
                .clipped()
                LinearGradient(
                    colors: [
                        Color.black.opacity(0),
                        Color.black.opacity(0.45),
                    ],
                    startPoint: UnitPoint(x: 0.5, y: 0.55),
                    endPoint: .bottom
                )
                .frame(height: 140)
                .allowsHitTesting(false)
            }
            .clipShape(bottomCurve)
            .shadow(color: Color.black.opacity(0.14), radius: 16, x: 0, y: 8)
        } else {
            theme.backgroundSecondary
                .frame(height: 200)
                .overlay(Text("No image").font(.subheadline).foregroundStyle(theme.textMuted))
                .clipShape(bottomCurve)
        }
    }

    private func tabBar(for profile: ServiceProfile) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(MarketplaceDetailTab.allCases, id: \.rawValue) { t in
                    let selected = tab == t
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) { tab = t }
                    } label: {
                        Text(t.title(for: profile))
                            .font(.subheadline.weight(selected ? .semibold : .medium))
                            .foregroundStyle(selected ? theme.primary : theme.textSecondary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 11)
                            .background(
                                selected
                                    ? theme.primaryLight.opacity(colorScheme == .dark ? 0.35 : 1)
                                    : Color.clear
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
        }
        .background(theme.background)
        .overlay(alignment: .bottom) {
            Rectangle().fill(theme.cardBorder).frame(height: 1)
        }
    }

    @ViewBuilder
    private func tabContent(for profile: ServiceProfile) -> some View {
        Group {
            switch tab {
            case .about:
                OverviewTabView(profile: profile)
            case .services:
                ServicesListTabView(items: profile.servicesList)
            case .reviews:
                ReviewsTabView(reviews: profile.reviews)
            case .team:
                TeamTabView(team: profile.team)
            case .portfolio:
                PortfolioTabView(items: profile.portfolio)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Tag labels shared with catalog cards
private enum MarketplaceTagPill {
    static func label(for tag: String) -> String {
        switch tag.lowercased() {
        case "online-booking": return "Online booking"
        case "russian-speaking": return "RU"
        case "premium": return "Premium"
        case "mobile": return "Mobile"
        default:
            return tag.replacingOccurrences(of: "-", with: " ").capitalized
        }
    }
}
