import Foundation

@MainActor
final class BookingViewModel: ObservableObject {
    let profile: ServiceProfile
    @Published var selectedDate: Date = Date()
    @Published var slots: [AvailableSlot] = []
    @Published var selectedSlot: AvailableSlot?
    @Published var isLoadingSlots = false
    @Published var clientName = ""
    @Published var clientPhone = ""
    @Published var clientEmail = ""
    @Published var clientNotes = ""
    @Published var isSubmitting = false
    @Published var errorMessage: String?
    @Published var successMessage: String?

    private let api = APIClient.shared
    private let df: DateFormatter = {
        let d = DateFormatter()
        d.calendar = Calendar(identifier: .gregorian)
        d.locale = Locale(identifier: "en_US_POSIX")
        d.dateFormat = "yyyy-MM-dd"
        return d
    }()

    init(profile: ServiceProfile) {
        self.profile = profile
    }

    var companyId: Int? { profile.service.effectiveCompanyId }
    var serviceId: Int? { profile.bookingServiceIdForAPI }

    var advertisementId: Int? { profile.service.advertisementId }

    func loadSlots() async {
        guard let cid = companyId else {
            errorMessage = "Missing company for this listing"
            return
        }
        guard let sid = serviceId else {
            errorMessage = "This listing has no bookable service ID"
            return
        }
        isLoadingSlots = true
        errorMessage = nil
        selectedSlot = nil
        defer { isLoadingSlots = false }
        let dateStr = df.string(from: selectedDate)
        var q: [URLQueryItem] = [
            URLQueryItem(name: "company_id", value: String(cid)),
            URLQueryItem(name: "service_id", value: String(sid)),
            URLQueryItem(name: "date", value: dateStr)
        ]
        if let aid = advertisementId {
            q.append(URLQueryItem(name: "advertisement_id", value: String(aid)))
        }
        do {
            let data = try await api.dataPublic(path: "bookings/available-slots", queryItems: q)
            slots = try JSONHelpers.decodeSlots(data).filter { $0.available != false }
        } catch {
            slots = []
            errorMessage = error.localizedDescription
        }
    }

    func submit() async -> Bool {
        guard let cid = companyId else {
            errorMessage = "Missing company for this listing"
            return false
        }
        guard let sid = serviceId else {
            errorMessage = "This listing has no bookable service ID"
            return false
        }
        guard let slot = selectedSlot else {
            errorMessage = "Select a time slot"
            return false
        }
        guard !clientName.trimmingCharacters(in: .whitespaces).isEmpty,
              !clientPhone.trimmingCharacters(in: .whitespaces).isEmpty else {
            errorMessage = "Name and phone are required"
            return false
        }
        isSubmitting = true
        errorMessage = nil
        defer { isSubmitting = false }
        let body = CreateBookingBody(
            companyId: cid,
            serviceId: sid,
            bookingDate: df.string(from: selectedDate),
            bookingTime: slot.time,
            clientName: clientName.trimmingCharacters(in: .whitespaces),
            clientPhone: clientPhone.trimmingCharacters(in: .whitespaces),
            clientEmail: clientEmail.isEmpty ? nil : clientEmail,
            clientNotes: clientNotes.isEmpty ? nil : clientNotes,
            advertisementId: advertisementId,
            executionType: nil,
            addressLine1: nil,
            city: nil,
            state: nil,
            zip: nil
        )
        do {
            let enc = JSONEncoder()
            enc.keyEncodingStrategy = .convertToSnakeCase
            let raw = try enc.encode(body)
            let data = try await api.dataPublic(path: "bookings", method: "POST", body: raw)
            let dec = JSONDecoder()
            dec.keyDecodingStrategy = .convertFromSnakeCase
            let resp = try dec.decode(BookingAPIResponse.self, from: data)
            successMessage = resp.message ?? "Booked"
            return resp.success != false
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
}
