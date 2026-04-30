import Foundation
import OSLog

enum AppLogger {
    private static let log = Logger(subsystem: "com.rexten.client", category: "app")

    static func debug(_ message: String) {
        log.debug("\(message, privacy: .public)")
    }

    static func error(_ message: String) {
        log.error("\(message, privacy: .public)")
    }
}
