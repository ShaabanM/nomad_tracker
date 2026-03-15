import Foundation

// MARK: - Rule Types

/// How a jurisdiction counts your days
enum RuleType: Codable, Equatable, Hashable {
    /// Rolling window: e.g., 90 days within any 180-day lookback (Schengen, Turkey, UAE)
    case rolling(maxDays: Int, windowDays: Int)

    /// Per visit: clock resets when you leave and re-enter (UK, Mexico, Japan)
    case perVisit(maxDays: Int)

    /// Calendar year: total days reset on January 1 (Colombia)
    case calendarYear(maxDays: Int)

    var maxDays: Int {
        switch self {
        case .rolling(let max, _): return max
        case .perVisit(let max): return max
        case .calendarYear(let max): return max
        }
    }

    var shortDescription: String {
        switch self {
        case .rolling(let max, let window):
            return "\(max) days in any \(window)-day window"
        case .perVisit(let max):
            return "\(max) days per visit"
        case .calendarYear(let max):
            return "\(max) days per calendar year"
        }
    }

    var ruleLabel: String {
        switch self {
        case .rolling(_, let window): return "Rolling \(window)-day window"
        case .perVisit: return "Per visit"
        case .calendarYear: return "Calendar year"
        }
    }
}

// MARK: - Jurisdiction

/// A visa jurisdiction with its rules for Canadian citizens
struct Jurisdiction: Identifiable, Equatable, Hashable {
    let id: String
    let name: String
    let emoji: String
    let ruleType: RuleType
    let notes: [String]
    let tips: [String]
    let countryCodes: Set<String>  // ISO 3166-1 alpha-2

    static func == (lhs: Jurisdiction, rhs: Jurisdiction) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

// MARK: - All Jurisdictions

extension Jurisdiction {

    /// All supported jurisdictions for Canadian citizens
    static let all: [Jurisdiction] = [
        schengen, uk, turkey, georgia, albania, montenegro, serbia,
        mexico, japan, southKorea, thailand, colombia, argentina,
        brazil, morocco, uae
    ]

    static let schengen = Jurisdiction(
        id: "schengen",
        name: "Schengen Area",
        emoji: "🇪🇺",
        ruleType: .rolling(maxDays: 90, windowDays: 180),
        notes: [
            "The 90/180 rule applies to ALL 29 Schengen countries combined — days in France, Germany, Italy, etc. are pooled together.",
            "The EU Entry/Exit System (EES) now digitally tracks all entries and exits. Overstays are detected automatically.",
            "ETIAS (online travel authorization) expected Q4 2026. The 90/180 rule still applies with ETIAS.",
            "Passport must be valid for at least 3 months after your planned departure.",
        ],
        tips: [
            "A 1-day trip outside Schengen does NOT meaningfully help. The rolling window means you need substantial time outside.",
            "After 90 consecutive days, you must wait 90 days outside before your full allowance renews.",
            "Georgia (365 days visa-free) is the top Schengen cooldown destination.",
            "Albania, Montenegro, and Serbia are nearby non-Schengen options with their own 90/180 rules.",
            "Consider a Digital Nomad Visa (Spain, Portugal, Croatia) for stays longer than 90 days.",
        ],
        countryCodes: [
            "AT", "BE", "BG", "HR", "CZ", "DK", "EE", "FI", "FR", "DE",
            "GR", "HU", "IS", "IT", "LV", "LI", "LT", "LU", "MT", "NL",
            "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "CH"
        ]
    )

    static let uk = Jurisdiction(
        id: "uk",
        name: "United Kingdom",
        emoji: "🇬🇧",
        ruleType: .perVisit(maxDays: 180),
        notes: [
            "Up to 6 months per visit. No formal rolling window or annual cap.",
            "UK ETA is mandatory for Canadians (£16, valid 2 years).",
            "Immigration officers assess whether you're a 'genuine visitor' — frequent long stays will raise flags.",
            "Youth Mobility Scheme available for Canadians aged 18-35 (up to 2 years).",
        ],
        tips: [
            "Each re-entry technically grants a fresh 6-month period, but don't abuse this — officers will refuse entry if you appear to be living in the UK.",
            "The 'genuine visitor' test is the real constraint, not a fixed day count.",
            "Overstaying is a criminal offence and affects future UK, Schengen, and US applications.",
        ],
        countryCodes: ["GB"]
    )

    static let turkey = Jurisdiction(
        id: "turkey",
        name: "Turkey",
        emoji: "🇹🇷",
        ruleType: .rolling(maxDays: 90, windowDays: 180),
        notes: [
            "Canadians can enter visa-free for up to 90 days. No e-Visa needed.",
            "Turkey's counter is completely separate from Schengen.",
            "Passport must be valid for at least 6 months beyond departure.",
        ],
        tips: [
            "Turkey is a popular Schengen cooldown destination — Istanbul and Antalya have great digital nomad infrastructure.",
            "Same 90/180 rolling window as Schengen but counted independently.",
        ],
        countryCodes: ["TR"]
    )

    static let georgia = Jurisdiction(
        id: "georgia",
        name: "Georgia",
        emoji: "🇬🇪",
        ruleType: .perVisit(maxDays: 365),
        notes: [
            "One of the world's most generous visa-free policies — a full year with no visa.",
            "A brief border crossing resets the counter to a fresh 365 days.",
            "Passport must be valid for 6 months with at least 1 blank page.",
            "Visa-free stay is for tourism only — working requires a separate visa.",
        ],
        tips: [
            "Georgia is the #1 Schengen cooldown destination. You can spend your entire 90-day Schengen pause here with room to spare.",
            "Tbilisi has a vibrant expat and digital nomad community.",
            "Low cost of living and fast internet make it ideal for remote work.",
        ],
        countryCodes: ["GE"]
    )

    static let albania = Jurisdiction(
        id: "albania",
        name: "Albania",
        emoji: "🇦🇱",
        ruleType: .rolling(maxDays: 90, windowDays: 180),
        notes: [
            "NOT in the Schengen Area — days here do NOT count against your Schengen 90/180.",
            "Has its own separate 90/180 counter.",
            "Passport must be valid for at least 3 months on arrival.",
            "Digital Nomad 'Unique Permit' available for up to 1 year.",
        ],
        tips: [
            "Popular as a 'Schengen pause' destination — affordable, growing nomad scene.",
            "Tirana and the Albanian Riviera are popular digital nomad spots.",
        ],
        countryCodes: ["AL"]
    )

    static let montenegro = Jurisdiction(
        id: "montenegro",
        name: "Montenegro",
        emoji: "🇲🇪",
        ruleType: .rolling(maxDays: 90, windowDays: 180),
        notes: [
            "NOT in Schengen. Independent counter.",
            "MANDATORY: Register with local police within 24 hours of arrival. Hotels do this automatically.",
            "If staying privately (Airbnb, friends), you or the host MUST register at the police station.",
            "Passport must be valid for 6 months with at least 1 blank page.",
        ],
        tips: [
            "Beautiful coastline. Digital nomad visa available requiring ~€1,350/month minimum income.",
            "Don't forget the 24-hour registration requirement — fines for non-compliance.",
        ],
        countryCodes: ["ME"]
    )

    static let serbia = Jurisdiction(
        id: "serbia",
        name: "Serbia",
        emoji: "🇷🇸",
        ruleType: .rolling(maxDays: 90, windowDays: 180),
        notes: [
            "NOT in Schengen. Independent counter.",
            "Passport must be valid for 6 months beyond intended stay.",
        ],
        tips: [
            "Belgrade is popular for nightlife and low cost of living.",
            "No registration hassle like Montenegro.",
        ],
        countryCodes: ["RS"]
    )

    static let mexico = Jurisdiction(
        id: "mexico",
        name: "Mexico",
        emoji: "🇲🇽",
        ruleType: .perVisit(maxDays: 180),
        notes: [
            "Up to 180 days per entry, but the officer decides how many days to grant.",
            "You are NOT automatically given 180 days — some officers grant less.",
            "No formal rolling window or annual cap.",
            "FMM fee is included in airline tickets for air arrivals.",
        ],
        tips: [
            "One of the most popular long-term digital nomad destinations due to generous rules.",
            "If you receive fewer days than desired, you can politely request more — but it's discretionary.",
            "Repeated near-continuous stays may draw immigration scrutiny.",
        ],
        countryCodes: ["MX"]
    )

    static let japan = Jurisdiction(
        id: "japan",
        name: "Japan",
        emoji: "🇯🇵",
        ruleType: .perVisit(maxDays: 90),
        notes: [
            "90 days per visit. No formal rolling window or annual cap.",
            "Immigration officers have full discretion to refuse entry if they suspect visa-running.",
        ],
        tips: [
            "While technically you can do back-to-back 90-day stays, wait several months between long stays to avoid scrutiny.",
            "No paid work allowed on visa-free stays.",
        ],
        countryCodes: ["JP"]
    )

    static let southKorea = Jurisdiction(
        id: "south_korea",
        name: "South Korea",
        emoji: "🇰🇷",
        ruleType: .perVisit(maxDays: 180),
        notes: [
            "180 days per visit — unusually generous, specific to the Canada-South Korea bilateral agreement.",
            "K-ETA temporarily waived for Canadians through December 31, 2026.",
            "Most other nationalities only get 30-90 days.",
        ],
        tips: [
            "Excellent option for a long stay outside Schengen — 180 days is very generous.",
            "Great infrastructure, fast internet, and vibrant culture.",
        ],
        countryCodes: ["KR"]
    )

    static let thailand = Jurisdiction(
        id: "thailand",
        name: "Thailand",
        emoji: "🇹🇭",
        ruleType: .perVisit(maxDays: 60),
        notes: [
            "60 days visa-free by air, extendable by 30 days at a local immigration office (1,900 THB).",
            "By land/sea: only 15 days, limited to 2 land entries per calendar year.",
            "Thailand Digital Arrival Card (TDAC) must be completed before arrival.",
            "Proof of funds may be requested: 10,000 THB per person.",
        ],
        tips: [
            "Extend to 90 days total by visiting a local immigration office before your 60 days expire.",
            "Thailand has become stricter about serial visa runners — don't do too many back-to-back entries.",
            "Passport must be valid for 6 months with 2 blank pages.",
        ],
        countryCodes: ["TH"]
    )

    static let colombia = Jurisdiction(
        id: "colombia",
        name: "Colombia",
        emoji: "🇨🇴",
        ruleType: .calendarYear(maxDays: 180),
        notes: [
            "CALENDAR YEAR system — 180 days max per calendar year (Jan 1 - Dec 31).",
            "90 days on entry, extendable once for another 90 days.",
            "A border run does NOT give you more days within the same calendar year.",
            "Entry fee of ~85 CAD charged upon arrival.",
        ],
        tips: [
            "Unlike most countries, leaving and re-entering does NOT reset your counter. All days count toward the annual 180-day cap.",
            "Plan your Colombia time carefully around the calendar year boundary if you want to maximize days.",
            "Counter resets every January 1.",
        ],
        countryCodes: ["CO"]
    )

    static let argentina = Jurisdiction(
        id: "argentina",
        name: "Argentina",
        emoji: "🇦🇷",
        ruleType: .perVisit(maxDays: 90),
        notes: [
            "90 days per entry. Border run resets the clock.",
            "Argentina is tightening enforcement on frequent border crossers.",
            "Overstaying results in a fine at the airport, not criminal charges.",
            "You can apply for a 'prorroga' (extension) for another 90 days at Migraciones.",
        ],
        tips: [
            "Quick ferry to Uruguay from Buenos Aires resets the clock — but immigration is increasingly scrutinizing this pattern.",
            "Apply for a prorroga within 60 days of entry for a cheaper extension.",
        ],
        countryCodes: ["AR"]
    )

    static let brazil = Jurisdiction(
        id: "brazil",
        name: "Brazil",
        emoji: "🇧🇷",
        ruleType: .rolling(maxDays: 180, windowDays: 365),
        notes: [
            "e-Visa REQUIRED for Canadians as of January 2026. Visa-free era has ended.",
            "90 days per visit, up to 180 days in any 12-month rolling period.",
            "e-Visa costs ~51 USD, applied for online, most approvals within 48-72 hours.",
        ],
        tips: [
            "Don't forget to get your e-Visa before traveling — you cannot enter visa-free anymore.",
            "The 180-day annual cap uses a rolling 12-month window, not a calendar year.",
        ],
        countryCodes: ["BR"]
    )

    static let morocco = Jurisdiction(
        id: "morocco",
        name: "Morocco",
        emoji: "🇲🇦",
        ruleType: .perVisit(maxDays: 90),
        notes: [
            "90 days per visit. Exit and re-enter for a fresh 90 days.",
            "The 90 days is exactly 90 days, NOT three calendar months.",
            "If you overstay, you must remain until seen by a prosecutor — very unpleasant.",
        ],
        tips: [
            "Geographically convenient for Schengen visa runners — quick trip from Spain pauses your Schengen clock.",
            "To extend without leaving, contact the Service to Foreigners at least 15 days before expiry.",
        ],
        countryCodes: ["MA"]
    )

    static let uae = Jurisdiction(
        id: "uae",
        name: "UAE",
        emoji: "🇦🇪",
        ruleType: .rolling(maxDays: 90, windowDays: 180),
        notes: [
            "90 days within a 180-day rolling window.",
            "Can extend once for an additional 90 days (AED 650 / ~240 CAD).",
            "UAE does not recognize dual nationality — enter on the same passport you'll exit with.",
            "If you hold Emirati citizenship, you MUST enter on your UAE passport.",
        ],
        tips: [
            "If you have any connection to Emirati citizenship (e.g., through a parent), be very careful which passport you use.",
            "Extension available at ICA offices for an additional 90 days.",
        ],
        countryCodes: ["AE"]
    )
}
