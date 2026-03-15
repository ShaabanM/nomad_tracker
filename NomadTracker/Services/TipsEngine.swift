import Foundation

/// Generates contextual tips and suggestions based on current visa status
struct TipsEngine {

    private let rulesEngine = RulesEngine()
    private let calendar = Calendar.current

    /// Generate all relevant tips for the current situation
    func generateTips(
        currentJurisdiction: Jurisdiction?,
        records: [StayRecord],
        asOf date: Date = .now
    ) -> [Tip] {
        var tips: [Tip] = []

        // Tips for the current jurisdiction
        if let current = currentJurisdiction {
            tips.append(contentsOf: currentJurisdictionTips(current, records: records, asOf: date))
        }

        // General travel tips
        tips.append(contentsOf: generalTips(currentJurisdiction: currentJurisdiction, records: records, asOf: date))

        // Sort by priority
        tips.sort { $0.priority.rawValue > $1.priority.rawValue }

        return tips
    }

    // MARK: - Current Jurisdiction Tips

    private func currentJurisdictionTips(
        _ jurisdiction: Jurisdiction,
        records: [StayRecord],
        asOf date: Date
    ) -> [Tip] {
        var tips: [Tip] = []
        let remaining = rulesEngine.daysRemaining(for: jurisdiction, records: records, asOf: date)
        let used = rulesEngine.daysUsed(for: jurisdiction, records: records, asOf: date)
        let maxDays = jurisdiction.ruleType.maxDays
        let projectedExtraDays = rulesEngine.projectedExtraDaysFromWindowExpiry(
            for: jurisdiction,
            records: records,
            asOf: date
        )
        let rollingProjectionNote: String
        if projectedExtraDays > 0 {
            rollingProjectionNote = " Older days should fall out of the rolling window while you stay, buying you about \(projectedExtraDays) extra day\(projectedExtraDays == 1 ? "" : "s")."
        } else {
            rollingProjectionNote = ""
        }

        // Deadline warning
        if used > 0, let leaveBy = rulesEngine.mustLeaveBy(for: jurisdiction, records: records, asOf: date) {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium

            if remaining <= 7 {
                tips.append(Tip(
                    icon: "exclamationmark.triangle.fill",
                    title: "Leave \(jurisdiction.name) by \(formatter.string(from: leaveBy))",
                    message: "Only \(remaining) day\(remaining == 1 ? "" : "s") remaining! Book your departure now.\(rollingProjectionNote)",
                    priority: .critical,
                    category: .deadline
                ))
            } else if remaining <= 14 {
                tips.append(Tip(
                    icon: "exclamationmark.triangle",
                    title: "\(remaining) days remaining in \(jurisdiction.name)",
                    message: "Start planning your departure. You must leave by \(formatter.string(from: leaveBy)).\(rollingProjectionNote)",
                    priority: .high,
                    category: .deadline
                ))
            } else if remaining <= 30 {
                tips.append(Tip(
                    icon: "clock",
                    title: "\(remaining) days remaining in \(jurisdiction.name)",
                    message: "You can stay until \(formatter.string(from: leaveBy)) if you remain continuously.\(rollingProjectionNote)",
                    priority: .medium,
                    category: .deadline
                ))
            } else {
                tips.append(Tip(
                    icon: "checkmark.circle",
                    title: "Comfortable in \(jurisdiction.name)",
                    message: "\(remaining) of \(maxDays) days remaining. Can stay until \(formatter.string(from: leaveBy)).\(rollingProjectionNote)",
                    priority: .low,
                    category: .status
                ))
            }
        }

        // Rolling window: when days fall off
        if let fallOff = rulesEngine.nextDayFallsOff(for: jurisdiction, records: records, asOf: date) {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            tips.append(Tip(
                icon: "arrow.counterclockwise",
                title: "Days falling off the window",
                message: "\(fallOff.count) day\(fallOff.count == 1 ? "" : "s") will fall off the \(jurisdiction.ruleType.ruleLabel.lowercased()) on \(formatter.string(from: fallOff.date)), giving you more allowance.",
                priority: .low,
                category: .info
            ))
        }

        // Calendar year reset
        if case .calendarYear = jurisdiction.ruleType,
           let resetDate = rulesEngine.calendarYearReset(asOf: date) {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            tips.append(Tip(
                icon: "calendar",
                title: "Counter resets on \(formatter.string(from: resetDate))",
                message: "\(jurisdiction.name) uses a calendar year system. Your day count resets to 0 on January 1.",
                priority: .low,
                category: .info
            ))
        }

        return tips
    }

    // MARK: - General Tips

    private func generalTips(
        currentJurisdiction: Jurisdiction?,
        records: [StayRecord],
        asOf date: Date
    ) -> [Tip] {
        var tips: [Tip] = []

        // Schengen-specific exit tips
        if currentJurisdiction?.id == "schengen" {
            let remaining = rulesEngine.daysRemaining(for: Jurisdiction.schengen, records: records, asOf: date)

            if remaining <= 30 {
                tips.append(Tip(
                    icon: "airplane.departure",
                    title: "Plan your Schengen exit",
                    message: "Consider these non-Schengen destinations: Georgia (365 days!), Albania (90 days), Montenegro (90 days), Turkey (90 days), or the UK (180 days).",
                    priority: .high,
                    category: .suggestion
                ))
            }

            tips.append(Tip(
                icon: "info.circle",
                title: "Schengen rolling window",
                message: "The 90/180 rule uses a rolling window — on any given day, immigration looks back 180 days. A 1-day trip outside Schengen doesn't meaningfully help.",
                priority: .low,
                category: .info
            ))
        }

        // Georgia promotion when not there
        if currentJurisdiction?.id != "georgia" {
            let georgiaUsed = rulesEngine.daysUsed(for: Jurisdiction.georgia, records: records, asOf: date)
            if georgiaUsed == 0 {
                tips.append(Tip(
                    icon: "star",
                    title: "Georgia: 365 days visa-free",
                    message: "One of the most generous visa policies in the world. Perfect for a Schengen cooldown with vibrant nomad community in Tbilisi.",
                    priority: .low,
                    category: .suggestion
                ))
            }
        }

        // Colombia calendar year awareness
        let colombiaUsed = rulesEngine.daysUsed(for: Jurisdiction.colombia, records: records, asOf: date)
        if colombiaUsed > 0 {
            tips.append(Tip(
                icon: "exclamationmark.circle",
                title: "Colombia: Border runs don't help",
                message: "Colombia counts ALL days in a calendar year. Leaving and re-entering does NOT reset your counter. \(colombiaUsed)/180 days used this year.",
                priority: .medium,
                category: .info
            ))
        }

        // Montenegro registration reminder
        if currentJurisdiction?.id == "montenegro" {
            tips.append(Tip(
                icon: "building.columns",
                title: "Register within 24 hours",
                message: "Montenegro requires you to register with local police within 24 hours of arrival. Hotels do this automatically. For Airbnbs, you must register yourself.",
                priority: .high,
                category: .action
            ))
        }

        // Brazil e-visa reminder
        if currentJurisdiction?.id != "brazil" {
            let brazilUsed = rulesEngine.daysUsed(for: Jurisdiction.brazil, records: records, asOf: date)
            if brazilUsed == 0 {
                // Only show if they might be interested
            }
        }

        return tips
    }
}

// MARK: - Tip Model

struct Tip: Identifiable {
    let id = UUID()
    let icon: String
    let title: String
    let message: String
    let priority: TipPriority
    let category: TipCategory
}

enum TipPriority: Int, Comparable {
    case low = 0
    case medium = 1
    case high = 2
    case critical = 3

    static func < (lhs: TipPriority, rhs: TipPriority) -> Bool {
        lhs.rawValue < rhs.rawValue
    }
}

enum TipCategory {
    case deadline
    case status
    case suggestion
    case info
    case action
}
