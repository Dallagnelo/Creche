// Regras e utilidades da transmissão ao vivo (WebRTC direto entre os navegadores).

export const MAX_VIEWERS = 10

// Quantas transmissões podem estar no ar ao mesmo tempo (cada uma usa a internet de quem transmite).
export const MAX_HOSTS = 4

/** Servidores que ajudam os navegadores a se encontrarem. O TURN (opcional) ajuda redes mais difíceis. */
export function iceServers() {
  const servers = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
  const url = import.meta.env.VITE_TURN_URL
  if (url) {
    servers.push({
      urls: url.split(',').map((item) => item.trim()),
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    })
  }
  return servers
}

/** Só dá para transmitir a tela em navegador de computador (Chrome, Edge...). Assistir funciona em qualquer um. */
export function canBroadcast() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia
}

/**
 * A qualidade se ajusta ao número de pessoas assistindo: o computador de quem transmite
 * envia uma cópia do vídeo para cada espectador, então com mais gente a imagem fica mais leve.
 */
// Quem transmite escolhe quanta internet de ENVIO usar por espectador. Se a transmissão usa toda a
// internet de envio, o resto (ex.: o próprio YouTube que está sendo transmitido) fica lento e baixa a qualidade.
export const SEND_PRESETS = [
  { id: 'max', title: 'Máxima', hint: 'sem redução automática, até 15 Mb/s por pessoa e 60 fps. Para internet muito boa.', cap: 15_000_000, scale: 1 },
  { id: 'normal', title: 'Normal', hint: 'até 2,5 Mb/s por pessoa, reduz sozinha se o PC não aguentar.', cap: 2_500_000, scale: 1 },
  { id: 'low', title: 'Econômica', hint: 'até 1,2 Mb/s por pessoa, em 720p. Para internet fraca.', cap: 1_200_000, scale: 1.5 },
]
export const DEFAULT_PRESET = 'max'

export function qualityFor(viewerCount, presetId = DEFAULT_PRESET) {
  const preset = SEND_PRESETS.find((item) => item.id === presetId) ?? SEND_PRESETS[0]
  // Máxima: sem reduzir por número de espectadores.
  if (preset.id === 'max') return { maxBitrate: preset.cap, scale: 1, label: 'Máxima' }
  let base
  if (viewerCount <= 3) base = { maxBitrate: 4_000_000, scale: 1, label: 'Alta' }
  else if (viewerCount <= 6) base = { maxBitrate: 2_500_000, scale: 1, label: 'Boa' }
  else if (viewerCount <= 8) base = { maxBitrate: 1_800_000, scale: 1.25, label: 'Média' }
  else base = { maxBitrate: 1_300_000, scale: 1.5, label: 'Leve' }
  return { ...base, maxBitrate: Math.min(base.maxBitrate, preset.cap), scale: Math.max(base.scale, preset.scale) }
}

/** Espera o navegador terminar de descobrir os caminhos de rede (assim cada conexão usa só 2 mensagens). */
export function waitForIce(pc, timeoutMs = 3000) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve()
    const done = () => {
      clearTimeout(timer)
      pc.removeEventListener('icegatheringstatechange', onChange)
      resolve()
    }
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') done()
    }
    const timer = setTimeout(done, timeoutMs)
    pc.addEventListener('icegatheringstatechange', onChange)
  })
}
