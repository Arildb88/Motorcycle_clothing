# Advertising and monetization strategy

Research only. Do not add an ad SDK, a consent SDK, or production ad code from this document.

Access date: 2026-10-01.

Labels: **Fact**, **Recommendation**, **Assumption**, **Open question**.

This document follows the existing product rules in `ARCHITECTURE.md` §16 and `RIDEWEAR_CONTEXT.md`: ads default off, at most one small banner or native banner on an eligible screen, ads never affect ranking, and safety surfaces stay empty. Those rules are not reopened here.

## 1. What “low-key” means

**Recommendation.**

- One placement visible at a time, in the layout, not over content.
- Banner or native banner only.
- No interstitial, app-open, or rewarded video as the default. Rewarded video that unlocks a kit or a forecast is out, because it withholds the product’s purpose.
- A later ad-free paid option may remove the banner. It must not remove weather, warnings, or the recommendation.

## 2. Platforms

**Fact.** Google AdMob is a mobile SDK for banner and native ads. For users in the EEA, the UK, and Switzerland, Google requires a Google-certified consent management platform that speaks IAB TCF if personalized ads are requested. Google’s own UMP SDK is one such CMP. Without consent to store or access information on the device (TCF Purpose 1), Google says only limited ads can serve. TCF 2.3 is mandatory for consent strings created on or after 1 March 2026. Sources: [AdMob TCF help](https://support.google.com/admob/answer/9760862), [consent requirements](https://support.google.com/admob/answer/13554116), and [UMP iOS](https://developers.google.com/admob/ios/privacy), accessed 2026-10-01.

**Fact.** On iOS, Google’s guidance is to show the GDPR message first and the App Tracking Transparency prompt second, and only after the relevant consent. UMP can sequence that if both messages are configured. Source: [AdMob iOS GDPR](https://developers.google.com/admob/ios/privacy/gdpr), accessed 2026-10-01.

**Fact.** Apple App Store Review Guideline 2.5.18: ads stay in the main binary (not widgets, notifications, or App Clips); they must fit the age rating; the user must be able to see targeting information without leaving the app; no behavioral ads from HealthKit, ClassKit, or Kids Category data; interrupting ads need a real close control and must be identifiable as ads; the app needs a way to report an inappropriate ad. Guideline text also rejects apps that exist mainly to show ads, and artificial click inflation. Source: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), accessed 2026-10-01.

**Fact.** Google Play treats ads as part of the app. Ads must not imitate system or app UI. The ads policy also restricts disruptive formats; the page points at the Coalition for Better Ads. Children-directed apps have extra limits. The developer is responsible for networks they embed. Source: [Play ads policy](https://support.google.com/googleplay/android-developer/answer/9857753), accessed 2026-10-01.

**Fact.** Other SDKs (Meta Audience Network, AppLovin, Unity Ads, and similar) exist. This pass did not re-read each vendor’s rate card. They add another data processor and another mediation choice.

**Recommendation.** If ads are ever enabled, start with one network (AdMob is the one with the clearest public EEA consent path in this review) behind an `AdBannerSlot` that the screen does not implement itself. Mediation can wait until fill is actually a problem. Do not add the SDK while `ADS_ENABLED` is false.

**Open question.** A Norwegian or EU publisher agreement, VAT, and whether RideWear is established in Norway are legal facts this research did not collect. Needed before any live ad unit.

## 3. Where a banner may sit

**Recommendation.** Only on browsing screens where the user is not deciding safety or submitting a secret:

- Activity home, below the fold, after the primary content, one slot.
- Saved-routes list, below the list or in a reserved footer that does not cover the last row.
- Wardrobe list, same pattern.

**Recommendation.** No ads on:

- Login, registration, password reset, OAuth, consent, privacy, and account security.
- The recommendation result, including the primary kit card and any severe-weather or “do not ride” style warning.
- Route drawing, map preview, place search, and any screen that is one tap from navigation handoff.
- Active session or “start ride” flows.
- Error, empty, and loading states that the user cannot scroll past.
- Payment or a future subscription screen.

**Fact.** Apple’s 2.5.18 and Play’s deceptive-ad examples both punish ads that look like system warnings or app controls. A clothing app must not style an ad like a weather alert.

## 4. Personalized versus contextual

**Fact.** Google’s EU policy, as summarized in the AdMob GDPR guide, still wants consent for local storage even for non-personalized ads, because identifiers are used for fraud, frequency caps, and aggregated reporting. Limited ads are the fallback when that consent is missing.

**Recommendation.** Default the product intent to non-personalized / contextual ads. Still implement a certified CMP before any request, because the limited-ads path is a policy requirement, not a way to skip consent UI. Do not read the wardrobe, GPS trace, or health-like comfort logs to target ads. That would collide with Apple’s sensitive-data rule and with RideWear’s privacy architecture even if a network allowed it.

**Assumption.** Contextual outdoor ads will earn less per impression than personalized ads. The size of the gap was not measured. Do not fill the gap by expanding tracking.

## 5. SDK and privacy

**Recommendation.** When an SDK is eventually considered:

- It runs only after consent, and the app must work with ads omitted if consent is refused.
- Document the SDK in the privacy policy and in store data-safety forms before release.
- No ad SDK in the motorcycle recommendation module. Ranking inputs stay weather, wardrobe, and activity.
- Prefer a single process-wide initialization behind the feature flag so screens cannot load ads ad hoc.
- Keep the advertising identifier off unless ATT and the CMP both allow it.

**Fact.** MET’s terms already warn that calling their API from the device exposes the user’s IP and coordinates. Ads do not change that rule. Weather stays proxied.

## 6. Money, without a fake forecast

**Fact.** This research did not find a public eCPM for a Norwegian outdoor utility app. Publishing a revenue number would be an invention.

**Illustration only, not a prediction.** If someone later measures an eCPM and a daily impression count, revenue per day is approximately `impressions / 1000 × eCPM`, minus the network’s share if the dashboard is not already net. Until both inputs are measured, the result is unknown. A small Norwegian audience and a one-banner cap imply modest income. That is a qualitative reading of the constraint, not a krone figure.

**Fact.** WeatherKit’s public list, if it were ever the weather source, starts at 500,000 calls included and then USD 49.99 per month for 1 million calls, scaling up the table in the weather document. Open-Meteo’s free tier forbids advertising; a commercial plan is required before ads and that API are combined. MET Locationforecast has no fee in the terms reviewed, but a 20 request/second ceiling and a caching duty. HeiGIT’s standard Directions quota is 2,000 requests/day.

**Recommendation.** Recurring provider cost and ad income should be compared only after both are measured. A plausible sequence:

1. Ship without ads, on MET plus Kartverket plus the free HeiGIT tier, which have no ad-licence conflict in the documents reviewed.
2. Turn on one banner only after the core loop is trusted (`ADS_ENABLED` stays false until then).
3. If a paid weather or routing plan is proposed, require the validation method in the weather document and a note that ad income might not cover it. An ad-free subscription is the cleaner way to fund a paid feed than raising the ad load on safety screens.

**Open question.** What price would an ad-free subscription need? Unknown until willingness to pay is tested. Do not invent a price.

## 7. Store and consent checklist for a later implementation

Not in scope now. Listed so it is not rediscovered as a surprise:

- Certified CMP, purpose text in Norwegian and English, and a way to change the choice.
- ATT on iOS after the GDPR message, not before.
- Age rating and no Kids Category behavioral ads.
- Report-ad control, required by Apple 2.5.18.
- Play Data safety and Apple privacy nutrition labels that mention the ad SDK.
- Ads labeled as ads, close controls if anything is ever full screen (the strategy is not to ship that).
- VAT invoice path for a future subscription.

## 8. Unresolved decisions

1. Is AdMob acceptable as the single network, or does a Norwegian publisher prefer a European vendor? **Open question.** The consent documentation is the reason AdMob is the reference here, not a signed choice.
2. Should the ad-free tier exist before ads exist? **Recommendation:** no. Build it when ads turn on, so the paid offer matches a real annoyance.
3. Does a banner on the home screen already feel like it “disturbs” a safety-adjacent product? **Open question** for a design review with the one-slot rule in front of people. The written rule is necessary and not sufficient.
