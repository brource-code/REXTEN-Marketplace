import Foundation

@MainActor
final class FavoritesViewModel: ObservableObject {
    @Published var services: [FavoriteService] = []
    @Published var advertisements: [FavoriteAdvertisement] = []
    @Published var businesses: [FavoriteBusiness] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let api = APIClient.shared

    var hasAny: Bool {
        !services.isEmpty || !advertisements.isEmpty || !businesses.isEmpty
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            async let sd = api.data(path: "client/favorites/services")
            async let ad = api.data(path: "client/favorites/advertisements")
            async let bd = api.data(path: "client/favorites/businesses")
            let sData = try await sd
            let aData = try await ad
            let bData = try await bd
            services = try JSONHelpers.decodeFavoriteServices(sData)
            advertisements = try JSONHelpers.decodeFavoriteAds(aData)
            businesses = try JSONHelpers.decodeFavoriteBusinesses(bData)
        } catch {
            errorMessage = error.localizedDescription
            services = []
            advertisements = []
            businesses = []
            AppLogger.error("Favorites: \(error.localizedDescription)")
        }
    }

    func removeService(_ item: FavoriteService) async {
        let raw = item.serviceId ?? item.id
        guard let id = Int(raw) else { return }
        do {
            _ = try await api.deleteAuth(path: "client/favorites/service/\(id)")
            services.removeAll { $0.id == item.id }
        } catch {
            AppLogger.error("Remove favorite service: \(error.localizedDescription)")
        }
    }

    func removeAdvertisement(_ item: FavoriteAdvertisement) async {
        let raw = item.advertisementId ?? item.id
        guard let id = Int(raw) else { return }
        do {
            _ = try await api.deleteAuth(path: "client/favorites/advertisement/\(id)")
            advertisements.removeAll { $0.id == item.id }
        } catch {
            AppLogger.error("Remove favorite ad: \(error.localizedDescription)")
        }
    }

    func removeBusiness(_ item: FavoriteBusiness) async {
        let raw = item.businessId ?? item.id
        guard let id = Int(raw) else { return }
        do {
            _ = try await api.deleteAuth(path: "client/favorites/business/\(id)")
            businesses.removeAll { $0.id == item.id }
        } catch {
            AppLogger.error("Remove favorite business: \(error.localizedDescription)")
        }
    }
}
