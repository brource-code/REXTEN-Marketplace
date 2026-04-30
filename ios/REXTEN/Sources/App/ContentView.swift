import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var auth: AuthManager

    var body: some View {
        Group {
            if auth.isLoggedIn {
                ClientTabView()
            } else {
                GuestTabView()
            }
        }
    }
}
