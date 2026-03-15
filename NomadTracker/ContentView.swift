import SwiftUI

/// Main tab view
struct ContentView: View {
    @Bindable var viewModel: DashboardViewModel

    var body: some View {
        TabView {
            DashboardView(viewModel: viewModel)
                .tabItem {
                    Label("Dashboard", systemImage: "gauge.with.needle")
                }

            TimelineView(viewModel: viewModel)
                .tabItem {
                    Label("Timeline", systemImage: "calendar")
                }

            SettingsView(viewModel: viewModel)
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
        }
    }
}
