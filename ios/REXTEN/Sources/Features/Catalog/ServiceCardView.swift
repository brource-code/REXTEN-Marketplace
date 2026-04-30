import SwiftUI

/// Подписи тегов как `getTagLabel` / RN `tagDictionary` (короткий набор из веб-каталога).
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

    static func fillColor(for tag: String, theme: AppTheme) -> Color {
        switch tag.lowercased() {
        case "online-booking": return theme.success
        case "russian-speaking": return Color.black.opacity(0.72)
        case "premium": return Color(hex: 0xCA8A04)
        default: return theme.backgroundSecondary
        }
    }

    static func textColor(for tag: String, theme: AppTheme) -> Color {
        switch tag.lowercased() {
        case "online-booking", "russian-speaking", "premium": return theme.buttonText
        default: return theme.textSecondary
        }
    }
}

struct ServiceCardView: View {
    @Environment(\.appTheme) private var theme
    let service: Service
    var style: Style = .list

    enum Style {
        case list
        case featuredStrip
        case popularCard
    }

    private var locLine: String {
        if !service.location.isEmpty { return service.location }
        let c = service.city.trimmingCharacters(in: .whitespaces)
        let st = service.state.trimmingCharacters(in: .whitespaces)
        if c.isEmpty && st.isEmpty { return "" }
        if c.isEmpty { return st }
        if st.isEmpty { return c }
        return "\(c), \(st)"
    }

    /// Как `topLeftBadge` в `frontend/src/components/marketplace/ServiceCard.jsx`.
    private var imageTopBadge: (String, Color)? {
        let available = service.allowBooking != false && service.hasSchedule == true
        if available { return ("Available", theme.success) }
        let popular =
            service.isAdvertisementListing
            || service.tags.contains { $0.lowercased() == "premium" }
            || (service.rating >= 4.5 && service.reviewsCount >= 12)
        if popular { return ("Popular", theme.warning) }
        return nil
    }

    var body: some View {
        Group {
            switch style {
            case .list: listLayout
            case .featuredStrip: featuredStripLayout
            case .popularCard: popularCardLayout
            }
        }
    }

    private var listLayout: some View {
        HStack(alignment: .center, spacing: 14) {
            listingImageBlock(width: 140, height: 105, corner: 12, ratingOnImage: true)
            VStack(alignment: .leading, spacing: 6) {
                Text(service.categoryDisplayLine.uppercased())
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(theme.textSecondary)
                    .lineLimit(1)
                Text(service.name)
                    .font(.body.weight(.bold))
                    .foregroundStyle(theme.text)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                if !locLine.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "mappin.circle.fill")
                            .font(.caption)
                            .foregroundStyle(theme.primary)
                        Text(locLine)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(theme.textSecondary)
                            .lineLimit(1)
                    }
                }
                HStack(alignment: .center, spacing: 8) {
                    ForEach(service.catalogListingBadgeTags, id: \.self) { tag in
                        Text(MarketplaceTagPill.label(for: tag))
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(MarketplaceTagPill.textColor(for: tag, theme: theme))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(MarketplaceTagPill.fillColor(for: tag, theme: theme))
                            .clipShape(Capsule())
                    }
                    Spacer(minLength: 0)
                    if !service.priceLabel.isEmpty {
                        Text(service.priceLabel)
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(theme.text)
                    }
                }
                .padding(.top, 4)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(12)
        .background(theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(
                    service.isFeatured == true ? theme.primary.opacity(0.45) : theme.cardBorder,
                    lineWidth: service.isFeatured == true ? 1.5 : 1
                )
        )
    }

    private var featuredStripLayout: some View {
        VStack(alignment: .leading, spacing: 0) {
            listingImageBlock(width: 200, height: 120, corner: 12, ratingOnImage: true)
            VStack(alignment: .leading, spacing: 6) {
                Text(service.categoryDisplayLine.uppercased())
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(theme.textSecondary)
                    .lineLimit(1)
                Text(service.name)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(theme.text)
                    .lineLimit(2)
                if !service.description.isEmpty {
                    Text(service.description)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(theme.textSecondary)
                        .lineLimit(1)
                }
                if !service.tags.isEmpty {
                    HStack(spacing: 6) {
                        ForEach(Array(service.tags.prefix(2)), id: \.self) { t in
                            Text(MarketplaceTagPill.label(for: t))
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(theme.textSecondary)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 3)
                                .background(theme.backgroundSecondary)
                                .clipShape(Capsule())
                        }
                    }
                }
                if !locLine.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "mappin.circle.fill")
                            .font(.caption2)
                            .foregroundStyle(theme.primary)
                        Text(locLine)
                            .font(.caption.weight(.bold))
                            .foregroundStyle(theme.textSecondary)
                            .lineLimit(1)
                    }
                }
                Divider().background(theme.cardBorder)
                HStack {
                    Spacer(minLength: 0)
                    Text(service.priceLabel)
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(theme.text)
                }
                .padding(.top, 2)
            }
            .padding(12)
        }
        .frame(width: 224)
        .background(theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(
                    service.isFeatured == true ? theme.primary.opacity(0.4) : theme.cardBorder,
                    lineWidth: service.isFeatured == true ? 1.5 : 1
                )
        )
    }

    // MARK: - Popular card (home screen horizontal scroll)

    private var popularCardLayout: some View {
        VStack(alignment: .leading, spacing: 0) {
            popularImageBlock
            VStack(alignment: .leading, spacing: 4) {
                Text(service.name)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(theme.text)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                if let company = service.companyName, !company.isEmpty {
                    Text(company)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(theme.textSecondary)
                        .lineLimit(1)
                }
                if !service.priceLabel.isEmpty {
                    Text("от \(service.priceLabel)")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(theme.text)
                        .padding(.top, 2)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 10)
        }
        .frame(width: 178)
        .background(theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(theme.cardBorder, lineWidth: 1))
    }

    private var popularImageBlock: some View {
        ZStack(alignment: .topLeading) {
            Group {
                if let url = ImageURL.absoluteURL(from: service.imageUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let img): img.resizable().scaledToFill()
                        default: theme.backgroundSecondary
                        }
                    }
                } else {
                    theme.backgroundSecondary
                }
            }
            .frame(width: 178, height: 140)
            .clipped()
            .clipShape(UnevenRoundedRectangle(topLeadingRadius: 16, bottomLeadingRadius: 0, bottomTrailingRadius: 0, topTrailingRadius: 16))

            // Gradient for rating overlay
            VStack {
                Spacer()
                LinearGradient(colors: [.clear, .black.opacity(0.65)], startPoint: .top, endPoint: .bottom)
                    .frame(height: 54)
            }
            .frame(width: 178, height: 140)
            .clipShape(UnevenRoundedRectangle(topLeadingRadius: 16, bottomLeadingRadius: 0, bottomTrailingRadius: 0, topTrailingRadius: 16))
            .allowsHitTesting(false)

            // Rating bottom-left
            VStack {
                Spacer()
                HStack(spacing: 3) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color(hex: 0xFBBF24))
                    Text(String(format: "%.1f", service.rating))
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.white)
                    if service.reviewsCount > 0 {
                        Text("(\(service.reviewsCount))")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white.opacity(0.9))
                    }
                }
                .padding(.leading, 8)
                .padding(.bottom, 7)
            }
            .frame(width: 178, height: 140, alignment: .bottomLeading)
            .allowsHitTesting(false)

            // Available badge top-left
            if let badge = imageTopBadge {
                Text(badge.0)
                    .font(.system(size: 10, weight: .heavy))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(badge.1)
                    .clipShape(Capsule())
                    .padding(8)
            }

            // Heart top-right
            VStack {
                HStack {
                    Spacer()
                    Image(systemName: "heart")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(7)
                        .background(.black.opacity(0.28))
                        .clipShape(Circle())
                        .padding(8)
                }
                Spacer()
            }
            .frame(width: 178, height: 140)
            .allowsHitTesting(false)
        }
        .frame(width: 178, height: 140)
    }

    @ViewBuilder
    private func listingImageBlock(width: CGFloat, height: CGFloat, corner: CGFloat, ratingOnImage: Bool) -> some View {
        ZStack(alignment: .topLeading) {
            Group {
                if let url = ImageURL.absoluteURL(from: service.imageUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let img):
                            img.resizable().scaledToFill()
                        default:
                            theme.backgroundSecondary
                        }
                    }
                } else {
                    theme.backgroundSecondary
                        .overlay(
                            Text("No photo")
                                .font(.caption2.bold())
                                .foregroundStyle(theme.textMuted)
                        )
                }
            }
            .frame(width: width, height: height)
            .clipped()
            .clipShape(RoundedRectangle(cornerRadius: corner))
            .overlay(RoundedRectangle(cornerRadius: corner).stroke(theme.cardBorder, lineWidth: 1))

            if ratingOnImage {
                VStack {
                    Spacer(minLength: 0)
                    LinearGradient(
                        colors: [.clear, .black.opacity(0.72)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .frame(height: height * 0.42)
                    .overlay(alignment: .bottomLeading) {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .font(.caption2)
                                .foregroundStyle(Color(hex: 0xFBBF24))
                            Text(String(format: "%.1f", service.rating))
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(.white)
                            if service.reviewsCount > 0 {
                                Text("(\(service.reviewsCount))")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundStyle(.white.opacity(0.9))
                            }
                        }
                        .padding(.horizontal, 8)
                        .padding(.bottom, 8)
                    }
                }
                .frame(width: width, height: height)
                .clipShape(RoundedRectangle(cornerRadius: corner))
                .allowsHitTesting(false)
            }

            if let badge = imageTopBadge {
                Text(badge.0)
                    .font(.system(size: 10, weight: .heavy))
                    .foregroundStyle(theme.buttonText)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(badge.1)
                    .clipShape(Capsule())
                    .padding(8)
            }
        }
        .frame(width: width, height: height)
    }
}
