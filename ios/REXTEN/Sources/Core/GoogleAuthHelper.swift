import AuthenticationServices
import Foundation
import UIKit

enum GoogleAuthError: LocalizedError {
    case missingToken
    case sessionStartFailed
    case noWindow

    var errorDescription: String? {
        switch self {
        case .missingToken: return "No access token in Google callback URL."
        case .sessionStartFailed: return "Could not start sign-in browser session."
        case .noWindow: return "No window for Google sign-in."
        }
    }
}

/// OAuth через браузер: `GET /auth/google/redirect?ios=1` → Google → callback → редирект на `com.rexten.client://…` (см. бэкенд `GoogleAuthController`).
@MainActor
final class GoogleAuthHelper: NSObject, ASWebAuthenticationPresentationContextProviding {
    private var session: ASWebAuthenticationSession?

    func signIn(startURL: URL, callbackURLScheme: String) async throws -> URL {
        try await withCheckedThrowingContinuation { cont in
            session = ASWebAuthenticationSession(url: startURL, callbackURLScheme: callbackURLScheme) { [weak self] callbackURL, error in
                self?.session = nil
                if let error = error {
                    cont.resume(throwing: error)
                    return
                }
                guard let callbackURL else {
                    cont.resume(throwing: GoogleAuthError.missingToken)
                    return
                }
                cont.resume(returning: callbackURL)
            }
            session?.presentationContextProvider = self
            session?.prefersEphemeralWebBrowserSession = false
            guard session?.start() == true else {
                session = nil
                cont.resume(throwing: GoogleAuthError.sessionStartFailed)
                return
            }
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let windows = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
        if let w = windows.first(where: { $0.isKeyWindow }) { return w }
        if let w = windows.first { return w }
        assertionFailure("GoogleAuthHelper: no UIWindow for ASWebAuthenticationSession")
        return UIWindow()
    }
}

enum GoogleOAuthURLBuilder {
    static func iosRedirectStartURL() throws -> URL {
        let base = APIConfig.resolvedApiRootURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard var comp = URLComponents(string: "\(base)/auth/google/redirect") else {
            throw URLError(.badURL)
        }
        comp.queryItems = [URLQueryItem(name: "ios", value: "1")]
        guard let url = comp.url else { throw URLError(.badURL) }
        return url
    }

    static func parseTokens(from callbackURL: URL) throws -> (access: String, refresh: String?) {
        guard let items = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false)?.queryItems else {
            throw GoogleAuthError.missingToken
        }
        func val(_ name: String) -> String? {
            guard let raw = items.first(where: { $0.name == name })?.value else { return nil }
            return raw.removingPercentEncoding ?? raw
        }
        let access = val("access_token") ?? val("token")
        guard let access, !access.isEmpty else { throw GoogleAuthError.missingToken }
        let refresh = val("refresh_token")
        return (access, refresh)
    }
}
