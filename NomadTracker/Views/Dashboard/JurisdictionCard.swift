import SwiftUI

/// Card showing visa status for a single jurisdiction
struct JurisdictionCard: View {
    let jurisdiction: Jurisdiction
    let daysUsed: Int
    let daysRemaining: Int
    let urgency: UrgencyLevel
    let isActive: Bool
    let mustLeaveBy: Date?

    private var maxDays: Int { jurisdiction.ruleType.maxDays }

    var body: some View {
        VStack(spacing: 0) {
            if isActive {
                expandedCard
            } else {
                compactCard
            }
        }
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(borderColor, lineWidth: isActive ? 2 : 0)
        )
    }

    // MARK: - Expanded (Active Jurisdiction)

    private var expandedCard: some View {
        VStack(spacing: 16) {
            // Header
            HStack {
                Text(jurisdiction.emoji)
                    .font(.title2)
                Text(jurisdiction.name)
                    .font(.title3.weight(.semibold))
                Spacer()
                activeLabel
            }

            // Progress ring
            ProgressRing(
                used: daysUsed,
                total: maxDays,
                urgency: urgency,
                size: 110
            )

            // Status text
            VStack(spacing: 4) {
                Text("\(daysRemaining) days remaining")
                    .font(.headline)
                    .foregroundStyle(statusColor)

                Text(jurisdiction.ruleType.ruleLabel)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if let leaveBy = mustLeaveBy, daysUsed > 0 {
                    Text("Can stay until \(leaveBy, format: .dateTime.month().day().year())")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            // Progress bar
            ProgressBar(used: daysUsed, total: maxDays, urgency: urgency)
        }
        .padding()
    }

    // MARK: - Compact (Other Jurisdictions)

    private var compactCard: some View {
        HStack(spacing: 12) {
            Text(jurisdiction.emoji)
                .font(.title3)

            VStack(alignment: .leading, spacing: 4) {
                Text(jurisdiction.name)
                    .font(.subheadline.weight(.semibold))

                Text("\(daysUsed)/\(maxDays) days \u{2022} \(jurisdiction.ruleType.ruleLabel)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Mini progress
            Text("\(daysRemaining)")
                .font(.title3.weight(.bold).monospacedDigit())
                .foregroundStyle(statusColor)

            Text("left")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding()
    }

    // MARK: - Helpers

    private var activeLabel: some View {
        Text("ACTIVE")
            .font(.caption2.weight(.bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(statusColor, in: Capsule())
    }

    private var statusColor: Color {
        switch urgency {
        case .safe: return .green
        case .caution: return .yellow
        case .warning: return .orange
        case .critical, .expired: return .red
        }
    }

    private var borderColor: Color {
        statusColor.opacity(0.5)
    }
}

#Preview {
    ScrollView {
        VStack(spacing: 16) {
            JurisdictionCard(
                jurisdiction: .schengen,
                daysUsed: 5,
                daysRemaining: 85,
                urgency: .safe,
                isActive: true,
                mustLeaveBy: Calendar.current.date(byAdding: .day, value: 85, to: .now)
            )

            JurisdictionCard(
                jurisdiction: .uk,
                daysUsed: 0,
                daysRemaining: 180,
                urgency: .safe,
                isActive: false,
                mustLeaveBy: nil
            )

            JurisdictionCard(
                jurisdiction: .turkey,
                daysUsed: 75,
                daysRemaining: 15,
                urgency: .warning,
                isActive: false,
                mustLeaveBy: Calendar.current.date(byAdding: .day, value: 15, to: .now)
            )
        }
        .padding()
    }
}
