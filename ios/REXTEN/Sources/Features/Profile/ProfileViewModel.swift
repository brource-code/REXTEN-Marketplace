import Foundation

@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var profile: ClientProfile?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var favoritesCount: Int = 0
    @Published var bookingsCount: Int = 0
    @Published var reviewsCount: Int = 0
    @Published var discountsCount: Int = 0

    private let api = APIClient.shared

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let data = try await api.data(path: "client/profile")
            profile = try JSONHelpers.decodeClientProfile(data)

            async let favSvc = api.data(path: "client/favorites/services")
            async let favAds = api.data(path: "client/favorites/advertisements")
            async let favBus = api.data(path: "client/favorites/businesses")
            async let allBooks = api.data(path: "client/bookings")
            async let loyaltyData = api.data(path: "client/discounts/loyalty")

            let dSvc = try await favSvc
            let dAds = try await favAds
            let dBus = try await favBus

            let cSvc = (try? JSONHelpers.decodeFavoriteServices(dSvc).count) ?? 0
            let cAds = (try? JSONHelpers.decodeFavoriteAds(dAds).count) ?? 0
            let cBus = (try? JSONHelpers.decodeFavoriteBusinesses(dBus).count) ?? 0
            favoritesCount = cSvc + cAds + cBus

            bookingsCount = (try? JSONHelpers.decodeClientBookings(try await allBooks).count) ?? 0

            if let ld = try? await loyaltyData,
               let obj = try? JSONSerialization.jsonObject(with: ld) as? [String: Any] {
                discountsCount = (obj["active_count"] as? Int)
                    ?? (obj["discounts_count"] as? Int)
                    ?? ((obj["data"] as? [Any])?.count)
                    ?? 0
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func save(_ body: UpdateProfileBody) async throws {
        let data = try await api.putAuth(path: "client/profile", body: body)
        profile = try JSONHelpers.decodeClientProfile(data)
    }
}
