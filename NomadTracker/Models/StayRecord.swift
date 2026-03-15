import Foundation
import SwiftData

/// Source of a stay record
enum RecordSource: String, Codable {
    case gps
    case manual
}

/// A single day spent in a jurisdiction
@Model
final class StayRecord {
    var date: Date
    var countryCode: String
    var jurisdictionId: String
    var source: String  // RecordSource raw value (SwiftData prefers simple types)
    var id: UUID

    init(date: Date, countryCode: String, jurisdictionId: String, source: RecordSource) {
        self.date = Calendar.current.startOfDay(for: date)
        self.countryCode = countryCode
        self.jurisdictionId = jurisdictionId
        self.source = source.rawValue
        self.id = UUID()
    }

    var recordSource: RecordSource {
        RecordSource(rawValue: source) ?? .manual
    }
}

/// A manual adjustment to a jurisdiction's day count
@Model
final class ManualOverride {
    var jurisdictionId: String
    var startDate: Date
    var endDate: Date
    var note: String
    var id: UUID

    init(jurisdictionId: String, startDate: Date, endDate: Date, note: String = "") {
        self.jurisdictionId = jurisdictionId
        self.startDate = Calendar.current.startOfDay(for: startDate)
        self.endDate = Calendar.current.startOfDay(for: endDate)
        self.note = note
        self.id = UUID()
    }
}
