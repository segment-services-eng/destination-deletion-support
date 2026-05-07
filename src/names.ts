const SPECIAL_NAMES: Readonly<Record<string, string>> = {
  "customerio": "Customer.io",
  "customer.io": "Customer.io",
  "fullstory": "FullStory",
  "braze": "Braze",
  "amplitude": "Amplitude",
  "intercom": "Intercom",
  "klaviyo": "Klaviyo",
  "airship": "Airship",
  "pushwoosh": "Pushwoosh",
  "gleap": "Gleap",
  "hilo": "Hilo",
  "loops": "Loops",
  "calliper": "Calliper",
  "recombee": "Recombee",
  "userpilot": "Userpilot",
  "xtremepush": "Xtremepush",
  "friendbuy": "Friendbuy",
  "encharge": "Encharge",
  "iqm": "IQM",
  "tray.io": "tray.io",
  "webhooks": "Webhooks",
  "optimizelyx": "Optimizely Full Stack",
  "appboy": "Braze (Legacy/Appboy)",
  "amazon-eventbridge": "Amazon EventBridge",
  "google-analytics": "Google Analytics",
  "google-cloud-pubsub": "Google Cloud PubSub",
  "google-data-manager": "Google Data Manager",
  "iterable": "Iterable",
  "vero": "Vero",
  "stackadapt-audiences": "StackAdapt Audiences",
  "angler-ai": "Angler AI",
  "app-fit": "AppFit",
  "blackbaud-raisers-edge-nxt": "Blackbaud Raiser's Edge NXT",
  "blend-ai": "Blend AI",
  "magellan-ai": "Magellan AI",
  "optimizely-feature-experimentation-actions": "Optimizely Feature Experimentation (Actions)",
};

const capitalize = (word: string): string =>
  word.charAt(0).toUpperCase() + word.slice(1);

export const toDisplayName = (slug: string): string =>
  SPECIAL_NAMES[slug] ?? slug.split("-").map(capitalize).join(" ");
