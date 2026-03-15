import SwiftUI

/// Header showing the user's current detected location
struct CurrentLocationHeader: View {
    let locationService: LocationService

    var body: some View {
        VStack(spacing: 12) {
            if locationService.isAuthorized {
                if let countryCode = locationService.currentCountryCode {
                    // Location detected
                    VStack(spacing: 6) {
                        HStack(spacing: 8) {
                            Text(CountryMapping.flag(for: countryCode))
                                .font(.system(size: 32))

                            VStack(alignment: .leading, spacing: 2) {
                                if let city = locationService.currentCity,
                                   let country = locationService.currentCountryName {
                                    Text("\(city), \(country)")
                                        .font(.title3.weight(.semibold))
                                } else {
                                    Text(CountryMapping.countryName(for: countryCode))
                                        .font(.title3.weight(.semibold))
                                }

                                if let jurisdiction = locationService.currentJurisdiction {
                                    Text(jurisdiction.name)
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                } else {
                                    Text("Not a tracked jurisdiction")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            Spacer()

                            // Last updated indicator
                            if let lastUpdated = locationService.lastUpdated {
                                VStack {
                                    Image(systemName: "location.fill")
                                        .font(.caption)
                                        .foregroundStyle(.green)
                                    Text(lastUpdated, style: .relative)
                                        .font(.caption2)
                                        .foregroundStyle(.tertiary)
                                }
                            }
                        }
                    }
                } else if let error = locationService.locationError {
                    // Error state
                    HStack {
                        Image(systemName: "location.slash")
                            .foregroundStyle(.orange)
                        Text("Location unavailable: \(error)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                } else {
                    // Loading state
                    HStack(spacing: 8) {
                        ProgressView()
                        Text("Detecting location...")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            } else {
                // Permission not granted
                VStack(spacing: 8) {
                    Image(systemName: "location.slash.circle")
                        .font(.title2)
                        .foregroundStyle(.orange)

                    Text("Location access needed")
                        .font(.headline)

                    Text("Nomad Tracker needs your location to automatically detect which country you're in.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)

                    Button("Enable Location") {
                        locationService.requestPermission()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.accentColor)
                }
            }
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
    }
}
