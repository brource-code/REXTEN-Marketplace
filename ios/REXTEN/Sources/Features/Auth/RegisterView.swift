import AuthenticationServices
import SwiftUI

struct RegisterView: View {
    @Environment(\.appTheme) private var theme
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var auth: AuthManager

    enum AccountType: CaseIterable {
        case client, business
        var title: String { self == .client ? "Client" : "Business Owner" }
        var icon: String { self == .client ? "person.fill" : "briefcase.fill" }
    }

    @State private var accountType: AccountType = .client

    // Shared fields
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var phone = ""

    // Business-only fields
    @State private var businessName = ""
    @State private var businessAddress = ""
    @State private var businessPhone = ""
    @State private var businessEmail = ""
    @State private var businessDescription = ""

    @State private var errorMessage: String?
    @State private var isLoading = false
    @State private var pendingVerifyEmail: String?

    var body: some View {
        NavigationStack {
            Group {
                if let em = pendingVerifyEmail {
                    VerifyCodeView(email: em) {
                        pendingVerifyEmail = nil
                        dismiss()
                    }
                    .environmentObject(auth)
                } else {
                    formContent
                }
            }
        }
    }

    // MARK: - Form

    private var formContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                AuthBrandingHeader(
                    title: "Create account",
                    subtitle: "Join REXTEN and get started"
                )

                accountTypePicker

                if let err = errorMessage {
                    errorBanner(err)
                }

                if accountType == .client {
                    googleSection
                }

                personalSection

                if accountType == .business {
                    businessSection
                }

                PrimaryButton(title: accountType == .client ? "Create account" : "Register business", isLoading: isLoading) {
                    Task { await submit() }
                }

                bottomLink
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 28)
        }
        .background(theme.background)
        .navigationTitle(accountType == .client ? "Sign Up" : "Business Sign Up")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Close") { dismiss() }
                    .font(.body.weight(.semibold))
                    .foregroundStyle(theme.textSecondary)
            }
        }
    }

    // MARK: - Account type picker

    private var accountTypePicker: some View {
        HStack(spacing: 0) {
            ForEach(AccountType.allCases, id: \.title) { type in
                let selected = accountType == type
                Button {
                    withAnimation(.easeInOut(duration: 0.18)) { accountType = type }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: type.icon)
                            .font(.system(size: 13, weight: .semibold))
                        Text(type.title)
                            .font(.subheadline.weight(.semibold))
                    }
                    .foregroundStyle(selected ? theme.buttonText : theme.textSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 11)
                    .background(selected ? theme.primary : Color.clear)
                    .clipShape(RoundedRectangle(cornerRadius: REXLayout.Radius.sm))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(3)
        .background(theme.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: REXLayout.Radius.md))
        .overlay(RoundedRectangle(cornerRadius: REXLayout.Radius.md).stroke(theme.border, lineWidth: 1))
    }

    // MARK: - Google section (client only)

    private var googleSection: some View {
        VStack(spacing: 16) {
            GoogleSignInButton(title: "Continue with Google", isLoading: isLoading) {
                Task { await googleSignIn() }
            }
            .disabled(isLoading)

            Text("By continuing with Google, you agree to the Terms of Service and Privacy Policy.")
                .font(.caption.weight(.semibold))
                .foregroundStyle(theme.textMuted)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)

            orDivider
        }
    }

    // MARK: - Personal fields

    private var personalSection: some View {
        VStack(spacing: 16) {
            sectionHeader(accountType == .business ? "Your info" : nil)

            HStack(spacing: 12) {
                AuthLabeledField(label: "First name") {
                    TextField("", text: $firstName, prompt: Text("First name").foregroundStyle(theme.textMuted))
                        .textFieldStyle(.plain)
                        .foregroundStyle(theme.text)
                        .textInputAutocapitalization(.words)
                }
                AuthLabeledField(label: "Last name") {
                    TextField("", text: $lastName, prompt: Text("Last name").foregroundStyle(theme.textMuted))
                        .textFieldStyle(.plain)
                        .foregroundStyle(theme.text)
                        .textInputAutocapitalization(.words)
                }
            }

            AuthLabeledField(label: "Email") {
                TextField("", text: $email, prompt: Text("you@example.com").foregroundStyle(theme.textMuted))
                    .textFieldStyle(.plain)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .foregroundStyle(theme.text)
            }

            AuthLabeledField(label: "Phone") {
                TextField("", text: $phone, prompt: Text("+1 (555) 000-0000").foregroundStyle(theme.textMuted))
                    .textFieldStyle(.plain)
                    .keyboardType(.phonePad)
                    .foregroundStyle(theme.text)
            }

            AuthLabeledField(label: "Password") {
                SecureField("", text: $password, prompt: Text("At least 8 characters").foregroundStyle(theme.textMuted))
                    .textFieldStyle(.plain)
                    .foregroundStyle(theme.text)
            }
        }
    }

    // MARK: - Business fields

    private var businessSection: some View {
        VStack(spacing: 16) {
            sectionHeader("Business info")
                .padding(.top, 4)

            AuthLabeledField(label: "Business name *") {
                TextField("", text: $businessName, prompt: Text("Your business name").foregroundStyle(theme.textMuted))
                    .textFieldStyle(.plain)
                    .foregroundStyle(theme.text)
                    .textInputAutocapitalization(.words)
            }

            AuthLabeledField(label: "Business address *") {
                TextField("", text: $businessAddress, prompt: Text("123 Main St, City, State").foregroundStyle(theme.textMuted))
                    .textFieldStyle(.plain)
                    .foregroundStyle(theme.text)
                    .textInputAutocapitalization(.words)
            }

            AuthLabeledField(label: "Business phone *") {
                TextField("", text: $businessPhone, prompt: Text("+1 (555) 000-0000").foregroundStyle(theme.textMuted))
                    .textFieldStyle(.plain)
                    .keyboardType(.phonePad)
                    .foregroundStyle(theme.text)
            }

            AuthLabeledField(label: "Business email") {
                TextField("", text: $businessEmail, prompt: Text("business@example.com").foregroundStyle(theme.textMuted))
                    .textFieldStyle(.plain)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .foregroundStyle(theme.text)
            }

            AuthLabeledField(label: "Description (optional)") {
                TextField("", text: $businessDescription, prompt: Text("What services do you offer?").foregroundStyle(theme.textMuted), axis: .vertical)
                    .textFieldStyle(.plain)
                    .lineLimit(2...4)
                    .foregroundStyle(theme.text)
            }

            infoNote("Fields marked * are required for business registration.")
        }
    }

    // MARK: - Bottom link

    private var bottomLink: some View {
        HStack(spacing: 4) {
            Text("Already have an account?")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(theme.textSecondary)
            Button("Sign In") { dismiss() }
                .font(.subheadline.weight(.bold))
                .foregroundStyle(theme.primary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 4)
    }

    // MARK: - Helpers

    private var orDivider: some View {
        HStack(spacing: 12) {
            Rectangle().fill(theme.border).frame(height: 1)
            Text("or with email")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(theme.textSecondary)
            Rectangle().fill(theme.border).frame(height: 1)
        }
        .padding(.vertical, 2)
    }

    @ViewBuilder
    private func sectionHeader(_ title: String?) -> some View {
        if let t = title {
            Text(t)
                .font(.subheadline.bold())
                .foregroundStyle(theme.text)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func infoNote(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 6) {
            Image(systemName: "info.circle")
                .font(.caption)
                .foregroundStyle(theme.primary)
            Text(text)
                .font(.caption.weight(.semibold))
                .foregroundStyle(theme.textSecondary)
        }
        .padding(10)
        .background(theme.primaryLight)
        .clipShape(RoundedRectangle(cornerRadius: REXLayout.Radius.sm))
    }

    private func errorBanner(_ text: String) -> some View {
        Text(text)
            .font(.caption.bold())
            .foregroundStyle(theme.error)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(theme.errorLight)
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Submit

    private func submit() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        if accountType == .client {
            await submitClient()
        } else {
            await submitBusiness()
        }
    }

    private func submitClient() async {
        do {
            let needVerify = try await auth.register(
                email: email,
                password: password,
                firstName: firstName.isEmpty ? nil : firstName,
                lastName: lastName.isEmpty ? nil : lastName,
                phone: phone.isEmpty ? nil : phone,
                role: "CLIENT"
            )
            if needVerify {
                pendingVerifyEmail = email
            } else {
                await auth.refreshMe()
                dismiss()
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func submitBusiness() async {
        guard !businessName.isEmpty else {
            errorMessage = "Business name is required."
            return
        }
        guard !businessAddress.isEmpty else {
            errorMessage = "Business address is required."
            return
        }
        guard !businessPhone.isEmpty else {
            errorMessage = "Business phone is required."
            return
        }
        do {
            let company = RegisterCompany(
                name: businessName,
                address: businessAddress,
                phone: businessPhone,
                email: businessEmail.isEmpty ? email : businessEmail,
                website: nil,
                description: businessDescription.isEmpty ? nil : businessDescription
            )
            let needVerify = try await auth.register(
                email: email,
                password: password,
                firstName: firstName.isEmpty ? nil : firstName,
                lastName: lastName.isEmpty ? nil : lastName,
                phone: phone.isEmpty ? nil : phone,
                role: "BUSINESS_OWNER",
                company: company
            )
            if needVerify {
                pendingVerifyEmail = email
            } else {
                await auth.refreshMe()
                dismiss()
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func googleSignIn() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            try await auth.signInWithGoogle()
            await auth.refreshMe()
            dismiss()
        } catch {
            let ns = error as NSError
            if ns.domain == ASWebAuthenticationSessionError.errorDomain, ns.code == 1 { return }
            errorMessage = error.localizedDescription
        }
    }
}
