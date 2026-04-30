import SwiftUI

struct BookingsListView: View {
    @Environment(\.appTheme) private var theme
    @StateObject private var model = BookingsViewModel()
    @State private var tab = 0

    var body: some View {
        VStack(spacing: 0) {
            pickerBar
            Group {
                if model.isLoading && model.upcoming.isEmpty && model.past.isEmpty {
                    VStack { LoaderView() }.frame(maxHeight: .infinity)
                } else {
                    let list = tab == 0 ? model.upcoming : model.past
                    if list.isEmpty {
                        EmptyStateView(
                            title: tab == 0 ? "No upcoming bookings" : "No past bookings",
                            message: model.errorMessage ?? "Your bookings will appear here.",
                            systemImage: "calendar"
                        )
                        .frame(maxHeight: .infinity)
                    } else {
                        bookingsList(list)
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(theme.background.ignoresSafeArea())
        .navigationTitle("Bookings")
        .task { await model.loadAll() }
        .refreshable { await model.loadAll() }
    }

    // MARK: - Picker bar

    private var pickerBar: some View {
        HStack(spacing: 0) {
            tabButton("Upcoming", index: 0)
            tabButton("Past", index: 1)
        }
        .padding(.horizontal, REXLayout.Spacing.pagePadding)
        .padding(.top, REXLayout.Spacing.md)
        .padding(.bottom, REXLayout.Spacing.sm)
    }

    private func tabButton(_ title: String, index: Int) -> some View {
        let active = tab == index
        return Button {
            withAnimation(.easeInOut(duration: 0.2)) { tab = index }
        } label: {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(active ? theme.primary : theme.textSecondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(active ? theme.primaryLight : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: REXLayout.Radius.sm))
        }
        .buttonStyle(.plain)
    }

    // MARK: - List

    private func bookingsList(_ list: [ClientBooking]) -> some View {
        ScrollView {
            LazyVStack(spacing: REXLayout.Spacing.md) {
                ForEach(list) { b in
                    bookingCard(b)
                }
            }
            .padding(.horizontal, REXLayout.Spacing.pagePadding)
            .padding(.vertical, REXLayout.Spacing.md)
        }
    }

    // MARK: - Card

    private func bookingCard(_ b: ClientBooking) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: 0) {
                VStack(alignment: .leading, spacing: REXLayout.Spacing.xs) {
                    Text(b.serviceName ?? b.businessName ?? "Booking")
                        .font(.subheadline.bold())
                        .foregroundStyle(theme.text)
                        .lineLimit(2)
                    if let biz = b.businessName, b.serviceName != nil {
                        Text(biz)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(theme.textSecondary)
                            .lineLimit(1)
                    }
                }
                Spacer(minLength: REXLayout.Spacing.sm)
                if let st = b.status {
                    REXStatusBadge(status: st)
                }
            }
            .padding(REXLayout.Spacing.md)

            Divider().background(theme.cardBorder.opacity(0.6))

            HStack(spacing: REXLayout.Spacing.xl) {
                Label(b.displayDate, systemImage: "calendar")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(theme.textSecondary)
                Label(b.displayTime, systemImage: "clock")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(theme.textSecondary)
                if !b.displayPrice.isEmpty {
                    Spacer()
                    Text(b.displayPrice)
                        .font(.caption.bold())
                        .foregroundStyle(theme.primary)
                }
            }
            .padding(.horizontal, REXLayout.Spacing.md)
            .padding(.vertical, REXLayout.Spacing.sm)
        }
        .background(theme.card)
        .clipShape(RoundedRectangle(cornerRadius: REXLayout.Radius.card))
        .overlay(RoundedRectangle(cornerRadius: REXLayout.Radius.card).stroke(theme.cardBorder, lineWidth: 1))
        .rexCardShadow()
    }
}
