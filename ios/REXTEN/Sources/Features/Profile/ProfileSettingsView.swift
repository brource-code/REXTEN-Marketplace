import SwiftUI

struct ProfileSettingsView: View {
    @Environment(\.appTheme) private var theme
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var auth: AuthManager
    @StateObject private var model = ProfileViewModel()
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var phone = ""
    @State private var city = ""
    @State private var state = ""
    @State private var address = ""
    @State private var zipCode = ""
    @State private var errorMessage: String?
    @State private var isSaving = false

    var body: some View {
        Form {
            Section("Name") {
                TextField("First name", text: $firstName)
                TextField("Last name", text: $lastName)
            }
            Section("Contact") {
                TextField("Phone", text: $phone)
                    .keyboardType(.phonePad)
            }
            Section("Location") {
                TextField("City", text: $city)
                TextField("State", text: $state)
                TextField("Address", text: $address)
                TextField("ZIP", text: $zipCode)
                    .keyboardType(.numbersAndPunctuation)
            }
            if let err = errorMessage {
                Section {
                    Text(err).font(.caption.bold()).foregroundStyle(theme.error)
                }
            }
            Section {
                PrimaryButton(title: "Save", isLoading: isSaving) {
                    Task { await save() }
                }
                .listRowBackground(Color.clear)
            }
        }
        .scrollContentBackground(.hidden)
        .background(theme.background)
        .navigationTitle("Edit profile")
        .task {
            await model.load()
            if let p = model.profile {
                firstName = p.firstName ?? ""
                lastName = p.lastName ?? ""
                phone = p.phone ?? ""
                city = p.city ?? ""
                state = p.state ?? ""
                address = p.address ?? ""
                zipCode = p.zipCode ?? ""
            }
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        var body = UpdateProfileBody()
        body.firstName = firstName.isEmpty ? nil : firstName
        body.lastName = lastName.isEmpty ? nil : lastName
        body.phone = phone.isEmpty ? nil : phone
        body.city = city.isEmpty ? nil : city
        body.state = state.isEmpty ? nil : state
        body.address = address.isEmpty ? nil : address
        body.zipCode = zipCode.isEmpty ? nil : zipCode
        do {
            try await model.save(body)
            await auth.refreshMe()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
