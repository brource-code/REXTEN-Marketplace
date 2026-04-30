import SwiftUI

struct ProfileView: View {
    @Environment(\.appTheme) private var theme
    @EnvironmentObject private var auth: AuthManager
    @StateObject private var model = ProfileViewModel()
    @State private var showSettings = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                headerCard
                statsRow
                menuGroup1
                menuGroup2
                logoutButton
                    .padding(.top, 8)
                    .padding(.bottom, 32)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }
        .background(theme.backgroundSecondary.ignoresSafeArea())
        .navigationTitle("Профиль")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: 4) {
                    NavigationLink {
                        ProfileSettingsView().environmentObject(auth)
                    } label: {
                        Image(systemName: "gearshape")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(theme.textSecondary)
                            .frame(width: 36, height: 36)
                            .background(theme.card)
                            .clipShape(Circle())
                            .overlay(Circle().stroke(theme.border, lineWidth: 1))
                    }
                    .buttonStyle(.plain)

                    NavigationLink {
                        NotificationSettingsView()
                    } label: {
                        ZStack(alignment: .topTrailing) {
                            Image(systemName: "bell")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundStyle(theme.textSecondary)
                                .frame(width: 36, height: 36)
                                .background(theme.card)
                                .clipShape(Circle())
                                .overlay(Circle().stroke(theme.border, lineWidth: 1))
                            Circle()
                                .fill(theme.primary)
                                .frame(width: 8, height: 8)
                                .offset(x: 2, y: -2)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .task { await model.load() }
        .refreshable { await model.load() }
    }

    // MARK: - Header card

    private var headerCard: some View {
        VStack(spacing: 14) {
            HStack(alignment: .top, spacing: 16) {
                avatarView

                VStack(alignment: .leading, spacing: 5) {
                    Text(displayName)
                        .font(.title3.bold())
                        .foregroundStyle(theme.text)

                    roleBadge

                    if let email = model.profile?.email ?? auth.user?.email {
                        Label(email, systemImage: "envelope")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(theme.textSecondary)
                            .lineLimit(1)
                    }

                    if let phone = model.profile?.phone, !phone.isEmpty {
                        Label(phone, systemImage: "phone")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(theme.textSecondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            Divider().background(theme.border)

            HStack {
                Label(locationLine, systemImage: "mappin")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(theme.textSecondary)
                Spacer()
                NavigationLink {
                    ProfileSettingsView().environmentObject(auth)
                } label: {
                    Text("Изменить")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(theme.primary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(16)
        .background(theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(theme.cardBorder, lineWidth: 1))
    }

    // MARK: - Stats row

    private var statsRow: some View {
        HStack(spacing: 10) {
            statCell(
                value: model.bookingsCount,
                title: "Бронирования",
                sub: "+2 за последний месяц",
                icon: "calendar",
                color: theme.primary
            )
            statCell(
                value: model.favoritesCount,
                title: "Избранное",
                sub: "Сохранённые услуги",
                icon: "heart.fill",
                color: theme.error
            )
            statCell(
                value: model.reviewsCount,
                title: "Отзывы",
                sub: "Оставлено отзывов",
                icon: "star",
                color: theme.warning
            )
            statCell(
                value: model.discountsCount,
                title: "Скидки",
                sub: "Активные предложения",
                icon: "tag.fill",
                color: Color(hex: 0xF59E0B)
            )
        }
    }

    private func statCell(value: Int, title: String, sub: String, icon: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(color)
            Text("\(value)")
                .font(.title2.bold())
                .foregroundStyle(theme.text)
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(theme.text)
                .lineLimit(1)
            Text(sub)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(theme.primary)
                .lineLimit(2)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(theme.cardBorder, lineWidth: 1))
    }

    // MARK: - Menu group 1

    private var menuGroup1: some View {
        menuCard {
            menuRow(icon: "calendar", iconColor: theme.primary, title: "Мои бронирования") {
                BookingsListView()
            }
            menuDivider
            menuRow(icon: "heart", iconColor: theme.error, title: "Избранное") {
                FavoritesView()
            }
            menuDivider
            menuRowWithBadge(icon: "star", iconColor: theme.warning, title: "Отзывы и рейтинги", badge: model.reviewsCount > 0 ? "\(model.reviewsCount)" : nil) {
                ClientReviewsView()
            }
            menuDivider
            menuRowPlain(icon: "creditcard", iconColor: Color(hex: 0x3B82F6), title: "Платежи и счета")
            menuDivider
            menuRowPlain(icon: "tag", iconColor: Color(hex: 0x8B5CF6), title: "Промокоды и скидки")
            menuDivider
            menuRow(icon: "bell", iconColor: Color(hex: 0xF59E0B), title: "Уведомления") {
                NotificationSettingsView()
            }
        }
    }

    // MARK: - Menu group 2

    private var menuGroup2: some View {
        menuCard {
            referralRow
            menuDivider
            menuRowPlain(icon: "person.2", iconColor: theme.primary, title: "Специалисты")
            menuDivider
            menuRowPlain(icon: "headphones", iconColor: theme.primary, title: "Поддержка")
            menuDivider
            menuRowPlain(icon: "info.circle", iconColor: theme.primary, title: "О приложении")
        }
    }

    private var referralRow: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(theme.primary.opacity(0.1))
                    .frame(width: 38, height: 38)
                Image(systemName: "person.2.fill")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(theme.primary)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("Пригласите друзей")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(theme.text)
                Text("Получите $20 за каждого друга")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(theme.textSecondary)
            }
            Spacer()
            Text("$20")
                .font(.subheadline.weight(.bold))
                .foregroundStyle(theme.primary)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(theme.primaryLight)
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 16)
    }

    // MARK: - Logout

    private var logoutButton: some View {
        Button(role: .destructive) {
            Task { await auth.logout() }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                    .font(.system(size: 16, weight: .semibold))
                Text("Выйти из аккаунта")
                    .font(.subheadline.weight(.semibold))
            }
            .foregroundStyle(theme.error)
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Helpers

    @ViewBuilder
    private func menuCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        VStack(spacing: 0) {
            content()
        }
        .background(theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(theme.cardBorder, lineWidth: 1))
    }

    private var menuDivider: some View {
        Divider()
            .background(theme.border)
            .padding(.leading, 66)
    }

    private func menuRow<Dest: View>(icon: String, iconColor: Color, title: String, @ViewBuilder destination: () -> Dest) -> some View {
        NavigationLink(destination: destination) {
            menuRowContent(icon: icon, iconColor: iconColor, title: title, trailing: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(theme.textMuted)
            })
        }
        .buttonStyle(.plain)
    }

    private func menuRowWithBadge<Dest: View>(icon: String, iconColor: Color, title: String, badge: String?, @ViewBuilder destination: () -> Dest) -> some View {
        NavigationLink(destination: destination) {
            menuRowContent(icon: icon, iconColor: iconColor, title: title, trailing: {
                HStack(spacing: 6) {
                    if let b = badge {
                        Text(b)
                            .font(.caption.bold())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(theme.warning)
                            .clipShape(Capsule())
                    }
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(theme.textMuted)
                }
            })
        }
        .buttonStyle(.plain)
    }

    private func menuRowPlain(icon: String, iconColor: Color, title: String) -> some View {
        menuRowContent(icon: icon, iconColor: iconColor, title: title, trailing: {
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(theme.textMuted)
        })
    }

    private func menuRowContent<Trailing: View>(icon: String, iconColor: Color, title: String, @ViewBuilder trailing: () -> Trailing) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(iconColor.opacity(0.12))
                    .frame(width: 38, height: 38)
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(iconColor)
            }
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(theme.text)
            Spacer()
            trailing()
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 16)
    }

    // MARK: - Avatar

    @ViewBuilder
    private var avatarView: some View {
        ZStack(alignment: .bottomTrailing) {
            let urlStr = model.profile?.avatar
            Group {
                if let url = ImageURL.absoluteURL(from: urlStr) {
                    AsyncImage(url: url) { ph in
                        switch ph {
                        case .success(let img): img.resizable().scaledToFill()
                        default: avatarFallback
                        }
                    }
                } else {
                    avatarFallback
                }
            }
            .frame(width: 72, height: 72)
            .clipShape(Circle())
            .overlay(Circle().stroke(theme.cardBorder, lineWidth: 2))

            Circle()
                .fill(theme.card)
                .frame(width: 24, height: 24)
                .overlay(
                    Image(systemName: "camera.fill")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(theme.textSecondary)
                )
                .overlay(Circle().stroke(theme.border, lineWidth: 1))
                .offset(x: 2, y: 2)
        }
    }

    private var avatarFallback: some View {
        theme.primaryLight
            .overlay(
                Text(String(displayName.prefix(1)).uppercased())
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(theme.primary)
            )
    }

    private var roleBadge: some View {
        let role = auth.user?.role ?? "CLIENT"
        let label = role == "BUSINESS_OWNER" ? "Бизнес" : "Клиент"
        let color = role == "BUSINESS_OWNER" ? theme.success : theme.primary
        return Text(label)
            .font(.caption.bold())
            .foregroundStyle(color)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }

    private var displayName: String {
        if let p = model.profile {
            let n = [p.firstName, p.lastName].compactMap { $0 }.joined(separator: " ").trimmingCharacters(in: .whitespaces)
            if !n.isEmpty { return n }
            if let nm = p.name, !nm.isEmpty { return nm }
        }
        return auth.user?.displayName ?? "Клиент"
    }

    private var locationLine: String {
        let parts = [model.profile?.city, model.profile?.state].compactMap { $0?.isEmpty == false ? $0 : nil }
        if !parts.isEmpty { return parts.joined(separator: ", ") }
        return "Не указано"
    }
}
