import Foundation

struct AuthUser: Codable, Equatable, Identifiable {
    var id: String
    var email: String?
    var firstName: String?
    var lastName: String?
    var name: String?
    var role: String?

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case firstName
        case lastName
        case name
        case role
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
        email = try c.decodeIfPresent(String.self, forKey: .email)
        firstName = try c.decodeIfPresent(String.self, forKey: .firstName)
        lastName = try c.decodeIfPresent(String.self, forKey: .lastName)
        name = try c.decodeIfPresent(String.self, forKey: .name)
        role = try c.decodeIfPresent(String.self, forKey: .role)
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encodeIfPresent(email, forKey: .email)
        try c.encodeIfPresent(firstName, forKey: .firstName)
        try c.encodeIfPresent(lastName, forKey: .lastName)
        try c.encodeIfPresent(name, forKey: .name)
        try c.encodeIfPresent(role, forKey: .role)
    }

    var displayName: String {
        if let n = name, !n.isEmpty { return n }
        let fn = firstName ?? ""
        let ln = lastName ?? ""
        let combined = "\(fn) \(ln)".trimmingCharacters(in: .whitespaces)
        if !combined.isEmpty { return combined }
        return email ?? "Client"
    }
}

struct LoginRequest: Encodable {
    let email: String
    let password: String
    /// Совпадает с вебом (`auth.ts`): язык писем при необходимости OTP
    var locale: String?

    enum CodingKeys: String, CodingKey {
        case email
        case password
        case locale
    }
}

struct RegisterCompany: Encodable {
    let name: String
    let address: String
    let phone: String
    var email: String?
    var website: String?
    var description: String?
}

struct RegisterRequest: Encodable {
    let email: String
    let password: String
    let passwordConfirmation: String
    let firstName: String
    let lastName: String
    let role: String
    var phone: String?
    var company: RegisterCompany?

    enum CodingKeys: String, CodingKey {
        case email, password, role, phone, company
        case passwordConfirmation
        case firstName
        case lastName
    }
}

struct VerifyEmailRequest: Encodable {
    let email: String
    let code: String
}

/// Ответ логина. Декодируется через `JSONDecoder` с **`keyDecodingStrategy = .useDefaultKeys`** (см. `AuthManager.authResponseDecoder`):
/// Laravel отдаёт `access_token` / `refresh_token`, без конфликта с `.convertFromSnakeCase`.
struct LoginEnvelope: Decodable {
    let accessToken: String?
    let refreshToken: String?
    /// Редкий ключ `token` вместо `access_token`
    let tokenAlt: String?
    let user: AuthUser?
    let data: LoginData?

    struct LoginData: Decodable {
        let accessToken: String?
        let tokenAlt: String?
        let refreshToken: String?
        let user: AuthUser?

        enum CodingKeys: String, CodingKey {
            case accessToken = "access_token"
            case tokenAlt = "token"
            case refreshToken = "refresh_token"
            case user
        }
    }

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case tokenAlt = "token"
        case user
        case data
    }

    var token: String? {
        accessToken ?? tokenAlt ?? data?.accessToken ?? data?.tokenAlt
    }

    var refresh: String? {
        refreshToken ?? data?.refreshToken
    }

    var resolvedUser: AuthUser? {
        user ?? data?.user
    }
}

struct RegisterEnvelope: Decodable {
    let requiresEmailVerification: Bool?
    let email: String?
    let accessToken: String?
    let refreshToken: String?
    let user: AuthUser?
    let data: LoginEnvelope.LoginData?

    enum CodingKeys: String, CodingKey {
        case requiresEmailVerification = "requires_email_verification"
        case email
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case user
        case data
    }

    var token: String? {
        accessToken ?? data?.accessToken ?? data?.tokenAlt
    }

    var refresh: String? {
        refreshToken ?? data?.refreshToken
    }

    var resolvedUser: AuthUser? {
        user ?? data?.user
    }
}
