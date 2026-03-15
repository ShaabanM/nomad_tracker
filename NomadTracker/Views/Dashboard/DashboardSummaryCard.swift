import SwiftUI

/// Hero card summarizing the user's current travel situation and next best moves.
struct DashboardSummaryCard: View {
    let jurisdiction: Jurisdiction?
    let urgency: UrgencyLevel
    let daysUsed: Int
    let daysRemaining: Int
    let leaveBy: Date?
    let projectedExtraDays: Int
    let nextFallOff: (date: Date, count: Int)?
    let fullResetDate: Date?
    let trackedJurisdictions: Int
    let totalLoggedDays: Int
    let recommendations: [DestinationRecommendation]

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            header
            metricsGrid

            if hasPlanningSignals {
                planningSection
            }

            if !recommendations.isEmpty {
                recommendationsSection
            }
        }
        .padding(20)
        .foregroundStyle(.white)
        .background(backgroundGradient, in: RoundedRectangle(cornerRadius: 26, style: .continuous))
        .overlay(alignment: .topTrailing) {
            Circle()
                .fill(.white.opacity(0.08))
                .frame(width: 140, height: 140)
                .offset(x: 40, y: -50)
        }
        .overlay {
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .strokeBorder(.white.opacity(0.12), lineWidth: 1)
        }
    }

    private var header: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Travel Pulse")
                    .font(.caption.weight(.semibold))
                    .textCase(.uppercase)
                    .foregroundStyle(.white.opacity(0.8))

                Text(headline)
                    .font(.title2.weight(.bold))
                    .fixedSize(horizontal: false, vertical: true)

                Text(subheadline)
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.84))
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 8)

            Text(statusLabel)
                .font(.caption.weight(.bold))
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(.white.opacity(0.16), in: Capsule())
        }
    }

    private var metricsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
            SummaryMetricCard(title: "Remaining", value: jurisdiction == nil ? "--" : "\(daysRemaining)", note: jurisdiction == nil ? "Waiting for a tracked location" : "days currently open")
            SummaryMetricCard(title: "Leave By", value: leaveBy.map { $0.formatted(.dateTime.month(.abbreviated).day()) } ?? "--", note: jurisdiction == nil ? "Add travel or enable GPS" : "continuous stay projection")
            SummaryMetricCard(title: "Tracked", value: "\(trackedJurisdictions)", note: "jurisdictions with history")
            SummaryMetricCard(title: "Logged", value: "\(totalLoggedDays)", note: "days recorded in total")
        }
    }

    private var planningSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Planning Horizon")
                .font(.headline)

            if let nextFallOff {
                PlanningInsightRow(
                    icon: "arrow.counterclockwise",
                    title: nextFallOff.count == 1 ? "1 day falls off next" : "\(nextFallOff.count) days fall off next",
                    detail: "Window relief starts on \(nextFallOff.date.formatted(.dateTime.month(.abbreviated).day().year()))."
                )
            }

            if projectedExtraDays > 0 {
                PlanningInsightRow(
                    icon: "calendar.badge.plus",
                    title: "Your runway extends by about \(projectedExtraDays) days",
                    detail: "Older days should expire from the rolling window while you stay."
                )
            }

            if let fullResetDate {
                PlanningInsightRow(
                    icon: "sparkles",
                    title: "Full allowance restores on \(fullResetDate.formatted(.dateTime.month(.abbreviated).day().year()))",
                    detail: "That is the earliest date you would regain a clean slate if you left now."
                )
            }
        }
    }

    private var recommendationsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Good Next Moves")
                .font(.headline)

            ForEach(recommendations) { recommendation in
                HStack(alignment: .top, spacing: 12) {
                    Text(recommendation.jurisdiction.emoji)
                        .font(.title3)
                        .padding(8)
                        .background(.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))

                    VStack(alignment: .leading, spacing: 3) {
                        HStack {
                            Text(recommendation.jurisdiction.name)
                                .font(.subheadline.weight(.semibold))
                            Spacer(minLength: 8)
                            Text("\(recommendation.daysRemaining)d")
                                .font(.caption.weight(.bold))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(.white.opacity(0.14), in: Capsule())
                        }

                        Text(recommendation.reason)
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.82))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
    }

    private var headline: String {
        guard let jurisdiction else {
            return "Ready to start tracking"
        }

        return "Currently in \(jurisdiction.emoji) \(jurisdiction.name)"
    }

    private var subheadline: String {
        guard let jurisdiction else {
            return "Enable location access or add past travel to build your first visa timeline."
        }

        if let leaveBy {
            if Calendar.current.isDateInToday(leaveBy) {
                return "Today is your last legal day in \(jurisdiction.name) unless older days fall out of the window overnight."
            }
            return "\(daysRemaining) days left right now, with a projected stay through \(leaveBy.formatted(.dateTime.month(.wide).day().year()))."
        }

        return "\(daysUsed) days logged against a \(jurisdiction.ruleType.shortDescription.lowercased())."
    }

    private var statusLabel: String {
        guard jurisdiction != nil else { return "Setup" }
        switch urgency {
        case .safe: return "Comfortable"
        case .caution: return "Caution"
        case .warning: return "Watchlist"
        case .critical: return "Action Now"
        case .expired: return "Expired"
        }
    }

    private var hasPlanningSignals: Bool {
        nextFallOff != nil || projectedExtraDays > 0 || fullResetDate != nil
    }

    private var backgroundGradient: LinearGradient {
        let colors: [Color]
        switch urgency {
        case .safe:
            colors = [Color(red: 0.09, green: 0.49, blue: 0.45), Color(red: 0.08, green: 0.28, blue: 0.52)]
        case .caution:
            colors = [Color(red: 0.63, green: 0.44, blue: 0.04), Color(red: 0.48, green: 0.26, blue: 0.07)]
        case .warning:
            colors = [Color(red: 0.67, green: 0.28, blue: 0.08), Color(red: 0.4, green: 0.16, blue: 0.12)]
        case .critical, .expired:
            colors = [Color(red: 0.56, green: 0.11, blue: 0.13), Color(red: 0.25, green: 0.08, blue: 0.16)]
        }

        return LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

private struct SummaryMetricCard: View {
    let title: String
    let value: String
    let note: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.white.opacity(0.74))
            Text(value)
                .font(.title3.weight(.bold).monospacedDigit())
            Text(note)
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.7))
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

private struct PlanningInsightRow: View {
    let icon: String
    let title: String
    let detail: String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .font(.body)
                .frame(width: 20)
                .foregroundStyle(.white.opacity(0.92))

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.78))
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}
