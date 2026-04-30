import Foundation

struct ClientBooking: Identifiable, Decodable {
    let id: Int
    let serviceName: String?
    let businessName: String?
    let businessSlug: String?
    let date: String?
    let bookingDate: String?
    let time: String?
    let bookingTime: String?
    let status: String?
    let price: Double?
    let priceLabel: String?

    enum CodingKeys: String, CodingKey {
        case id
        case serviceName
        case businessName
        case businessSlug
        case date
        case bookingDate
        case time
        case bookingTime
        case status
        case price
        case priceLabel
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let i = try? c.decode(Int.self, forKey: .id) {
            id = i
        } else if let s = try? c.decode(String.self, forKey: .id), let i = Int(s) {
            id = i
        } else {
            id = 0
        }
        serviceName = try c.decodeIfPresent(String.self, forKey: .serviceName)
        businessName = try c.decodeIfPresent(String.self, forKey: .businessName)
        businessSlug = try c.decodeIfPresent(String.self, forKey: .businessSlug)
        date = try c.decodeIfPresent(String.self, forKey: .date)
        bookingDate = try c.decodeIfPresent(String.self, forKey: .bookingDate)
        time = try c.decodeIfPresent(String.self, forKey: .time)
        bookingTime = try c.decodeIfPresent(String.self, forKey: .bookingTime)
        status = try c.decodeIfPresent(String.self, forKey: .status)
        price = try c.decodeIfPresent(Double.self, forKey: .price)
        priceLabel = try c.decodeIfPresent(String.self, forKey: .priceLabel)
    }

    var displayDate: String {
        bookingDate ?? date ?? ""
    }

    var displayTime: String {
        bookingTime ?? time ?? ""
    }

    var displayPrice: String {
        if let p = priceLabel, !p.isEmpty { return p }
        if let p = price { return String(format: "$%.2f", p) }
        return ""
    }
}

struct CreateBookingBody: Encodable {
    let companyId: Int
    let serviceId: Int
    let bookingDate: String
    let bookingTime: String
    let clientName: String
    let clientPhone: String
    let clientEmail: String?
    let clientNotes: String?
    let advertisementId: Int?
    let executionType: String?
    let addressLine1: String?
    let city: String?
    let state: String?
    let zip: String?

    enum CodingKeys: String, CodingKey {
        case companyId = "company_id"
        case serviceId = "service_id"
        case bookingDate = "booking_date"
        case bookingTime = "booking_time"
        case clientName = "client_name"
        case clientPhone = "client_phone"
        case clientEmail = "client_email"
        case clientNotes = "client_notes"
        case advertisementId = "advertisement_id"
        case executionType = "execution_type"
        case addressLine1 = "address_line1"
        case city, state, zip
    }
}

struct BookingAPIResponse: Decodable {
    let success: Bool?
    let message: String?
    let data: BookingCreated?

    struct BookingCreated: Decodable {
        let id: Int?
    }
}

struct AvailableSlot: Codable, Hashable {
    var time: String
    var endTime: String?
    var available: Bool?

    enum CodingKeys: String, CodingKey {
        case time
        case endTime = "end_time"
        case available
    }
}
