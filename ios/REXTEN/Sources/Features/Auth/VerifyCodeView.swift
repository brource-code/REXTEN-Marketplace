import SwiftUI

struct VerifyCodeView: View {
    @Environment(\.appTheme) private var theme
    @Environment(\.colorScheme) private var colorScheme
    @EnvironmentObject private var auth: AuthManager
    let email: String
    var onDone: () -> Void

    @State private var code = ""
    @State private var errorMessage: String?
    @State private var isLoading = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                AuthBrandingHeader(
                    title: "Verify email",
                    subtitle: "Enter the code sent to \(email)"
                )

                if let err = errorMessage {
                    Text(err)
                        .font(.caption.bold())
                        .foregroundStyle(theme.error)
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(theme.errorLight)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                AuthLabeledField(label: "Verification code") {
                    TextField("", text: $code, prompt: Text("6-digit code").foregroundStyle(theme.textMuted))
                        .textFieldStyle(.plain)
                        .keyboardType(.numberPad)
                        .font(.title2.monospacedDigit())
                        .foregroundStyle(theme.text)
                        .tracking(4)
                }

                PrimaryButton(title: "Verify", isLoading: isLoading) {
                    Task { await submit() }
                }

                HStack(spacing: 4) {
                    Text("Didn't receive the code?")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(theme.textSecondary)
                    Button("Check spam or retry") {
                    }
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(theme.primary)
                    .disabled(true)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 4)
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 28)
        }
        .background(theme.background)
        .navigationTitle("Verify email")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func submit() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            try await auth.verifyEmail(email: email, code: code.trimmingCharacters(in: .whitespaces))
            await auth.refreshMe()
            onDone()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
