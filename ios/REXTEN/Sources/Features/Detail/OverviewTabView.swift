import SwiftUI

/// Вкладка «О сервисе» — только описание (как блок about в RN до списка услуг).
struct OverviewTabView: View {
    @Environment(\.appTheme) private var theme
    let profile: ServiceProfile

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            let desc = profile.service.description.trimmingCharacters(in: .whitespacesAndNewlines)
            if desc.isEmpty {
                EmptyStateView(
                    title: "No description",
                    message: "The business has not added a description yet.",
                    systemImage: "text.alignleft"
                )
                .padding(.vertical, 24)
            } else {
                Text(desc)
                    .font(.body)
                    .foregroundStyle(theme.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
