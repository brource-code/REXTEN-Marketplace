import SwiftUI

struct GuestTabView: View {
    @Environment(\.appTheme) private var theme

    var body: some View {
        TabView {
            NavigationStack {
                CatalogView()
            }
            .tabItem { Label("Главная", systemImage: "house.fill") }

            NavigationStack {
                LoginView()
            }
            .tabItem { Label("Профиль", systemImage: "person.circle") }
        }
        .tint(theme.primary)
    }
}
