import AuthenticationServices
import SwiftUI

struct LoginView: View {
    @Environment(\.appTheme) private var theme
    @Environment(\.colorScheme) private var colorScheme
    @EnvironmentObject private var auth: AuthManager
    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage: String?
    @State private var isLoading = false
    @State private var showRegister = false

    var body: some View {
        ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    AuthBrandingHeader(
                        title: "Welcome!",
                        subtitle: "Enter your credentials to sign in"
                    )

                    if let err = errorMessage {
                        Text(err)
                            .font(.caption.bold())
                            .foregroundStyle(theme.error)
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(theme.errorLight.opacity(colorScheme == .dark ? 0.25 : 0.5))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    AuthLabeledField(label: "Email") {
                        TextField("", text: $email, prompt: Text("you@example.com").foregroundStyle(theme.textMuted))
                            .textFieldStyle(.plain)
                            .textInputAutocapitalization(.never)
                            .keyboardType(.emailAddress)
                            .foregroundStyle(theme.text)
                    }

                    AuthLabeledField(label: "Password") {
                        SecureField("", text: $password, prompt: Text("••••••••").foregroundStyle(theme.textMuted))
                            .textFieldStyle(.plain)
                            .foregroundStyle(theme.text)
                    }

                    PrimaryButton(title: "Sign In", isLoading: isLoading) {
                        Task { await submit() }
                    }

                    orDivider

                    GoogleSignInButton(title: "Google", isLoading: isLoading) {
                        Task { await googleSignIn() }
                    }
                    .disabled(isLoading)

                    Text("By continuing with Google, you agree to the Terms of Service and Privacy Policy.")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(theme.textMuted)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)

                    HStack(spacing: 4) {
                        Text("Don't have an account?")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(theme.textSecondary)
                        Button("Sign Up") { showRegister = true }
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(theme.primary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 4)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 28)
            }
            .background(theme.background)
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showRegister) {
                RegisterView()
                    .environmentObject(auth)
            }
    }

    private var orDivider: some View {
        HStack(spacing: 12) {
            Rectangle()
                .fill(theme.border)
                .frame(height: 1)
            Text("or continue with")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(theme.textSecondary)
            Rectangle()
                .fill(theme.border)
                .frame(height: 1)
        }
        .padding(.vertical, 4)
    }

    private func submit() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            try await auth.login(email: email, password: password)
            await auth.refreshMe()
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
        } catch {
            let ns = error as NSError
            if ns.domain == ASWebAuthenticationSessionError.errorDomain, ns.code == 1 {
                return
            }
            errorMessage = error.localizedDescription
        }
    }
}
