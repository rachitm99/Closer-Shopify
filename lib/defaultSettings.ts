export interface DefaultSettings {
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
  submittedMessage: string;
  followButtonText: string;
  giveawayRules: string[];
}

export const DEFAULT_SETTINGS: DefaultSettings = {
  popupTitle: '🎉Win Products worth ₹1,000',
  subtitleTop: 'Follow us on Instagram to enter the Giveaway',
  subtitleBottom: 'Winners will be announced on 23rd Jan 2026',
  socialProofSubtitle: '1248 Entries submitted already!',
  rulesTitle: 'How to Enter:',
  rulesDescription: 'Enter your Instagram handle and follow @{{your instagram profile url}} to enter',
  formFieldLabel: 'Instagram Username',
  submitButtonText: 'Follow & Enter Giveaway 🎁',
  countdownTitle: '⏰ Giveaway ends in ',
  submittedTitle: '✅ Entry Submitted!',
  submittedMessage: 'Thank you for entering! Good luck! 🍀',
  followButtonText: 'Follow Us on Instagram',
  giveawayRules: [
    'Follow us on Instagram',
    'Like our latest post',
    'Tag 2 friends in the comments',
    'Share this post to your story',
  ],
};