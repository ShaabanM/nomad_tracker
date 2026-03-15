import SwiftUI
import SwiftData

@main
struct NomadTrackerApp: App {
    let modelContainer: ModelContainer
    @State private var viewModel = DashboardViewModel()

    init() {
        do {
            modelContainer = try ModelContainer(for: StayRecord.self, ManualOverride.self)
        } catch {
            fatalError("Failed to create model container: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView(viewModel: viewModel)
                .modelContainer(modelContainer)
                .onAppear {
                    viewModel.configure(with: modelContainer.mainContext)
                    if viewModel.locationService.isAuthorized {
                        viewModel.locationService.startTracking()
                    }
                }
        }
    }
}

/// Root view that handles onboarding vs main app
struct RootView: View {
    @Bindable var viewModel: DashboardViewModel

    var body: some View {
        if viewModel.hasCompletedOnboarding {
            ContentView(viewModel: viewModel)
        } else {
            OnboardingView(viewModel: viewModel)
        }
    }
}
