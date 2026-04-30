import Foundation

enum JSONHelpers {
    static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    static func decodeServices(_ data: Data) throws -> [Service] {
        if let arr = try? decoder.decode([Service].self, from: data) {
            return arr
        }
        struct Wrap: Decodable { let data: [Service]? }
        let w = try decoder.decode(Wrap.self, from: data)
        return w.data ?? []
    }

    static func decodeServiceProfile(_ data: Data) throws -> ServiceProfile {
        struct Root: Decodable {
            let data: ServiceProfile?
            let service: Service?
        }
        if let p = try? decoder.decode(ServiceProfile.self, from: data) {
            return p
        }
        let r = try decoder.decode(Root.self, from: data)
        if let d = r.data { return d }
        throw DecodingError.dataCorrupted(.init(codingPath: [], debugDescription: "Invalid profile JSON"))
    }

    static func decodeClientBookings(_ data: Data) throws -> [ClientBooking] {
        if let arr = try? decoder.decode([ClientBooking].self, from: data) {
            return arr
        }
        struct Wrap: Decodable { let data: [ClientBooking]? }
        let w = try decoder.decode(Wrap.self, from: data)
        return w.data ?? []
    }

    static func decodeFavoriteAds(_ data: Data) throws -> [FavoriteAdvertisement] {
        if let arr = try? decoder.decode([FavoriteAdvertisement].self, from: data) {
            return arr
        }
        struct Wrap: Decodable { let data: [FavoriteAdvertisement]? }
        let w = try decoder.decode(Wrap.self, from: data)
        return w.data ?? []
    }

    static func decodeClientProfile(_ data: Data) throws -> ClientProfile {
        if let p = try? decoder.decode(ClientProfile.self, from: data) {
            return p
        }
        struct Wrap: Decodable { let data: ClientProfile? }
        let w = try decoder.decode(Wrap.self, from: data)
        guard let p = w.data else {
            throw DecodingError.dataCorrupted(.init(codingPath: [], debugDescription: "No profile"))
        }
        return p
    }

    static func decodeSlots(_ data: Data) throws -> [AvailableSlot] {
        if let arr = try? decoder.decode([AvailableSlot].self, from: data) {
            return arr
        }
        struct Wrap: Decodable {
            let slots: [AvailableSlot]?
            let data: [AvailableSlot]?
        }
        let w = try decoder.decode(Wrap.self, from: data)
        return w.slots ?? w.data ?? []
    }

    static func decodeFavoriteServices(_ data: Data) throws -> [FavoriteService] {
        if let arr = try? decoder.decode([FavoriteService].self, from: data) {
            return arr
        }
        struct Wrap: Decodable { let data: [FavoriteService]? }
        let w = try decoder.decode(Wrap.self, from: data)
        return w.data ?? []
    }

    static func decodeFavoriteBusinesses(_ data: Data) throws -> [FavoriteBusiness] {
        if let arr = try? decoder.decode([FavoriteBusiness].self, from: data) {
            return arr
        }
        struct Wrap: Decodable { let data: [FavoriteBusiness]? }
        let w = try decoder.decode(Wrap.self, from: data)
        return w.data ?? []
    }

    static func decodeClientReviews(_ data: Data) throws -> [ClientReview] {
        if let arr = try? decoder.decode([ClientReview].self, from: data) {
            return arr
        }
        struct Wrap: Decodable { let data: [ClientReview]? }
        let w = try decoder.decode(Wrap.self, from: data)
        return w.data ?? []
    }

    static func decodePendingReviews(_ data: Data) throws -> [PendingReview] {
        if let arr = try? decoder.decode([PendingReview].self, from: data) {
            return arr
        }
        struct Wrap: Decodable { let data: [PendingReview]? }
        let w = try decoder.decode(Wrap.self, from: data)
        return w.data ?? []
    }

    static func decodeDiscounts(_ data: Data) throws -> [DiscountItem] {
        if let arr = try? decoder.decode([DiscountItem].self, from: data) {
            return arr
        }
        struct Wrap: Decodable { let data: [DiscountItem]? }
        let w = try decoder.decode(Wrap.self, from: data)
        return w.data ?? []
    }

    static func decodeBonuses(_ data: Data) throws -> [BonusItem] {
        if let arr = try? decoder.decode([BonusItem].self, from: data) {
            return arr
        }
        struct Wrap: Decodable { let data: [BonusItem]? }
        let w = try decoder.decode(Wrap.self, from: data)
        return w.data ?? []
    }

    static func decodeNotificationSettings(_ data: Data) -> NotificationSettings {
        if let s = try? decoder.decode(NotificationSettings.self, from: data) {
            return s
        }
        struct Wrap: Decodable { let data: NotificationSettings? }
        if let w = try? decoder.decode(Wrap.self, from: data), let s = w.data {
            return s
        }
        return .default
    }
}
