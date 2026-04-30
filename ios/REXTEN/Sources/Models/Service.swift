import Foundation

struct Category: Identifiable, Codable, Hashable {
    var id: String
    var name: String
    var description: String?

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let s = try? c.decode(String.self, forKey: .id) {
            id = s
        } else if let i = try? c.decode(Int.self, forKey: .id) {
            id = String(i)
        } else {
            id = ""
        }
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? ""
        description = try c.decodeIfPresent(String.self, forKey: .description)
    }

    enum CodingKeys: String, CodingKey {
        case id, name, description
    }
}

struct USState: Identifiable, Codable, Hashable {
    var id: String
    var name: String

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let s = try? c.decode(String.self, forKey: .id) {
            id = s
        } else if let i = try? c.decode(Int.self, forKey: .id) {
            id = String(i)
        } else {
            id = ""
        }
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? ""
    }

    enum CodingKeys: String, CodingKey { case id, name }
}

struct Service: Identifiable, Codable, Hashable {
    var id: String
    var name: String
    var category: String
    var city: String
    var state: String
    var location: String
    var priceLabel: String
    var priceValue: Double
    var rating: Double
    var reviewsCount: Int
    var tags: [String]
    var imageUrl: String
    var group: String
    var description: String
    var path: String
    var isFeatured: Bool?
    var companyId: Int?
    var advertisementId: Int?
    var companyName: String?
    /// Числовой `service_id` из каталога (как в RN), не путать с строковым `id` объявления.
    var listingServiceId: Int?
    var groupLabel: String?
    var allowBooking: Bool?
    var hasSchedule: Bool?

    enum CodingKeys: String, CodingKey {
        case id, name, category, city, state, location, priceLabel, priceValue, rating, reviewsCount, tags, imageUrl, group, description, path, isFeatured
        case companyId = "company_id"
        case advertisementId = "advertisement_id"
        case companyName
        case listingServiceId = "service_id"
        case groupLabel = "group_label"
        case allowBooking = "allow_booking"
        case hasSchedule = "has_schedule"
    }

    private enum BusinessIdCodingKeys: String, CodingKey {
        case businessId = "business_id"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let s = try? c.decode(String.self, forKey: .id) {
            id = s
        } else if let i = try? c.decode(Int.self, forKey: .id) {
            id = String(i)
        } else {
            id = ""
        }
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? ""
        category = try c.decodeIfPresent(String.self, forKey: .category) ?? ""
        city = try c.decodeIfPresent(String.self, forKey: .city) ?? ""
        state = try c.decodeIfPresent(String.self, forKey: .state) ?? ""
        location = try c.decodeIfPresent(String.self, forKey: .location) ?? ""
        priceLabel = try c.decodeIfPresent(String.self, forKey: .priceLabel) ?? ""
        priceValue = try c.decodeIfPresent(Double.self, forKey: .priceValue) ?? 0
        rating = try c.decodeIfPresent(Double.self, forKey: .rating) ?? 0
        reviewsCount = try c.decodeIfPresent(Int.self, forKey: .reviewsCount) ?? 0
        tags = try c.decodeIfPresent([String].self, forKey: .tags) ?? []
        imageUrl = try c.decodeIfPresent(String.self, forKey: .imageUrl) ?? ""
        if let g = try? c.decode(String.self, forKey: .group) {
            group = g
        } else if let gi = try? c.decode(Int.self, forKey: .group) {
            group = String(gi)
        } else {
            group = ""
        }
        description = try c.decodeIfPresent(String.self, forKey: .description) ?? ""
        path = try c.decodeIfPresent(String.self, forKey: .path) ?? ""
        isFeatured = try c.decodeIfPresent(Bool.self, forKey: .isFeatured)
        let alt = try decoder.container(keyedBy: BusinessIdCodingKeys.self)
        let fromBusinessId: Int? = {
            if let i = try? alt.decode(Int.self, forKey: .businessId) { return i }
            if let s = try? alt.decode(String.self, forKey: .businessId), let i = Int(s) { return i }
            return nil
        }()
        companyId = Self.decodeOptionalInt(c, key: .companyId) ?? fromBusinessId
        advertisementId = Self.decodeOptionalInt(c, key: .advertisementId)
        companyName = try c.decodeIfPresent(String.self, forKey: .companyName)
        listingServiceId = Self.decodeOptionalInt(c, key: .listingServiceId)
        groupLabel = try c.decodeIfPresent(String.self, forKey: .groupLabel)
        allowBooking = try c.decodeIfPresent(Bool.self, forKey: .allowBooking)
        if let b = try? c.decode(Bool.self, forKey: .hasSchedule) {
            hasSchedule = b
        } else if let s = try? c.decode(String.self, forKey: .hasSchedule) {
            hasSchedule = ["1", "true", "yes"].contains(s.lowercased())
        } else {
            hasSchedule = nil
        }
    }

    private static func decodeOptionalInt(_ c: KeyedDecodingContainer<CodingKeys>, key: CodingKeys) -> Int? {
        if let i = try? c.decode(Int.self, forKey: key) { return i }
        if let s = try? c.decode(String.self, forKey: key), let i = Int(s) { return i }
        return nil
    }

    /// `company_id` из API; если нет — как в RN: числовой `group` часто совпадает с company для маркетплейса.
    var effectiveCompanyId: Int? {
        if let c = companyId { return c }
        let g = group.trimmingCharacters(in: .whitespacesAndNewlines)
        if let v = Int(g), String(v) == g { return v }
        return nil
    }

    var slug: String {
        let p = path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        if p.hasPrefix("marketplace/") {
            return String(p.dropFirst("marketplace/".count))
        }
        return id
    }

    /// Строка категории как на вебе: `group_label` или `category`.
    var categoryDisplayLine: String {
        let gl = groupLabel?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !gl.isEmpty { return gl }
        let cat = category.trimmingCharacters(in: .whitespacesAndNewlines)
        if !cat.isEmpty { return cat }
        return "Service"
    }

    var isAdvertisementListing: Bool { id.hasPrefix("ad_") }

    /// Теги для плашек карточки: при `allow_booking` добавляем `online-booking` (как `ServiceCard.jsx`).
    var tagsForListingPills: [String] {
        var raw = tags
        if allowBooking == true, !raw.contains("online-booking") {
            raw.append("online-booking")
        }
        if allowBooking == false {
            raw = raw.filter { $0 != "online-booking" }
        }
        return raw
    }

    var catalogListingBadgeTags: [String] {
        tagsForListingPills.filter { $0 == "online-booking" || $0 == "russian-speaking" }
    }
}

struct ServiceItem: Identifiable, Codable, Hashable {
    var id: String
    /// Числовой id услуги внутри объявления (как в Laravel `servicesList[].service_id`) — для `bookings/*`.
    var serviceId: Int?
    var name: String
    var category: String?
    var description: String?
    var price: String?
    var duration: String?
    var serviceType: String?

    enum CodingKeys: String, CodingKey {
        case id, name, category, description, price, duration
        case serviceType = "service_type"
        case serviceId
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let s = try? c.decode(String.self, forKey: .id) {
            id = s
        } else if let i = try? c.decode(Int.self, forKey: .id) {
            id = String(i)
        } else {
            id = ""
        }
        if let i = try? c.decode(Int.self, forKey: .serviceId) {
            serviceId = i
        } else if let s = try? c.decode(String.self, forKey: .serviceId), let i = Int(s) {
            serviceId = i
        } else {
            serviceId = nil
        }
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? ""
        category = try c.decodeIfPresent(String.self, forKey: .category)
        description = try c.decodeIfPresent(String.self, forKey: .description)
        if let ps = try? c.decode(String.self, forKey: .price) {
            price = ps
        } else if let pd = try? c.decode(Double.self, forKey: .price) {
            price = String(format: "$%.0f", pd)
        } else {
            price = nil
        }
        if let ds = try? c.decode(String.self, forKey: .duration) {
            duration = ds
        } else if let di = try? c.decode(Int.self, forKey: .duration) {
            duration = "\(di) min"
        } else {
            duration = nil
        }
        serviceType = try c.decodeIfPresent(String.self, forKey: .serviceType)
    }

    /// Числовой id для Booking API: приоритет `service_id` из ответа профиля, затем числовой `id` строки прайса.
    var bookingLineServiceId: Int? {
        if let s = serviceId { return s }
        let raw = id.trimmingCharacters(in: .whitespacesAndNewlines)
        return Int(raw)
    }
}

struct Review: Identifiable, Codable, Hashable {
    var id: String
    var name: String?
    var userName: String?
    var rating: Double
    var date: String?
    var text: String?
    var comment: String?

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let s = try? c.decode(String.self, forKey: .id) {
            id = s
        } else if let i = try? c.decode(Int.self, forKey: .id) {
            id = String(i)
        } else {
            id = ""
        }
        name = try c.decodeIfPresent(String.self, forKey: .name)
        userName = try c.decodeIfPresent(String.self, forKey: .userName)
        rating = try c.decodeIfPresent(Double.self, forKey: .rating) ?? 0
        date = try c.decodeIfPresent(String.self, forKey: .date)
        text = try c.decodeIfPresent(String.self, forKey: .text)
        comment = try c.decodeIfPresent(String.self, forKey: .comment)
    }

    enum CodingKeys: String, CodingKey {
        case id, name, userName, rating, date, text, comment
    }

    var displayName: String { name ?? userName ?? "Anonymous" }
    var body: String { text ?? comment ?? "" }
}

struct TeamMember: Identifiable, Codable, Hashable {
    var id: String
    var name: String
    var role: String
    var description: String?
    var bio: String?
    var rating: Double?
    var avatarUrl: String?
    var avatar: String?

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let s = try? c.decode(String.self, forKey: .id) {
            id = s
        } else if let i = try? c.decode(Int.self, forKey: .id) {
            id = String(i)
        } else {
            id = ""
        }
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? ""
        role = try c.decodeIfPresent(String.self, forKey: .role) ?? ""
        description = try c.decodeIfPresent(String.self, forKey: .description)
        bio = try c.decodeIfPresent(String.self, forKey: .bio)
        rating = try c.decodeIfPresent(Double.self, forKey: .rating)
        avatarUrl = try c.decodeIfPresent(String.self, forKey: .avatarUrl)
        avatar = try c.decodeIfPresent(String.self, forKey: .avatar)
    }

    enum CodingKeys: String, CodingKey {
        case id, name, role, description, bio, rating, avatarUrl, avatar
    }
}

struct PortfolioItem: Identifiable, Codable, Hashable {
    var id: String
    var title: String?
    var tag: String?
    var imageUrl: String?

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let s = try? c.decode(String.self, forKey: .id) {
            id = s
        } else if let i = try? c.decode(Int.self, forKey: .id) {
            id = String(i)
        } else {
            id = ""
        }
        title = try c.decodeIfPresent(String.self, forKey: .title)
        tag = try c.decodeIfPresent(String.self, forKey: .tag)
        imageUrl = try c.decodeIfPresent(String.self, forKey: .imageUrl)
    }

    enum CodingKeys: String, CodingKey { case id, title, tag, imageUrl }
}

struct ServiceProfile: Codable {
    var service: Service
    var servicesList: [ServiceItem]
    var reviews: [Review]
    var team: [TeamMember]
    var portfolio: [PortfolioItem]

    enum CodingKeys: String, CodingKey {
        case service
        case servicesList
        case reviews
        case team
        case portfolio
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        service = try c.decode(Service.self, forKey: .service)
        servicesList = try c.decodeIfPresent([ServiceItem].self, forKey: .servicesList) ?? []
        reviews = try c.decodeIfPresent([Review].self, forKey: .reviews) ?? []
        team = try c.decodeIfPresent([TeamMember].self, forKey: .team) ?? []
        portfolio = try c.decodeIfPresent([PortfolioItem].self, forKey: .portfolio) ?? []
    }
}

extension ServiceProfile {
    /// ID услуги для публичных `bookings/*`: совпадает с позицией прайса объявления (`servicesList[].service_id` / числовой `id`), **не** с id объявления (`ad_…`).
    var bookingServiceIdForAPI: Int? {
        if let sid = service.listingServiceId { return sid }
        for item in servicesList {
            if let n = item.bookingLineServiceId { return n }
        }
        return nil
    }

    var canShowBookCTA: Bool {
        guard service.effectiveCompanyId != nil else { return false }
        if service.allowBooking == false { return false }
        return true
    }
}
