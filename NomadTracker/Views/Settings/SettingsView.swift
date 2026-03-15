import SwiftUI

/// Settings screen for manual overrides and app configuration
struct SettingsView: View {
    @Bindable var viewModel: DashboardViewModel
    @State private var showingAddJurisdiction = false
    @State private var showingClearAllConfirm = false

    var body: some View {
        NavigationStack {
            List {
                // Current status
                Section("Location Status") {
                    if viewModel.locationService.isAuthorized {
                        HStack {
                            Image(systemName: "location.fill")
                                .foregroundStyle(.green)
                            Text("Location tracking active")
                        }
                    } else {
                        HStack {
                            Image(systemName: "location.slash")
                                .foregroundStyle(.red)
                            Text("Location tracking disabled")
                        }

                        Button("Enable in Settings") {
                            if let url = URL(string: UIApplication.openSettingsURLString) {
                                UIApplication.shared.open(url)
                            }
                        }
                    }

                    if let country = viewModel.locationService.currentCountryName {
                        HStack {
                            Text("Current location")
                            Spacer()
                            if let code = viewModel.locationService.currentCountryCode {
                                Text("\(CountryMapping.flag(for: code)) \(country)")
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }

                // Quick add past days
                Section("Add Past Travel") {
                    Button {
                        showingAddJurisdiction = true
                    } label: {
                        Label("Add days to a jurisdiction", systemImage: "plus.circle")
                    }

                    Text("Use this to enter days you've already spent in a jurisdiction before installing the app.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                // All jurisdictions overview
                Section("All Jurisdictions") {
                    ForEach(Jurisdiction.all) { jurisdiction in
                        NavigationLink(value: jurisdiction.id) {
                            HStack {
                                Text(jurisdiction.emoji)
                                    .font(.title3)

                                VStack(alignment: .leading) {
                                    Text(jurisdiction.name)
                                        .font(.subheadline)
                                    Text(jurisdiction.ruleType.shortDescription)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }

                                Spacer()

                                let used = viewModel.daysUsed(for: jurisdiction)
                                if used > 0 {
                                    Text("\(used)/\(jurisdiction.ruleType.maxDays)")
                                        .font(.caption.monospacedDigit())
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }

                // Info
                Section("About") {
                    HStack {
                        Text("Citizenship")
                        Spacer()
                        Text("🇨🇦 Canadian")
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text("Tracked jurisdictions")
                        Spacer()
                        Text("\(Jurisdiction.all.count)")
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text("Total days logged")
                        Spacer()
                        Text("\(viewModel.records.count)")
                            .foregroundStyle(.secondary)
                    }
                }

                // Danger zone
                Section {
                    Button(role: .destructive) {
                        showingClearAllConfirm = true
                    } label: {
                        Label("Clear All Data", systemImage: "trash")
                    }
                } footer: {
                    Text("This will permanently delete all recorded travel days.")
                }
            }
            .navigationTitle("Settings")
            .navigationDestination(for: String.self) { jurisdictionId in
                if let jurisdiction = Jurisdiction.all.first(where: { $0.id == jurisdictionId }) {
                    JurisdictionDetailView(jurisdiction: jurisdiction, viewModel: viewModel)
                }
            }
            .sheet(isPresented: $showingAddJurisdiction) {
                AddJurisdictionSheet(viewModel: viewModel)
            }
            .alert("Clear All Data", isPresented: $showingClearAllConfirm) {
                Button("Cancel", role: .cancel) {}
                Button("Clear Everything", role: .destructive) {
                    for jurisdiction in Jurisdiction.all {
                        viewModel.clearJurisdiction(jurisdiction)
                    }
                }
            } message: {
                Text("This will delete ALL recorded travel days across all jurisdictions. This cannot be undone.")
            }
        }
    }
}

// MARK: - Add Jurisdiction Sheet

struct AddJurisdictionSheet: View {
    @Bindable var viewModel: DashboardViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var selectedJurisdiction: Jurisdiction?
    @State private var startDate = Date.now
    @State private var endDate = Date.now
    @State private var selectedCountryCode = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Jurisdiction") {
                    Picker("Select", selection: $selectedJurisdiction) {
                        Text("Choose...").tag(nil as Jurisdiction?)
                        ForEach(Jurisdiction.all) { jurisdiction in
                            Text("\(jurisdiction.emoji) \(jurisdiction.name)")
                                .tag(jurisdiction as Jurisdiction?)
                        }
                    }
                }

                if let jurisdiction = selectedJurisdiction {
                    Section("Date Range") {
                        DatePicker("From", selection: $startDate, displayedComponents: .date)
                        DatePicker("To", selection: $endDate, in: startDate..., displayedComponents: .date)
                    }

                    if jurisdiction.countryCodes.count > 1 {
                        Section("Country") {
                            Picker("Country", selection: $selectedCountryCode) {
                                ForEach(Array(jurisdiction.countryCodes).sorted(), id: \.self) { code in
                                    Text("\(CountryMapping.flag(for: code)) \(CountryMapping.countryName(for: code))")
                                        .tag(code)
                                }
                            }
                        }
                    }

                    Section {
                        let days = Calendar.current.dateComponents([.day], from: startDate, to: endDate).day.map { $0 + 1 } ?? 1
                        Text("This will add **\(days) day\(days == 1 ? "" : "s")** to \(jurisdiction.name)")
                            .font(.caption)

                        Text("Rule: \(jurisdiction.ruleType.shortDescription)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Add Past Travel")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        if let jurisdiction = selectedJurisdiction {
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
                    .disabled(selectedJurisdiction == nil)
                }
            }
            .onChange(of: selectedJurisdiction) { _, newValue in
                if let j = newValue {
                    selectedCountryCode = j.countryCodes.first ?? "XX"
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
