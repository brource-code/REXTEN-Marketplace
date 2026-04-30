import Foundation
import SwiftUI

private let userDefaultsKey = "rexten.auth.user.json"

@MainActor
final class AuthManager: ObservableObject {
    static let shared = AuthManager()

    @Published private(set) var isLoggedIn: Bool
    @Published private(set) var user: AuthUser?

    private let api = APIClient.shared
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()
    /// Ответы `auth/login`, `auth/register`, `auth/email/verify-code`: явные ключи `access_token` в `LoginEnvelope` / `RegisterEnvelope`.
    private let authResponseDecoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .useDefaultKeys
        return d
    }()

    private init() {
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let hasToken = KeychainStore.accessToken != nil
        isLoggedIn = hasToken
        user = Self.loadUserFromDefaults()
    }

    func login(email: String, password: String, locale: String? = nil) async throws {
        do {
            let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
            let body = LoginRequest(email: trimmedEmail, password: password, locale: locale)
            let data = try await api.postPublic(path: "auth/login", body: body)
            let env = try authResponseDecoder.decode(LoginEnvelope.self, from: data)
            guard let token = env.token, let u = env.resolvedUser else {
                throw APIError.httpStatus(422, "Missing token or user")
            }
            KeychainStore.accessToken = token
            if let r = env.refresh {
                KeychainStore.refreshToken = r
            }
            user = u
            isLoggedIn = true
            saveUserToDefaults(u)
        } catch {
            throw Self.normalizedAuthError(error)
        }
    }

    func register(
        email: String,
        password: String,
        firstName: String?,
        lastName: String?,
        phone: String? = nil,
        role: String = "CLIENT",
        company: RegisterCompany? = nil
    ) async throws -> Bool {
        do {
            var body = RegisterRequest(
                email: email,
                password: password,
                passwordConfirmation: password,
                firstName: firstName?.trimmingCharacters(in: .whitespaces) ?? "-",
                lastName: lastName?.trimmingCharacters(in: .whitespaces) ?? "-",
                role: role
            )
            body.phone = phone?.trimmingCharacters(in: .whitespaces)
            body.company = company
            let data = try await api.postPublic(path: "auth/register", body: body)
            let env = try authResponseDecoder.decode(RegisterEnvelope.self, from: data)
            if env.requiresEmailVerification == true {
                return true
            }
            guard let token = env.token, let u = env.resolvedUser else {
                throw APIError.httpStatus(422, "Registration response incomplete")
            }
            KeychainStore.accessToken = token
            if let r = env.refresh {
                KeychainStore.refreshToken = r
            }
            user = u
            isLoggedIn = true
            saveUserToDefaults(u)
            return false
        } catch {
            throw Self.normalizedAuthError(error)
        }
    }

    func signInWithGoogle() async throws {
        let helper = GoogleAuthHelper()
        let startURL = try GoogleOAuthURLBuilder.iosRedirectStartURL()
        let callbackURL = try await helper.signIn(
            startURL: startURL,
            callbackURLScheme: APIConfig.googleCallbackURLScheme
        )
        let tokens = try GoogleOAuthURLBuilder.parseTokens(from: callbackURL)
        KeychainStore.accessToken = tokens.access
        if let r = tokens.refresh, !r.isEmpty {
            KeychainStore.refreshToken = r
        } else {
            KeychainStore.refreshToken = nil
        }
        let u: AuthUser = try await api.decode(AuthUser.self, path: "auth/me")
        user = u
        isLoggedIn = true
        saveUserToDefaults(u)
    }

    func verifyEmail(email: String, code: String) async throws {
        do {
            let data = try await api.postPublic(path: "auth/email/verify-code", body: VerifyEmailRequest(email: email, code: code))
            let env = try authResponseDecoder.decode(LoginEnvelope.self, from: data)
            guard let token = env.token, let u = env.resolvedUser else {
                throw APIError.httpStatus(422, "Verification failed")
            }
            KeychainStore.accessToken = token
            if let r = env.refresh {
                KeychainStore.refreshToken = r
            }
            user = u
            isLoggedIn = true
            saveUserToDefaults(u)
        } catch {
            throw Self.normalizedAuthError(error)
        }
    }

    func logout() async {
        _ = try? await api.data(path: "auth/logout", method: "POST", requiresAuth: true)
        KeychainStore.clearAll()
        UserDefaults.standard.removeObject(forKey: userDefaultsKey)
        user = nil
        isLoggedIn = false
    }

    func refreshMe() async {
        guard isLoggedIn else { return }
        do {
            let u: AuthUser = try await api.decode(AuthUser.self, path: "auth/me")
            user = u
            saveUserToDefaults(u)
        } catch {
            // ignore
        }
    }

    private static func loadUserFromDefaults() -> AuthUser? {
        guard let d = UserDefaults.standard.data(forKey: userDefaultsKey) else { return nil }
        let dec = JSONDecoder()
        dec.keyDecodingStrategy = .convertFromSnakeCase
        return try? dec.decode(AuthUser.self, from: d)
    }

    private func saveUserToDefaults(_ u: AuthUser) {
        if let d = try? encoder.encode(u) {
            UserDefaults.standard.set(d, forKey: userDefaultsKey)
        }
    }

    /// Человекочитаемое сообщение из JSON Laravel (`message`, `errors`).
    private static func normalizedAuthError(_ error: Error) -> Error {
        guard case APIError.httpStatus(let code, let body) = error,
              let body,
              let data = body.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return error
        }
        if let msg = obj["message"] as? String, !msg.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return NSError(domain: "Auth", code: code, userInfo: [NSLocalizedDescriptionKey: msg])
        }
        if let errs = obj["errors"] as? [String: Any] {
            for (_, val) in errs {
                if let arr = val as? [String], let first = arr.first, !first.isEmpty {
                    return NSError(domain: "Auth", code: code, userInfo: [NSLocalizedDescriptionKey: first])
                }
            }
        }
        return error
    }
}
