import Foundation

enum ImageURL {
    /// Нормализация относительных путей картинок (как в RN).
    static func absoluteURL(from raw: String?) -> URL? {
        guard var s = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty else { return nil }
        if s.hasPrefix("http://") || s.hasPrefix("https://") {
            return URL(string: s)
        }
        if s.hasPrefix("//") {
            return URL(string: "https:" + s)
        }
        if !s.hasPrefix("/") {
            s = "/" + s
        }
        let root = APIConfig.resolvedApiRootURL.deletingLastPathComponent()
        return URL(string: root.absoluteString + s)
    }
}
