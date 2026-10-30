import { supabase } from './supabase'
import type { FoodType } from './recipes'

export type PlanMealSlot = 'lunch' | 'dinner'

export interface PlanRecipeSummary {
  id: string
  name: string
  foodType: FoodType
  servings: number
}

export interface PlanSlot {
  id: string
  weekStart: string
  dayOfWeek: number
  slot: PlanMealSlot
  recipeId: string | null
  recipe: PlanRecipeSummary | null
}

export interface PlanSlotInput {
  weekStart: string
  dayOfWeek: number
  slot: PlanMealSlot
  recipeId: string | null
}

export interface PlanSlotRow {
  id: string
  week_start: string
  day_of_week: number
  slot: PlanMealSlot
  recipe_id: string | null
  recipes: PlanRecipeRow | PlanRecipeRow[] | null
}

interface PlanRecipeRow {
  id: string
  name: string
  food_type: FoodType
  servings: number
}

const PLAN_SLOT_SELECT =
  'id, week_start, day_of_week, slot, recipe_id, recipes(id, name, food_type, servings)'

export function getWeekStart(date: Date = new Date()): string {
  if (Number.isNaN(date.getTime())) throw new Error('La fecha indicada no es válida.')

  const monday = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const daysSinceMonday = (monday.getUTCDay() + 6) % 7
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday)
  return monday.toISOString().slice(0, 10)
}

function assertWeekStart(weekStart: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    throw new Error('La fecha de inicio de semana debe tener formato YYYY-MM-DD.')
  }

  const date = new Date(`${weekStart}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== weekStart) {
    throw new Error('La fecha de inicio de semana no es válida.')
  }
  if (date.getUTCDay() !== 1) {
    throw new Error('La semana debe comenzar en lunes.')
  }
}

function assertSlot(dayOfWeek: number, slot: PlanMealSlot) {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error('El día de la semana debe estar entre 0 (lunes) y 6 (domingo).')
  }
  if (slot !== 'lunch' && slot !== 'dinner') {
    throw new Error('La ranura debe ser comida o cena.')
  }
}

function throwQueryError(operation: string, error: { message: string } | null) {
  if (error) throw new Error(`${operation}: ${error.message}`)
}

function mapPlanSlot(row: PlanSlotRow): PlanSlot {
  const recipe = Array.isArray(row.recipes) ? row.recipes[0] ?? null : row.recipes

  return {
    id: row.id,
    weekStart: row.week_start,
    dayOfWeek: row.day_of_week,
    slot: row.slot,
    recipeId: row.recipe_id,
    recipe: recipe
      ? {
          id: recipe.id,
          name: recipe.name,
          foodType: recipe.food_type,
          servings: recipe.servings,
        }
      : null,
  }
}

export async function listPlanSlots(weekStart: string): Promise<PlanSlot[]> {
  assertWeekStart(weekStart)

  const { data, error } = await supabase
    .from('plan_slots')
    .select(PLAN_SLOT_SELECT)
    .eq('week_start', weekStart)
    .order('day_of_week', { ascending: true })
  throwQueryError('No se pudo cargar el plan semanal', error)
  if (!data) throw new Error('La consulta del plan semanal no devolvió datos.')

  return data.map((row) => mapPlanSlot(row))
}

export async function upsertPlanSlot(input: PlanSlotInput): Promise<PlanSlot> {
  assertWeekStart(input.weekStart)
  assertSlot(input.dayOfWeek, input.slot)

  const { data, error } = await supabase
    .from('plan_slots')
    .upsert(
      {
        week_start: input.weekStart,
        day_of_week: input.dayOfWeek,
        slot: input.slot,
        recipe_id: input.recipeId,
      },
      { onConflict: 'week_start,day_of_week,slot' },
    )
    .select(PLAN_SLOT_SELECT)
    .single()
  throwQueryError('No se pudo guardar la ranura del plan', error)
  if (!data) throw new Error('La operación no devolvió la ranura guardada.')

  return mapPlanSlot(data)
}

export async function clearPlanSlot(
  input: Omit<PlanSlotInput, 'recipeId'>,
): Promise<void> {
  assertWeekStart(input.weekStart)
  assertSlot(input.dayOfWeek, input.slot)

  const { error } = await supabase
    .from('plan_slots')
    .delete()
    .eq('week_start', input.weekStart)
    .eq('day_of_week', input.dayOfWeek)
    .eq('slot', input.slot)
  throwQueryError('No se pudo vaciar la ranura del plan', error)
}
