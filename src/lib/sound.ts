// Sonidos de Súbase: pitido del conductor (/conductor/:vehiculoId) y campanitas de pago aprobado del pasajero
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

/**
 * Sonido del pasajero cuando el pago queda aprobado: dos campanitas ascendentes (Mi 6 → La 6), cada una con
 * armónicos suaves. Original de Súbase, en la línea de los sonidos de pago aprobado (no usa ningún archivo de
 * terceros). Mismos parámetros que la muestra aprobada (subase-pago-aprobado.wav, prompt180). Distinto del
 * pitido del conductor para que en el bus se sepa qué celular sonó. En Android también vibra.
 */
export function sonarPagoAprobado(): void {
  try {
    navigator.vibrate?.([14, 50, 22]);
  } catch {
    // Safari no tiene vibración web
  }
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const t0 = ctx.currentTime + 0.02;
    const salida = ctx.createGain();
    salida.gain.value = 0.5;
    salida.connect(ctx.destination);
    const notas = [
      { t: 0, f: 1318.51, caida: 0.11, vol: 0.55 }, // Mi 6
      { t: 0.12, f: 1760, caida: 0.22, vol: 0.6 }, // La 6
    ];
    const armonicos: Array<[number, number]> = [
      [1, 1],
      [2, 0.22],
      [3, 0.06],
    ];
    for (const n of notas) {
      for (const [m, peso] of armonicos) {
        const inicio = t0 + n.t;
        // Caída de cada armónico: los agudos se apagan antes (como una campana)
        const tau = 1 / (1 / n.caida + (m - 1) * 6);
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.f * m, inicio);
        g.gain.setValueAtTime(0, inicio);
        g.gain.linearRampToValueAtTime(n.vol * peso, inicio + 0.004); // 4 ms de ataque: sin clic
        g.gain.setTargetAtTime(0, inicio + 0.004, tau);
        osc.connect(g);
        g.connect(salida);
        osc.start(inicio);
        osc.stop(inicio + Math.min(0.75, tau * 7));
      }
    }
  } catch {
    // Ignorar si el navegador bloqueó el audio sin interacción previa
  }
}

// Un recibo suena una sola vez: no al volver a abrirlo desde «Mi pase» ni al recargar.
const SONADOS_KEY = 'subase_recibos_sonados';

export function reciboYaSono(viajeId: string): boolean {
  try {
    return (JSON.parse(localStorage.getItem(SONADOS_KEY) || '[]') as string[]).includes(viajeId);
  } catch {
    return false;
  }
}

export function marcarReciboSonado(viajeId: string): void {
  try {
    const lista = JSON.parse(localStorage.getItem(SONADOS_KEY) || '[]') as string[];
    localStorage.setItem(SONADOS_KEY, JSON.stringify([viajeId, ...lista.filter((v) => v !== viajeId)].slice(0, 30)));
  } catch {
    // sin localStorage: puede volver a sonar, no es grave
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

