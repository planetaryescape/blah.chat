/**
 * Deepgram Aura TTS voice catalog shared by web and mobile voice pickers.
 * Aura 1 (12 voices) + Aura 2 (32 English voices), sorted by label.
 */
export interface TtsVoiceOption {
  value: string;
  label: string;
}

export const TTS_VOICE_OPTIONS: readonly TtsVoiceOption[] = [
  { value: "aura-2-amalthea-en", label: "Amalthea (Female, gentle)" },
  { value: "aura-2-andromeda-en", label: "Andromeda (Female, clear)" },
  { value: "aura-angus-en", label: "Angus (Male, Irish accent)" },
  { value: "aura-2-apollo-en", label: "Apollo (Male, bold)" },
  { value: "aura-arcas-en", label: "Arcas (Male, calm)" },
  { value: "aura-2-aries-en", label: "Aries (Male, aggressive)" },
  { value: "aura-asteria-en", label: "Asteria (Female, warm)" },
  { value: "aura-athena-en", label: "Athena (Female, authoritative)" },
  { value: "aura-2-atlas-en", label: "Atlas (Male, strong)" },
  { value: "aura-2-aurora-en", label: "Aurora (Female, soft)" },
  { value: "aura-2-callista-en", label: "Callista (Female, powerful)" },
  { value: "aura-2-cora-en", label: "Cora (Female, balanced)" },
  { value: "aura-2-cordelia-en", label: "Cordelia (Female, sweet)" },
  { value: "aura-2-delia-en", label: "Delia (Female, calm)" },
  { value: "aura-2-draco-en", label: "Draco (Male, deep)" },
  { value: "aura-2-electra-en", label: "Electra (Female, edgy)" },
  { value: "aura-2-harmonia-en", label: "Harmonia (Female, musical)" },
  { value: "aura-2-helena-en", label: "Helena (Female, classic)" },
  { value: "aura-helios-en", label: "Helios (Male, warm)" },
  { value: "aura-hera-en", label: "Hera (Female, friendly)" },
  { value: "aura-2-hermes-en", label: "Hermes (Male, quick)" },
  { value: "aura-2-hyperion-en", label: "Hyperion (Male, commanding)" },
  { value: "aura-2-iris-en", label: "Iris (Female, bright)" },
  { value: "aura-2-janus-en", label: "Janus (Male, dual)" },
  { value: "aura-2-juno-en", label: "Juno (Female, mature)" },
  { value: "aura-2-jupiter-en", label: "Jupiter (Male, kingly)" },
  { value: "aura-luna-en", label: "Luna (Female, expressive)" },
  { value: "aura-2-mars-en", label: "Mars (Male, battle-ready)" },
  { value: "aura-2-minerva-en", label: "Minerva (Female, wise)" },
  { value: "aura-2-neptune-en", label: "Neptune (Male, vast)" },
  { value: "aura-2-odysseus-en", label: "Odysseus (Male, clever)" },
  { value: "aura-2-ophelia-en", label: "Ophelia (Female, dreamy)" },
  { value: "aura-orion-en", label: "Orion (Male, confident)" },
  { value: "aura-orpheus-en", label: "Orpheus (Male, storytelling)" },
  { value: "aura-2-pandora-en", label: "Pandora (Female, mysterious)" },
  { value: "aura-perseus-en", label: "Perseus (Male, energetic)" },
  { value: "aura-2-phoebe-en", label: "Phoebe (Female, energetic)" },
  { value: "aura-2-pluto-en", label: "Pluto (Male, dark)" },
  { value: "aura-2-saturn-en", label: "Saturn (Male, old)" },
  { value: "aura-2-selene-en", label: "Selene (Female, mysterious)" },
  { value: "aura-stella-en", label: "Stella (Female, professional)" },
  { value: "aura-2-thalia-en", label: "Thalia (Female, cheerful)" },
  { value: "aura-2-theia-en", label: "Theia (Female, motherly)" },
  { value: "aura-2-vesta-en", label: "Vesta (Female, homey)" },
  { value: "aura-zeus-en", label: "Zeus (Male, authoritative)" },
];
