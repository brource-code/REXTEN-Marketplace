import SwiftUI

@MainActor
final class ClientReviewsViewModel: ObservableObject {
    @Published var reviews: [ClientReview] = []
    @Published var pending: [PendingReview] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let api = APIClient.shared

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            async let rd = api.data(path: "client/reviews")
            async let pd = api.data(path: "client/reviews/pending")
            let rData = try await rd
            let pData = try await pd
            reviews = try JSONHelpers.decodeClientReviews(rData)
            pending = try JSONHelpers.decodePendingReviews(pData)
        } catch {
            errorMessage = error.localizedDescription
            reviews = []
            pending = []
        }
    }
}

struct ClientReviewsView: View {
    @Environment(\.appTheme) private var theme
    @StateObject private var model = ClientReviewsViewModel()
    @State private var sheetPending: PendingReview?

    var body: some View {
        Group {
            if model.isLoading && model.reviews.isEmpty && model.pending.isEmpty {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    if let err = model.errorMessage {
                        Section {
                            Text(err).font(.caption).foregroundStyle(.red)
                        }
                    }
                    if !model.pending.isEmpty {
                        Section("Awaiting your review") {
                            ForEach(model.pending) { p in
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(p.serviceName ?? "Service")
                                        .font(.subheadline.bold())
                                    if let b = p.businessName {
                                        Text(b).font(.caption).foregroundStyle(theme.textSecondary)
                                    }
                                    Button("Write review") {
                                        sheetPending = p
                                    }
                                    .buttonStyle(.bordered)
                                }
                                .padding(.vertical, 4)
                            }
                        }
                    }
                    Section("Your reviews") {
                        if model.reviews.isEmpty {
                            Text("No reviews yet").foregroundStyle(theme.textSecondary)
                        }
                        ForEach(model.reviews) { r in
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text(r.serviceName ?? "Service")
                                        .font(.subheadline.bold())
                                    Spacer()
                                    Text(String(format: "%.1f ★", r.rating))
                                        .font(.caption.bold())
                                }
                                if let b = r.businessName {
                                    Text(b).font(.caption).foregroundStyle(theme.textSecondary)
                                }
                                if let c = r.comment, !c.isEmpty {
                                    Text(c).font(.caption)
                                }
                                if let d = r.createdAt {
                                    Text(d).font(.caption2).foregroundStyle(theme.textMuted)
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
        .navigationTitle("Reviews")
        .navigationBarTitleDisplayMode(.inline)
        .task { await model.load() }
        .refreshable { await model.load() }
        .sheet(item: $sheetPending) { p in
            CreateReviewSheet(pending: p, onSuccess: {
                await model.load()
            })
        }
    }
}

private struct CreateReviewSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.appTheme) private var theme

    let pending: PendingReview
    var onSuccess: () async -> Void

    @State private var rating = 5
    @State private var comment = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                if let err = errorMessage {
                    Section { Text(err).foregroundStyle(.red) }
                }
                Section("Your review") {
                    Picker("Rating", selection: $rating) {
                        ForEach(1 ... 5, id: \.self) { n in
                            Text("\(n)").tag(n)
                        }
                    }
                    TextField("Comment", text: $comment, axis: .vertical)
                        .lineLimit(4 ... 10)
                }
            }
            .navigationTitle(pending.serviceName ?? "Review")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Submit") {
                        Task { await submit() }
                    }
                    .disabled(isSubmitting || comment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
        .tint(theme.primary)
    }

    private func submit() async {
        isSubmitting = true
        errorMessage = nil
        defer { isSubmitting = false }
        let body = CreateReviewBody(
            orderId: pending.orderId,
            bookingId: pending.bookingId,
            rating: rating,
            comment: comment.trimmingCharacters(in: .whitespacesAndNewlines)
        )
        do {
            _ = try await APIClient.shared.postAuth(path: "client/reviews", body: body)
            await onSuccess()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
