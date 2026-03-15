import Foundation

/// Calculates visa day counts based on jurisdiction rules
struct RulesEngine {

    private let calendar = Calendar.current

    // MARK: - Core Calculations

    /// Calculate how many days have been used in a jurisdiction
    func daysUsed(for jurisdiction: Jurisdiction, records: [StayRecord], asOf date: Date = .now) -> Int {
        let today = calendar.startOfDay(for: date)
        let relevantRecords = records.filter { $0.jurisdictionId == jurisdiction.id }

        switch jurisdiction.ruleType {
        case .rolling(_, let windowDays):
            return daysInRollingWindow(records: relevantRecords, windowDays: windowDays, asOf: today)

        case .perVisit:
            return daysInCurrentVisit(records: relevantRecords, asOf: today)

        case .calendarYear:
            return daysInCalendarYear(records: relevantRecords, asOf: today)
        }
    }

    /// Calculate how many days remain in a jurisdiction
    func daysRemaining(for jurisdiction: Jurisdiction, records: [StayRecord], asOf date: Date = .now) -> Int {
        let used = daysUsed(for: jurisdiction, records: records, asOf: date)
        return max(0, jurisdiction.ruleType.maxDays - used)
    }

    /// Calculate the percentage of days used (0.0 to 1.0)
    func usagePercentage(for jurisdiction: Jurisdiction, records: [StayRecord], asOf date: Date = .now) -> Double {
        let used = daysUsed(for: jurisdiction, records: records, asOf: date)
        let max = jurisdiction.ruleType.maxDays
        guard max > 0 else { return 0 }
        return min(1.0, Double(used) / Double(max))
    }

    /// Calculate the date when you must leave (if staying continuously from today)
    func mustLeaveBy(for jurisdiction: Jurisdiction, records: [StayRecord], asOf date: Date = .now) -> Date? {
        let stayableDays = continuousStayDaysAvailable(for: jurisdiction, records: records, asOf: date)
        let today = calendar.startOfDay(for: date)

        guard stayableDays > 0 else { return today }
        return calendar.date(byAdding: .day, value: stayableDays - 1, to: today)
    }

    /// Calculate how many continuous days you can legally stay starting today.
    func continuousStayDaysAvailable(
        for jurisdiction: Jurisdiction,
        records: [StayRecord],
        asOf date: Date = .now
    ) -> Int {
        let today = calendar.startOfDay(for: date)
        let relevantRecords = records.filter { $0.jurisdictionId == jurisdiction.id }
        let isPresentToday = relevantRecords.contains {
            calendar.isDate($0.date, inSameDayAs: today)
        }

        switch jurisdiction.ruleType {
        case .rolling(let maxDays, let windowDays):
            return projectedRollingStayDays(
                records: relevantRecords,
                maxDays: maxDays,
                windowDays: windowDays,
                asOf: today
            )

        case .perVisit(let maxDays):
            let used = daysInCurrentVisit(records: relevantRecords, asOf: today)
            let inclusiveDays = isPresentToday ? (maxDays - used + 1) : (maxDays - used)
            return max(0, inclusiveDays)

        case .calendarYear(let maxDays):
            let used = daysInCalendarYear(records: relevantRecords, asOf: today)
            let inclusiveDays = isPresentToday ? (maxDays - used + 1) : (maxDays - used)
            return max(0, inclusiveDays)
        }
    }

    /// For rolling windows, quantify how much older days extend a continuous stay.
    func projectedExtraDaysFromWindowExpiry(
        for jurisdiction: Jurisdiction,
        records: [StayRecord],
        asOf date: Date = .now
    ) -> Int {
        guard case .rolling = jurisdiction.ruleType else { return 0 }

        let today = calendar.startOfDay(for: date)
        let relevantRecords = records.filter { $0.jurisdictionId == jurisdiction.id }
        let isPresentToday = relevantRecords.contains {
            calendar.isDate($0.date, inSameDayAs: today)
        }
        let naiveDays = max(0, daysRemaining(for: jurisdiction, records: records, asOf: today) + (isPresentToday ? 1 : 0))
        let projectedDays = continuousStayDaysAvailable(for: jurisdiction, records: records, asOf: today)

        return max(0, projectedDays - naiveDays)
    }

    /// If you leave today, when would this jurisdiction return to a full allowance?
    func fullAllowanceResetDate(
        for jurisdiction: Jurisdiction,
        records: [StayRecord],
        asOf date: Date = .now
    ) -> Date? {
        let today = calendar.startOfDay(for: date)
        let relevantRecords = records.filter { $0.jurisdictionId == jurisdiction.id }

        switch jurisdiction.ruleType {
        case .rolling(_, let windowDays):
            let inWindowDates = relevantRecords
                .map { calendar.startOfDay(for: $0.date) }
                .filter { recordedDay in
                    guard let windowStart = calendar.date(byAdding: .day, value: -(windowDays - 1), to: today) else {
                        return false
                    }
                    return recordedDay >= windowStart && recordedDay <= today
                }

            guard let latestRelevantDate = inWindowDates.max() else { return nil }
            return calendar.date(byAdding: .day, value: windowDays, to: latestRelevantDate)

        case .calendarYear:
            guard daysInCalendarYear(records: relevantRecords, asOf: today) > 0 else { return nil }
            return calendarYearReset(asOf: today)

        case .perVisit:
            return nil
        }
    }

    /// For rolling windows: find the date when days start "falling off"
    func nextDayFallsOff(for jurisdiction: Jurisdiction, records: [StayRecord], asOf date: Date = .now) -> (date: Date, count: Int)? {
        guard case .rolling(_, let windowDays) = jurisdiction.ruleType else { return nil }

        let today = calendar.startOfDay(for: date)
        let relevantRecords = records
            .filter { $0.jurisdictionId == jurisdiction.id }
            .sorted { $0.date < $1.date }

        // Find the earliest record that's still within the window
        guard let windowStart = calendar.date(byAdding: .day, value: -(windowDays - 1), to: today) else { return nil }
        let inWindowRecords = relevantRecords.filter { $0.date >= windowStart && $0.date <= today }

        guard let earliestInWindow = inWindowRecords.first else { return nil }

        // The earliest day falls off when it's windowDays after its date
        if let fallOffDate = calendar.date(byAdding: .day, value: windowDays, to: earliestInWindow.date) {
            // Count how many days fall off on that same date
            let count = inWindowRecords.filter {
                calendar.isDate($0.date, inSameDayAs: earliestInWindow.date)
            }.count
            return (fallOffDate, count)
        }
        return nil
    }

    /// For calendar year: when does the counter reset?
    func calendarYearReset(asOf date: Date = .now) -> Date? {
        let year = calendar.component(.year, from: date)
        return calendar.date(from: DateComponents(year: year + 1, month: 1, day: 1))
    }

    // MARK: - Status

    /// Get the urgency level for display purposes
    func urgencyLevel(for jurisdiction: Jurisdiction, records: [StayRecord], asOf date: Date = .now) -> UrgencyLevel {
        let remaining = daysRemaining(for: jurisdiction, records: records, asOf: date)
        let max = jurisdiction.ruleType.maxDays
        let used = daysUsed(for: jurisdiction, records: records, asOf: date)
        let today = calendar.startOfDay(for: date)
        let isPresentToday = records.contains {
            $0.jurisdictionId == jurisdiction.id && calendar.isDate($0.date, inSameDayAs: today)
        }

        // If they haven't used any days, it's safe
        if used == 0 { return .safe }

        let percentRemaining = Double(remaining) / Double(max)

        if used > max { return .expired }
        if remaining == 0 { return isPresentToday ? .critical : .expired }
        if remaining <= 7 { return .critical }
        if percentRemaining < 0.15 { return .critical }
        if percentRemaining < 0.33 { return .warning }
        if percentRemaining < 0.66 { return .caution }
        return .safe
    }

    // MARK: - Private Helpers

    /// Count days within a rolling window
    private func daysInRollingWindow(records: [StayRecord], windowDays: Int, asOf date: Date) -> Int {
        guard let windowStart = calendar.date(byAdding: .day, value: -(windowDays - 1), to: date) else { return 0 }

        // Count unique days in the window
        let uniqueDays = Set(records
            .filter { $0.date >= windowStart && $0.date <= date }
            .map { calendar.startOfDay(for: $0.date) }
        )
        return uniqueDays.count
    }

    /// Count days in the current continuous visit
    private func daysInCurrentVisit(records: [StayRecord], asOf date: Date) -> Int {
        let sortedDates = Set(records.map { calendar.startOfDay(for: $0.date) }).sorted(by: >)

        var count = 0
        var expectedDate = date

        for recordDate in sortedDates {
            let dayStart = calendar.startOfDay(for: expectedDate)
            if calendar.isDate(recordDate, inSameDayAs: dayStart) {
                count += 1
                guard let prevDay = calendar.date(byAdding: .day, value: -1, to: expectedDate) else { break }
                expectedDate = prevDay
            } else {
                break
            }
        }
        return count
    }

    /// Count days in the current calendar year
    private func daysInCalendarYear(records: [StayRecord], asOf date: Date) -> Int {
        let year = calendar.component(.year, from: date)
        guard let yearStart = calendar.date(from: DateComponents(year: year, month: 1, day: 1)) else { return 0 }

        let uniqueDays = Set(records
            .filter { $0.date >= yearStart && $0.date <= date }
            .map { calendar.startOfDay(for: $0.date) }
        )
        return uniqueDays.count
    }

    /// Simulate a continuous stay to find the last legal day in a rolling window.
    private func projectedRollingStayDays(
        records: [StayRecord],
        maxDays: Int,
        windowDays: Int,
        asOf date: Date
    ) -> Int {
        let existingDays = Set(records.map { calendar.startOfDay(for: $0.date) })
        var occupiedDays = existingDays
        var projectedDate = date
        var legalStayDays = 0

        while legalStayDays < maxDays {
            occupiedDays.insert(projectedDate)

            guard let windowStart = calendar.date(byAdding: .day, value: -(windowDays - 1), to: projectedDate) else {
                break
            }

            let usedDays = occupiedDays.filter { $0 >= windowStart && $0 <= projectedDate }.count
            if usedDays > maxDays {
                break
            }

            legalStayDays += 1

            guard let nextDate = calendar.date(byAdding: .day, value: 1, to: projectedDate) else {
                break
            }
            projectedDate = nextDate
        }

        return legalStayDays
    }
}

/// How urgent the visa situation is
enum UrgencyLevel {
    case safe       // > 66% remaining
    case caution    // 33-66% remaining
    case warning    // 15-33% remaining
    case critical   // < 15% or < 7 days remaining
    case expired    // 0 days remaining
}
