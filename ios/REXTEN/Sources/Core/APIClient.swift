import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case noData
    case httpStatus(Int, String?)
    case decoding(Error)
    case unauthorized

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .noData: return "Empty response"
        case .httpStatus(let code, let body): return "HTTP \(code): \(body ?? "")"
        case .decoding(let e): return e.localizedDescription
        case .unauthorized: return "Unauthorized"
        }
    }
}

/// HTTP-клиент к Laravel API: Bearer, refresh при 401 (как `auth.ts` в RN).
final class APIClient: @unchecked Sendable {
    static let shared = APIClient()

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    private let refreshLock = NSLock()

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        session = URLSession(configuration: config)
        decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
    }

    func buildURL(path: String, query: [String: String] = [:]) throws -> URL {
        let items = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        return try buildURL(path: path, queryItems: items)
    }

    func buildURL(path: String, queryItems: [URLQueryItem]) throws -> URL {
        let base = APIConfig.resolvedApiRootURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let p = path.hasPrefix("/") ? String(path.dropFirst()) : path
        guard var comp = URLComponents(string: "\(base)/\(p)") else { throw APIError.invalidURL }
        if !queryItems.isEmpty {
            comp.queryItems = queryItems
        }
        guard let url = comp.url else { throw APIError.invalidURL }
        return url
    }

    func dataPublic(path: String, method: String = "GET", query: [String: String] = [:], queryItems: [URLQueryItem]? = nil, body: Data? = nil) async throws -> Data {
        try await perform(path: path, method: method, query: query, queryItems: queryItems, body: body, requiresAuth: false, allowRetry: false)
    }

    func data(path: String, method: String = "GET", query: [String: String] = [:], queryItems: [URLQueryItem]? = nil, body: Data? = nil, requiresAuth: Bool = true) async throws -> Data {
        try await perform(path: path, method: method, query: query, queryItems: queryItems, body: body, requiresAuth: requiresAuth, allowRetry: true)
    }

    func decode<T: Decodable>(_ type: T.Type, path: String, method: String = "GET", query: [String: String] = [:], queryItems: [URLQueryItem]? = nil, body: Data? = nil, requiresAuth: Bool = true) async throws -> T {
        let data = try await self.data(path: path, method: method, query: query, queryItems: queryItems, body: body, requiresAuth: requiresAuth)
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }

    func decodePublic<T: Decodable>(_ type: T.Type, path: String, method: String = "GET", query: [String: String] = [:], queryItems: [URLQueryItem]? = nil, body: Data? = nil) async throws -> T {
        let data = try await dataPublic(path: path, method: method, query: query, queryItems: queryItems, body: body)
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }

    func postPublic(path: String, body: some Encodable) async throws -> Data {
        let d = try encoder.encode(body)
        return try await dataPublic(path: path, method: "POST", query: [:], body: d)
    }

    func postAuth(path: String, body: some Encodable) async throws -> Data {
        let d = try encoder.encode(body)
        return try await data(path: path, method: "POST", query: [:], body: d, requiresAuth: true)
    }

    func putAuth(path: String, body: some Encodable) async throws -> Data {
        let d = try encoder.encode(body)
        return try await data(path: path, method: "PUT", query: [:], body: d, requiresAuth: true)
    }

    func deleteAuth(path: String) async throws -> Data {
        try await data(path: path, method: "DELETE", query: [:], body: nil, requiresAuth: true)
    }

    private func perform(path: String, method: String, query: [String: String], queryItems: [URLQueryItem]?, body: Data?, requiresAuth: Bool, allowRetry: Bool) async throws -> Data {
        let url: URL
        if let qi = queryItems {
            url = try buildURL(path: path, queryItems: qi)
        } else {
            url = try buildURL(path: path, query: query)
        }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if body != nil {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        req.httpBody = body

        if requiresAuth, let token = KeychainStore.accessToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, resp) = try await session.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw APIError.noData }

        if http.statusCode == 401, requiresAuth, allowRetry {
            let refreshed = try await refreshTokens()
            if refreshed {
                return try await perform(path: path, method: method, query: query, queryItems: queryItems, body: body, requiresAuth: requiresAuth, allowRetry: false)
            }
            throw APIError.unauthorized
        }

        guard (200 ... 299).contains(http.statusCode) else {
            let text = String(data: data, encoding: .utf8)
            throw APIError.httpStatus(http.statusCode, text)
        }
        return data
    }

    private func refreshTokens() async throws -> Bool {
        refreshLock.lock()
        defer { refreshLock.unlock() }
        guard let refresh = KeychainStore.refreshToken, !refresh.isEmpty else { return false }

        let url = try buildURL(path: "auth/refresh")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body = try encoder.encode(RefreshRequest(refreshToken: refresh))
        req.httpBody = body

        let (data, resp) = try await session.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200 ... 299).contains(http.statusCode) else {
            KeychainStore.clearAll()
            return false
        }

        let parsed = try decoder.decode(RefreshResponse.self, from: data)
        let access = parsed.resolvedAccess
        guard let access else {
            KeychainStore.clearAll()
            return false
        }
        KeychainStore.accessToken = access
        if let newRefresh = parsed.resolvedRefresh {
            KeychainStore.refreshToken = newRefresh
        }
        return true
    }
}

private struct RefreshRequest: Encodable {
    let refreshToken: String
}

private struct RefreshResponse: Decodable {
    let accessToken: String?
    let token: String?
    let refreshToken: String?
    let data: RefreshBody?

    enum CodingKeys: String, CodingKey {
        case accessToken
        case token
        case refreshToken
        case data
    }

    var resolvedAccess: String? {
        accessToken ?? token ?? data?.accessToken ?? data?.token
    }

    var resolvedRefresh: String? {
        refreshToken ?? data?.refreshToken
    }
}

private struct RefreshBody: Decodable {
    let accessToken: String?
    let token: String?
    let refreshToken: String?
}
