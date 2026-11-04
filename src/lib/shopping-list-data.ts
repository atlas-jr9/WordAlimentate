import { supabase } from './supabase'
import type { IngredientUnit } from './recipes'

export interface ShoppingListItem {
  id: string
  weekStart: string
  name: string
  quantity: number | null
  unit: IngredientUnit | null
  manual: boolean
  checked: boolean
}

export interface ShoppingListItemInput {
  weekStart: string
  name: string
  quantity: number | null
  unit: IngredientUnit | null
  manual: boolean
  checked: boolean
}

interface ShoppingListItemRow {
  id: string
  week_start: string
  name: string
  quantity: number | string | null
  unit: IngredientUnit | null
  manual: boolean
  checked: boolean
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

function normalizeInput(input: ShoppingListItemInput): ShoppingListItemInput {
  const name = input.name.trim()
  if (!name) throw new Error('El nombre del artículo es obligatorio.')
  if ((input.quantity === null) !== (input.unit === null)) {
    throw new Error('La cantidad y la unidad deben indicarse juntas.')
  }
  if (input.quantity !== null && (!Number.isFinite(input.quantity) || input.quantity <= 0)) {
    throw new Error('La cantidad debe ser mayor que cero.')
  }
  if (!input.manual && (input.quantity === null || input.unit === null)) {
    throw new Error('Los artículos generados deben tener cantidad y unidad.')
  }

  return { ...input, name }
}

function throwQueryError(operation: string, error: { message: string } | null) {
  if (error) throw new Error(`${operation}: ${error.message}`)
}

function mapShoppingListItem(row: ShoppingListItemRow): ShoppingListItem {
  return {
    id: row.id,
    weekStart: row.week_start,
    name: row.name,
    quantity: row.quantity === null ? null : Number(row.quantity),
    unit: row.unit,
    manual: row.manual,
    checked: row.checked,
  }
}

export async function listShoppingListItems(weekStart: string): Promise<ShoppingListItem[]> {
  assertWeekStart(weekStart)

  const { data, error } = await supabase
    .from('shopping_list_items')
    .select('id, week_start, name, quantity, unit, manual, checked')
    .eq('week_start', weekStart)
    .order('name', { ascending: true })
  throwQueryError('No se pudo cargar la lista de la compra', error)
  if (!data) throw new Error('La consulta de la lista de la compra no devolvió datos.')

  return (data as ShoppingListItemRow[]).map(mapShoppingListItem)
}

export async function upsertShoppingListItem(
  input: ShoppingListItemInput,
): Promise<ShoppingListItem> {
  assertWeekStart(input.weekStart)
  const normalizedInput = normalizeInput(input)

  const { data, error } = await supabase
    .from('shopping_list_items')
    .upsert(
      {
        week_start: normalizedInput.weekStart,
        name: normalizedInput.name,
        quantity: normalizedInput.quantity,
        unit: normalizedInput.unit,
        manual: normalizedInput.manual,
        checked: normalizedInput.checked,
      },
      { onConflict: 'week_start,name,unit' },
    )
    .select('id, week_start, name, quantity, unit, manual, checked')
    .single()
  throwQueryError('No se pudo guardar el artículo de la lista', error)
  if (!data) throw new Error('La operación no devolvió el artículo guardado.')

  return mapShoppingListItem(data as ShoppingListItemRow)
}

export async function deleteManualShoppingListItem(
  weekStart: string,
  itemId: string,
): Promise<void> {
  assertWeekStart(weekStart)
  if (!itemId.trim()) throw new Error('El artículo indicado no es válido.')

  const { error } = await supabase
    .from('shopping_list_items')
    .delete()
    .eq('id', itemId)
    .eq('week_start', weekStart)
    .eq('manual', true)
  throwQueryError('No se pudo eliminar el artículo manual', error)
}
