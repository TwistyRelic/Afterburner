// Voice out. The browser's own synthesiser reads every coach reply; if an
// ElevenLabs key has been dropped into localStorage the reply is fetched from
// their endpoint and played instead. No key, no network, no synthesiser — the
// reply still reveals itself on screen either way.
export const KEY_NAMES = ["afterburner.elevenlabs", "elevenlabs", "11"];
export const VOICE_NAMES = ["afterburner.elevenlabs.voice", "11.voice"];
export const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM";
export const MODEL = "eleven_multilingual_v2";

export function readStored(storage, names) {
  for (const name of names) {
    try {
      const value = storage?.getItem(name);
      if (value && value.trim()) return value.trim();
    } catch {
      return null;
    }
  }
  return null;
}

export const readKey = (storage) => readStored(storage, KEY_NAMES);
export const readVoice = (storage) =>
  readStored(storage, VOICE_NAMES) ?? DEFAULT_VOICE;

export const endpoint = (voice) =>
  `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;

export function splitWords(text) {
  return text.split(/\s+/).filter(Boolean);
}

// Words are revealed on the same clock the audio runs on, so a long reply does
// not finish drawing while it is still being read out.
export function wordStagger(text, seconds = 0.09) {
  const words = splitWords(text);
  return words.length ? Math.min(seconds, 2.6 / words.length) : seconds;
}

export async function fetchSpeech(text, key, voice, fetchImpl) {
  const response = await fetchImpl(endpoint(voice), {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({ text, model_id: MODEL }),
  });
  if (!response.ok) throw new Error(`speech ${response.status}`);
  return response.blob();
}
