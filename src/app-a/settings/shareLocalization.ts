import type { AppALanguage } from '../types';

export interface ShareAppLocalization {
  cardTitle: string;
  supportingText: string;
  shareAction: string;
  sharePayloadTitle: string;
  sharePayloadDescription: string;
  linkCopied: string;
  copyManually: string;
  notAvailableYet: string;
  copyAction: string;
  shareIconLabel: string;
  readOnlyFieldLabel: string;
}

export const SHARE_APP_LOCALIZATION: Record<AppALanguage, ShareAppLocalization> = {
  en: {
    cardTitle: 'Share App',
    supportingText: 'Share Daily Reset with someone who may find it useful.',
    shareAction: 'Share App',
    sharePayloadTitle: 'Daily Reset',
    sharePayloadDescription: 'Mindful daily planning and focus.',
    linkCopied: 'Link copied.',
    copyManually: 'Copy this link manually.',
    notAvailableYet: 'The public sharing link is not available yet.',
    copyAction: 'Copy',
    shareIconLabel: 'Share',
    readOnlyFieldLabel: 'Public share link',
  },
  sr: {
    cardTitle: 'Podeli aplikaciju',
    supportingText: 'Podeli Daily Reset sa nekim kome bi mogao da bude koristan.',
    shareAction: 'Podeli aplikaciju',
    sharePayloadTitle: 'Daily Reset',
    sharePayloadDescription: 'Svesno dnevno planiranje i fokus.',
    linkCopied: 'Link je kopiran.',
    copyManually: 'Kopiraj ovaj link ručno.',
    notAvailableYet: 'Javni link za deljenje još nije dostupan.',
    copyAction: 'Kopiraj',
    shareIconLabel: 'Podeli',
    readOnlyFieldLabel: 'Javni link za deljenje',
  },
  tr: {
    cardTitle: 'Uygulamayı paylaş',
    supportingText: 'Daily Reset’i faydalı bulabilecek biriyle paylaş.',
    shareAction: 'Uygulamayı paylaş',
    sharePayloadTitle: 'Daily Reset',
    sharePayloadDescription: 'Bilinçli günlük planlama ve odak.',
    linkCopied: 'Bağlantı kopyalandı.',
    copyManually: 'Bu bağlantıyı elle kopyalayın.',
    notAvailableYet: 'Herkese açık paylaşım bağlantısı henüz kullanılamıyor.',
    copyAction: 'Kopyala',
    shareIconLabel: 'Paylaş',
    readOnlyFieldLabel: 'Herkese açık paylaşım bağlantısı',
  },
};
