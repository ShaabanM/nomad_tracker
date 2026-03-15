import SwiftUI

/// Detailed view for a single jurisdiction
struct JurisdictionDetailView: View {
    let jurisdiction: Jurisdiction
    @Bindable var viewModel: DashboardViewModel

    @State private var showingAddDays = false
    @State private var showingClearConfirm = false

    private var records: [StayRecord] {
        viewModel.records
            .filter { $0.jurisdictionId == jurisdiction.id }
            .sorted { $0.date > $1.date }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Status card
                statusCard

                // Rule explanation
                ruleCard

                // Notes
                if !jurisdiction.notes.isEmpty {
                    notesCard
                }

                // Tips
                if !jurisdiction.tips.isEmpty {
                    tipsCard
                }

                // Day log
                dayLogCard

                // Danger zone
                dangerZone
            }
            .padding(.horizontal)
        }
        .navigationTitle(jurisdiction.name)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showingAddDays = true
                } label: {
                    Image(systemName: "plus.circle")
                }
            }
        }
        .sheet(isPresented: $showingAddDays) {
            AddDaysSheet(jurisdiction: jurisdiction, viewModel: viewModel)
        }
        .alert("Clear All Days", isPresented: $showingClearConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Clear", role: .destructive) {
                viewModel.clearJurisdiction(jurisdiction)
            }
        } message: {
            Text("This will delete all recorded days for \(jurisdiction.name). This cannot be undone.")
        }
    }

    // MARK: - Status Card

    private var statusCard: some View {
        VStack(spacing: 16) {
            HStack {
                Text(jurisdiction.emoji)
                    .font(.largeTitle)
                Spacer()

                if jurisdiction.id == viewModel.locationService.currentJurisdiction?.id {
                    Label("You are here", systemImage: "location.fill")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(.green, in: Capsule())
                }
            }

            ProgressRing(
                used: viewModel.daysUsed(for: jurisdiction),
                total: jurisdiction.ruleType.maxDays,
                urgency: viewModel.urgencyLevel(for: jurisdiction),
                size: 150
            )

            VStack(spacing: 4) {
                Text("\(viewModel.daysRemaining(for: jurisdiction)) days remaining")
                    .font(.title2.weight(.bold))

                if let leaveBy = viewModel.mustLeaveBy(for: jurisdiction),
                   viewModel.daysUsed(for: jurisdiction) > 0 {
                    Text("Can stay until \(leaveBy, format: .dateTime.month(.wide).day().year())")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            ProgressBar(
                used: viewModel.daysUsed(for: jurisdiction),
                total: jurisdiction.ruleType.maxDays,
                urgency: viewModel.urgencyLevel(for: jurisdiction)
            )
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Rule Card

    private var ruleCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Rule", systemImage: "book.closed")
                .font(.headline)

            Text(jurisdiction.ruleType.shortDescription)
                .font(.body)

            switch jurisdiction.ruleType {
            case .rolling(let max, let window):
                Text("On any given day, immigration looks back \(window) days and counts how many you spent here. If that count reaches \(max), you cannot enter.")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if let leaveBy = viewModel.mustLeaveBy(for: jurisdiction),
                   viewModel.daysUsed(for: jurisdiction) > 0 {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 8) {
                            Image(systemName: "calendar.badge.clock")
                                .foregroundStyle(.blue)
                            Text("Projected continuous stay: \(leaveBy, format: .dateTime.month().day().year())")
                                .font(.caption.weight(.medium))
                        }

                        let extraDays = viewModel.projectedExtraDaysFromWindowExpiry(for: jurisdiction)
                        if extraDays > 0 {
                            Text("\(extraDays) older day\(extraDays == 1 ? "" : "s") should fall out of the rolling window while you stay, extending your legal runway.")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.top, 4)
                }

                if let fallOff = viewModel.nextDayFallsOff(for: jurisdiction) {
                    HStack {
                        Image(systemName: "arrow.counterclockwise")
                            .foregroundStyle(.blue)
                        Text("Next day falls off: \(fallOff.date, format: .dateTime.month().day())")
                            .font(.caption)
                    }
                    .padding(.top, 4)
                }

            case .perVisit(let max):
                Text("Each time you leave and re-enter, you get a fresh \(max)-day allowance. Your clock resets on re-entry.")
                    .font(.caption)
                    .foregroundStyle(.secondary)

            case .calendarYear(let max):
                Text("All days in a calendar year count toward the \(max)-day limit. Resets on January 1. Leaving and re-entering does NOT reset the counter.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Notes Card

    private var notesCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Important Notes", systemImage: "exclamationmark.circle")
                .font(.headline)

            ForEach(jurisdiction.notes, id: \.self) { note in
                HStack(alignment: .top, spacing: 8) {
                    Text("•")
                        .foregroundStyle(.secondary)
                    Text(note)
                        .font(.caption)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Tips Card

    private var tipsCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Tips", systemImage: "lightbulb")
                .font(.headline)

            ForEach(jurisdiction.tips, id: \.self) { tip in
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "arrow.right.circle.fill")
                        .font(.caption)
                        .foregroundStyle(.blue)
                    Text(tip)
                        .font(.caption)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Day Log Card

    private var dayLogCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Label("Day Log", systemImage: "calendar")
                    .font(.headline)
                Spacer()
                Text("\(records.count) days")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if records.isEmpty {
                Text("No days recorded yet.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 8)
            } else {
                ForEach(Array(records.prefix(30))) { record in
                    HStack {
                        Text(CountryMapping.flag(for: record.countryCode))

                        Text(record.date, format: .dateTime.weekday(.wide).month().day())
                            .font(.caption)

                        Spacer()

                        Image(systemName: record.recordSource == .gps ? "location.fill" : "hand.tap.fill")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 2)
                }

                if records.count > 30 {
                    Text("+ \(records.count - 30) more days")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Danger Zone

    private var dangerZone: some View {
        VStack(spacing: 8) {
            Button(role: .destructive) {
                showingClearConfirm = true
            } label: {
                Label("Clear All Days for \(jurisdiction.name)", systemImage: "trash")
                    .font(.subheadline)
            }
        }
        .padding(.vertical)
    }
}

// MARK: - Add Days Sheet

struct AddDaysSheet: View {
    let jurisdiction: Jurisdiction
    @Bindable var viewModel: DashboardViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var startDate = Date.now
    @State private var endDate = Date.now
    @State private var selectedCountryCode: String = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Date Range") {
                    DatePicker("Start Date", selection: $startDate, displayedComponents: .date)
                    DatePicker("End Date", selection: $endDate, in: startDate..., displayedComponents: .date)
                }

                Section("Country") {
                    if jurisdiction.countryCodes.count > 1 {
                        Picker("Country", selection: $selectedCountryCode) {
                            ForEach(Array(jurisdiction.countryCodes).sorted(), id: \.self) { code in
                                Text("\(CountryMapping.flag(for: code)) \(CountryMapping.countryName(for: code))")
                                    .tag(code)
                            }
                        }
                    } else {
                        let code = jurisdiction.countryCodes.first ?? "XX"
                        HStack {
                            Text(CountryMapping.flag(for: code))
                            Text(CountryMapping.countryName(for: code))
                        }
                    }
                }

                Section {
                    let days = Calendar.current.dateComponents([.day], from: startDate, to: endDate).day.map { $0 + 1 } ?? 1
                    Text("This will add **\(days) day\(days == 1 ? "" : "s")** to \(jurisdiction.name)")
                        .font(.caption)
                }
            }
            .navigationTitle("Add Past Days")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let code = selectedCountryCode.isEmpty
                            ? (jurisdiction.countryCodes.first ?? "XX")
                            : selectedCountryCode
                        viewModel.addManualDays(
                            jurisdiction: jurisdiction,
                            from: startDate,
                            to: endDate,
                            countryCode: code
                        )
                        dismiss()
                    }
                }
            }
            .onAppear {
                selectedCountryCode = jurisdiction.countryCodes.first ?? "XX"
            }
        }
        .presentationDetents([.medium])
    }
}
