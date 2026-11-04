import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getWeekStart, listPlanSlots } from './lib/planner'
import { INGREDIENT_UNITS, listRecipes } from './lib/recipes'
import type { IngredientUnit } from './lib/recipes'
import { generateShoppingList } from './lib/shopping-list'
import {
  deleteManualShoppingListItem,
  listShoppingListItems,
  upsertShoppingListItem,
} from './lib/shopping-list-data'
import type { ShoppingListItem } from './lib/shopping-list-data'

function getIngredientKey(name: string, unit: IngredientUnit) {
  return `${name.toLowerCase()}\0${unit}`
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export default function ShoppingListPage() {
  const [weekStart] = useState(() => getWeekStart())
  const [items, setItems] = useState<ShoppingListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [updatingItemId, setUpdatingItemId] = useState('')
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState<IngredientUnit | ''>('')
  const [errorMessage, setErrorMessage] = useState('')

  const loadItems = useCallback(async (): Promise<ShoppingListItem[]> => {
    const [planSlots, recipes, savedItems] = await Promise.all([
      listPlanSlots(weekStart),
      listRecipes(),
      listShoppingListItems(weekStart),
    ])
    const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]))
    const generatedItems = generateShoppingList(
      planSlots.map((slot) => ({
        recipe: slot.recipeId ? recipesById.get(slot.recipeId) ?? null : null,
      })),
    )
    const savedGeneratedItems = new Map(
      savedItems
        .filter(
          (item): item is ShoppingListItem & { unit: IngredientUnit } =>
            !item.manual && item.unit !== null,
        )
        .map((item) => [getIngredientKey(item.name, item.unit), item]),
    )
    const generatedShoppingItems: ShoppingListItem[] = generatedItems.map((item) => {
      const savedItem = savedGeneratedItems.get(getIngredientKey(item.name, item.unit))
      return {
        id: savedItem?.id ?? `generated-${getIngredientKey(item.name, item.unit)}`,
        weekStart,
        name: savedItem?.name ?? item.name,
        quantity: item.quantity,
        unit: item.unit,
        manual: false,
        checked: savedItem?.checked ?? false,
      }
    })

    return [
      ...generatedShoppingItems,
      ...savedItems.filter((item) => item.manual),
    ]
  }, [weekStart])

  async function refreshItems() {
    setItems(await loadItems())
  }

  useEffect(() => {
    let isMounted = true

    loadItems()
      .then((loadedItems) => {
        if (isMounted) setItems(loadedItems)
      })
      .catch((error: unknown) => {
        if (!isMounted) return
        console.error('Error al cargar la lista de la compra:', error)
        setErrorMessage(getErrorMessage(error, 'No se pudo cargar la lista de la compra.'))
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [loadItems])

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setErrorMessage('El nombre del artículo es obligatorio.')
      return
    }
    if (Boolean(quantity) !== Boolean(unit)) {
      setErrorMessage('Indica tanto la cantidad como la unidad, o deja ambos campos vacíos.')
      return
    }

    const numericQuantity = quantity ? Number(quantity) : null
    if (numericQuantity !== null && (!Number.isFinite(numericQuantity) || numericQuantity <= 0)) {
      setErrorMessage('La cantidad debe ser mayor que cero.')
      return
    }

    setIsSaving(true)
    try {
      await upsertShoppingListItem({
        weekStart,
        name: trimmedName,
        quantity: numericQuantity,
        unit: unit || null,
        manual: true,
        checked: false,
      })
      await refreshItems()
      setName('')
      setQuantity('')
      setUnit('')
    } catch (error) {
      console.error('Error al añadir un artículo manual a la lista:', error)
      setErrorMessage(getErrorMessage(error, 'No se pudo añadir el artículo.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCheckedChange(item: ShoppingListItem) {
    setUpdatingItemId(item.id)
    setErrorMessage('')

    try {
      await upsertShoppingListItem({
        weekStart: item.weekStart,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        manual: item.manual,
        checked: !item.checked,
      })
      await refreshItems()
    } catch (error) {
      console.error('Error al actualizar el estado de compra:', error)
      setErrorMessage(getErrorMessage(error, 'No se pudo actualizar el artículo.'))
    } finally {
      setUpdatingItemId('')
    }
  }

  async function handleDeleteItem(item: ShoppingListItem) {
    setUpdatingItemId(item.id)
    setErrorMessage('')

    try {
      await deleteManualShoppingListItem(weekStart, item.id)
      await refreshItems()
    } catch (error) {
      console.error('Error al eliminar un artículo manual de la lista:', error)
      setErrorMessage(getErrorMessage(error, 'No se pudo eliminar el artículo.'))
    } finally {
      setUpdatingItemId('')
    }
  }

  return (
    <section aria-labelledby="shopping-list-heading" className="w-full">
      <header className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
          Prepárate para comprar
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900" id="shopping-list-heading">
          Lista de la compra
        </h1>
      </header>

      {errorMessage && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      )}

      <form
        aria-label="Añadir artículo manual"
        className="mb-6 grid gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_8rem_10rem_auto] sm:items-end"
        onSubmit={(event) => void handleAddItem(event)}
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="manual-item-name">
            Artículo
          </label>
          <input
            autoComplete="off"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-base text-stone-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="manual-item-name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Papel de cocina"
            value={name}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="manual-item-quantity">
            Cantidad (opcional)
          </label>
          <input
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-base text-stone-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="manual-item-quantity"
            min="0.01"
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="—"
            step="any"
            type="number"
            value={quantity}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="manual-item-unit">
            Unidad (opcional)
          </label>
          <select
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="manual-item-unit"
            onChange={(event) => {
              const value = event.target.value
              setUnit(INGREDIENT_UNITS.find(({ value: option }) => option === value)?.value ?? '')
            }}
            value={unit}
          >
            <option value="">Sin unidad</option>
            {INGREDIENT_UNITS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <button
          className="min-h-11 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? 'Añadiendo…' : 'Añadir'}
        </button>
      </form>

      {isLoading && <p className="text-stone-600" role="status">Cargando lista…</p>}
      {!isLoading && items.length === 0 && !errorMessage && (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-8 text-center text-stone-600">
          Aún no hay artículos en esta lista.
        </p>
      )}
      {!isLoading && items.length > 0 && (
        <ul aria-label="Artículos de la lista" className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white shadow-sm">
          {items.map((item) => {
            const isUpdating = updatingItemId === item.id
            const unitLabel = INGREDIENT_UNITS.find(({ value }) => value === item.unit)?.label.toLocaleLowerCase()

            return (
              <li className="flex items-center gap-3 px-4 py-3" key={item.id}>
                <input
                  aria-label={`Marcar ${item.name} como comprado`}
                  checked={item.checked}
                  className="size-6 shrink-0 accent-emerald-800"
                  disabled={Boolean(updatingItemId)}
                  onChange={() => void handleCheckedChange(item)}
                  type="checkbox"
                />
                <div className="min-w-0 flex-1">
                  <p className={`break-words font-medium ${item.checked ? 'text-stone-500 line-through' : 'text-stone-900'}`}>
                    {item.name}
                  </p>
                  {item.quantity !== null && item.unit && (
                    <p className="text-sm text-stone-600">
                      {item.quantity} {unitLabel}
                    </p>
                  )}
                  {item.manual && (
                    <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                      Manual
                    </span>
                  )}
                </div>
                {item.manual && (
                  <button
                    aria-label={`Eliminar ${item.name}`}
                    className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-medium text-red-700 underline decoration-red-300 underline-offset-2 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={Boolean(updatingItemId)}
                    onClick={() => void handleDeleteItem(item)}
                    type="button"
                  >
                    {isUpdating ? 'Eliminando…' : 'Eliminar'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
