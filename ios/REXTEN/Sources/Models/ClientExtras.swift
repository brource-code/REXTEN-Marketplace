import Foundation

struct ClientReview: Identifiable, Decodable {
    let id: Int
    var businessName: String?
    var businessSlug: String?
    var serviceName: String?
    var rating: Double
    var comment: String?
    var createdAt: String?
    var response: String?
    var responseAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case businessName
        case businessSlug
        case serviceName
        case rating
        case comment
        case createdAt
        case response
        case responseAt
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
        businessName = try c.decodeIfPresent(String.self, forKey: .businessName)
        businessSlug = try c.decodeIfPresent(String.self, forKey: .businessSlug)
        serviceName = try c.decodeIfPresent(String.self, forKey: .serviceName)
        rating = try c.decodeIfPresent(Double.self, forKey: .rating) ?? 0
        comment = try c.decodeIfPresent(String.self, forKey: .comment)
        createdAt = try c.decodeIfPresent(String.self, forKey: .createdAt)
        response = try c.decodeIfPresent(String.self, forKey: .response)
        responseAt = try c.decodeIfPresent(String.self, forKey: .responseAt)
    }
}

struct PendingReview: Identifiable, Decodable {
    let id: Int
    var orderId: Int?
    var bookingId: Int?
    var serviceName: String?
    var businessName: String?
    var businessSlug: String?
    var date: String?
    var time: String?
    var price: Double?
    var completedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case orderId
        case bookingId
        case serviceName
        case businessName
        case businessSlug
        case date
        case time
        case price
        case completedAt
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
        orderId = try? c.decode(Int.self, forKey: .orderId)
        bookingId = try? c.decode(Int.self, forKey: .bookingId)
        serviceName = try c.decodeIfPresent(String.self, forKey: .serviceName)
        businessName = try c.decodeIfPresent(String.self, forKey: .businessName)
        businessSlug = try c.decodeIfPresent(String.self, forKey: .businessSlug)
        date = try c.decodeIfPresent(String.self, forKey: .date)
        time = try c.decodeIfPresent(String.self, forKey: .time)
        price = try c.decodeIfPresent(Double.self, forKey: .price)
        completedAt = try c.decodeIfPresent(String.self, forKey: .completedAt)
    }
}

struct CreateReviewBody: Encodable {
    var orderId: Int?
    var bookingId: Int?
    var rating: Int
    var comment: String
}

struct DiscountItem: Identifiable, Decodable {
    let id: Int
    var code: String?
    var title: String?
    var description: String?
    var discountType: String?
    var discountValue: Double?
    var businessName: String?
    var businessSlug: String?
    var validUntil: String?
    var isActive: Bool?
    var isUsed: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case code
        case title
        case description
        case discountType
        case discountValue
        case businessName
        case businessSlug
        case validUntil
        case isActive
        case isUsed
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
        code = try c.decodeIfPresent(String.self, forKey: .code)
        title = try c.decodeIfPresent(String.self, forKey: .title)
        description = try c.decodeIfPresent(String.self, forKey: .description)
        discountType = try c.decodeIfPresent(String.self, forKey: .discountType)
        if let d = try? c.decode(Double.self, forKey: .discountValue) {
            discountValue = d
        } else if let i = try? c.decode(Int.self, forKey: .discountValue) {
            discountValue = Double(i)
        } else {
            discountValue = nil
        }
        businessName = try c.decodeIfPresent(String.self, forKey: .businessName)
        businessSlug = try c.decodeIfPresent(String.self, forKey: .businessSlug)
        validUntil = try c.decodeIfPresent(String.self, forKey: .validUntil)
        isActive = try c.decodeIfPresent(Bool.self, forKey: .isActive)
        isUsed = try c.decodeIfPresent(Bool.self, forKey: .isUsed)
    }
}

struct BonusItem: Identifiable, Decodable {
    let id: Int
    var title: String?
    var description: String?
    var bonusType: String?
    var bonusValue: Double?
    var businessName: String?
    var businessSlug: String?
    var validUntil: String?
    var isActive: Bool?
    var isUsed: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case description
        case bonusType
        case bonusValue
        case businessName
        case businessSlug
        case validUntil
        case isActive
        case isUsed
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
        title = try c.decodeIfPresent(String.self, forKey: .title)
        description = try c.decodeIfPresent(String.self, forKey: .description)
        bonusType = try c.decodeIfPresent(String.self, forKey: .bonusType)
        if let d = try? c.decode(Double.self, forKey: .bonusValue) {
            bonusValue = d
        } else if let i = try? c.decode(Int.self, forKey: .bonusValue) {
            bonusValue = Double(i)
        } else {
            bonusValue = nil
        }
        businessName = try c.decodeIfPresent(String.self, forKey: .businessName)
        businessSlug = try c.decodeIfPresent(String.self, forKey: .businessSlug)
        validUntil = try c.decodeIfPresent(String.self, forKey: .validUntil)
        isActive = try c.decodeIfPresent(Bool.self, forKey: .isActive)
        isUsed = try c.decodeIfPresent(Bool.self, forKey: .isUsed)
    }
}

struct NotificationSettings: Codable, Equatable {
    var email: Bool
    var sms: Bool
    var telegram: Bool
    var push: Bool

    static let `default` = NotificationSettings(email: true, sms: false, telegram: false, push: true)
}
