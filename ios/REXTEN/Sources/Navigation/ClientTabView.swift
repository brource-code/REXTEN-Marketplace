import SwiftUI

struct ClientTabView: View {
    @Environment(\.appTheme) private var theme

    var body: some View {
        TabView {
            NavigationStack {
                CatalogView()
            }
            .tabItem { Label("Главная", systemImage: "house.fill") }

            NavigationStack {
                FavoritesView()
            }
            .tabItem { Label("Избранное", systemImage: "heart.fill") }

            NavigationStack {
                BookingsListView()
            }
            .tabItem { Label("Бронирования", systemImage: "calendar") }

            NavigationStack {
                MessagesPlaceholderView()
            }
            .tabItem { Label("Сообщения", systemImage: "message.fill") }

            NavigationStack {
                ProfileView()
            }
            .tabItem { Label("Профиль", systemImage: "person.circle.fill") }
        }
        .tint(theme.primary)
    }
}

/// Заглушка экрана Сообщений (функционал в разработке).
private struct MessagesPlaceholderView: View {
    @Environment(\.appTheme) private var theme
    var body: some View {
        EmptyStateView(
            title: "Сообщения",
            message: "Этот раздел появится в ближайшем обновлении.",
            systemImage: "message"
        )
        .navigationTitle("Сообщения")
        .background(theme.background.ignoresSafeArea())
    }
}
