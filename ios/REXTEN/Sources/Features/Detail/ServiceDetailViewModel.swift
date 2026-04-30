import Foundation

@MainActor
final class ServiceDetailViewModel: ObservableObject {
    let slug: String
    @Published var profile: ServiceProfile?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var isFavorite = false
    @Published var favoriteBusy = false

    private let api = APIClient.shared

    init(slug: String) {
        self.slug = slug
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let data = try await api.dataPublic(path: "marketplace/services/\(slug)/profile")
            profile = try JSONHelpers.decodeServiceProfile(data)
            await refreshFavoriteState()
        } catch {
            errorMessage = error.localizedDescription
            profile = nil
        }
    }

    func refreshFavoriteState() async {
        guard KeychainStore.accessToken != nil,
              let adId = advertisementIdForAPI() else {
            isFavorite = false
            return
        }
        do {
            let data = try await api.data(path: "client/favorites/advertisements")
            let list = try JSONHelpers.decodeFavoriteAds(data)
            isFavorite = list.contains { fav in
                (fav.advertisementId ?? fav.id) == String(adId) || fav.id == String(adId)
            }
        } catch {
            isFavorite = false
        }
    }

    /// ID объявления для API избранного / брони.
    func advertisementIdForAPI() -> Int? {
        guard let s = profile?.service else { return nil }
        if let aid = s.advertisementId { return aid }
        if s.id.hasPrefix("ad_"), let n = Int(s.id.dropFirst(3)) { return n }
        return Int(s.id)
    }

    func toggleFavorite(loggedIn: Bool) async {
        guard loggedIn, let adId = advertisementIdForAPI() else { return }
        favoriteBusy = true
        defer { favoriteBusy = false }
        do {
            if isFavorite {
                _ = try await api.deleteAuth(path: "client/favorites/advertisement/\(adId)")
                isFavorite = false
            } else {
                _ = try await api.postAuth(path: "client/favorites/advertisement/\(adId)", body: EmptyBody())
                isFavorite = true
            }
        } catch {
            AppLogger.error("Favorite: \(error.localizedDescription)")
        }
    }
}

private struct EmptyBody: Encodable {}
