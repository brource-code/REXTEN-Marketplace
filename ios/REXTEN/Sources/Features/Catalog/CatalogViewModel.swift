import Foundation

enum CatalogPriceBracket: String, CaseIterable, Identifiable {
    case any
    case under75
    case range75to125
    case over125

    var id: String { rawValue }

    var title: String {
        switch self {
        case .any: return "Any budget"
        case .under75: return "Up to $75"
        case .range75to125: return "$75 – $125"
        case .over125: return "$125+"
        }
    }

    func applyQueryItems(into items: inout [URLQueryItem]) {
        switch self {
        case .any: break
        case .under75:
            items.append(URLQueryItem(name: "priceMax", value: "75"))
        case .range75to125:
            items.append(URLQueryItem(name: "priceMin", value: "75"))
            items.append(URLQueryItem(name: "priceMax", value: "125"))
        case .over125:
            items.append(URLQueryItem(name: "priceMin", value: "125"))
        }
    }
}

@MainActor
final class CatalogViewModel: ObservableObject {
    @Published var services: [Service] = []
    @Published var featuredServices: [Service] = []
    @Published var categories: [Category] = []
    @Published var states: [USState] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    @Published var searchText = ""
    @Published var selectedCategoryId = "all"
    @Published var selectedStateId = ""
    @Published var selectedCity = ""
    @Published var selectedTags: [String] = []
    @Published var priceBracket: CatalogPriceBracket = .any
    @Published var ratingMin: Double?

    private let api = APIClient.shared

    func loadMeta() async {
        do {
            async let cats: [Category] = api.decodePublic([Category].self, path: "marketplace/categories")
            async let sts: [USState] = api.decodePublic([USState].self, path: "marketplace/states")
            categories = try await cats
            states = try await sts
        } catch {
            AppLogger.error("Catalog meta: \(error.localizedDescription)")
        }
    }

    func loadFeatured() async {
        do {
            let data = try await api.dataPublic(
                path: "advertisements/featured",
                queryItems: [
                    URLQueryItem(name: "limit", value: "5"),
                    URLQueryItem(name: "placement", value: "services"),
                ]
            )
            featuredServices = try JSONHelpers.decodeServices(data)
        } catch {
            featuredServices = []
            AppLogger.error("Featured: \(error.localizedDescription)")
        }
    }

    func loadServices() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        var items: [URLQueryItem] = []
        let q = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !q.isEmpty { items.append(URLQueryItem(name: "search", value: q)) }
        if selectedCategoryId != "all" {
            items.append(URLQueryItem(name: "category", value: selectedCategoryId))
        }
        if !selectedStateId.isEmpty {
            items.append(URLQueryItem(name: "state", value: selectedStateId))
        }
        if !selectedCity.isEmpty {
            items.append(URLQueryItem(name: "city", value: selectedCity))
        }
        priceBracket.applyQueryItems(into: &items)
        if let r = ratingMin {
            items.append(URLQueryItem(name: "ratingMin", value: String(r)))
        }
        for t in selectedTags {
            items.append(URLQueryItem(name: "tags[]", value: t))
        }

        do {
            let data = try await api.dataPublic(path: "marketplace/services", queryItems: items)
            services = try JSONHelpers.decodeServices(data)
        } catch {
            errorMessage = error.localizedDescription
            AppLogger.error("Services: \(error.localizedDescription)")
            services = []
        }
    }

    var hasActiveFilters: Bool {
        !selectedStateId.isEmpty || !selectedCity.isEmpty || priceBracket != .any || ratingMin != nil || !selectedTags.isEmpty
    }

    func toggleTag(_ tag: String) {
        if let i = selectedTags.firstIndex(of: tag) {
            selectedTags.remove(at: i)
        } else {
            selectedTags.append(tag)
        }
    }
}
