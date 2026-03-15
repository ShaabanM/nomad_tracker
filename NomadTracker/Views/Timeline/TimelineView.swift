import SwiftUI

/// Calendar-based timeline showing travel history
struct TimelineView: View {
    @Bindable var viewModel: DashboardViewModel
    @State private var selectedMonth = Date.now

    private let calendar = Calendar.current

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Month selector
                    monthSelector

                    // Calendar grid
                    calendarGrid

                    // Monthly summary
                    monthlySummary

                    Spacer(minLength: 20)
                }
                .padding(.horizontal)
            }
            .navigationTitle("Timeline")
        }
    }

    // MARK: - Month Selector

    private var monthSelector: some View {
        HStack {
            Button {
                withAnimation {
                    selectedMonth = calendar.date(byAdding: .month, value: -1, to: selectedMonth) ?? selectedMonth
                }
            } label: {
                Image(systemName: "chevron.left")
                    .font(.title3)
            }

            Spacer()

            Text(selectedMonth, format: .dateTime.month(.wide).year())
                .font(.title3.weight(.semibold))

            Spacer()

            Button {
                withAnimation {
                    selectedMonth = calendar.date(byAdding: .month, value: 1, to: selectedMonth) ?? selectedMonth
                }
            } label: {
                Image(systemName: "chevron.right")
                    .font(.title3)
            }
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Calendar Grid

    private var calendarGrid: some View {
        let monthRecords = viewModel.records(for: selectedMonth)
        let recordsByDay = Dictionary(grouping: monthRecords) { record in
            calendar.component(.day, from: record.date)
        }

        let components = calendar.dateComponents([.year, .month], from: selectedMonth)
        let firstOfMonth = calendar.date(from: components)!
        let daysInMonth = calendar.range(of: .day, in: .month, for: firstOfMonth)!.count
        let firstWeekday = calendar.component(.weekday, from: firstOfMonth) - 1 // 0-indexed

        return VStack(spacing: 4) {
            // Day headers
            HStack(spacing: 4) {
                ForEach(["S", "M", "T", "W", "T", "F", "S"], id: \.self) { day in
                    Text(day)
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                }
            }

            // Day cells
            let totalCells = firstWeekday + daysInMonth
            let rows = (totalCells + 6) / 7

            ForEach(0..<rows, id: \.self) { row in
                HStack(spacing: 4) {
                    ForEach(0..<7, id: \.self) { col in
                        let index = row * 7 + col
                        let day = index - firstWeekday + 1

                        if day >= 1 && day <= daysInMonth {
                            let dayRecords = recordsByDay[day] ?? []
                            CalendarDayCell(
                                day: day,
                                records: dayRecords,
                                isToday: isToday(day: day)
                            )
                        } else {
                            Color.clear
                                .frame(maxWidth: .infinity)
                                .aspectRatio(1, contentMode: .fit)
                        }
                    }
                }
            }
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private func isToday(day: Int) -> Bool {
        let components = calendar.dateComponents([.year, .month], from: selectedMonth)
        let todayComponents = calendar.dateComponents([.year, .month, .day], from: .now)
        return components.year == todayComponents.year
            && components.month == todayComponents.month
            && day == todayComponents.day
    }

    // MARK: - Monthly Summary

    private var monthlySummary: some View {
        let monthRecords = viewModel.records(for: selectedMonth)
        let byJurisdiction = Dictionary(grouping: monthRecords) { $0.jurisdictionId }

        return VStack(alignment: .leading, spacing: 8) {
            Text("This Month")
                .font(.headline)

            if byJurisdiction.isEmpty {
                Text("No travel recorded this month.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(byJurisdiction.sorted(by: { $0.value.count > $1.value.count }), id: \.key) { jurisdictionId, records in
                    if let jurisdiction = Jurisdiction.all.first(where: { $0.id == jurisdictionId }) {
                        HStack {
                            Text(jurisdiction.emoji)
                            Text(jurisdiction.name)
                                .font(.subheadline)
                            Spacer()
                            Text("\(Set(records.map { calendar.startOfDay(for: $0.date) }).count) days")
                                .font(.subheadline.weight(.medium))
                                .monospacedDigit()
                        }
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - Calendar Day Cell

struct CalendarDayCell: View {
    let day: Int
    let records: [StayRecord]
    let isToday: Bool

    var body: some View {
        VStack(spacing: 2) {
            Text("\(day)")
                .font(.caption2.weight(isToday ? .bold : .regular))
                .foregroundStyle(isToday ? .white : .primary)

            if let record = records.first,
               let jurisdiction = Jurisdiction.all.first(where: { $0.id == record.jurisdictionId }) {
                Text(jurisdiction.emoji)
                    .font(.system(size: 10))
            }
        }
        .frame(maxWidth: .infinity)
        .aspectRatio(1, contentMode: .fit)
        .background {
            if isToday {
                Circle().fill(.blue)
            } else if !records.isEmpty {
                Circle().fill(jurisdictionColor.opacity(0.15))
            }
        }
    }

    private var jurisdictionColor: Color {
        guard let record = records.first,
              let jurisdiction = Jurisdiction.all.first(where: { $0.id == record.jurisdictionId }) else {
            return .gray
        }
        // Color based on jurisdiction for visual distinction
        switch jurisdiction.id {
        case "schengen": return .blue
        case "uk": return .red
        case "turkey": return .red
        case "georgia": return .purple
        case "albania": return .orange
        case "montenegro": return .teal
        case "serbia": return .indigo
        case "mexico": return .green
        case "japan": return .pink
        case "south_korea": return .cyan
        case "thailand": return .yellow
        case "colombia": return .orange
        case "argentina": return .blue
        case "brazil": return .green
        case "morocco": return .red
        case "uae": return .green
        default: return .gray
        }
    }
}
