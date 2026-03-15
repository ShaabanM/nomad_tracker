import Foundation

/// Maps ISO 3166-1 alpha-2 country codes to jurisdictions
enum CountryMapping {

    /// Find which jurisdiction a country code belongs to
    static func jurisdiction(for countryCode: String) -> Jurisdiction? {
        let code = countryCode.uppercased()
        return Jurisdiction.all.first { $0.countryCodes.contains(code) }
    }

    /// Country display name from ISO code
    static func countryName(for code: String) -> String {
        Locale.current.localizedString(forRegionCode: code) ?? code
    }

    /// Country flag emoji from ISO code
    static func flag(for countryCode: String) -> String {
        let code = countryCode.uppercased()
        let base: UInt32 = 127397
        var emoji = ""
        for scalar in code.unicodeScalars {
            if let flagScalar = UnicodeScalar(base + scalar.value) {
                emoji.append(String(flagScalar))
            }
        }
        return emoji.isEmpty ? "🏳️" : emoji
    }

    /// All Schengen country codes
    static let schengenCodes: Set<String> = [
        "AT", "BE", "BG", "HR", "CZ", "DK", "EE", "FI", "FR", "DE",
        "GR", "HU", "IS", "IT", "LV", "LI", "LT", "LU", "MT", "NL",
        "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "CH"
    ]
}
