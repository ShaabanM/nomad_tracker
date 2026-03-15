import SwiftUI

/// Card showing visa status for a single jurisdiction
struct JurisdictionCard: View {
    let jurisdiction: Jurisdiction
    let daysUsed: Int
    let daysRemaining: Int
    let urgency: UrgencyLevel
    let isActive: Bool
    let mustLeaveBy: Date?
    let projectedExtraDays: Int
    let fullResetDate: Date?

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
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 10) {
                        Text(jurisdiction.emoji)
                            .font(.title2)
                        Text(jurisdiction.name)
                            .font(.title3.weight(.bold))
                    }

                    HStack(spacing: 8) {
                        activeLabel
                        RuleChip(label: jurisdiction.ruleType.ruleLabel)
                    }
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(daysRemaining)")
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(statusColor)
                    Text("days left")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
            }

            HStack(alignment: .center, spacing: 18) {
                ProgressRing(
                    used: daysUsed,
                    total: maxDays,
                    urgency: urgency,
                    size: 102
                )

                VStack(alignment: .leading, spacing: 10) {
                    statusRow(title: "Used", value: "\(daysUsed)/\(maxDays) days")

                    if let leaveBy, daysUsed > 0 {
                        statusRow(
                            title: "Stay until",
                            value: leaveBy.formatted(.dateTime.month(.abbreviated).day().year())
                        )
                    }

                    if let fullResetDate {
                        statusRow(
                            title: "Full reset",
                            value: fullResetDate.formatted(.dateTime.month(.abbreviated).day())
                        )
                    }
                }
            }

            ProgressBar(used: daysUsed, total: maxDays, urgency: urgency)

            if projectedExtraDays > 0 {
                HStack(spacing: 8) {
                    Image(systemName: "calendar.badge.plus")
                        .foregroundStyle(statusColor)
                    Text("\(projectedExtraDays) older day\(projectedExtraDays == 1 ? "" : "s") should expire while you stay, extending your runway.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .padding()
    }

    // MARK: - Compact (Other Jurisdictions)

    private var compactCard: some View {
        HStack(spacing: 12) {
            Text(jurisdiction.emoji)
                .font(.title3)
                .padding(10)
                .background(statusColor.opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))

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

            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.tertiary)
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

    private func statusRow(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.subheadline.weight(.semibold))
        }
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

private struct RuleChip: View {
    let label: String

    var body: some View {
        Text(label)
            .font(.caption2.weight(.semibold))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color.primary.opacity(0.06), in: Capsule())
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
                mustLeaveBy: Calendar.current.date(byAdding: .day, value: 85, to: .now),
                projectedExtraDays: 0,
                fullResetDate: Calendar.current.date(byAdding: .day, value: 180, to: .now)
            )

            JurisdictionCard(
                jurisdiction: .uk,
                daysUsed: 0,
                daysRemaining: 180,
                urgency: .safe,
                isActive: false,
                mustLeaveBy: nil,
                projectedExtraDays: 0,
                fullResetDate: nil
            )

            JurisdictionCard(
                jurisdiction: .turkey,
                daysUsed: 75,
                daysRemaining: 15,
                urgency: .warning,
                isActive: false,
                mustLeaveBy: Calendar.current.date(byAdding: .day, value: 15, to: .now),
                projectedExtraDays: 2,
                fullResetDate: Calendar.current.date(byAdding: .day, value: 105, to: .now)
            )
        }
        .padding()
    }
}
