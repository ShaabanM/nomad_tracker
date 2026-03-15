# NomadTracker

**A native iPhone app that tracks your visa and stay limits across multiple countries so you never accidentally overstay.**

Built for Canadian citizens traveling internationally. The app uses your phone's GPS to automatically detect which country you're in, counts each day against the correct jurisdiction's rules, and warns you as you approach limits.

---

## Why This Exists

If you're a Canadian traveling across multiple countries — bouncing between the EU, the UK, Turkey, Georgia, and beyond — keeping track of how many days you've spent where is a nightmare. Different countries use completely different counting systems:

- **Schengen Area**: 90 days within a *rolling* 180-day window (not a calendar year — immigration looks back 180 days from today and counts)
- **United Kingdom**: 180 days *per visit* (resets when you leave and come back)
- **Colombia**: 180 days per *calendar year* (resets January 1, and border runs don't help)
- **Georgia**: 365 days per entry (resets on re-entry)

Get any of these wrong and you're looking at fines, deportation, or entry bans. The EU's new Entry/Exit System (EES) now digitally tracks every entry and exit — the days of lax enforcement are over.

NomadTracker handles all of this for you.

---

## What It Does

### Automatic Day Counting
The app runs in the background and uses significant location changes to detect when you cross borders. Each day is logged against the correct jurisdiction automatically. If you don't open the app for a few days, it backfills the gap using your last known location.

### Dashboard
The main screen shows:
- Your current detected location (city, country, jurisdiction)
- A card for each jurisdiction you've visited, showing days used vs. allowed
- Color-coded urgency: **green** (comfortable) → **yellow** (caution) → **orange** (warning) → **red** (critical)
- Your "can stay until" date if you remain continuously
- A progress ring and bar for each jurisdiction

### Smart Tips & Suggestions
The app generates contextual advice based on your situation:
- *"You have 30 days remaining in Schengen. Consider Georgia (365 days visa-free!) or Albania for your cooldown."*
- *"Your earliest Schengen days fall off the 180-day window on September 6, giving you more allowance."*
- *"Montenegro: You must register with local police within 24 hours of arrival."*
- *"Colombia uses a calendar year system — leaving and re-entering does NOT reset your counter."*

### Manual Overrides
Already been traveling before installing the app? No problem:
- The onboarding flow asks when you arrived at your current location
- You can add past travel date ranges for any jurisdiction at any time
- Edit or delete individual day records
- Clear all data for a jurisdiction and start over

### Timeline
A calendar view showing where you were each day, color-coded by jurisdiction, with monthly summaries.

---

## Supported Jurisdictions

The app tracks 16 jurisdictions with their exact rules for Canadian citizens:

| Jurisdiction | Max Stay | Rule Type | Key Detail |
|---|---|---|---|
| **Schengen Area** (29 countries) | 90 days | Rolling 180-day window | All Schengen countries share one pool |
| **United Kingdom** | 180 days | Per visit | "Genuine visitor" test is the real limit |
| **Turkey** | 90 days | Rolling 180-day window | Separate counter from Schengen |
| **Georgia** | 365 days | Per entry | Resets on re-entry. Best Schengen cooldown spot |
| **Albania** | 90 days | Rolling 180-day window | NOT Schengen. Independent counter |
| **Montenegro** | 90 days | Rolling 180-day window | Must register with police within 24hrs |
| **Serbia** | 90 days | Rolling 180-day window | Independent from Schengen |
| **Mexico** | up to 180 days | Per visit | Officer decides how many days to grant |
| **Japan** | 90 days | Per visit | Officers scrutinize frequent visa runners |
| **South Korea** | 180 days | Per visit | Unusually generous for Canadians specifically |
| **Thailand** | 60 days | Per visit | Extendable to 90 at local immigration office |
| **Colombia** | 180 days | Calendar year | Border runs DON'T reset the counter |
| **Argentina** | 90 days | Per visit | Tightening enforcement on border runners |
| **Brazil** | 180 days | Rolling 12-month window | e-Visa REQUIRED as of Jan 2026 |
| **Morocco** | 90 days | Per visit | Overstay = must wait for a prosecutor |
| **UAE** | 90 days | Rolling 180-day window | Dual citizenship caution |

### How the Rule Types Work

**Rolling Window** (Schengen, Turkey, Albania, Montenegro, Serbia, UAE, Brazil):
On any given day, immigration looks *backward* by the window length (e.g., 180 days) and counts how many of those days you were present. There's no fixed "reset date" — days gradually "fall off" as they age past the window. After 90 consecutive days in Schengen, you need 90 days outside before your full allowance renews.

**Per Visit** (UK, Georgia, Mexico, Japan, South Korea, Thailand, Argentina, Morocco):
Each time you leave and re-enter, the clock resets. Your stay is counted from your most recent entry date. Some countries (UK, Japan) will scrutinize you if you appear to be gaming this with short exits and long stays.

**Calendar Year** (Colombia):
All days within January 1 – December 31 count toward the annual limit. Leaving the country does NOT reset anything. The counter resets to zero on January 1 of the next year.

---

## How to Install

### Prerequisites

- A Mac with **Xcode** installed (free from the Mac App Store)
- An **Apple Developer account** (free tier works for personal devices, or $99/year for full)
- An iPhone running **iOS 17.0 or later**
- **Homebrew** installed on your Mac (`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`)

### Setup Steps

**1. Clone the repo**
```bash
git clone git@github.com:ShaabanM/nomad_tracker.git
cd nomad_tracker
```

**2. Run the setup script**
```bash
./setup.sh
```
This installs [XcodeGen](https://github.com/yonaskolb/XcodeGen) (if not already installed) and generates the `NomadTracker.xcodeproj` file from `project.yml`.

**3. Open in Xcode**
```bash
open NomadTracker.xcodeproj
```

**4. Configure signing**
- In Xcode, click on the **NomadTracker** project in the sidebar
- Go to **Signing & Capabilities**
- Check **Automatically manage signing**
- Select your **Team** (your Apple ID)
- Xcode will create a provisioning profile automatically

**5. Deploy to your iPhone**
- Connect your iPhone to your Mac via USB (or set up wireless debugging)
- Select your iPhone from the device dropdown at the top of Xcode
- If this is your first time, your iPhone may ask you to **trust this computer**
- Press the **Run** button (or `Cmd+R`)
- On first install, go to **Settings → General → VPN & Device Management** on your iPhone and trust your developer certificate

**6. Grant permissions**
When the app launches:
- Allow **location access** → select **"Always"** for background border crossing detection
- The onboarding flow will ask when you arrived at your current location
- Set your arrival date and the app starts counting from there

### If You Don't Have Xcode

Xcode is required to build and deploy iOS apps. It's a ~12GB download from the Mac App Store. After installing:
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```
Then follow the steps above.

---

## Project Structure

```
nomad_tracker/
├── project.yml                          # XcodeGen project spec
├── setup.sh                             # One-command setup script
└── NomadTracker/
    ├── NomadTrackerApp.swift            # App entry point, SwiftData setup
    ├── ContentView.swift                # Tab bar (Dashboard, Timeline, Settings)
    ├── Info.plist                        # Location permissions, background modes
    │
    ├── Models/
    │   ├── Jurisdiction.swift           # All 16 jurisdictions with rules, notes, tips
    │   ├── StayRecord.swift             # SwiftData model for daily records
    │   └── CountryMapping.swift         # ISO country code → jurisdiction mapping
    │
    ├── Services/
    │   ├── LocationService.swift        # CoreLocation GPS + reverse geocoding
    │   ├── RulesEngine.swift            # Day counting logic for all rule types
    │   └── TipsEngine.swift             # Contextual tip generation
    │
    ├── ViewModels/
    │   └── DashboardViewModel.swift     # Orchestrates data, location, and tips
    │
    └── Views/
        ├── Onboarding/
        │   └── OnboardingView.swift     # First-launch setup flow
        ├── Dashboard/
        │   ├── DashboardView.swift      # Main screen
        │   ├── CurrentLocationHeader.swift
        │   ├── JurisdictionCard.swift   # Expanded + compact card variants
        │   └── TipsPanel.swift          # Collapsible tips section
        ├── Detail/
        │   └── JurisdictionDetailView.swift  # Deep dive per jurisdiction
        ├── Timeline/
        │   └── TimelineView.swift       # Calendar grid with monthly summary
        ├── Settings/
        │   └── SettingsView.swift       # Overrides, jurisdiction list, data management
        └── Components/
            └── ProgressRing.swift       # Circular + bar progress indicators
```

---

## Tech Stack

- **SwiftUI** — declarative UI framework
- **SwiftData** — persistence for day records (replaced CoreData)
- **CoreLocation** — GPS tracking with `significantLocationChange` monitoring for battery-efficient background detection
- **CLGeocoder** — reverse geocoding to determine country from coordinates
- **XcodeGen** — generates `.xcodeproj` from a human-readable `project.yml`

No external dependencies. No pods. No SPM packages. Pure Apple frameworks.

---

## Important Disclaimers

**This app is a personal tracking tool, not legal advice.** Immigration rules can change at any time. Always verify current rules with the official embassy or consulate of your destination country before making travel decisions.

The visa rules encoded in this app were researched as of March 2026. If a country changes its policy, the app's data will need to be updated.

The app counts days based on GPS detection and manual entries. It does not interface with any government immigration system. Your actual legal status is determined by your passport stamps, entry records, and the immigration authority of each country — not this app.

---

## License

Personal use project. Not published on the App Store.
