export type DisplayMode = 'basic' | 'giveaway' | 'free-gift' | 'coupon-code' | 'legacy';

export interface SelectedProduct {
  id: string;
  variantId: string;
  title: string;
  variantTitle?: string;
  image?: string;
  price?: string;
}

export interface DefaultSettings {
  mode: DisplayMode;
  popupTitle: string;
  subtitleTop: string;
  subtitleBottom: string;
  socialProofSubtitle: string;
  rulesTitle: string;
  rulesDescription: string;
  formFieldLabel: string;
  submitButtonText: string;
  countdownTitle: string;
  submittedTitle: string;
  submittedSubtitle: string;
  submittedCountdownText: string;
  submittedWinnerText: string;
  submittedSocialProofText: string;
  followButtonText: string;
  couponCode: string;
  couponCodeTitle: string;
  giveawayRules: string[];
  selectedProducts: SelectedProduct[];
}

export const DEFAULT_SETTINGS: DefaultSettings = {
  mode: 'giveaway',
  popupTitle: '🎉Win Products worth ₹1,000',
  subtitleTop: 'Follow us on Instagram to enter the Giveaway',
  subtitleBottom: 'Winners will be announced on 23rd Jan 2026',
  socialProofSubtitle: '1248 Entries submitted already!',
  rulesTitle: 'How to Enter:',
  rulesDescription: 'Enter your Instagram handle and follow @{{your instagram profile url}} to enter',
  formFieldLabel: 'Instagram Username',
  submitButtonText: 'Follow & Enter Giveaway 🎁',
  countdownTitle: '⏰ Giveaway ends in ',
  submittedTitle: '✅ You\'re entered!',
  submittedSubtitle: 'Thanks for following {{@instagramhandle}}',
  submittedCountdownText: '🎁Giveaway ends in',
  submittedWinnerText: '🏆Winner announced on Jan 23',
  couponCode: 'WELCOME10',
  couponCodeTitle: '🎁 Your Coupon Code',
  submittedSocialProofText: '👥 1248 people have entered',
  followButtonText: 'View us on Instagram',
  giveawayRules: [
    'Follow us on Instagram',
    'Like our latest post',
    'Tag 2 friends in the comments',
    'Share this post to your story',
  ],
  selectedProducts: [],
};