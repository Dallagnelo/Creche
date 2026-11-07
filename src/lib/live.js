// Regras e utilidades da transmissão ao vivo (WebRTC direto entre os navegadores).

export const MAX_VIEWERS = 10

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
export function qualityFor(viewerCount) {
  if (viewerCount <= 3) return { maxBitrate: 4_000_000, scale: 1, label: 'Alta' }
  if (viewerCount <= 6) return { maxBitrate: 2_500_000, scale: 1, label: 'Boa' }
  if (viewerCount <= 8) return { maxBitrate: 1_800_000, scale: 1.25, label: 'Média' }
  return { maxBitrate: 1_300_000, scale: 1.5, label: 'Leve' }
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
