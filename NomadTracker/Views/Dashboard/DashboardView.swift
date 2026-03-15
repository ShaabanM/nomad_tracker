import SwiftUI

/// Main dashboard showing all visa status at a glance
struct DashboardView: View {
    @Bindable var viewModel: DashboardViewModel

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [
                        Color(.systemGroupedBackground),
                        Color(.secondarySystemGroupedBackground)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 18) {
                        CurrentLocationHeader(locationService: viewModel.locationService)

                        DashboardSummaryCard(
                            jurisdiction: summaryJurisdiction,
                            urgency: summaryJurisdiction.map { viewModel.urgencyLevel(for: $0) } ?? .safe,
                            daysUsed: summaryJurisdiction.map { viewModel.daysUsed(for: $0) } ?? 0,
                            daysRemaining: summaryJurisdiction.map { viewModel.daysRemaining(for: $0) } ?? 0,
                            leaveBy: summaryJurisdiction.flatMap { viewModel.mustLeaveBy(for: $0) },
                            projectedExtraDays: summaryJurisdiction.map { viewModel.projectedExtraDaysFromWindowExpiry(for: $0) } ?? 0,
                            nextFallOff: summaryJurisdiction.flatMap { viewModel.nextDayFallsOff(for: $0) },
                            fullResetDate: summaryJurisdiction.flatMap { viewModel.fullAllowanceResetDate(for: $0) },
                            trackedJurisdictions: viewModel.trackedJurisdictionCount,
                            totalLoggedDays: viewModel.totalLoggedDays,
                            recommendations: viewModel.recommendedDestinations()
                        )

                        if viewModel.activeJurisdictions.isEmpty {
                            emptyState
                        } else {
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Text("Jurisdictions")
                                        .font(.headline)
                                    Spacer()
                                    Text("\(viewModel.activeJurisdictions.count) active")
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(.secondary)
                                }

                                LazyVStack(spacing: 12) {
                                    ForEach(viewModel.activeJurisdictions) { jurisdiction in
                                        NavigationLink(value: jurisdiction.id) {
                                            JurisdictionCard(
                                                jurisdiction: jurisdiction,
                                                daysUsed: viewModel.daysUsed(for: jurisdiction),
                                                daysRemaining: viewModel.daysRemaining(for: jurisdiction),
                                                urgency: viewModel.urgencyLevel(for: jurisdiction),
                                                isActive: jurisdiction.id == viewModel.locationService.currentJurisdiction?.id,
                                                mustLeaveBy: viewModel.mustLeaveBy(for: jurisdiction),
                                                projectedExtraDays: viewModel.projectedExtraDaysFromWindowExpiry(for: jurisdiction),
                                                fullResetDate: viewModel.fullAllowanceResetDate(for: jurisdiction)
                                            )
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                        }

                        TipsPanel(tips: viewModel.tips)

                        Spacer(minLength: 24)
                    }
                    .padding(.horizontal)
                    .padding(.top, 8)
                }
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

    private var summaryJurisdiction: Jurisdiction? {
        viewModel.currentDashboardJurisdiction
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
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 24)
        .padding(.vertical, 40)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}
