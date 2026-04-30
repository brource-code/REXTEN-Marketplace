import SwiftUI

struct CatalogView: View {
    @Environment(\.appTheme) private var theme
    @EnvironmentObject private var auth: AuthManager
    @StateObject private var model = CatalogViewModel()
    @StateObject private var bookingsModel = BookingsViewModel()
    @State private var showFilters = false

    private var firstName: String {
        if let fn = auth.user?.firstName, !fn.isEmpty { return fn }
        let full = auth.user?.name ?? ""
        return full.components(separatedBy: " ").first ?? full
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                headerSection
                    .padding(.horizontal, REXLayout.Spacing.pagePadding)
                    .padding(.top, 8)
                    .padding(.bottom, 20)

                searchBarSection
                    .padding(.horizontal, REXLayout.Spacing.pagePadding)
                    .padding(.bottom, 20)

                categoryIconsSection
                    .padding(.horizontal, REXLayout.Spacing.pagePadding)
                    .padding(.bottom, 24)

                popularSection
                    .padding(.bottom, 24)

                if auth.isLoggedIn && !bookingsModel.upcoming.isEmpty {
                    upcomingSection
                        .padding(.horizontal, REXLayout.Spacing.pagePadding)
                        .padding(.bottom, 24)
                }

                allServicesSection
                    .padding(.horizontal, REXLayout.Spacing.pagePadding)
                    .padding(.bottom, REXLayout.Spacing.xxl)
            }
        }
        .background(theme.background.ignoresSafeArea())
        .refreshable {
            async let f: Void = model.loadFeatured()
            async let s: Void = model.loadServices()
            if auth.isLoggedIn { async let b: Void = bookingsModel.loadAll(); _ = await (f, s, b) }
            else { _ = await (f, s) }
        }
        .navigationTitle("")
        .navigationBarHidden(true)
        .navigationDestination(for: String.self) { slug in
            ServiceDetailView(slug: slug)
        }
        .sheet(isPresented: $showFilters) {
            FiltersView(model: model)
        }
        .task {
            await model.loadMeta()
            async let f: Void = model.loadFeatured()
            async let s: Void = model.loadServices()
            if auth.isLoggedIn {
                async let b: Void = bookingsModel.loadAll()
                _ = await (f, s, b)
            } else {
                _ = await (f, s)
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                if auth.isLoggedIn && !firstName.isEmpty {
                    Text("Привет, \(firstName)")
                        .font(.title2.bold())
                        .foregroundStyle(theme.text)
                } else {
                    Text("REXTEN")
                        .font(.title2.bold())
                        .foregroundStyle(theme.text)
                }
                Text("Ищите лучших мастеров рядом с вами")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(theme.textSecondary)
            }
            Spacer()
            Button {
            } label: {
                ZStack {
                    Circle()
                        .fill(theme.backgroundSecondary)
                        .overlay(Circle().stroke(theme.border, lineWidth: 1))
                        .frame(width: 42, height: 42)
                    Image(systemName: "bell")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(theme.textSecondary)
                }
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Search

    private var searchBarSection: some View {
        HStack(spacing: 10) {
            REXSearchField(text: $model.searchText, placeholder: "Что вы ищете?") {
                Task { await model.loadServices() }
            }
            Button {
                showFilters = true
            } label: {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(model.hasActiveFilters ? theme.primary : theme.backgroundSecondary)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(model.hasActiveFilters ? theme.primary : theme.border, lineWidth: 1))
                        .frame(width: 46, height: 46)
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(model.hasActiveFilters ? theme.buttonText : theme.textSecondary)
                }
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Category icons

    private var categoryIconsSection: some View {
        CategoryIconsView(selectedCategoryId: $model.selectedCategoryId, categories: model.categories)
            .onChange(of: model.selectedCategoryId) { _, _ in
                Task { await model.loadServices() }
            }
    }

    // MARK: - Popular services

    private var popularSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Популярные услуги")
                    .font(.headline.bold())
                    .foregroundStyle(theme.text)
                Spacer()
                Text("Смотреть все")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(theme.primary)
            }
            .padding(.horizontal, REXLayout.Spacing.pagePadding)

            if model.isLoading && model.featuredServices.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(0..<3, id: \.self) { _ in
                            RoundedRectangle(cornerRadius: 16)
                                .fill(theme.backgroundSecondary)
                                .frame(width: 178, height: 248)
                                .shimmer()
                        }
                    }
                    .padding(.horizontal, REXLayout.Spacing.pagePadding)
                }
            } else if model.featuredServices.isEmpty && !model.isLoading && !model.services.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(model.services.prefix(5)) { s in
                            NavigationLink(value: s.slug) {
                                ServiceCardView(service: s, style: .popularCard)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, REXLayout.Spacing.pagePadding)
                    .padding(.vertical, 2)
                }
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(model.featuredServices) { s in
                            NavigationLink(value: s.slug) {
                                ServiceCardView(service: s, style: .popularCard)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, REXLayout.Spacing.pagePadding)
                    .padding(.vertical, 2)
                }
            }
        }
    }

    // MARK: - Upcoming bookings

    private var upcomingSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Ближайшие бронирования")
                .font(.headline.bold())
                .foregroundStyle(theme.text)

            VStack(spacing: 10) {
                ForEach(bookingsModel.upcoming.prefix(3)) { booking in
                    upcomingBookingRow(booking)
                }
            }
        }
    }

    private func upcomingBookingRow(_ booking: ClientBooking) -> some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 10)
                .fill(theme.backgroundSecondary)
                .overlay(
                    Image(systemName: "calendar")
                        .font(.title2)
                        .foregroundStyle(theme.textMuted)
                )
                .frame(width: 56, height: 56)

            VStack(alignment: .leading, spacing: 4) {
                if let dateStr = booking.date ?? booking.bookingDate, !dateStr.isEmpty {
                    let timeStr = (booking.time ?? booking.bookingTime).map { ", \($0)" } ?? ""
                    Text(formattedDate(dateStr) + timeStr)
                        .font(.caption.weight(.bold))
                        .foregroundStyle(theme.primary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(theme.primaryLight)
                        .clipShape(Capsule())
                }
                Text(booking.businessName ?? booking.serviceName ?? "Бронирование")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(theme.text)
                    .lineLimit(1)
                if let svc = booking.serviceName, !(booking.businessName ?? "").isEmpty {
                    Text(svc)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(theme.textSecondary)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(theme.textMuted)
        }
        .padding(12)
        .background(theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(theme.cardBorder, lineWidth: 1))
    }

    // MARK: - All services list

    private var allServicesSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            if !model.services.isEmpty {
                HStack {
                    Text("Все услуги")
                        .font(.headline.bold())
                        .foregroundStyle(theme.text)
                    Spacer()
                    if model.isLoading {
                        ProgressView().tint(theme.primary)
                    }
                }
            }

            if model.services.isEmpty && !model.isLoading {
                EmptyStateView(
                    title: "Ничего не найдено",
                    message: "Попробуйте другие фильтры или поиск.",
                    systemImage: "magnifyingglass"
                )
                .padding(.vertical, 32)
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(model.services) { s in
                        NavigationLink(value: s.slug) {
                            ServiceCardView(service: s)
                        }
                        .buttonStyle(.plain)
                    }
                    if model.isLoading && !model.services.isEmpty {
                        HStack { LoaderView().padding(.vertical, 8) }
                    }
                }
            }
        }
    }

    // MARK: - Helpers

    private func formattedDate(_ raw: String) -> String {
        let fmts = ["yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'", "yyyy-MM-dd'T'HH:mm:ssZ", "yyyy-MM-dd"]
        let out = DateFormatter()
        out.locale = Locale(identifier: "ru_RU")
        out.dateFormat = "d MMM"
        for fmt in fmts {
            let f = DateFormatter()
            f.dateFormat = fmt
            if let d = f.date(from: raw) { return out.string(from: d) }
        }
        return raw
    }
}

// MARK: - Shimmer modifier placeholder

private extension View {
    func shimmer() -> some View { self.opacity(0.5) }
}
