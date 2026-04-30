import SwiftUI

struct LoaderView: View {
    @Environment(\.appTheme) private var theme

    var body: some View {
        ProgressView()
            .tint(theme.primary)
            .scaleEffect(1.2)
    }
}
