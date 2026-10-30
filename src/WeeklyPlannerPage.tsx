import { useEffect, useState } from 'react'
import { getWeekStart, listPlanSlots } from './lib/planner'
import type { PlanMealSlot, PlanSlot } from './lib/planner'

const DAYS_OF_WEEK = Array.from({ length: 7 }, (_, dayOfWeek) => dayOfWeek)
const MEAL_SLOTS: Array<{ value: PlanMealSlot; label: string }> = [
  { value: 'lunch', label: 'Comida' },
  { value: 'dinner', label: 'Cena' },
]

function addWeeks(weekStart: string, weeks: number) {
  const date = new Date(`${weekStart}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + weeks * 7)
  return date.toISOString().slice(0, 10)
}

function formatWeekRange(weekStart: string) {
  const monday = new Date(`${weekStart}T12:00:00`)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const formatDate = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' })
  const year = new Intl.DateTimeFormat('es-ES', { year: 'numeric' }).format(sunday)

  return `Semana del ${formatDate.format(monday)} al ${formatDate.format(sunday)} de ${year}`
}

function formatDay(weekStart: string, dayOfWeek: number) {
  const date = new Date(`${weekStart}T12:00:00`)
  date.setDate(date.getDate() + dayOfWeek)
  const weekday = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(date)
  const shortDate = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
  }).format(date)

  return {
    weekday: `${weekday.charAt(0).toLocaleUpperCase()}${weekday.slice(1)}`,
    shortDate,
  }
}

export default function WeeklyPlannerPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart())
  const [slots, setSlots] = useState<PlanSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true
    setSlots([])
    setErrorMessage('')
    setIsLoading(true)

    listPlanSlots(weekStart)
      .then((weekSlots) => {
        if (isMounted) setSlots(weekSlots)
      })
      .catch((error: unknown) => {
        if (!isMounted) return
        console.error('Error al cargar el plan semanal:', error)
        setErrorMessage(
          error instanceof Error ? error.message : 'No se pudo cargar el plan semanal.',
        )
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [weekStart])

  function getSlot(dayOfWeek: number, slot: PlanMealSlot) {
    return slots.find((planSlot) => planSlot.dayOfWeek === dayOfWeek && planSlot.slot === slot)
  }

  return (
    <section aria-labelledby="planner-heading" className="w-full">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
            Organiza tus comidas
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900" id="planner-heading">
            Plan semanal
          </h1>
          <p className="mt-2 text-stone-600">{formatWeekRange(weekStart)}</p>
        </div>
        <nav aria-label="Navegación entre semanas" className="flex items-center gap-2">
          <button
            aria-label="Semana anterior"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            onClick={() => setWeekStart((current) => addWeeks(current, -1))}
            type="button"
          >
            ← Anterior
          </button>
          <button
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            onClick={() => setWeekStart(getWeekStart())}
            type="button"
          >
            Hoy
          </button>
          <button
            aria-label="Semana siguiente"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            onClick={() => setWeekStart((current) => addWeeks(current, 1))}
            type="button"
          >
            Siguiente →
          </button>
        </nav>
      </header>

      {isLoading && <p className="text-stone-600" role="status">Cargando plan…</p>}
      {errorMessage && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && (
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {DAYS_OF_WEEK.map((dayOfWeek) => {
            const day = formatDay(weekStart, dayOfWeek)

            return (
              <li
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
                key={`${weekStart}-${dayOfWeek}`}
              >
                <h2 className="border-b border-stone-100 pb-3 font-semibold text-stone-900">
                  {day.weekday}
                  <span className="ml-2 text-sm font-normal text-stone-500">{day.shortDate}</span>
                </h2>
                <dl className="mt-3 space-y-3">
                  {MEAL_SLOTS.map(({ value, label }) => {
                    const planSlot = getSlot(dayOfWeek, value)

                    return (
                      <div className="rounded-lg bg-stone-50 p-3" key={value}>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                          {label}
                        </dt>
                        <dd className="mt-1 text-sm text-stone-800">
                          {planSlot?.recipe?.name ?? 'Sin receta'}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
