import SwiftUI

/// Panel showing contextual tips and suggestions
struct TipsPanel: View {
    let tips: [Tip]
    @State private var isExpanded = true

    var body: some View {
        if !tips.isEmpty {
            VStack(alignment: .leading, spacing: 14) {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isExpanded.toggle()
                    }
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 8) {
                                Image(systemName: "lightbulb.fill")
                                    .foregroundStyle(.yellow)
                                Text("Tips & Suggestions")
                                    .font(.headline)
                            }
                            Text("\(tips.count) tailored for your current travel pattern")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .buttonStyle(.plain)

                if isExpanded {
                    ForEach(Array(tips.prefix(6))) { tip in
                        TipRow(tip: tip)
                    }
                }
            }
            .padding(18)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        }
    }
}

/// A single tip row
struct TipRow: View {
    let tip: Tip

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: tip.icon)
                .font(.body)
                .foregroundStyle(iconColor)
                .frame(width: 26, height: 26)
                .background(iconColor.opacity(0.12), in: RoundedRectangle(cornerRadius: 10, style: .continuous))

            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .top, spacing: 8) {
                    Text(tip.title)
                        .font(.subheadline.weight(.semibold))

                    Spacer(minLength: 8)

                    Text(priorityLabel)
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(iconColor)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(iconColor.opacity(0.1), in: Capsule())
                }

                Text(tip.message)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(12)
        .background(Color.primary.opacity(0.04), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var iconColor: Color {
        switch tip.priority {
        case .critical: return .red
        case .high: return .orange
        case .medium: return .yellow
        case .low: return .blue
        }
    }

    private var priorityLabel: String {
        switch tip.priority {
        case .critical: return "Now"
        case .high: return "High"
        case .medium: return "Soon"
        case .low: return "Info"
        }
    }
}
