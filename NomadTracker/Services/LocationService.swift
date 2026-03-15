import Foundation
import CoreLocation
import SwiftData

/// Manages GPS location tracking and reverse geocoding
@Observable
final class LocationService: NSObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()
    private let geocoder = CLGeocoder()

    var currentCountryCode: String?
    var currentCity: String?
    var currentCountryName: String?
    var currentJurisdiction: Jurisdiction?
    var authorizationStatus: CLAuthorizationStatus = .notDetermined
    var isAuthorized: Bool {
        authorizationStatus == .authorizedAlways || authorizationStatus == .authorizedWhenInUse
    }
    var lastUpdated: Date?
    var locationError: String?

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyKilometer
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false
        authorizationStatus = locationManager.authorizationStatus
    }

    func requestPermission() {
        locationManager.requestAlwaysAuthorization()
    }

    func startTracking() {
        locationManager.startMonitoringSignificantLocationChanges()
        // Also get an immediate location
        locationManager.requestLocation()
    }

    func stopTracking() {
        locationManager.stopMonitoringSignificantLocationChanges()
    }

    func requestCurrentLocation() {
        locationManager.requestLocation()
    }

    // MARK: - CLLocationManagerDelegate

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
        if isAuthorized {
            startTracking()
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        reverseGeocode(location)
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Don't overwrite existing location data on transient errors
        if currentCountryCode == nil {
            locationError = error.localizedDescription
        }
    }

    // MARK: - Reverse Geocoding

    private func reverseGeocode(_ location: CLLocation) {
        geocoder.reverseGeocodeLocation(location) { [weak self] placemarks, error in
            guard let self = self else { return }

            if let error = error {
                self.locationError = error.localizedDescription
                return
            }

            guard let placemark = placemarks?.first,
                  let countryCode = placemark.isoCountryCode else {
                return
            }

            self.currentCountryCode = countryCode
            self.currentCity = placemark.locality
            self.currentCountryName = placemark.country
            self.currentJurisdiction = CountryMapping.jurisdiction(for: countryCode)
            self.lastUpdated = Date()
            self.locationError = nil

            // Post notification for the view model to handle day logging
            NotificationCenter.default.post(
                name: .locationDidUpdate,
                object: nil,
                userInfo: [
                    "countryCode": countryCode,
                    "jurisdictionId": self.currentJurisdiction?.id ?? "unknown"
                ]
            )
        }
    }
}

extension Notification.Name {
    static let locationDidUpdate = Notification.Name("locationDidUpdate")
}
