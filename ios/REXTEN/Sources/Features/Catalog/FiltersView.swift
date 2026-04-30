import SwiftUI

struct FiltersView: View {
    @Environment(\.appTheme) private var theme
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var model: CatalogViewModel

    var body: some View {
        NavigationStack {
            Form {
                Section("Location") {
                    Picker("State", selection: $model.selectedStateId) {
                        Text("Any").tag("")
                        ForEach(model.states) { s in
                            Text(s.name).tag(s.id)
                        }
                    }
                    TextField("City", text: $model.selectedCity)
                        .textInputAutocapitalization(.words)
                }
                Section("Price") {
                    Picker("Budget", selection: $model.priceBracket) {
                        ForEach(CatalogPriceBracket.allCases) { b in
                            Text(b.title).tag(b)
                        }
                    }
                }
                Section("Rating") {
                    Picker("Minimum rating", selection: $model.ratingMin) {
                        Text("Any").tag(Double?.none)
                        Text("4.0+").tag(Optional(4.0))
                        Text("4.5+").tag(Optional(4.5))
                        Text("4.8+").tag(Optional(4.8))
                    }
                }
                Section("Tags") {
                    let common = ["online-booking", "online-payment", "has-reviews", "has-portfolio", "premium"]
                    ForEach(common, id: \.self) { tag in
                        Toggle(tag.replacingOccurrences(of: "-", with: " "), isOn: Binding(
                            get: { model.selectedTags.contains(tag) },
                            set: { on in
                                if on { if !model.selectedTags.contains(tag) { model.selectedTags.append(tag) } }
                                else { model.selectedTags.removeAll { $0 == tag } }
                            }
                        ))
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(theme.background)
            .navigationTitle("Filters")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Apply") {
                        Task { await model.loadServices() }
                        dismiss()
                    }
                }
            }
        }
    }
}
