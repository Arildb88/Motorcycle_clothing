// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Norwegian Bokmål (`nb`).
class AppLocalizationsNb extends AppLocalizations {
  AppLocalizationsNb([String locale = 'nb']) : super(locale);

  @override
  String get appTitle => 'RideWear';

  @override
  String get navToday => 'I dag';

  @override
  String get navRoutes => 'Ruter';

  @override
  String get navWardrobe => 'Garderobe';

  @override
  String get navProfile => 'Profil';

  @override
  String get language => 'Språk';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageNorwegian => 'Norsk';

  @override
  String get languageSaved => 'Språk lagret';

  @override
  String get quickRoutes => 'Legg til ruter';

  @override
  String get planNewRide => 'Planlegg ny tur';

  @override
  String get leaveNow => 'Dra nå';

  @override
  String get todayAt => 'I dag kl…';

  @override
  String get tomorrowAt => 'I morgen kl…';

  @override
  String get customDateTime => 'Egendefinert dato/tid';

  @override
  String get whenLeaving => 'Når drar du?';

  @override
  String get tapSavedRoute =>
      'Trykk på en lagret rute for å beregne dagens vær og antrekk.';

  @override
  String get profileSaved => 'Profil lagret';

  @override
  String get wearSection => 'Bruk nå';

  @override
  String get packSection => 'Pakk med';

  @override
  String get confidenceLabel => 'Sikkerhet';

  @override
  String get reasonColdMountain =>
      'Det er ventet kald eksponering på fjellstrekningen.';

  @override
  String get reasonRain => 'Det er sannsynlig med regn langs ruten.';

  @override
  String get reasonStrongWind =>
      'Det er ventet sterk vind på eksponerte strekninger.';

  @override
  String get reasonPersonalColdHands =>
      'Ut fra turene dine blir hendene ofte kalde under lignende forhold.';

  @override
  String get reasonMildConditions =>
      'Forholdene er milde — unngå unødvendig isolasjon.';

  @override
  String get reasonLowEffectiveTemperature =>
      'Effektiv motorsykkeleksponering er lav for denne turen.';

  @override
  String get reasonSustainedColdExposure =>
      'Vedvarende kulde øker behovet for varme.';

  @override
  String get reasonShortColdSegment =>
      'Et kort kaldt segment kan kreve isolasjon å ha med.';

  @override
  String get reasonRainProtectionRequired =>
      'Regnbeskyttelse kreves ved vedvarende våteksponering.';

  @override
  String get reasonPackRainLayer =>
      'Pakk vanntett beskyttelse for senere eller kortvarig regnrisiko.';

  @override
  String get reasonHighWindExposure =>
      'Høy vind / kjøreluft øker behovet for beskyttelse.';

  @override
  String get reasonTemperatureVariation => 'Temperaturen varierer langs ruten.';

  @override
  String get reasonThermalLinerRecommended =>
      'Sett i termofôret for denne turen.';

  @override
  String get reasonWaterproofLinerRecommended =>
      'Sett i vanntett fôr for denne turen.';

  @override
  String get reasonVentsClosedRecommended =>
      'Hold ventilene lukket ved kaldere eksponering.';

  @override
  String get reasonVentsOpenRecommended =>
      'Åpne ventilene ved varmere eksponering.';

  @override
  String get reasonPackExtraInsulation =>
      'Pakk ekstra isolasjon for korte kalde segmenter.';

  @override
  String get reasonWardrobeGap =>
      'Fant ingen egnet eid plagg for dette behovet.';

  @override
  String get reasonIncompleteWeather =>
      'Værdekningen er ufullstendig — lavere sikkerhet.';

  @override
  String get reasonIncompleteWardrobe =>
      'Garderobedekningen er ufullstendig — lavere sikkerhet.';

  @override
  String get reasonBaselineNoPersonalEvidence =>
      'Basisanbefaling — ikke nok personlig turhistorikk ennå.';

  @override
  String get reasonBasicUnderlayerWarmth =>
      'Vanlige klær du allerede har på dekker noe av varmen, så det foreslås mindre ekstra lag.';

  @override
  String get reasonRouteSpeedProfileUsed =>
      'Tidsberegningen bruker rutens egen fartsprofil.';

  @override
  String get reasonRouteSpeedProfileUnavailable =>
      'Ruten hadde ingen fartsprofil, så et standardtempo er brukt.';

  @override
  String get reasonAssumedCruiseSpeed =>
      'Marsjfart er antatt fordi ruten ikke oppga en.';

  @override
  String get reasonWindDirectionUnavailable =>
      'Vindretning var ikke tilgjengelig, så luftstrømmen er ikke beregnet som en vektor.';

  @override
  String get reasonElevationUsed =>
      'Terrenghøyde ble sendt med værforespørselen der høyden var kjent.';

  @override
  String get reasonElevationPartial =>
      'Terrenghøyde mangler for deler av denne planen.';

  @override
  String get reasonElevationUnavailable =>
      'Terrenghøyde var ikke tilgjengelig, så værforespørselen ble sendt uten høyde.';

  @override
  String get reasonVentOrPackShell =>
      'Bruk ventiler eller pakk et skall for skiftende forhold.';

  @override
  String get reasonGenericCyclingKit =>
      'Dette er et generelt sykkelantrekk fordi ingen passende eide plagg ble funnet.';

  @override
  String get reasonAssumedRideStyle =>
      'Innsats er antatt fordi den ikke ble oppgitt.';

  @override
  String get reasonRouteGeometryFallback =>
      'Veigeometri var utilgjengelig, så værprøvene følger de lagrede punktene.';

  @override
  String get reasonHelmetAssumed =>
      'Hjelm er antatt og velges ikke av dette bekledningsantrekket.';

  @override
  String get reasonFeetLimitingZone =>
      'Føttene trenger mer varme enn overkroppen på denne turen.';

  @override
  String get reasonHandsWindChill =>
      'Hendene får mer vind enn overkroppen på denne turen.';

  @override
  String get reasonUpperMountainSetsKit =>
      'Det kaldere fjellet oppunder toppen bestemmer det du har på deg.';

  @override
  String get reasonStayingAtBase =>
      'Planen blir ved bunnen, så bunnværet bestemmer antrekket.';

  @override
  String get reasonVillageWeatherNotUsedAsSummit =>
      'Vær fra dalen eller bunnen brukes ikke som toppvær.';

  @override
  String get reasonUpperSiteMissing =>
      'Ingen toppstasjon ble funnet, så forholdene på toppen er ukjente.';

  @override
  String get reasonUpperElevationUnavailable =>
      'Toppstasjonen har ingen høyde, så værmeldingen der ble ikke hentet.';

  @override
  String get reasonSitesNeedLabels =>
      'Stasjonene kunne ikke ordnes som bunn og topp. Legg til navn eller høyder.';

  @override
  String get reasonMidElevationEstimated =>
      'Høyden midt i fjellet er anslått, ikke målt.';

  @override
  String get reasonTemperatureSpread =>
      'Temperaturen er forskjellig mellom bunnen og toppen.';

  @override
  String get reasonHighWindAtUpper => 'Det er mye vind oppunder toppen.';

  @override
  String get reasonAssumedExposureMode =>
      'Eksponeringsmåte er antatt fordi den ikke ble oppgitt.';

  @override
  String get reasonGenericAlpineKit =>
      'Dette er et generelt alpinantrekk fordi ingen passende eide plagg ble funnet.';

  @override
  String get reasonLeaveWarmerLayerOffHill =>
      'La det varmere laget ligge igjen mens du er i bakken.';

  @override
  String get reasonBootsAreEquipment =>
      'Støvler er utstyr og velges ikke av dette bekledningsantrekket.';

  @override
  String get reasonGogglesAreEquipment =>
      'Briller er utstyr og velges ikke av dette bekledningsantrekket.';

  @override
  String get reasonHelmetIsEquipment =>
      'Hjelm er utstyr og velges ikke av dette bekledningsantrekket.';

  @override
  String get reasonShortColdStopPacked =>
      'Et kort kaldt opphold dekkes av noe du pakker med, ikke har på hele tiden.';

  @override
  String get reasonPackShell =>
      'Pakk et skall i stedet for å ha det på hele tiden.';

  @override
  String get reasonVentsForClimb => 'Åpne ventilene mens du går oppover.';

  @override
  String get reasonGenericXcKit =>
      'Dette er et generelt langrennantrekk fordi ingen passende eide plagg ble funnet.';

  @override
  String get reasonAssumedIntensity =>
      'Intensitet er antatt fordi den ikke ble oppgitt.';

  @override
  String get reasonAssumedDuration =>
      'Varighet er antatt fordi ruten ikke har lagret lengde.';

  @override
  String get reasonStyleNotSpecified =>
      'Klassisk eller skøyting ble ikke oppgitt, så støvler velges ikke.';

  @override
  String get reasonClassicBootsAreEquipment =>
      'Klassiske støvler er utstyr og velges ikke av dette bekledningsantrekket.';

  @override
  String get reasonSkateBootsAreEquipment =>
      'Skøytestøvler er utstyr og velges ikke av dette bekledningsantrekket.';

  @override
  String get reasonUserTrackNotRoad =>
      'Været følger sporet ditt, ikke en veirute.';

  @override
  String get reasonClimbReducesWornDemand =>
      'Motbakke reduserer hvor mye isolasjon du trenger å ha på deg.';

  @override
  String get reasonNoGroomingStatus =>
      'Preparering er ukjent og inngår ikke i denne anbefalingen.';

  @override
  String get reasonNoWaxAdvice =>
      'Denne anbefalingen inneholder ikke skismøring.';

  @override
  String get reasonsSection => 'Hvorfor dette antrekket';

  @override
  String get limitsSection => 'Begrensninger og antakelser';

  @override
  String get wearSectionHint => 'Dette har du på deg';

  @override
  String get packSectionHint => 'Dette pakker du med';

  @override
  String elevationRange(String min, String max) {
    return 'Høyde $min–$max m';
  }

  @override
  String elevationSingle(String value) {
    return 'Høyde $value m';
  }

  @override
  String get elevationEstimated => 'anslått høyde';

  @override
  String get siteBase => 'Bunn';

  @override
  String get siteMid => 'Midt';

  @override
  String get siteUpper => 'Topp';

  @override
  String elevationAttribution(String source) {
    return 'Høydedata: $source';
  }

  @override
  String get unitsSection => 'Enheter';

  @override
  String get unitsPresetMetric => 'Meter';

  @override
  String get unitsPresetImperial => 'Engelske mil';

  @override
  String get unitsTemperature => 'Temperatur';

  @override
  String get unitsDistance => 'Avstand';

  @override
  String get unitsRidingSpeed => 'Kjørehastighet';

  @override
  String get unitsWindSpeed => 'Vindhastighet';

  @override
  String get unitCelsius => 'Celsius (°C)';

  @override
  String get unitFahrenheit => 'Fahrenheit (°F)';

  @override
  String get unitKilometers => 'Kilometer (km)';

  @override
  String get unitMiles => 'Engelske mil (mi)';

  @override
  String get unitKmh => 'km/t';

  @override
  String get unitMph => 'mph';

  @override
  String get unitMs => 'm/s';

  @override
  String get unitsSaved => 'Endringer er lagret';

  @override
  String get plannerTitle => 'Planlegg tur';

  @override
  String get plannerSubtitle =>
      'Velg hvor du skal, når du drar eller ankommer, og analyser vær og antrekk.';

  @override
  String get plannerSiteSubtitle =>
      'Velg fjellet eller området. Ett sted er nok. Flere steder kan markere bunn og topp.';

  @override
  String get plannerResortSubtitle =>
      'Hvilket skianlegg skal du bruke? Søk på navn, eller finn anlegg nær deg eller nær et sted.';

  @override
  String get plannerResortName => 'Skianlegg';

  @override
  String get plannerResortNearby => 'Finn skianlegg i nærheten';

  @override
  String get plannerResortNearPlace => 'Nær et sted';

  @override
  String get plannerResortEmpty => 'Fant ingen skianlegg.';

  @override
  String get plannerResortUnavailable =>
      'Søk etter skianlegg er midlertidig utilgjengelig.';

  @override
  String get plannerResortAttribution =>
      'Informasjon om skianlegg er hentet fra Fnugg.no';

  @override
  String get plannerResortSelected => 'Valgt skianlegg';

  @override
  String plannerResortStraightLineKm(String distance) {
    return '$distance km i luftlinje';
  }

  @override
  String plannerResortStraightLineMeters(int meters) {
    return '$meters m i luftlinje';
  }

  @override
  String get plannerResortLocationDenied =>
      'Posisjonstillatelse ble avslått. Du kan fortsatt søke etter et skianlegg.';

  @override
  String get plannerResortLocationDeniedForever =>
      'Posisjonstillatelse er blokkert. Skru den på i innstillinger, eller søk etter et skianlegg.';

  @override
  String get plannerResortLocationDisabled =>
      'Posisjonstjenester er av. Skru dem på, eller søk etter et skianlegg.';

  @override
  String get plannerResortLocationTemporary =>
      'Klarte ikke å hente posisjonen nå. Prøv igjen eller søk etter et skianlegg.';

  @override
  String get plannerTrailSubtitle =>
      'Finn en skiløype i nærheten, eller planlegg start og mål selv.';

  @override
  String get plannerTrailNearby => 'Finn løype i nærheten';

  @override
  String get plannerTrailManual => 'Planlegg egen tur';

  @override
  String get plannerTrailNearPlace => 'Nær et sted';

  @override
  String get plannerTrailEmpty => 'Ingen skiløyper funnet.';

  @override
  String get plannerTrailUnavailable =>
      'Skiløyper er midlertidig utilgjengelige.';

  @override
  String get plannerTrailAttribution => 'Løypeinformasjon fra Kartverket';

  @override
  String get plannerTrailSelected => 'Valgt løype';

  @override
  String get plannerTrailLocationDenied =>
      'Posisjonstillatelse ble avslått. Du kan fortsatt søke nær et sted, eller planlegge egen tur.';

  @override
  String get plannerTrailLocationDeniedForever =>
      'Posisjonstillatelse er blokkert. Skru den på i innstillinger, søk nær et sted, eller planlegg egen tur.';

  @override
  String get plannerTrailLocationDisabled =>
      'Posisjonstjenester er av. Skru dem på, søk nær et sted, eller planlegg egen tur.';

  @override
  String get plannerTrailLocationTemporary =>
      'Klarte ikke å hente posisjonen nå. Prøv igjen, søk nær et sted, eller planlegg egen tur.';

  @override
  String get plannerIncompleteResort => 'Velg et skianlegg før du analyserer.';

  @override
  String get plannerSaveDisabledResort =>
      'Legg til et navn og velg et skianlegg før du lagrer.';

  @override
  String get plannerPlace => 'Sted';

  @override
  String plannerPlaceNumber(int number) {
    return 'Sted $number';
  }

  @override
  String get plannerAddPlace => 'Legg til sted';

  @override
  String get plannerSaveDisabledSite =>
      'Legg til et navn og velg et sted før du lagrer.';

  @override
  String get plannerIncompleteSite => 'Velg et sted før du analyserer.';

  @override
  String get plannerSavedRoutes => 'Lagrede';

  @override
  String get plannerChooseSavedRoute => 'Bruk en lagret rute';

  @override
  String get plannerNoSavedRoutes =>
      'Ingen lagrede ruter ennå. Bygg en her, og lagre den.';

  @override
  String get plannerUseCurrentLocation => 'Bruk nåværende posisjon';

  @override
  String get plannerLocationPermissionDenied =>
      'Posisjonstillatelse ble avslått. Du kan fortsatt søke etter startsted.';

  @override
  String get plannerLocationPermissionDeniedForever =>
      'Posisjonstillatelse er blokkert. Skru den på i innstillinger, eller søk etter startsted.';

  @override
  String get plannerLocationServicesDisabled =>
      'Posisjonstjenester er av. Skru dem på, eller søk etter et sted.';

  @override
  String get plannerLocationTemporaryFailure =>
      'Klarte ikke å hente posisjonen nå. Prøv igjen eller søk etter et sted.';

  @override
  String get plannerMoveUp => 'Flytt opp';

  @override
  String get plannerMoveDown => 'Flytt ned';

  @override
  String get plannerRemoveStop => 'Fjern stopp';

  @override
  String get plannerAddStop => 'Legg til stopp';

  @override
  String get plannerReverse => 'Bytt om';

  @override
  String get plannerRoundTrip => 'Tilbake til start';

  @override
  String get plannerWhenSection => 'Når';

  @override
  String get plannerDeparture => 'Avreise';

  @override
  String get plannerArrival => 'Ankomst';

  @override
  String get plannerDepartureHint => 'Tidspunktet er når du drar.';

  @override
  String get plannerArrivalHint =>
      'Tidspunktet er når du vil ankomme. Avreise beregnes fra turens varighet.';

  @override
  String get plannerDepartureTime => 'Avreisetid';

  @override
  String get plannerArrivalTime => 'Ankomsttid';

  @override
  String get plannerOptionsSection => 'Rutevalg';

  @override
  String get plannerAvoidMotorways => 'Unngå motorvei';

  @override
  String get plannerAvoidMotorwaysHint =>
      'Foretrekk veier uten motorvei når tilbyderen støtter det.';

  @override
  String get plannerRouteName => 'Rutenavn';

  @override
  String get plannerRouteNameHint => 'f.eks. Jobbpendling';

  @override
  String get plannerAnalyzeRide => 'Analyser tur';

  @override
  String get plannerSaveRoute => 'Lagre rute';

  @override
  String get plannerPrimaryActionHint =>
      'Analyser tur sjekker vær og antrekk. Den starter ikke navigasjon.';

  @override
  String get plannerSaveDisabledHint =>
      'Legg til navn og velg start og destinasjon før lagring.';

  @override
  String get plannerIncompleteRoute => 'Velg start og destinasjon før analyse.';

  @override
  String get plannerDefaultRouteName => 'Turplan';

  @override
  String get plannerRouteSaved => 'Rute lagret';

  @override
  String get plannerMapFailed => 'Kartforhåndsvisning feilet';

  @override
  String get routeDrivingGeometryNotice =>
      'Veifølgende kjøregeometri. Denne ruten er ikke motorsykkeloptimalisert.';

  @override
  String get routeRoutingUnavailable =>
      'Veiruting er midlertidig utilgjengelig.';

  @override
  String get plannerAnalysisTitle => 'Turanalyse';

  @override
  String get plannerAnalysisSubtitle =>
      'Vær, eksponering og antrekk for denne planen';

  @override
  String get plannerNoWearItems => 'Ingen plagg å bruke ble returnert.';

  @override
  String get plannerNoPackItems => 'Ingen pakkeelementer ble returnert.';

  @override
  String get plannerBackToPlanner => 'Tilbake til planlegger';

  @override
  String get authTagline =>
      'Kle deg for turen — tilpasset på tvers av utendørsaktiviteter.';

  @override
  String get authEmailLabel => 'E-post';

  @override
  String get authPasswordLabel => 'Passord';

  @override
  String get authDisplayNameLabel => 'Visningsnavn';

  @override
  String get authContinueWithEmail => 'Fortsett med e-post';

  @override
  String get authCreateAccount => 'Opprett konto';

  @override
  String get authHaveAccountSignIn => 'Har du en konto? Logg inn';

  @override
  String get authNewHereRegister => 'Ny her? Registrer deg';

  @override
  String get authForgotPassword => 'Glemt passord?';

  @override
  String get authContinueMicrosoft => 'Fortsett med Microsoft';

  @override
  String get authContinueMicrosoftDev => 'Fortsett med Microsoft (dev)';

  @override
  String get authContinueFacebook => 'Fortsett med Facebook';

  @override
  String get authContinueFacebookDev => 'Fortsett med Facebook (dev)';

  @override
  String get authSocialLoginHint =>
      'Sosiale innloggingsknapper aktiveres når Facebook/Microsoft er konfigurert på API-et.';

  @override
  String get authEmailAlreadyRegistered =>
      'En konto med denne e-postadressen finnes allerede.';

  @override
  String get authInvalidCredentials => 'Ugyldig e-post eller passord.';

  @override
  String get authInvalidEmail => 'Skriv inn en gyldig e-postadresse.';

  @override
  String get authPasswordRequired => 'Skriv inn passordet ditt.';

  @override
  String get authPasswordTooShort => 'Passordet må være minst 8 tegn.';

  @override
  String get authDisplayNameRequired => 'Skriv inn et visningsnavn.';

  @override
  String get authNetworkError =>
      'Kunne ikke nå serveren. Sjekk tilkoblingen og prøv igjen.';

  @override
  String get authGenericFailure => 'Noe gikk galt. Prøv igjen.';

  @override
  String get authForgotPasswordTitle => 'Glemt passord';

  @override
  String get authForgotPasswordSubtitle =>
      'Skriv inn e-postadressen din, så sender vi en tilbakestillingslenke hvis kontoen finnes.';

  @override
  String get authSendResetLink => 'Send tilbakestillingslenke';

  @override
  String get authForgotPasswordSuccess =>
      'Hvis det finnes en konto for denne e-postadressen, er en tilbakestillingslenke sendt.';

  @override
  String get authHaveResetToken => 'Jeg har allerede en tilbakestillingskode';

  @override
  String get authResetPasswordTitle => 'Tilbakestill passord';

  @override
  String get authResetPasswordSubtitle =>
      'Lim inn tilbakestillingskoden og velg et nytt passord.';

  @override
  String get authResetTokenLabel => 'Tilbakestillingskode';

  @override
  String get authNewPasswordLabel => 'Nytt passord';

  @override
  String get authConfirmPasswordLabel => 'Bekreft passord';

  @override
  String get authSetNewPassword => 'Sett nytt passord';

  @override
  String get authPasswordMismatch => 'Passordene er ikke like.';

  @override
  String get authPasswordResetSuccess =>
      'Passordet er oppdatert. Du kan logge inn nå.';

  @override
  String get authInvalidResetToken =>
      'Denne tilbakestillingslenken er ugyldig eller har utløpt.';

  @override
  String get authChangePassword => 'Endre passord';

  @override
  String get authChangePasswordTitle => 'Endre passord';

  @override
  String get authChangePasswordSubtitle =>
      'Skriv inn nåværende passord, og velg deretter et nytt.';

  @override
  String get authCurrentPasswordLabel => 'Nåværende passord';

  @override
  String get authCurrentPasswordRequired => 'Skriv inn nåværende passord.';

  @override
  String get authInvalidCurrentPassword => 'Nåværende passord er feil.';

  @override
  String get authNoLocalPassword => 'Denne kontoen bruker ikke passord.';

  @override
  String get authPasswordChanged => 'Passordet er oppdatert.';

  @override
  String get commonCancel => 'Avbryt';

  @override
  String get commonDelete => 'Slett';

  @override
  String get commonSave => 'Lagre';

  @override
  String get commonEdit => 'Rediger';

  @override
  String get commonRetry => 'Prøv igjen';

  @override
  String get commonContinue => 'Fortsett';

  @override
  String get commonClear => 'Tøm';

  @override
  String get commonRemove => 'Fjern';

  @override
  String get commonNone => 'Ingen';

  @override
  String get commonCustom => 'Egendefinert';

  @override
  String get commonName => 'Navn';

  @override
  String get commonCategory => 'Kategori';

  @override
  String get commonFavorite => 'Favoritt';

  @override
  String get commonUnfavorite => 'Fjern favoritt';

  @override
  String get errorGeneric => 'Noe gikk galt. Prøv igjen.';

  @override
  String get errorCouldNotLoad => 'Kunne ikke laste inn. Prøv igjen.';

  @override
  String get currentLocation => 'Nåværende posisjon';

  @override
  String get labelStart => 'Start';

  @override
  String get labelDestination => 'Destinasjon';

  @override
  String get labelEnd => 'Slutt';

  @override
  String waypointStop(int index) {
    return 'Stopp $index';
  }

  @override
  String routeLoopSummary(String start, int count) {
    return '$start · runde · $count stopp';
  }

  @override
  String routeViaSummary(String start, String end, int count) {
    return '$start → … → $end ($count)';
  }

  @override
  String durationMinutes(int minutes) {
    return '~$minutes min';
  }

  @override
  String durationHours(int hours) {
    return '~$hours t';
  }

  @override
  String durationHoursMinutes(int hours, int minutes) {
    return '~$hours t $minutes min';
  }

  @override
  String get homePlanNewChip => '+ Planlegg ny';

  @override
  String get homeSaveRouteChip => 'Lagre en rute';

  @override
  String get homeHowWasTheRide => 'Hvordan var turen?';

  @override
  String get homeFallbackRide => 'Tur';

  @override
  String get metricTemp => 'Temp';

  @override
  String get metricExposure => 'Eksponering';

  @override
  String get metricRain => 'Regn';

  @override
  String get metricWind => 'Vind';

  @override
  String kitNotOwned(String name) {
    return '$name (ikke i garderoben)';
  }

  @override
  String get kitFallbackItem => 'Plagg';

  @override
  String get confidenceHigh => 'Høy';

  @override
  String get confidenceMedium => 'Middels';

  @override
  String get confidenceLow => 'Lav';

  @override
  String get configInstallThermalLiner => 'sett i termofôr';

  @override
  String get configInstallWaterproofLiner => 'sett i vanntett fôr';

  @override
  String get configRemoveThermalLiner => 'ta ut termofôr';

  @override
  String get configVentsOpen => 'ventiler åpne';

  @override
  String get configVentsClosed => 'ventiler lukket';

  @override
  String get routesTitle => 'Lagrede ruter';

  @override
  String get routesSubtitle =>
      'Reusable templates for motorcycle. Weather and kit are always recalculated when you launch a ride.';

  @override
  String get routesEditTemplate => 'Rediger rutemal';

  @override
  String get routesDeleteTitle => 'Slette ruten?';

  @override
  String routesDeleteBody(String name) {
    return '«$name» fjernes. Tidligere turer beholder et øyeblikksbilde av ruten.';
  }

  @override
  String get profileSection => 'Profil';

  @override
  String get profileDisplayName => 'Visningsnavn';

  @override
  String get profileAvatarInitials => 'Avatar: initialer inntil videre';

  @override
  String get profileAvatarProvider =>
      'profilbilde fra innloggingen er tilgjengelig';

  @override
  String get profileActivitySection => 'Aktivitet';

  @override
  String get profileDefaultActivity => 'Standardaktivitet';

  @override
  String get profileShowChooser => 'Vis aktivitetsvalg ved oppstart';

  @override
  String get profileLoginMethods => 'Tilknyttede innloggingsmåter';

  @override
  String get profileLinked => 'Tilknyttet';

  @override
  String get profileConnectFacebook => 'Facebook-innlogging';

  @override
  String get profileConnectMicrosoft => 'Microsoft-innlogging';

  @override
  String get profileServices => 'Eksterne Tjenester';

  @override
  String get profileConnected => 'Tilkoblet';

  @override
  String get profileSync => 'Synkroniser';

  @override
  String get profileDisconnect => 'Koble fra';

  @override
  String get profileConnectStrava => 'Koble til Strava';

  @override
  String get profileStravaNotConfigured =>
      'Strava er ikke satt opp på serveren ennå.';

  @override
  String get profileSave => 'Lagre profil';

  @override
  String get profileAccount => 'Konto';

  @override
  String get profileSignOut => 'Logg ut';

  @override
  String get profileDeleteAccount => 'Slett konto';

  @override
  String get profileDeleteTitle => 'Slette kontoen?';

  @override
  String get profileDeleteBody =>
      'Dette sletter RideWear-kontoen, garderoben og historikken permanent.';

  @override
  String get profileDemoLinkHint =>
      'Sett opp Facebook eller Microsoft på serveren for å knytte dem til denne kontoen.';

  @override
  String get profileLoginFallback => 'Innlogging';

  @override
  String get activityMotorcycle => 'Motorsykkel';

  @override
  String get activityHiking => 'Fottur';

  @override
  String get activityCycling => 'Sykling';

  @override
  String get activityAlpineSkiing => 'Alpint';

  @override
  String get activitySnowboarding => 'Snowboard';

  @override
  String get activityAlpineAndSnowboard => 'Alpint & snowboard';

  @override
  String get activityXcSkiing => 'Langrenn';

  @override
  String get plannerResortDiscipline => 'Alpint eller snowboard';

  @override
  String get plannerIntensity => 'Innsats';

  @override
  String get plannerIntensityEasy => 'Lett';

  @override
  String get plannerIntensitySteady => 'Jevn';

  @override
  String get plannerIntensityHard => 'Hard';

  @override
  String get plannerExposure => 'Hvor du oppholder deg';

  @override
  String get plannerExposureLift => 'Heiser';

  @override
  String get plannerExposureHike => 'Gå opp';

  @override
  String get plannerExposureBase => 'Bli i bunnen';

  @override
  String get plannerStyle => 'Stil';

  @override
  String get plannerStyleUnspecified => 'Ikke valgt';

  @override
  String get plannerStyleClassic => 'Klassisk';

  @override
  String get plannerStyleSkate => 'Skøyting';

  @override
  String get plannerBasicClothing => 'Klær under det mc-utstyret';

  @override
  String get plannerBasicHint =>
      'Optional. None is a valid choice, including when the motorcycle garment is the only layer you need.';

  @override
  String get plannerBasicUpper => 'Overdel';

  @override
  String get plannerBasicLower => 'Underdel';

  @override
  String get plannerBasicNone => 'Ingen';

  @override
  String get plannerBasicTShirt => 'T-skjorte';

  @override
  String get plannerBasicThinSweater => 'Tynn genser';

  @override
  String get plannerBasicThickSweater => 'Tykk genser';

  @override
  String get plannerBasicWoolTop => 'Ull-undertøy, overdel';

  @override
  String get plannerBasicWoolBottom => 'Ull-undertøy, underdel';

  @override
  String get plannerBasicJeans => 'Jeans';

  @override
  String get plannerBasicJoggers => 'Joggebukse';

  @override
  String get plannerSessionLength => 'Øktlengde';

  @override
  String get activityWhatToday => 'Hva skal du gjøre i dag?';

  @override
  String activityDefaultLine(String activity) {
    return 'Standard: $activity';
  }

  @override
  String get activityDefaultBadge => 'STANDARD';

  @override
  String get activitySoon => 'Snart';

  @override
  String get activityChooserHint =>
      'Å bytte dagens aktivitet endrer ikke den lagrede standarden.';

  @override
  String get onboardingInterests => 'Hva vil du bruke RideWear til?';

  @override
  String get onboardingOpen => 'Hvordan skal RideWear åpnes?';

  @override
  String get onboardingTemperature => 'Hvordan opplever du temperatur?';

  @override
  String get onboardingStart => 'Start RideWear';

  @override
  String get onboardingComingLater => 'Anbefalinger kommer senere';

  @override
  String get onboardingShowChooser =>
      'Vis aktivitetsvalg når jeg åpner RideWear';

  @override
  String get onboardingCold => 'Jeg fryser lett';

  @override
  String get onboardingAverage => 'Vanlig';

  @override
  String get onboardingWarm => 'Jeg blir vanligvis fort varm';

  @override
  String activityComingNext(String activity) {
    return 'Anbefalinger for $activity kommer senere.';
  }

  @override
  String get activitySharedBody =>
      'Anbefalinger for fottur er ikke tilgjengelige ennå, og aktiviteten bruker ikke motorsykkelanbefalingen.';

  @override
  String get activityOpenMotorcycle => 'Åpne Motorsykkel i dag';

  @override
  String activityMakeDefault(String activity) {
    return 'Gjør $activity til standard';
  }

  @override
  String activityNowDefault(String activity) {
    return '$activity er satt som standard';
  }

  @override
  String get wardrobeIntro =>
      'Legg inn klær for å få anbefalinger på klesvalg.';

  @override
  String get wardrobeEmptyTitle => 'Ingen plagg lagt til';

  @override
  String get wardrobeEmptyBody =>
      'Legg til noen plagg du kjører med, eller last inn et demosett for testing.';

  @override
  String get wardrobeAdd => 'Legg til plagg';

  @override
  String get wardrobeLoadDemo => 'Legg til demo-klær';

  @override
  String get wardrobeDeleteTitle => 'Slette plagg?';

  @override
  String wardrobeDeleteBody(String name) {
    return 'Fjern «$name» fra garderoben.';
  }

  @override
  String get wardrobeDemoBadge => 'DEMO';

  @override
  String get wardrobeDeleteDemo => 'Slett demo-garderobe';

  @override
  String get wardrobeDeleteDemoTitle => 'Slette demo-garderobe?';

  @override
  String get wardrobeDeleteDemoBody =>
      'Bare demoklær for denne aktiviteten fjernes. Dine egne plagg blir værende.';

  @override
  String get wardrobeSharingTitle => 'Del personlige klær';

  @override
  String get wardrobeSharingBody =>
      'Motorcycle clothes can never be shared. Choose two or more activities to share personal garments. Demo clothes stay with their activity.';

  @override
  String get wardrobeMotorcycleIsolated =>
      'Motorcycle clothes stay in their own wardrobe.';

  @override
  String get wardrobeHikingUnavailable => 'Tur har ikke en garderobe ennå.';

  @override
  String get wardrobeActivityMembership => 'Tilgjengelig for';

  @override
  String get garmentMotorcycleLocked =>
      'This piece stays in the motorcycle wardrobe and is not shared.';

  @override
  String get garmentEditTitle => 'Rediger plagg';

  @override
  String get garmentUpdatePiece => 'Oppdater plagget';

  @override
  String get garmentKeepSimple => 'Hold det enkelt';

  @override
  String get garmentNameHint => 'f.eks. Dainese Carve Master';

  @override
  String get garmentQuickType => 'Hurtigtype (valgfritt)';

  @override
  String get garmentMaterial => 'Materiale';

  @override
  String get garmentUnspecified => 'Ikke oppgitt';

  @override
  String get garmentVentilation => 'Har ventilasjon';

  @override
  String get garmentVentilationHint =>
      'Åpen eller lukket velges senere for hver tur';

  @override
  String get garmentHeated => 'Oppvarmet';

  @override
  String get garmentThermalLiner => 'Termofôr følger med';

  @override
  String get garmentThermalLinerHint => 'Samme jakke — fôret kan settes i';

  @override
  String get garmentWaterproofLiner => 'Vanntett fôr følger med';

  @override
  String get garmentBrand => 'Merke (valgfritt)';

  @override
  String get garmentModel => 'Modell (valgfritt)';

  @override
  String get garmentMoreDetails => 'Flere detaljer';

  @override
  String get garmentMoreDetailsHint => 'Juster varme- og væreegenskaper';

  @override
  String get garmentNotes => 'Notater (valgfritt)';

  @override
  String get garmentSaveChanges => 'Lagre endringer';

  @override
  String get garmentAddToWardrobe => 'Legg i garderoben';

  @override
  String get garmentNameRequired => 'Navn er påkrevd';

  @override
  String get catalogueSearchBrand => 'Søk merke';

  @override
  String get catalogueSearchModel => 'Søk modell';

  @override
  String get catalogueWriteYourself => 'Annet / skriv selv';

  @override
  String get catalogueWriteYourselfHint =>
      'Ditt eget navn blir på plagget. Det legges ikke i den delte katalogen.';

  @override
  String get catalogueYourValue => 'Din verdi';

  @override
  String get catalogueAutomaticDefault => 'Automatisk standard';

  @override
  String catalogueCommunityEstimate(int count) {
    return 'Fellesskapsestimat · $count bidrag';
  }

  @override
  String get catalogueNotVerified =>
      'Merke- og modellvalg er en kuratert liste, ikke verifiserte produsentmålinger.';

  @override
  String get catalogueUseModel => 'Bruk denne modellen';

  @override
  String get catalogueChangeProduct => 'Bytt produkt';

  @override
  String get catalogueContributeTitle => 'Del denne vurderingen';

  @override
  String get catalogueContributeBody =>
      'Bare verdier du selv har satt, blir telt. Automatiske standardverdier, demoklær, kopierte verdier og å legge til samme produkt på nytt uten en ny vurdering blir ikke telt. RideWear lagrer et antall for hver poengsum fra 1 til 5. Navn, notater, konto og plagg lagres ikke. Tallet er et antall bidrag, ikke et antall personer. Å fjerne høyeste og laveste verdi er ikke beskyttelse mot misbruk.';

  @override
  String get tierWarmth => 'Varme';

  @override
  String get tierWind => 'Vindtetthet';

  @override
  String get tierWater => 'Vanntetthet';

  @override
  String get tierBreath => 'Pusteevne';

  @override
  String garmentLiners(int count) {
    return '$count fôr';
  }

  @override
  String get garmentVents => 'ventilasjon';

  @override
  String get garmentHeatedShort => 'oppvarmet';

  @override
  String get catBaseLayer => 'Basislag';

  @override
  String get catMidLayer => 'Mellomlag';

  @override
  String get catShellJacket => 'Skalljakke';

  @override
  String get catPants => 'Bukse';

  @override
  String get catOnePieceSuit => 'Hel dress';

  @override
  String get catGloves => 'Hansker';

  @override
  String get catBoots => 'Støvler';

  @override
  String get catSocks => 'Sokker';

  @override
  String get catHeadwear => 'Hodeplagg';

  @override
  String get catNeckwear => 'Hals';

  @override
  String get catHeatedVest => 'Varmevest';

  @override
  String get catRainLayer => 'Regnlag';

  @override
  String get matTextile => 'Tekstil';

  @override
  String get matLeather => 'Skinn';

  @override
  String get matMesh => 'Mesh';

  @override
  String get matDenim => 'Denim';

  @override
  String get matSynthetic => 'Syntetisk';

  @override
  String get matMerino => 'Merino';

  @override
  String get matMixed => 'Blandet';

  @override
  String get matOther => 'Annet';

  @override
  String get presetTextileJacket => 'Tekstiljakke for motorsykkel';

  @override
  String get presetMeshJacket => 'Mesh- / sommerjakke';

  @override
  String get presetLeatherJacket => 'Skinnjakke for motorsykkel';

  @override
  String get presetTextilePants => 'Tekstilbukse for motorsykkel';

  @override
  String get presetMotorcycleJeans => 'Mc-jeans';

  @override
  String get presetOnePieceSuit => 'Hel dress';

  @override
  String get presetSummerGloves => 'Sommerhansker';

  @override
  String get presetWinterGloves => 'Vinterhansker';

  @override
  String get presetHeatedGloves => 'Oppvarmede hansker';

  @override
  String get cyclingGarmentType => 'Sykkelplagg';

  @override
  String get cyclingLongTrousers => 'Lange sykkelbukser / tights';

  @override
  String get cyclingShorts => 'Korte sykkelshorts';

  @override
  String get cyclingTriathlonSuit => 'Triatlondrakt';

  @override
  String get cyclingShortSleeveTee => 'Teknisk T-skjorte med korte ermer';

  @override
  String get cyclingLongJersey => 'Teknisk trøye med lange ermer';

  @override
  String get cyclingJacket => 'Tynn sykkeljakke';

  @override
  String get cyclingFingerlessGloves => 'Fingreløse sykkelhansker';

  @override
  String get cyclingFullFingerGloves => 'Tynne sykkelhansker med fingre';

  @override
  String get cyclingWarmthThin => 'Tynn';

  @override
  String get cyclingWarmthMedium => 'Middels';

  @override
  String get cyclingWarmthWarm => 'Varm';

  @override
  String get cyclingAdvancedWinter => 'Avanserte innstillinger / vinter';

  @override
  String get cyclingDefaultsEstimate =>
      'Disse standardverdiene er anslag, ikke målte produsentverdier.';

  @override
  String get routeNew => 'Ny rute';

  @override
  String get routeEdit => 'Rediger rute';

  @override
  String get routeNameHint => 'Jobb 1, søndagsrunde…';

  @override
  String get routeDescription => 'Beskrivelse (valgfritt)';

  @override
  String get routeFavoriteHint => 'Vises først på motorsykkelforsiden';

  @override
  String get routeSection => 'Rute';

  @override
  String get routeSearchHint =>
      'Søk etter steder — du trenger ikke skrive inn koordinater.';

  @override
  String get routeAdvancedCoords => 'Avansert: koordinater';

  @override
  String get routeAdvancedHint => 'Kun som reserve';

  @override
  String coordLatitude(String role) {
    return '$role breddegrad';
  }

  @override
  String get coordLongitude => 'Lengdegrad';

  @override
  String get coordApply => 'Bruk koordinater';

  @override
  String get routeCatWork => 'Jobb';

  @override
  String get routeCatCommute => 'Pendlerrute';

  @override
  String get routeCatHome => 'Hjem';

  @override
  String get routeCatWeekend => 'Helg';

  @override
  String get routeCatTouring => 'Langtur';

  @override
  String get routeCatFavourite => 'Favoritt';

  @override
  String get routeCatCustom => 'Egendefinert';

  @override
  String get mapSelectEndpoints =>
      'Velg start og destinasjon for å forhåndsvise ruten';

  @override
  String get placeSearchHint => 'Søk etter sted eller adresse';

  @override
  String get placeNoResults => 'Ingen steder funnet';

  @override
  String get placeSearchFailed => 'Stedsøket mislyktes';

  @override
  String get placeSearchUnavailable => 'Stedsøk er midlertidig utilgjengelig.';

  @override
  String get placeSearchNotConfigured =>
      'Stedsøk er ikke konfigurert på serveren.';

  @override
  String get placeNotFound => 'Stedet kunne ikke velges. Prøv igjen.';

  @override
  String get routeStraightSegmentsNotice =>
      'Forhåndsvisningen bruker rette streker fordi veiruting ikke er tilgjengelig.';

  @override
  String get plannerCouldNotSave => 'Kunne ikke lagre ruten for analyse.';

  @override
  String get feedbackTitle => 'Hvordan kjentes antrekket?';

  @override
  String get feedbackTooCold => 'For kald';

  @override
  String get feedbackSlightlyCold => 'Litt kaldt';

  @override
  String get feedbackJustRight => 'Passe';

  @override
  String get feedbackSlightlyWarm => 'Litt varmt';

  @override
  String get feedbackTooWarm => 'For varm';

  @override
  String get feedbackSubmit => 'Send tilbakemelding';

  @override
  String get feedbackThanks => 'Takk — komfortprofilen er oppdatert';

  @override
  String analysisTempChip(String value) {
    return 'Temp $value';
  }

  @override
  String analysisRainChip(String value) {
    return 'Regn $value';
  }

  @override
  String get departureCompareTitle => 'Avreisetider';

  @override
  String get departureCompareHint =>
      'Nærliggende avreiser langs ruten. Sammenlign forholdene. Ingen er rangert.';

  @override
  String get departureCompareYours => 'Din avreise';

  @override
  String get departureCompareUnavailable =>
      'Prognose utilgjengelig for dette tidspunktet';

  @override
  String departureCompareForecastAt(String time) {
    return 'Prognose for $time';
  }

  @override
  String departureCompareForecastSpan(String from, String to) {
    return 'Prognose $from–$to';
  }

  @override
  String departureComparePrecip(String value) {
    return 'Nedbør $value';
  }

  @override
  String departureCompareMissing(String time) {
    return 'Ingen prognose for $time';
  }

  @override
  String get departureCompareStatic =>
      'Denne prognosen endrer seg ikke mellom disse avreisetidene.';

  @override
  String analysisWindChip(String value) {
    return 'Vind $value';
  }

  @override
  String get routeCoordsInvalid => 'Koordinatene må være gyldige tall.';

  @override
  String get routeEditorIncomplete =>
      'Skriv inn et navn og velg sted for start og destinasjon.';

  @override
  String get coordCustomPoint => 'Egendefinert punkt';

  @override
  String get commuteTimesTitle => 'Vanlige avreisetider';

  @override
  String get commuteTimesHint =>
      'Klokkeslett i Europe/Oslo. Dette er maler, ikke et værvarsel.';

  @override
  String get commuteOutboundTime => 'Til jobb';

  @override
  String get commuteReturnTime => 'Hjem';

  @override
  String get commutePlanTitle => 'Pendlerrute';

  @override
  String get commuteDate => 'Dato';

  @override
  String get commuteNextDay => 'Hjemtur neste dag';

  @override
  String get commuteAnalyze => 'Se uttur og hjemtur';

  @override
  String get commuteOutboundSection => 'Til jobb';

  @override
  String get commuteReturnSection => 'Hjem';

  @override
  String get commuteWearHeading => 'Ha på til utturen';

  @override
  String get commutePackHeading => 'Pakk før du drar';

  @override
  String get commuteAdjustmentHeading => 'Endre til hjemturen';

  @override
  String commuteArrival(String time) {
    return 'Estimert ankomst $time';
  }

  @override
  String get commuteUnavailable =>
      'Været for hjemturen er ikke tilgjengelig. Morgenforhold brukes ikke for hjemturen. Prøv igjen.';

  @override
  String get commuteOutboundWeatherUnavailable =>
      'Været for utturen er ikke tilgjengelig. Hjemturens prognose brukes ikke for denne etappen. Prøv igjen.';

  @override
  String get routeProviderUnavailable =>
      'Vei-ruting er ikke tilgjengelig. Dette er ikke en reisetid fra veitjenesten.';

  @override
  String get weatherUnavailableRetry => 'Prøv igjen';

  @override
  String get weatherUnavailableConfiguration =>
      'Været er ikke konfigurert på serveren. Ingen bekledning er foreslått.';

  @override
  String get weatherUnavailableTimeout =>
      'Værtjenesten svarte ikke i tide. Ingen bekledning er foreslått. Prøv igjen.';

  @override
  String get weatherUnavailableEmpty =>
      'Værtjenesten returnerte ingen prognose. Ingen bekledning er foreslått. Prøv igjen.';

  @override
  String get weatherUnavailableMissing =>
      'Prognosen mangler temperatur, regn eller vind. Ingen bekledning er foreslått. Prøv igjen.';

  @override
  String get weatherUnavailableOutOfRange =>
      'Ingen prognose dekker dette tidspunktet. Et annet tidspunkt er ikke brukt. Prøv igjen.';

  @override
  String get weatherUnavailableProvider =>
      'Værtjenesten feilet. Ingen bekledning er foreslått. Prøv igjen.';

  @override
  String get weatherUnavailablePartial =>
      'Deler av prognosen mangler. Ingen fullstendig bekledningsanbefaling ble laget. Prøv igjen.';

  @override
  String get commuteForecastNote => 'Et varsel er ikke en garanti.';

  @override
  String get commuteDiffDryRain =>
      'Opphold på morgenen, regn meldt på hjemturen – ta med regntøy.';

  @override
  String get commuteDiffWarmCold =>
      'Utturen er meldt varmere enn hjemturen. Pakk ekstra lag til hjemturen.';

  @override
  String get commuteLegFeedback => 'Hvordan kjentes denne etappen?';

  @override
  String get commuteTimeInvalid => 'Skriv klokkeslett som HH:mm.';

  @override
  String commuteRain(String amount, String probability) {
    return 'Regn $amount mm, $probability%';
  }

  @override
  String commuteWind(String value) {
    return 'Vind $value';
  }
}
