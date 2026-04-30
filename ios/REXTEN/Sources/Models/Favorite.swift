import Foundation

struct FavoriteService: Identifiable, Decodable, Hashable {
    var id: String
    var serviceId: String?
    var name: String?
    var serviceName: String?
    var serviceSlug: String?
    var category: String?
    var imageUrl: String?
    var image: String?
    var priceLabel: String?
    var rating: Double?
    var reviewsCount: Int?
    var path: String?
    var description: String?
    var businessName: String?
    var businessSlug: String?
    var city: String?
    var state: String?

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let s = try? c.decode(String.self, forKey: .id) {
            id = s
        } else if let i = try? c.decode(Int.self, forKey: .id) {
            id = String(i)
        } else {
            id = ""
        }
        if let v = try? c.decode(String.self, forKey: .serviceId) {
            serviceId = v
        } else if let v = try? c.decode(Int.self, forKey: .serviceId) {
            serviceId = String(v)
        } else {
            serviceId = nil
        }
        name = try c.decodeIfPresent(String.self, forKey: .name)
        serviceName = try c.decodeIfPresent(String.self, forKey: .serviceName)
        serviceSlug = try c.decodeIfPresent(String.self, forKey: .serviceSlug)
        category = try c.decodeIfPresent(String.self, forKey: .category)
        imageUrl = try c.decodeIfPresent(String.self, forKey: .imageUrl)
        image = try c.decodeIfPresent(String.self, forKey: .image)
        priceLabel = try c.decodeIfPresent(String.self, forKey: .priceLabel)
        rating = try c.decodeIfPresent(Double.self, forKey: .rating)
        reviewsCount = try c.decodeIfPresent(Int.self, forKey: .reviewsCount)
        path = try c.decodeIfPresent(String.self, forKey: .path)
        description = try c.decodeIfPresent(String.self, forKey: .description)
        businessName = try c.decodeIfPresent(String.self, forKey: .businessName)
        businessSlug = try c.decodeIfPresent(String.self, forKey: .businessSlug)
        city = try c.decodeIfPresent(String.self, forKey: .city)
        state = try c.decodeIfPresent(String.self, forKey: .state)
    }

    enum CodingKeys: String, CodingKey {
        case id
        case serviceId
        case name
        case serviceName
        case serviceSlug
        case category
        case imageUrl
        case image
        case priceLabel
        case rating
        case reviewsCount
        case path
        case description
        case businessName
        case businessSlug
        case city
        case state
    }

    var displayTitle: String {
        serviceName ?? name ?? "Service"
    }

    var listingSlug: String {
        if let s = serviceSlug?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty {
            return s
        }
        if let p = path?.trimmingCharacters(in: CharacterSet(charactersIn: "/")), !p.isEmpty {
            if p.hasPrefix("marketplace/") {
                return String(p.dropFirst("marketplace/".count))
            }
            return p
        }
        return serviceId ?? id
    }
}

struct FavoriteBusiness: Identifiable, Decodable, Hashable {
    var id: String
    var businessId: String?
    var businessName: String
    var category: String?
    var image: String?
    var imageUrl: String?
    var rating: Double?
    var reviewsCount: Int?
    var businessSlug: String?

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let s = try? c.decode(String.self, forKey: .id) {
            id = s
        } else if let i = try? c.decode(Int.self, forKey: .id) {
            id = String(i)
        } else {
            id = ""
        }
        if let v = try? c.decode(String.self, forKey: .businessId) {
            businessId = v
        } else if let v = try? c.decode(Int.self, forKey: .businessId) {
            businessId = String(v)
        } else {
            businessId = nil
        }
        businessName = try c.decodeIfPresent(String.self, forKey: .businessName) ?? ""
        category = try c.decodeIfPresent(String.self, forKey: .category)
        image = try c.decodeIfPresent(String.self, forKey: .image)
        imageUrl = try c.decodeIfPresent(String.self, forKey: .imageUrl)
        rating = try c.decodeIfPresent(Double.self, forKey: .rating)
        reviewsCount = try c.decodeIfPresent(Int.self, forKey: .reviewsCount)
        businessSlug = try c.decodeIfPresent(String.self, forKey: .businessSlug)
    }

    enum CodingKeys: String, CodingKey {
        case id
        case businessId
        case businessName
        case category
        case image
        case imageUrl
        case rating
        case reviewsCount
        case businessSlug
    }
}

struct FavoriteAdvertisement: Identifiable, Decodable, Hashable {
    var id: String
    var advertisementId: String?
    var name: String?
    var title: String?
    var path: String?
    var link: String?
    var imageUrl: String?
    var image: String?
    var priceLabel: String?
    var rating: Double?
    var reviewsCount: Int?
    var category: String?
    var businessName: String?
    var slug: String?

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let s = try? c.decode(String.self, forKey: .id) {
            id = s
        } else if let i = try? c.decode(Int.self, forKey: .id) {
            id = String(i)
        } else {
            id = ""
        }
        if let aid = try? c.decode(String.self, forKey: .advertisementId) {
            advertisementId = aid
        } else if let aid = try? c.decode(Int.self, forKey: .advertisementId) {
            advertisementId = String(aid)
        } else {
            advertisementId = nil
        }
        name = try c.decodeIfPresent(String.self, forKey: .name)
        title = try c.decodeIfPresent(String.self, forKey: .title)
        path = try c.decodeIfPresent(String.self, forKey: .path)
        link = try c.decodeIfPresent(String.self, forKey: .link)
        imageUrl = try c.decodeIfPresent(String.self, forKey: .imageUrl)
        image = try c.decodeIfPresent(String.self, forKey: .image)
        priceLabel = try c.decodeIfPresent(String.self, forKey: .priceLabel)
        rating = try c.decodeIfPresent(Double.self, forKey: .rating)
        reviewsCount = try c.decodeIfPresent(Int.self, forKey: .reviewsCount)
        category = try c.decodeIfPresent(String.self, forKey: .category)
        businessName = try c.decodeIfPresent(String.self, forKey: .businessName)
        slug = try c.decodeIfPresent(String.self, forKey: .slug)
            ?? (try c.decodeIfPresent(String.self, forKey: .advertisementSlug))
    }

    enum CodingKeys: String, CodingKey {
        case id
        case advertisementId
        case name, title, path, link, imageUrl, image, priceLabel, rating, reviewsCount, category, businessName
        case slug
        case advertisementSlug
    }

    var displayTitle: String {
        title ?? name ?? "Advertisement"
    }

    var listingSlug: String {
        if let s = slug, !s.isEmpty { return s }
        if let p = path?.trimmingCharacters(in: CharacterSet(charactersIn: "/")), p.hasPrefix("marketplace/") {
            return String(p.dropFirst("marketplace/".count))
        }
        return advertisementId ?? id
    }
}

struct ClientProfile: Codable {
    var id: Int?
    var firstName: String?
    var lastName: String?
    var name: String?
    var email: String?
    var phone: String?
    var avatar: String?
    var city: String?
    var state: String?
    var address: String?
    var zipCode: String?
}

struct UpdateProfileBody: Encodable {
    var firstName: String?
    var lastName: String?
    var phone: String?
    var address: String?
    var city: String?
    var state: String?
    var zipCode: String?

    enum CodingKeys: String, CodingKey {
        case firstName = "first_name"
        case lastName = "last_name"
        case phone, address, city, state
        case zipCode = "zip_code"
    }
}
