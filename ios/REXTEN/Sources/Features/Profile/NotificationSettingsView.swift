import SwiftUI

@MainActor
final class NotificationSettingsViewModel: ObservableObject {
    @Published var settings = NotificationSettings.default
    @Published var isLoading = false
    @Published var isSaving = false
    @Published var errorMessage: String?

    private let api = APIClient.shared

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let data = try await api.data(path: "client/notifications/settings")
            settings = JSONHelpers.decodeNotificationSettings(data)
        } catch {
            errorMessage = error.localizedDescription
            settings = .default
        }
    }

    func save(_ newSettings: NotificationSettings) async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            let data = try await api.putAuth(path: "client/notifications/settings", body: newSettings)
            settings = JSONHelpers.decodeNotificationSettings(data)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct NotificationSettingsView: View {
    @Environment(\.appTheme) private var theme
    @StateObject private var model = NotificationSettingsViewModel()
    @State private var draft = NotificationSettings.default

    var body: some View {
        Form {
            if let err = model.errorMessage {
                Section {
                    Text(err).foregroundStyle(.red)
                }
            }
            Section("Channels") {
                Toggle("Push in app", isOn: binding(\.push))
                Toggle("Email", isOn: binding(\.email))
                Toggle("SMS", isOn: binding(\.sms))
                Toggle("Telegram", isOn: binding(\.telegram))
            }
        }
        .scrollContentBackground(.hidden)
        .background(theme.background)
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                if model.isSaving {
                    ProgressView()
                } else {
                    Button("Save") {
                        Task {
                            await model.save(draft)
                        }
                    }
                }
            }
        }
        .task {
            await model.load()
            draft = model.settings
        }
        .onChange(of: model.settings) { _, newValue in
            draft = newValue
        }
    }

    private func binding(_ keyPath: WritableKeyPath<NotificationSettings, Bool>) -> Binding<Bool> {
        Binding(
            get: { draft[keyPath: keyPath] },
            set: { draft[keyPath: keyPath] = $0 }
        )
    }
}
