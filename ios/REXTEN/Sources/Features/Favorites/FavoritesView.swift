import SwiftUI

struct FavoritesView: View {
    @Environment(\.appTheme) private var theme
    @StateObject private var model = FavoritesViewModel()

    var body: some View {
        Group {
            if model.isLoading && !model.hasAny {
                VStack { LoaderView() }
            } else if !model.hasAny {
                EmptyStateView(
                    title: "No favorites yet",
                    message: model.errorMessage ?? "Save services and listings you like.",
                    systemImage: "heart"
                )
            } else {
                favoritesList
            }
        }
        .background(theme.background.ignoresSafeArea())
        .navigationTitle("Favorites")
        .navigationDestination(for: String.self) { slug in
            ServiceDetailView(slug: slug)
        }
        .task { await model.load() }
        .refreshable { await model.load() }
    }

    // MARK: - List

    private var favoritesList: some View {
        List {
            if !model.services.isEmpty {
                Section("Services") {
                    ForEach(model.services) { item in
                        NavigationLink(value: item.listingSlug) {
                            favoriteRow(title: item.displayTitle, subtitle: item.priceLabel, image: item.imageUrl ?? item.image)
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            Button(role: .destructive) { Task { await model.removeService(item) } }
                                label: { Label("Remove", systemImage: "trash") }
                        }
                    }
                }
            }
            if !model.advertisements.isEmpty {
                Section("Listings") {
                    ForEach(model.advertisements) { item in
                        NavigationLink(value: item.listingSlug) {
                            favoriteRow(title: item.displayTitle, subtitle: item.priceLabel, image: item.imageUrl ?? item.image)
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            Button(role: .destructive) { Task { await model.removeAdvertisement(item) } }
                                label: { Label("Remove", systemImage: "trash") }
                        }
                    }
                }
            }
            if !model.businesses.isEmpty {
                Section("Businesses") {
                    ForEach(model.businesses) { item in
                        Group {
                            if let slug = item.businessSlug?.trimmingCharacters(in: .whitespacesAndNewlines), !slug.isEmpty {
                                NavigationLink(value: slug) {
                                    favoriteRow(title: item.businessName, subtitle: item.category, image: item.imageUrl ?? item.image)
                                }
                            } else {
                                favoriteRow(title: item.businessName, subtitle: item.category, image: item.imageUrl ?? item.image)
                            }
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            Button(role: .destructive) { Task { await model.removeBusiness(item) } }
                                label: { Label("Remove", systemImage: "trash") }
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(theme.background)
    }

    // MARK: - Row

    private func favoriteRow(title: String, subtitle: String?, image: String?) -> some View {
        HStack(spacing: REXLayout.Spacing.md) {
            thumb(image)
                .frame(width: 52, height: 52)
                .clipShape(RoundedRectangle(cornerRadius: REXLayout.Radius.sm))
            VStack(alignment: .leading, spacing: REXLayout.Spacing.xs) {
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundStyle(theme.text)
                    .lineLimit(2)
                if let sub = subtitle, !sub.isEmpty {
                    Text(sub)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(theme.primary)
                        .lineLimit(1)
                }
            }
        }
        .padding(.vertical, REXLayout.Spacing.xs)
    }

    // MARK: - Thumbnail

    @ViewBuilder
    private func thumb(_ urlStr: String?) -> some View {
        if let url = ImageURL.absoluteURL(from: urlStr) {
            AsyncImage(url: url) { p in
                switch p {
                case .success(let i): i.resizable().scaledToFill()
                default: theme.backgroundSecondary
                }
            }
        } else {
            theme.backgroundSecondary.overlay(
                Image(systemName: "photo")
                    .foregroundStyle(theme.textMuted)
                    .font(.caption)
            )
        }
    }
}
