import Foundation

/// Базовый URL Laravel API (как `EXPO_PUBLIC_API_BASE_URL` в RN).
enum APIConfig {
    /// Переопределение: схема Xcode → Run → Arguments → Environment → `REXTEN_API_BASE`
    static var baseURL: URL {
        if let raw = ProcessInfo.processInfo.environment["REXTEN_API_BASE"]?.trimmingCharacters(in: .whitespacesAndNewlines),
           !raw.isEmpty,
           let u = URL(string: raw) {
            return u
        }
        return URL(string: "https://api.rexten.live/api")!
    }

    /// Нормализованный корень `routes/api.php`: в конце всегда есть сегмент `/api`.
    /// Если в `REXTEN_API_BASE` забыли `/api` (например `https://api.rexten.live`), запросы попадут не в Laravel — отсюда «Google открывает наш сайт».
    static var resolvedApiRootURL: URL {
        guard var comp = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else { return baseURL }
        var path = comp.path
        while path.hasSuffix("/") { path.removeLast() }
        if path.lowercased().hasSuffix("/api") {
            comp.path = path.isEmpty ? "/api" : path
            return comp.url ?? baseURL
        }
        if path.isEmpty || path == "/" {
            comp.path = "/api"
        } else {
            comp.path = path + "/api"
        }
        return comp.url ?? baseURL
    }

    /// Схема URL для `ASWebAuthenticationSession` (совпадает с `CFBundleURLSchemes` и `GOOGLE_IOS_REDIRECT_URI` на сервере).
    static var googleCallbackURLScheme: String {
        if let s = ProcessInfo.processInfo.environment["REXTEN_GOOGLE_CALLBACK_SCHEME"]?.trimmingCharacters(in: .whitespacesAndNewlines),
           !s.isEmpty {
            return s
        }
        return "com.rexten.client"
    }
}
