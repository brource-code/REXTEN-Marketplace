import SwiftUI

@MainActor
final class RewardsViewModel: ObservableObject {
    @Published var discounts: [DiscountItem] = []
    @Published var bonuses: [BonusItem] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var actionMessage: String?

    private let api = APIClient.shared

    func load() async {
        isLoading = true
        errorMessage = nil
        actionMessage = nil
        defer { isLoading = false }
        do {
            async let dd = api.data(path: "client/discounts")
            async let bd = api.data(path: "client/bonuses")
            let d1 = try await dd
            let d2 = try await bd
            discounts = try JSONHelpers.decodeDiscounts(d1)
            bonuses = try JSONHelpers.decodeBonuses(d2)
        } catch {
            errorMessage = error.localizedDescription
            discounts = []
            bonuses = []
        }
    }

    func applyDiscount(id: Int) async {
        actionMessage = nil
        do {
            _ = try await api.data(path: "client/discounts/\(id)/apply", method: "POST", body: nil)
            await load()
            actionMessage = "Discount applied"
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func applyBonus(id: Int) async {
        actionMessage = nil
        do {
            _ = try await api.data(path: "client/bonuses/\(id)/apply", method: "POST", body: nil)
            await load()
            actionMessage = "Bonus applied"
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct RewardsView: View {
    @Environment(\.appTheme) private var theme
    @StateObject private var model = RewardsViewModel()

    var body: some View {
        Group {
            if model.isLoading && model.discounts.isEmpty && model.bonuses.isEmpty {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    if let msg = model.actionMessage {
                        Section {
                            Text(msg).font(.caption.bold()).foregroundStyle(theme.primary)
                        }
                    }
                    if let err = model.errorMessage {
                        Section {
                            Text(err).font(.caption).foregroundStyle(.red)
                        }
                    }
                    Section("Discounts") {
                        if model.discounts.isEmpty {
                            Text("No active discounts").foregroundStyle(theme.textSecondary)
                        }
                        ForEach(model.discounts) { item in
                            VStack(alignment: .leading, spacing: 6) {
                                Text(item.title ?? item.code ?? "Discount")
                                    .font(.subheadline.bold())
                                if let b = item.businessName {
                                    Text(b).font(.caption).foregroundStyle(theme.textSecondary)
                                }
                                if item.isUsed == true {
                                    Text("Used").font(.caption2).foregroundStyle(theme.textMuted)
                                } else if item.isActive != false {
                                    Button("Apply") {
                                        Task { await model.applyDiscount(id: item.id) }
                                    }
                                    .buttonStyle(.borderedProminent)
                                    .tint(theme.primary)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    Section("Bonuses") {
                        if model.bonuses.isEmpty {
                            Text("No bonuses").foregroundStyle(theme.textSecondary)
                        }
                        ForEach(model.bonuses) { item in
                            VStack(alignment: .leading, spacing: 6) {
                                Text(item.title ?? "Bonus")
                                    .font(.subheadline.bold())
                                if let b = item.businessName {
                                    Text(b).font(.caption).foregroundStyle(theme.textSecondary)
                                }
                                if item.isUsed == true {
                                    Text("Used").font(.caption2).foregroundStyle(theme.textMuted)
                                } else if item.isActive != false {
                                    Button("Apply") {
                                        Task { await model.applyBonus(id: item.id) }
                                    }
                                    .buttonStyle(.borderedProminent)
                                    .tint(theme.primary)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
                .scrollContentBackground(.hidden)
                .background(theme.background)
            }
        }
        .background(theme.background.ignoresSafeArea())
        .navigationTitle("Discounts & bonuses")
        .navigationBarTitleDisplayMode(.inline)
        .task { await model.load() }
        .refreshable { await model.load() }
    }
}
