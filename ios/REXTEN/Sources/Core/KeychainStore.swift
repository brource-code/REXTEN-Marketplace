import Foundation
import Security

enum KeychainStore {
    private static let service = "com.rexten.client.keychain"
    private static let accessKey = "access_token"
    private static let refreshKey = "refresh_token"

    static var accessToken: String? {
        get { read(accessKey) }
        set { if let v = newValue { save(accessKey, v) } else { delete(accessKey) } }
    }

    static var refreshToken: String? {
        get { read(refreshKey) }
        set { if let v = newValue { save(refreshKey, v) } else { delete(refreshKey) } }
    }

    static func clearAll() {
        delete(accessKey)
        delete(refreshKey)
    }

    private static func save(_ account: String, _ value: String) {
        delete(account)
        let data = Data(value.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    private static func read(_ account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var out: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &out)
        guard status == errSecSuccess, let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private static func delete(_ account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(query as CFDictionary)
    }
}
