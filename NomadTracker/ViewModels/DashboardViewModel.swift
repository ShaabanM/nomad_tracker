import Foundation
import SwiftData
import Combine

/// Main view model for the dashboard
@Observable
final class DashboardViewModel {
    let locationService = LocationService()
    let rulesEngine = RulesEngine()
    let tipsEngine = TipsEngine()

    var records: [StayRecord] = []
    var tips: [Tip] = []
    var hasCompletedOnboarding: Bool {
        get { UserDefaults.standard.bool(forKey: "hasCompletedOnboarding") }
        set { UserDefaults.standard.set(newValue, forKey: "hasCompletedOnboarding") }
    }

    private var modelContext: ModelContext?
    private var cancellables = Set<AnyCancellable>()

    init() {
        // Listen for location updates
        NotificationCenter.default.publisher(for: .locationDidUpdate)
            .sink { [weak self] notification in
                self?.handleLocationUpdate(notification)
            }
            .store(in: &cancellables)
    }

    func configure(with modelContext: ModelContext) {
        self.modelContext = modelContext
        loadRecords()
        refreshTips()
    }

    // MARK: - Data Loading

    func loadRecords() {
        guard let modelContext = modelContext else { return }
        let descriptor = FetchDescriptor<StayRecord>(
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        do {
            records = try modelContext.fetch(descriptor)
        } catch {
            print("Failed to load records: \(error)")
        }
    }

    // MARK: - Day Counting

    func daysUsed(for jurisdiction: Jurisdiction) -> Int {
        rulesEngine.daysUsed(for: jurisdiction, records: records)
    }

    func daysRemaining(for jurisdiction: Jurisdiction) -> Int {
        rulesEngine.daysRemaining(for: jurisdiction, records: records)
    }

    func usagePercentage(for jurisdiction: Jurisdiction) -> Double {
        rulesEngine.usagePercentage(for: jurisdiction, records: records)
    }

    func mustLeaveBy(for jurisdiction: Jurisdiction) -> Date? {
        rulesEngine.mustLeaveBy(for: jurisdiction, records: records)
    }

    func urgencyLevel(for jurisdiction: Jurisdiction) -> UrgencyLevel {
        rulesEngine.urgencyLevel(for: jurisdiction, records: records)
    }

    func nextDayFallsOff(for jurisdiction: Jurisdiction) -> (date: Date, count: Int)? {
        rulesEngine.nextDayFallsOff(for: jurisdiction, records: records)
    }

    // MARK: - Active Jurisdictions

    /// Jurisdictions where the user has spent time or is currently in
    var activeJurisdictions: [Jurisdiction] {
        let activeIds = Set(records.map { $0.jurisdictionId })
        var active = Jurisdiction.all.filter { activeIds.contains($0.id) }

        // Always include the current jurisdiction
        if let current = locationService.currentJurisdiction,
           !active.contains(where: { $0.id == current.id }) {
            active.insert(current, at: 0)
        }

        // Sort: current jurisdiction first, then by days used (descending)
        active.sort { a, b in
            if a.id == locationService.currentJurisdiction?.id { return true }
            if b.id == locationService.currentJurisdiction?.id { return false }
            return daysUsed(for: a) > daysUsed(for: b)
        }

        return active
    }

    /// All jurisdictions not yet active (for adding manually)
    var inactiveJurisdictions: [Jurisdiction] {
        let activeIds = Set(activeJurisdictions.map { $0.id })
        return Jurisdiction.all.filter { !activeIds.contains($0.id) }
    }

    // MARK: - Location Updates

    private func handleLocationUpdate(_ notification: Notification) {
        guard let countryCode = notification.userInfo?["countryCode"] as? String,
              let jurisdictionId = notification.userInfo?["jurisdictionId"] as? String else {
            return
        }
        logDay(countryCode: countryCode, jurisdictionId: jurisdictionId, source: .gps)
    }

    /// Log today for a jurisdiction (prevents duplicates)
    func logDay(countryCode: String, jurisdictionId: String, source: RecordSource, date: Date = .now) {
        guard let modelContext = modelContext else { return }

        let today = Calendar.current.startOfDay(for: date)

        // Check if today is already logged for this jurisdiction
        let existingDescriptor = FetchDescriptor<StayRecord>(
            predicate: #Predicate<StayRecord> { record in
                record.jurisdictionId == jurisdictionId && record.date == today
            }
        )

        do {
            let existing = try modelContext.fetch(existingDescriptor)
            if existing.isEmpty {
                let record = StayRecord(
                    date: today,
                    countryCode: countryCode,
                    jurisdictionId: jurisdictionId,
                    source: source
                )
                modelContext.insert(record)
                try modelContext.save()
                loadRecords()
                refreshTips()

                // Fill in any gap days
                fillGapDays(countryCode: countryCode, jurisdictionId: jurisdictionId)
            }
        } catch {
            print("Failed to log day: \(error)")
        }
    }

    /// Fill in days between the last record and today
    private func fillGapDays(countryCode: String, jurisdictionId: String) {
        guard let modelContext = modelContext else { return }

        let today = Calendar.current.startOfDay(for: Date.now)
        let calendar = Calendar.current

        // Find the most recent record before today for this jurisdiction
        let allRecordsForJurisdiction = records
            .filter { $0.jurisdictionId == jurisdictionId && $0.date < today }
            .sorted { $0.date > $1.date }

        guard let lastRecord = allRecordsForJurisdiction.first else { return }

        // Fill gap days (max 30 days to prevent accidents)
        var checkDate = calendar.date(byAdding: .day, value: 1, to: lastRecord.date)!
        var gapDays = 0
        let maxGapFill = 30

        while checkDate < today && gapDays < maxGapFill {
            let gapDate = checkDate
            let existingDescriptor = FetchDescriptor<StayRecord>(
                predicate: #Predicate<StayRecord> { record in
                    record.jurisdictionId == jurisdictionId && record.date == gapDate
                }
            )

            do {
                let existing = try modelContext.fetch(existingDescriptor)
                if existing.isEmpty {
                    let record = StayRecord(
                        date: checkDate,
                        countryCode: countryCode,
                        jurisdictionId: jurisdictionId,
                        source: .gps
                    )
                    modelContext.insert(record)
                    gapDays += 1
                }
            } catch {
                print("Failed to fill gap day: \(error)")
            }

            checkDate = calendar.date(byAdding: .day, value: 1, to: checkDate)!
        }

        if gapDays > 0 {
            do {
                try modelContext.save()
                loadRecords()
            } catch {
                print("Failed to save gap days: \(error)")
            }
        }
    }

    // MARK: - Manual Overrides

    /// Add a date range for a jurisdiction manually
    func addManualDays(jurisdiction: Jurisdiction, from startDate: Date, to endDate: Date, countryCode: String? = nil) {
        let calendar = Calendar.current
        let code = countryCode ?? jurisdiction.countryCodes.first ?? "XX"
        var date = calendar.startOfDay(for: startDate)
        let end = calendar.startOfDay(for: endDate)

        while date <= end {
            logDay(countryCode: code, jurisdictionId: jurisdiction.id, source: .manual, date: date)
            date = calendar.date(byAdding: .day, value: 1, to: date)!
        }
    }

    /// Delete a specific day record
    func deleteRecord(_ record: StayRecord) {
        guard let modelContext = modelContext else { return }
        modelContext.delete(record)
        do {
            try modelContext.save()
            loadRecords()
            refreshTips()
        } catch {
            print("Failed to delete record: \(error)")
        }
    }

    /// Delete all records for a jurisdiction
    func clearJurisdiction(_ jurisdiction: Jurisdiction) {
        guard let modelContext = modelContext else { return }
        let toDelete = records.filter { $0.jurisdictionId == jurisdiction.id }
        for record in toDelete {
            modelContext.delete(record)
        }
        do {
            try modelContext.save()
            loadRecords()
            refreshTips()
        } catch {
            print("Failed to clear jurisdiction: \(error)")
        }
    }

    // MARK: - Tips

    func refreshTips() {
        tips = tipsEngine.generateTips(
            currentJurisdiction: locationService.currentJurisdiction,
            records: records
        )
    }

    // MARK: - Timeline

    /// Get records grouped by date for the timeline
    func recordsByDate() -> [(Date, [StayRecord])] {
        let grouped = Dictionary(grouping: records) { record in
            Calendar.current.startOfDay(for: record.date)
        }
        return grouped.sorted { $0.key > $1.key }
    }

    /// Get records for a specific month
    func records(for month: Date) -> [StayRecord] {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month], from: month)
        guard let monthStart = calendar.date(from: components),
              let monthEnd = calendar.date(byAdding: .month, value: 1, to: monthStart) else {
            return []
        }
        return records.filter { $0.date >= monthStart && $0.date < monthEnd }
    }
}
