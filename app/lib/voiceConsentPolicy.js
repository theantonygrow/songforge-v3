export const voiceConsentPolicy = {
  allowed: [
    'Upload your own voice recordings and create a private voice style with explicit consent.',
    'Upload recordings from a performer who gave written permission.',
    'Use licensed or fictional voice presets that are not based on a real person.',
    'Use voice messages only when the speaker has clearly agreed to voice modeling and singing generation.'
  ],
  notAllowed: [
    'Do not clone voices from songs by other musicians without permission.',
    'Do not extract a real person’s voice from voice messages without consent.',
    'Do not label a preset as the exact voice of a real celebrity or artist.',
    'Do not use generated vocals to mislead listeners into thinking a real person performed the song.'
  ],
  uiCopy: {
    title: 'Consent Voice Lab',
    subtitle: 'Create singing voices only from your own recordings, licensed voices, or performers who gave permission.',
    consentCheckbox: 'I confirm I own this recording or have explicit permission from the speaker/singer to create a singing voice from it.',
    disabledNotice: 'Voice cloning from famous artists or private voice messages without consent is not supported.'
  }
};
