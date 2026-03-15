import SwiftUI

/// First-launch onboarding flow
struct OnboardingView: View {
    @Bindable var viewModel: DashboardViewModel
    @State private var currentPage = 0
    @State private var arrivalDate = Date.now
    @State private var selectedJurisdiction: Jurisdiction?

    var body: some View {
        VStack {
            TabView(selection: $currentPage) {
                welcomePage.tag(0)
                locationPage.tag(1)
                initialDaysPage.tag(2)
            }
            .tabViewStyle(.page(indexDisplayMode: .always))
            .indexViewStyle(.page(backgroundDisplayMode: .always))
        }
        .background(Color(.systemBackground))
    }

    // MARK: - Welcome

    private var welcomePage: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "globe.americas.fill")
                .font(.system(size: 80))
                .foregroundStyle(.accent)

            Text("Nomad Tracker")
                .font(.largeTitle.weight(.bold))

            Text("Track your visa days automatically.\nNever overstay anywhere.")
                .font(.title3)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Spacer()

            VStack(spacing: 12) {
                featureRow(icon: "location.fill", text: "Auto-detects your country via GPS")
                featureRow(icon: "calendar.badge.clock", text: "Understands rolling windows, per-visit, and calendar year rules")
                featureRow(icon: "bell.badge", text: "Warns you before you approach limits")
                featureRow(icon: "hand.tap", text: "Easy manual overrides for past travel")
            }
            .padding(.horizontal, 32)

            Spacer()

            nextButton
        }
        .padding()
    }

    private func featureRow(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(.accent)
                .frame(width: 30)

            Text(text)
                .font(.subheadline)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Location

    private var locationPage: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "location.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(.blue)

            Text("Location Access")
                .font(.title.weight(.bold))

            Text("Nomad Tracker uses your location to automatically detect which country you're in. Background tracking catches border crossings even when the app is closed.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            if viewModel.locationService.isAuthorized {
                Label("Location enabled", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(.green)
                    .font(.headline)
            } else {
                Button("Enable Location") {
                    viewModel.locationService.requestPermission()
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }

            Spacer()

            nextButton
        }
        .padding()
    }

    // MARK: - Initial Days

    private var initialDaysPage: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "calendar.badge.plus")
                .font(.system(size: 60))
                .foregroundStyle(.accent)

            Text("Already Traveling?")
                .font(.title.weight(.bold))

            Text("If you've already been in a jurisdiction, set your arrival date so we can count those days.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            VStack(spacing: 16) {
                Picker("Jurisdiction", selection: $selectedJurisdiction) {
                    Text("None — starting fresh").tag(nil as Jurisdiction?)
                    ForEach(Jurisdiction.all) { jurisdiction in
                        Text("\(jurisdiction.emoji) \(jurisdiction.name)")
                            .tag(jurisdiction as Jurisdiction?)
                    }
                }
                .pickerStyle(.menu)

                if let currentJurisdiction = viewModel.locationService.currentJurisdiction,
                   selectedJurisdiction == nil {
                    Button {
                        selectedJurisdiction = currentJurisdiction
                    } label: {
                        Label(
                            "Use detected location: \(currentJurisdiction.emoji) \(currentJurisdiction.name)",
                            systemImage: "location.fill"
                        )
                        .font(.subheadline.weight(.medium))
                    }
                    .buttonStyle(.bordered)
                }

                if selectedJurisdiction != nil {
                    DatePicker("Arrived on", selection: $arrivalDate, in: ...Date.now, displayedComponents: .date)
                        .padding(.horizontal, 32)
                }
            }

            Spacer()

            Button {
                // Save initial days if set
                if let jurisdiction = selectedJurisdiction {
                    let code = jurisdiction.countryCodes.first ?? "XX"
                    viewModel.addManualDays(
                        jurisdiction: jurisdiction,
                        from: arrivalDate,
                        to: .now,
                        countryCode: code
                    )
                }
                viewModel.hasCompletedOnboarding = true
            } label: {
                Text("Get Started")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(.accent)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .padding(.horizontal, 32)

            Button("Skip — I'll set this up later") {
                viewModel.hasCompletedOnboarding = true
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        .padding()
    }

    // MARK: - Helpers

    private var nextButton: some View {
        Button {
            withAnimation {
                currentPage += 1
            }
        } label: {
            Text("Next")
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding()
                .background(.accent)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .padding(.horizontal, 32)
    }
}
