// Sonido de confirmación para la terminal del conductor (/conductor/:vehiculoId)
// Usa Web Audio API para no depender de archivos externos que bloqueen o fallen en red móvil.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function unlockAudio(): boolean {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.02);
    return true;
  } catch {
    return false;
  }
}

export function playPaymentChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Primer tono (La5 - 880 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.28, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.17);

    // Segundo tono de confirmación (Mi6 - 1318.5 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1318.5, now + 0.11);
    gain2.gain.setValueAtTime(0.001, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.34, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.11);
    osc2.stop(now + 0.46);
  } catch {
    // Ignorar si el navegador bloqueó el audio sin interacción previa
  }
}

export function desbloquearVoz(): void {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !window.speechSynthesis) {
      return;
    }
    if (typeof SpeechSynthesisUtterance === 'undefined') {
      return;
    }
    window.speechSynthesis.getVoices();
    const utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignorar errores si el navegador no soporta Web Speech API
  }
}

export function anunciarPago(monto: number): void {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !window.speechSynthesis) {
      return;
    }
    if (typeof SpeechSynthesisUtterance === 'undefined') {
      return;
    }
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    const voice =
      voices.find((v) => v.lang === 'es-CO' || v.lang.toLowerCase() === 'es-co') ||
      voices.find((v) => v.lang.toLowerCase().startsWith('es'));
    synth.cancel();
    const montoEntero = Math.round(Number(monto) || 0);
    const utterance = new SpeechSynthesisUtterance(`Pagado, ${montoEntero} pesos`);
    // Chrome carga las voces de forma asíncrona: si aún no hay lista, el navegador elige por lang.
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'es-CO';
    }
    utterance.rate = 1;
    utterance.volume = 1;
    synth.speak(utterance);
  } catch {
    // Ignorar errores si el navegador bloquea o falla al sintetizar voz
  }
}

