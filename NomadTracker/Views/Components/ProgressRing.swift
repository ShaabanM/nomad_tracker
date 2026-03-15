import SwiftUI

/// Circular progress ring showing days used
struct ProgressRing: View {
    let used: Int
    let total: Int
    let urgency: UrgencyLevel
    let size: CGFloat

    private var progress: Double {
        guard total > 0 else { return 0 }
        return min(1.0, Double(used) / Double(total))
    }

    private var color: Color {
        switch urgency {
        case .safe: return .green
        case .caution: return .yellow
        case .warning: return .orange
        case .critical: return .red
        case .expired: return .red
        }
    }

    private var trackColor: Color {
        color.opacity(0.15)
    }

    var body: some View {
        ZStack {
            // Track
            Circle()
                .stroke(trackColor, style: StrokeStyle(lineWidth: size * 0.12, lineCap: .round))

            // Progress
            Circle()
                .trim(from: 0, to: progress)
                .stroke(color, style: StrokeStyle(lineWidth: size * 0.12, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut(duration: 0.8), value: progress)

            // Center text
            VStack(spacing: 2) {
                Text("\(used)")
                    .font(.system(size: size * 0.28, weight: .bold, design: .rounded))
                    .monospacedDigit()

                Text("of \(total)")
                    .font(.system(size: size * 0.12, weight: .medium, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: size, height: size)
    }
}

/// Horizontal progress bar variant
struct ProgressBar: View {
    let used: Int
    let total: Int
    let urgency: UrgencyLevel

    private var progress: Double {
        guard total > 0 else { return 0 }
        return min(1.0, Double(used) / Double(total))
    }

    private var color: Color {
        switch urgency {
        case .safe: return .green
        case .caution: return .yellow
        case .warning: return .orange
        case .critical: return .red
        case .expired: return .red
        }
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                // Track
                RoundedRectangle(cornerRadius: 4)
                    .fill(color.opacity(0.15))

                // Fill
                RoundedRectangle(cornerRadius: 4)
                    .fill(color)
                    .frame(width: geometry.size.width * progress)
                    .animation(.easeInOut(duration: 0.6), value: progress)
            }
        }
        .frame(height: 8)
    }
}

#Preview {
    VStack(spacing: 30) {
        ProgressRing(used: 5, total: 90, urgency: .safe, size: 120)
        ProgressRing(used: 60, total: 90, urgency: .caution, size: 120)
        ProgressRing(used: 80, total: 90, urgency: .warning, size: 120)
        ProgressRing(used: 88, total: 90, urgency: .critical, size: 120)

        ProgressBar(used: 45, total: 90, urgency: .caution)
            .padding(.horizontal)
    }
}
