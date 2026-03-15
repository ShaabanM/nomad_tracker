import SwiftUI

/// Header showing the user's current detected location
struct CurrentLocationHeader: View {
    let locationService: LocationService

    var body: some View {
        VStack(spacing: 14) {
            if locationService.isAuthorized {
                if let countryCode = locationService.currentCountryCode {
                    VStack(spacing: 10) {
                        HStack(alignment: .top, spacing: 12) {
                            Text(CountryMapping.flag(for: countryCode))
                                .font(.system(size: 34))
                                .padding(10)
                                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Current location")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.secondary)

                                if let city = locationService.currentCity,
                                   let country = locationService.currentCountryName {
                                    Text("\(city), \(country)")
                                        .font(.title3.weight(.bold))
                                } else {
                                    Text(CountryMapping.countryName(for: countryCode))
                                        .font(.title3.weight(.bold))
                                }

                                if let jurisdiction = locationService.currentJurisdiction {
                                    Label(jurisdiction.name, systemImage: "checkmark.shield")
                                        .font(.subheadline.weight(.medium))
                                        .foregroundStyle(.primary)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(Color.blue.opacity(0.1), in: Capsule())
                                } else {
                                    Text("Not currently in a tracked jurisdiction")
                                        .font(.subheadline.weight(.medium))
                                        .foregroundStyle(.secondary)
                                }
                            }

                            Spacer()

                            if let lastUpdated = locationService.lastUpdated {
                                VStack(alignment: .trailing, spacing: 4) {
                                    Image(systemName: "location.fill")
                                        .font(.caption.weight(.bold))
                                        .foregroundStyle(.green)
                                    Text(lastUpdated, style: .relative)
                                        .font(.caption2.weight(.medium))
                                        .foregroundStyle(.secondary)
                                }
                                .padding(.top, 2)
                            }
                        }

                        if let jurisdiction = locationService.currentJurisdiction {
                            HStack(spacing: 8) {
                                StatusCapsule(title: "Rule", value: jurisdiction.ruleType.ruleLabel)
                                StatusCapsule(title: "Allowance", value: "\(jurisdiction.ruleType.maxDays) days")
                            }
                        }
                    }
                } else if let error = locationService.locationError {
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: "location.slash")
                            .foregroundStyle(.orange)
                            .padding(.top, 2)
                        Text("Location unavailable: \(error)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                } else {
                    HStack(spacing: 8) {
                        ProgressView()
                        Text("Detecting location...")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            } else {
                VStack(spacing: 10) {
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
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .strokeBorder(Color.white.opacity(0.35), lineWidth: 1)
        }
    }
}

private struct StatusCapsule: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption.weight(.semibold))
                .lineLimit(1)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}
