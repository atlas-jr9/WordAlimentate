import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  FOOD_TYPES,
  INGREDIENT_UNITS,
  createRecipe,
  getRecipe,
  updateRecipe,
} from './lib/recipes'
import type { FoodType, IngredientUnit, RecipeInput } from './lib/recipes'

interface IngredientDraft {
  key: string
  name: string
  quantity: string
  unit: IngredientUnit
  pantry: boolean
}

function createIngredientDraft(): IngredientDraft {
  return {
    key: crypto.randomUUID(),
    name: '',
    quantity: '',
    unit: 'uds',
    pantry: false,
  }
}

export default function RecipeEditorPage() {
  const { recipeId } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [foodType, setFoodType] = useState<FoodType>('lunch')
  const [servings, setServings] = useState('2')
  const [instructions, setInstructions] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([createIngredientDraft()])
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!recipeId) return

    let isMounted = true
    setIsLoadingRecipe(true)
    getRecipe(recipeId)
      .then((recipe) => {
        if (!isMounted) return
        if (!recipe) {
          setErrorMessage('No se encontró la receta.')
          return
        }

        setName(recipe.name)
        setFoodType(recipe.foodType)
        setServings(String(recipe.servings))
        setInstructions(recipe.instructions)
        setTagsInput(recipe.tags.join(', '))
        setIngredients(
          recipe.ingredients.map((ingredient) => ({
            key: crypto.randomUUID(),
            name: ingredient.name,
            quantity: String(ingredient.quantity),
            unit: ingredient.unit,
            pantry: ingredient.pantry,
          })),
        )
      })
      .catch((error: unknown) => {
        if (!isMounted) return
        console.error('Error al cargar la receta para editar:', error)
        setErrorMessage(
          error instanceof Error ? error.message : 'No se pudo cargar la receta.',
        )
      })
      .finally(() => {
        if (isMounted) setIsLoadingRecipe(false)
      })

    return () => {
      isMounted = false
    }
  }, [recipeId])

  function updateIngredient(key: string, updates: Partial<IngredientDraft>) {
    setIngredients((current) =>
      current.map((ingredient) =>
        ingredient.key === key ? { ...ingredient, ...updates } : ingredient,
      ),
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    const filledIngredients = ingredients.filter(
      (ingredient) => ingredient.name.trim() || ingredient.quantity.trim(),
    )
    if (!name.trim()) {
      setErrorMessage('El nombre de la receta es obligatorio.')
      return
    }
    if (filledIngredients.length === 0) {
      setErrorMessage('Añade al menos un ingrediente.')
      return
    }
    if (
      filledIngredients.some(
        (ingredient) => !ingredient.name.trim() || !ingredient.quantity.trim(),
      )
    ) {
      setErrorMessage('Completa el nombre y la cantidad de cada ingrediente.')
      return
    }

    const input: RecipeInput = {
      name,
      foodType,
      servings: Number(servings),
      instructions,
      tags: tagsInput.split(',').map((tag) => tag.trim()).filter(Boolean),
      ingredients: filledIngredients.map((ingredient) => ({
        name: ingredient.name,
        quantity: Number(ingredient.quantity),
        unit: ingredient.unit,
        pantry: ingredient.pantry,
      })),
    }

    setIsSaving(true)
    try {
      if (recipeId) {
        await updateRecipe(recipeId, input)
      } else {
        await createRecipe(input)
      }
      navigate('/', { replace: true })
    } catch (error) {
      console.error('Error al guardar la receta:', error)
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo guardar la receta.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoadingRecipe) {
    return <p className="text-stone-600" role="status">Cargando receta…</p>
  }

  return (
    <section aria-labelledby="editor-heading" className="w-full max-w-3xl">
      <header className="mb-6">
        <Link className="text-sm font-medium text-emerald-800 hover:underline" to="/">
          ← Volver a recetas
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-stone-900" id="editor-heading">
          {recipeId ? 'Editar receta' : 'Nueva receta'}
        </h1>
      </header>

      <form className="space-y-6 rounded-xl bg-white p-5 shadow-sm sm:p-7" onSubmit={handleSubmit}>
        {errorMessage && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {errorMessage}
          </p>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="recipe-name">
            Nombre de la receta
          </label>
          <input
            autoComplete="off"
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="recipe-name"
            name="name"
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="food-type">
              Tipo de comida
            </label>
            <select
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              id="food-type"
              onChange={(event) => setFoodType(event.target.value as FoodType)}
              value={foodType}
            >
              {FOOD_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="servings">
              Raciones
            </label>
            <input
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              id="servings"
              min="1"
              onChange={(event) => setServings(event.target.value)}
              required
              type="number"
              value={servings}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="recipe-tags">
            Etiquetas <span className="font-normal text-stone-500">(separadas por comas)</span>
          </label>
          <input
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="recipe-tags"
            onChange={(event) => setTagsInput(event.target.value)}
            value={tagsInput}
          />
        </div>

        <fieldset className="space-y-4">
          <legend className="mb-3 text-lg font-semibold text-stone-900">Ingredientes</legend>
          {ingredients.map((ingredient, index) => (
            <div className="rounded-lg border border-stone-200 p-4" key={ingredient.key}>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_10rem_auto] sm:items-end">
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-stone-700"
                    htmlFor={`ingredient-name-${ingredient.key}`}
                  >
                    Nombre
                  </label>
                  <input
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                    id={`ingredient-name-${ingredient.key}`}
                    onChange={(event) => updateIngredient(ingredient.key, { name: event.target.value })}
                    value={ingredient.name}
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-stone-700"
                    htmlFor={`ingredient-quantity-${ingredient.key}`}
                  >
                    Cantidad
                  </label>
                  <input
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                    id={`ingredient-quantity-${ingredient.key}`}
                    min="0.01"
                    onChange={(event) =>
                      updateIngredient(ingredient.key, { quantity: event.target.value })
                    }
                    step="any"
                    type="number"
                    value={ingredient.quantity}
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-stone-700"
                    htmlFor={`ingredient-unit-${ingredient.key}`}
                  >
                    Unidad
                  </label>
                  <select
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                    id={`ingredient-unit-${ingredient.key}`}
                    onChange={(event) =>
                      updateIngredient(ingredient.key, {
                        unit: event.target.value as IngredientUnit,
                      })
                    }
                    value={ingredient.unit}
                  >
                    {INGREDIENT_UNITS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <button
                  aria-label={`Quitar ingrediente ${index + 1}`}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600"
                  onClick={() =>
                    setIngredients((current) =>
                      current.filter((item) => item.key !== ingredient.key),
                    )
                  }
                  type="button"
                >
                  Quitar
                </button>
              </div>
              <label className="mt-3 inline-flex items-center gap-2 text-sm text-stone-700">
                <input
                  checked={ingredient.pantry}
                  className="size-4 accent-emerald-800"
                  onChange={(event) =>
                    updateIngredient(ingredient.key, { pantry: event.target.checked })
                  }
                  type="checkbox"
                />
                Es un ingrediente de despensa
              </label>
            </div>
          ))}
          <button
            className="rounded-lg border border-emerald-800 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            onClick={() => setIngredients((current) => [...current, createIngredientDraft()])}
            type="button"
          >
            Añadir ingrediente
          </button>
        </fieldset>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-stone-700"
            htmlFor="instructions"
          >
            Instrucciones
          </label>
          <textarea
            className="min-h-32 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="instructions"
            onChange={(event) => setInstructions(event.target.value)}
            required
            value={instructions}
          />
        </div>

        <footer className="flex flex-wrap justify-end gap-3 border-t border-stone-100 pt-4">
          <Link
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
            to="/"
          >
            Cancelar
          </Link>
          <button
            className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? 'Guardando…' : 'Guardar receta'}
          </button>
        </footer>
      </form>
    </section>
  )
}
