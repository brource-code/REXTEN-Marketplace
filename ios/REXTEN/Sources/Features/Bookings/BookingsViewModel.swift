import Foundation

@MainActor
final class BookingsViewModel: ObservableObject {
    @Published var upcoming: [ClientBooking] = []
    @Published var past: [ClientBooking] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let api = APIClient.shared

    func loadAll() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            async let uData = api.data(path: "client/bookings", query: ["upcoming": "true"])
            async let pData = api.data(path: "client/bookings", query: ["upcoming": "false"])
            let u = try await uData
            let p = try await pData
            upcoming = try JSONHelpers.decodeClientBookings(u)
            past = try JSONHelpers.decodeClientBookings(p)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
