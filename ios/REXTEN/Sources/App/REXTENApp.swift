import SwiftUI

@main
struct REXTENApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(AuthManager.shared)
                .withAppTheme()
        }
    }
}
