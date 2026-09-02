import type { AppALanguage } from "../types";

export interface DataResetCopy {
  dangerZoneTitle: string;
  dangerZoneDescription: string;
  primaryAction: string;

  modalTitle: string;
  modalIntro: string;

  selectAll: string;
  deselectAll: string;
  cancel: string;
  back: string;
  continueToConfirm: string;
  finalDestructiveAction: string;
  retryAction: string;
  doneAction: string;

  // Scopes
  scopeDailyTitle: string;
  scopeDailyDescription: string;
  scopePreferencesTitle: string;
  scopePreferencesDescription: string;
  scopeVisionTitle: string;
  scopeVisionDescription: string;
  scopeVisionWarning: string;
  scopeRoutinesTitle: string;
  scopeRoutinesDescription: string;
  scopeRoutinesWarning: string;

  // Confirmation step
  requiredPhrase: string;
  confirmationPrompt: (phrase: string) => string;
  confirmationPlaceholder: string;
  finalConfirmationTitle: string;
  finalSummaryIntro: string;
  accountSafeNotice: string;
  cannotBeUndone: string;

  // Selected scope summaries in final confirmation
  summaryItemDaily: string;
  summaryItemPreferences: string;
  summaryItemVision: string;
  summaryItemRoutines: string;

  // Progress & States
  progressTitle: string;
  progressDeleting: string;
  successTitle: string;
  successMessage: string;
  partialFailureTitle: string;
  partialFailureMessage: string;
  completedScopesLabel: string;
  failedScopesLabel: string;
  retryNotice: string;
  selectAtLeastOneScopeError: string;
}

export const DATA_RESET_LOCALIZATION: Record<AppALanguage, DataResetCopy> = {
  en: {
    dangerZoneTitle: "Danger Zone",
    dangerZoneDescription: "Permanently delete selected data without signing out.",
    primaryAction: "Reset app data",

    modalTitle: "Reset App A data",
    modalIntro:
      "Select the data categories you wish to permanently delete. Your account will remain signed in.",

    selectAll: "Select all",
    deselectAll: "Deselect all",
    cancel: "Cancel",
    back: "Back",
    continueToConfirm: "Review & confirm",
    finalDestructiveAction: "Permanently reset selected data",
    retryAction: "Retry remaining scopes",
    doneAction: "Done",

    scopeDailyTitle: "App A daily plans & rollover decisions",
    scopeDailyDescription:
      "Deletes saved daily plans (appAUsers/{uid}/dailyResets/*), rollover decisions, and resets today's working session.",
    scopePreferencesTitle: "Also reset App A preferences",
    scopePreferencesDescription:
      "Resets App A interface and planning preferences to defaults (app_a_preferences_v1). Preserves language.",
    scopeVisionTitle: "Vision strategies & candidates",
    scopeVisionDescription:
      "Deletes long-term vision strategies (users/{uid}/visionStrategies/*) and today candidates.",
    scopeVisionWarning:
      "Warning: These records may be used by future or shared App B/C features.",
    scopeRoutinesTitle: "Daily routines & history",
    scopeRoutinesDescription:
      "Deletes daily routine definitions (users/{uid}/routines/*) and routine completion logs.",
    scopeRoutinesWarning:
      "Warning: Routines and completion history are shared across Apps A, B, and C.",

    requiredPhrase: "RESET",
    confirmationPrompt: (phrase: string) => `To proceed, type "${phrase}" below:`,
    confirmationPlaceholder: "Type RESET to confirm",
    finalConfirmationTitle: "Confirm permanent deletion",
    finalSummaryIntro: "The following selected data will be permanently removed:",
    accountSafeNotice:
      "Identity Guarantee: Your Firebase account will not be deleted, and you will stay signed in.",
    cannotBeUndone: "This destructive operation cannot be undone.",

    summaryItemDaily: "• App A daily plans, rollover decisions, and execution state",
    summaryItemPreferences: "• App A local preferences (rebuilt with clean defaults)",
    summaryItemVision: "• Shared vision strategies and candidate items",
    summaryItemRoutines: "• Shared daily routines and completion logs",

    progressTitle: "Resetting data…",
    progressDeleting: "Securely deleting selected collections…",
    successTitle: "Reset complete",
    successMessage:
      "Selected data has been permanently deleted. Your working state is fresh and you remain signed in.",
    partialFailureTitle: "Reset partially completed",
    partialFailureMessage:
      "Some scopes could not be deleted due to a network or permission error. Your authenticated session is intact.",
    completedScopesLabel: "Successfully deleted:",
    failedScopesLabel: "Pending / failed scopes requiring retry:",
    retryNotice: "You can safely retry deleting the remaining scopes without duplicating work.",
    selectAtLeastOneScopeError: "Please select at least one data scope to reset.",
  },

  sr: {
    dangerZoneTitle: "Zona opasnosti",
    dangerZoneDescription: "Trajno obrišite izabrane podatke bez odjavljivanja sa naloga.",
    primaryAction: "Resetuj podatke aplikacije",

    modalTitle: "Resetovanje podataka App A",
    modalIntro:
      "Izaberite kategorije podataka koje želite trajno obrisati. Vaš nalog ostaje prijavljen.",

    selectAll: "Izaberi sve",
    deselectAll: "Poništi izbor",
    cancel: "Otkaži",
    back: "Nazad",
    continueToConfirm: "Pregledaj i potvrdi",
    finalDestructiveAction: "Trajno resetuj izabrane podatke",
    retryAction: "Pokušaj ponovo za preostalo",
    doneAction: "Završi",

    scopeDailyTitle: "Dnevni planovi i odluke o prenosu",
    scopeDailyDescription:
      "Briše sačuvane dnevne planove (appAUsers/{uid}/dailyResets/*), odluke o prenosu i radno stanje današnjeg dana.",
    scopePreferencesTitle: "Takođe resetuj podešavanja App A",
    scopePreferencesDescription:
      "Vraća podešavanja prikaza i planiranja na podrazumevane vrednosti (app_a_preferences_v1). Čuva jezik.",
    scopeVisionTitle: "Strategije vizije i kandidati",
    scopeVisionDescription:
      "Briše dugoročne strategije (users/{uid}/visionStrategies/*) i stavke kandidata za danas.",
    scopeVisionWarning:
      "Upozorenje: Ovi zapisi mogu biti korišćeni u budućim ili deljenim funkcijama App B/C.",
    scopeRoutinesTitle: "Dnevne rutine i istorija",
    scopeRoutinesDescription:
      "Briše definicije dnevnih rutina (users/{uid}/routines/*) i evidenciju završenih rutina.",
    scopeRoutinesWarning:
      "Upozorenje: Rutine i istorija završetaka se dele između aplikacija A, B i C.",

    requiredPhrase: "RESETUJ",
    confirmationPrompt: (phrase: string) => `Za nastavak, unesite "${phrase}" ispod:`,
    confirmationPlaceholder: "Unesite RESETUJ za potvrdu",
    finalConfirmationTitle: "Potvrdite trajno brisanje",
    finalSummaryIntro: "Sledeći izabrani podaci biće trajno uklonjeni:",
    accountSafeNotice:
      "Garancija identiteta: Vaš Firebase nalog neće biti obrisan i ostajete prijavljeni.",
    cannotBeUndone: "Ova destruktivna radnja se ne može poništiti.",

    summaryItemDaily: "• Dnevni planovi, odluke o prenosu i radno stanje",
    summaryItemPreferences: "• Lokalna podešavanja App A (ponovo kreirana sa podrazumevanim vrednostima)",
    summaryItemVision: "• Deljene strategije vizije i kandidati za danas",
    summaryItemRoutines: "• Deljene dnevne rutine i evidencija završetaka",

    progressTitle: "Resetovanje podataka u toku…",
    progressDeleting: "Bezbedno brisanje izabranih kolekcija…",
    successTitle: "Resetovanje završeno",
    successMessage:
      "Izabrani podaci su trajno obrisani. Radno stanje je osveženo i ostajete prijavljeni.",
    partialFailureTitle: "Resetovanje delimično završeno",
    partialFailureMessage:
      "Neki opsezi nisu mogli biti obrisani zbog mrežne greške ili dozvola. Vaša prijava je očuvana.",
    completedScopesLabel: "Uspešno obrisano:",
    failedScopesLabel: "Neuspešni opsezi koji zahtevaju ponovni pokušaj:",
    retryNotice: "Možete bezbedno ponoviti brisanje za preostale opsege bez dupliranja radnji.",
    selectAtLeastOneScopeError: "Molimo izaberite bar jedan opseg podataka za resetovanje.",
  },

  tr: {
    dangerZoneTitle: "Tehlike Bölgesi",
    dangerZoneDescription: "Oturumu kapatmadan seçilen verileri kalıcı olarak silin.",
    primaryAction: "Uygulama verilerini sıfırla",

    modalTitle: "App A verilerini sıfırla",
    modalIntro:
      "Kalıcı olarak silmek istediğiniz veri kategorilerini seçin. Hesabınız açık kalmaya devam edecektir.",

    selectAll: "Tümünü seç",
    deselectAll: "Seçimi kaldır",
    cancel: "İptal",
    back: "Geri",
    continueToConfirm: "İncele ve onayla",
    finalDestructiveAction: "Seçilen verileri kalıcı olarak sıfırla",
    retryAction: "Kalan kapsamları tekrar dene",
    doneAction: "Bitti",

    scopeDailyTitle: "Günlük planlar ve devir kararları",
    scopeDailyDescription:
      "Kayıtlı günlük planları (appAUsers/{uid}/dailyResets/*), devir kararlarını ve bugünkü çalışma durumunu siler.",
    scopePreferencesTitle: "App A tercihlerini de sıfırla",
    scopePreferencesDescription:
      "App A görünüm ve planlama ayarlarını varsayılanlara sıfırlar (app_a_preferences_v1). Dili korur.",
    scopeVisionTitle: "Vizyon stratejileri ve adayları",
    scopeVisionDescription:
      "Uzun vadeli vizyon stratejilerini (users/{uid}/visionStrategies/*) ve bugünün aday maddelerini siler.",
    scopeVisionWarning:
      "Uyarı: Bu kayıtlar gelecekteki veya paylaşılan App B/C özellikleri tarafından kullanılabilir.",
    scopeRoutinesTitle: "Günlük rutinler ve geçmiş",
    scopeRoutinesDescription:
      "Günlük rutin tanımlarını (users/{uid}/routines/*) ve tamamlama kayıtlarını siler.",
    scopeRoutinesWarning:
      "Uyarı: Rutinler ve tamamlama geçmişi App A, B ve C arasında paylaşılır.",

    requiredPhrase: "SIFIRLA",
    confirmationPrompt: (phrase: string) => `Devam etmek için aşağıya "${phrase}" yazın:`,
    confirmationPlaceholder: "Onaylamak için SIFIRLA yazın",
    finalConfirmationTitle: "Kalıcı silmeyi onaylayın",
    finalSummaryIntro: "Aşağıda seçilen veriler kalıcı olarak kaldırılacaktır:",
    accountSafeNotice:
      "Kimlik Güvencesi: Firebase hesabınız silinmeyecek ve oturumunuz açık kalacaktır.",
    cannotBeUndone: "Bu yıkıcı işlem geri alınamaz.",

    summaryItemDaily: "• Günlük planlar, devir kararları ve yürütme durumu",
    summaryItemPreferences: "• App A yerel tercihleri (varsayılanlarla yeniden oluşturulur)",
    summaryItemVision: "• Paylaşılan vizyon stratejileri ve aday maddeler",
    summaryItemRoutines: "• Paylaşılan günlük rutinler ve tamamlama kayıtları",

    progressTitle: "Veriler sıfırlanıyor…",
    progressDeleting: "Seçilen koleksiyonlar güvenle siliniyor…",
    successTitle: "Sıfırlama tamamlandı",
    successMessage:
      "Seçilen veriler kalıcı olarak silindi. Çalışma alanınız yenilendi ve oturumunuz açık kaldı.",
    partialFailureTitle: "Sıfırlama kısmen tamamlandı",
    partialFailureMessage:
      "Ağ veya yetki hatası nedeniyle bazı kapsamlar silinemedi. Oturumunuz korunmaktadır.",
    completedScopesLabel: "Başarıyla silinenler:",
    failedScopesLabel: "Tekrar denenmesi gereken başarısız kapsamlar:",
    retryNotice: "Kalan kapsamları fazladan işlem yapmadan güvenle yeniden deneyebilirsiniz.",
    selectAtLeastOneScopeError: "Lütfen sıfırlamak için en az bir veri kapsamı seçin.",
  },
};
