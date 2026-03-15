import SwiftUI

/// Main dashboard showing all visa status at a glance
struct DashboardView: View {
    @Bindable var viewModel: DashboardViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Current location
                    CurrentLocationHeader(locationService: viewModel.locationService)

                    // Active jurisdiction cards
                    if viewModel.activeJurisdictions.isEmpty {
                        emptyState
                    } else {
                        LazyVStack(spacing: 12) {
                            ForEach(viewModel.activeJurisdictions) { jurisdiction in
                                NavigationLink(value: jurisdiction.id) {
                                    JurisdictionCard(
                                        jurisdiction: jurisdiction,
                                        daysUsed: viewModel.daysUsed(for: jurisdiction),
                                        daysRemaining: viewModel.daysRemaining(for: jurisdiction),
                                        urgency: viewModel.urgencyLevel(for: jurisdiction),
                                        isActive: jurisdiction.id == viewModel.locationService.currentJurisdiction?.id,
                                        mustLeaveBy: viewModel.mustLeaveBy(for: jurisdiction)
                                    )
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    // Tips
                    TipsPanel(tips: viewModel.tips)

                    // Spacer for tab bar
                    Spacer(minLength: 20)
                }
                .padding(.horizontal)
            }
            .navigationTitle("Nomad Tracker")
            .navigationDestination(for: String.self) { jurisdictionId in
                if let jurisdiction = Jurisdiction.all.first(where: { $0.id == jurisdictionId }) {
                    JurisdictionDetailView(jurisdiction: jurisdiction, viewModel: viewModel)
                }
            }
            .refreshable {
                viewModel.locationService.requestCurrentLocation()
                viewModel.loadRecords()
                viewModel.refreshTips()
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "globe")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("No jurisdictions tracked yet")
                .font(.headline)

            Text("Your location will be detected automatically, or you can add past travel manually in Settings.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, 40)
    }
}
