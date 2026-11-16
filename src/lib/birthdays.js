// Aniversários da turma (a data de nascimento vem do perfil).

const ON_WEEKDAY = ['no domingo', 'na segunda', 'na terça', 'na quarta', 'na quinta', 'na sexta', 'no sábado']

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Próximos aniversários a partir de hoje (inclui hoje), do mais perto para o mais longe.
 * Cada item: { profile, date, days, age, isToday }
 */
export function upcomingBirthdays(profiles, { withinDays = 30, now = new Date() } = {}) {
  const today = startOfDay(now)
  return (profiles ?? [])
    .filter((profile) => /^\d{4}-\d{2}-\d{2}$/.test(profile.birth_date ?? ''))
    .map((profile) => {
      const [year, month, day] = profile.birth_date.split('-').map(Number)
      let date = new Date(today.getFullYear(), month - 1, day)
      if (date < today) date = new Date(today.getFullYear() + 1, month - 1, day)
      const days = Math.round((date - today) / 86400000)
      return { profile, date, days, age: date.getFullYear() - year, isToday: days === 0 }
    })
    .filter((item) => item.days <= withinDays)
    .sort((a, b) => a.days - b.days || a.profile.display_name.localeCompare(b.profile.display_name))
}

/** "hoje!" / "amanhã" / "no sábado" / "22/11" */
export function birthdayWhen({ date, days }) {
  if (days === 0) return 'hoje!'
  if (days === 1) return 'amanhã'
  if (days < 7) return ON_WEEKDAY[date.getDay()]
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
}
