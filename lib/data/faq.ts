/**
 * The /faq questions, shared by the page (which renders them and marks them up
 * as FAQPage) and /llms-full.txt (which gives assistants the same answers).
 * One copy, so the answers an assistant quotes are the ones the page shows.
 */
export interface FaqGroup {
  chapter: string;
  label: string;
  items: { q: string; a: string }[];
}

export const faqGroups: FaqGroup[] = [
  {
    chapter: "One",
    label: "The Diffusers",
    items: [
      {
        q: "How is this different from a regular diffuser?",
        a: "Unlike traditional water-based diffusers that mix fragrance with water and create a visible mist, Quint Home uses waterless cold-air diffusion technology to disperse fragrance as an ultra-fine dry mist – without heat or water.\n\nBut the difference goes beyond the technology. Quint Home is a complete scenting experience. We carefully curate our fragrances, develop scent profiles specifically for modern interiors, and pair them with a controlled diffusion system designed for consistent, elegant fragrance distribution.\n\nThere is no water, no dilution, no wet residue and no open flame – just a refined, dry fragrance experience designed to make your space feel beautifully scented.\n\nThink of it less as a traditional diffuser and more as a fragrance system for your home.",
      },
      {
        q: "Is it actually silent?",
        a: "Near-silent. There is no fan, no gurgling water and no clicking, which is why they suit bedrooms, studies and offices. The Pillar, for example, is rated at 35 dB or less.",
      },
      {
        q: "What does it take to set up?",
        a: "For the Monolith, the Pillar and the Ember, the process is simple: Fill the oil reservoir, pair with the Quint Home companion app once, set a schedule, and the device runs on its own from that point. No daily interaction is needed, unless you want to change any settings.\n\nThe Loom has no app: fill it, switch it on and set the intensity at its knob.\n\nThe Drift, the car diffuser, has no app either: two buttons set its intensity and run time.\n\nThe Pebble is a plug-in model and needs no app at all – it runs on a built-in 24-hour intelligent cyclic timer. Once switched on, it runs automatically for 8 hours, then enters sleep mode for 16 hours before restarting on its own. This 24-hour cycle repeats every day. The plug-in diffuser is designed to operate intelligently with minimal intervention.\n\nAfter 16 days of continuous operation, the diffuser enters Auto Shut-Off Mode as a safety feature. Simply press the power button to restart the cycle.\n\nIf you wish to restart the diffuser or change the fragrance intensity at any time, press the power button and select your preferred intensity. The diffuser will begin a fresh cycle, running for 8 hours, sleeping for 16 hours, and continuing this pattern until the next automatic shut-off after 16 days.",
      },
    ],
  },
  {
    chapter: "Two",
    label: "The Fragrance Oils",
    items: [
      {
        q: "How long does a 50 ml oil last?",
        a: "Approximately 45–60 days, depending on the model and intensity. Most models average around 50 days at moderate settings.",
      },
      {
        q: "Are the oils IFRA-compliant?",
        a: "Yes – every Quint Home oil is composed to IFRA (International Fragrance Association) standards. Safe around children and pets when used as directed.",
      },
      {
        q: "Can I use other oils in the diffuser?",
        a: "Use only Quint Home oils. Ours are undiluted, high-concentration blends made specifically for waterless cold-air nebulisation. Diluted oils, water-based oils, or third-party blends can clog the nebuliser and won’t perform as intended – and will void your warranty.",
      },
    ],
  },
  {
    chapter: "Three",
    label: "The App & Controls",
    items: [
      {
        q: "How do I control it?",
        a: "Through the Quint Home companion app for iOS and Android. Pair once, then set your schedules and intensity. The Monolith, Pillar and Ember are app-controllable. The Loom is set by hand at its knob, the Pebble (plug-in) runs on a built-in 24-hour cyclic timer, and the Drift (car) on its own two buttons; none of them needs an app.",
      },
      {
        q: "Does it need Wi-Fi to work?",
        a: "No. The diffusers run from the companion app and an on-device schedule – no Wi-Fi, no account, and no cloud. You adjust settings from your phone, and the device keeps to its schedule on its own.",
      },
    ],
  },
];
