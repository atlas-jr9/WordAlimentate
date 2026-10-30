import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FOOD_TYPES, filterRecipes, listRecipes } from './lib/recipes'
import type { FoodType, Recipe } from './lib/recipes'

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [foodTypeFilter, setFoodTypeFilter] = useState<FoodType | ''>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    let isMounted = true

    listRecipes()
      .then((loadedRecipes) => {
        if (isMounted) setRecipes(loadedRecipes)
      })
      .catch((error: unknown) => {
        if (!isMounted) return
        console.error('Error al cargar las recetas:', error)
        setErrorMessage(
          error instanceof Error ? error.message : 'No se pudieron cargar las recetas.',
        )
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const availableTags = [...new Set(recipes.flatMap((recipe) => recipe.tags))].sort((a, b) =>
    a.localeCompare(b),
  )
  const filteredRecipes = filterRecipes(recipes, {
    foodType: foodTypeFilter,
    tags: selectedTags,
    search,
  })

  return (
    <section aria-labelledby="recipes-heading" className="w-full max-w-3xl">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
            Tu recetario
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900" id="recipes-heading">
            Recetas
          </h1>
        </div>
        <Link
          className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
          to="/recipes/new"
        >
          Nueva receta
        </Link>
      </header>

      {isLoading && <p className="text-stone-600" role="status">Cargando recetas…</p>}
      {errorMessage && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      )}
      {!isLoading && !errorMessage && recipes.length === 0 && (
        <p className="rounded-lg bg-white px-5 py-6 text-stone-600 shadow-sm">
          Aún no hay recetas. Añade la primera para empezar tu recetario.
        </p>
      )}

      {!isLoading && !errorMessage && recipes.length > 0 && (
        <div className="space-y-5">
          <div className="grid gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-2">
            <div>
              <label
                className="mb-2 block text-sm font-medium text-stone-700"
                htmlFor="recipe-search"
              >
                Buscar por nombre
              </label>
              <input
                autoComplete="off"
                className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                id="recipe-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ej. tortilla"
                type="search"
                value={search}
              />
            </div>
            <div>
              <label
                className="mb-2 block text-sm font-medium text-stone-700"
                htmlFor="recipe-food-type-filter"
              >
                Tipo de comida
              </label>
              <select
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                id="recipe-food-type-filter"
                onChange={(event) =>
                  setFoodTypeFilter(event.target.value as FoodType | '')
                }
                value={foodTypeFilter}
              >
                <option value="">Todos los tipos</option>
                {FOOD_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            {availableTags.length > 0 && (
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-sm font-medium text-stone-700">
                  Etiquetas (debe incluir todas)
                </legend>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {availableTags.map((tag) => (
                    <label className="inline-flex items-center gap-2 text-sm text-stone-700" key={tag}>
                      <input
                        checked={selectedTags.includes(tag)}
                        className="size-4 accent-emerald-800"
                        onChange={(event) =>
                          setSelectedTags((current) =>
                            event.target.checked
                              ? [...current, tag]
                              : current.filter((selectedTag) => selectedTag !== tag),
                          )
                        }
                        type="checkbox"
                      />
                      {tag}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>

          {filteredRecipes.length === 0 ? (
            <p className="rounded-lg bg-white px-5 py-6 text-stone-600 shadow-sm">
              No hay recetas que coincidan con estos filtros.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {filteredRecipes.map((recipe) => {
            const foodTypeLabel =
              FOOD_TYPES.find(({ value }) => value === recipe.foodType)?.label ?? recipe.foodType

            return (
              <li key={recipe.id}>
                <Link
                  className="block h-full rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-emerald-700/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  to={`/recipes/${recipe.id}/edit`}
                >
                  <h2 className="text-xl font-semibold text-stone-900">{recipe.name}</h2>
                  <p className="mt-2 text-sm text-stone-600">
                    {foodTypeLabel} · {recipe.servings} {recipe.servings === 1 ? 'ración' : 'raciones'}
                  </p>
                  {recipe.tags.length > 0 && (
                    <ul aria-label={`Etiquetas de ${recipe.name}`} className="mt-4 flex flex-wrap gap-2">
                      {recipe.tags.map((tag) => (
                        <li
                          className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
                          key={tag}
                        >
                          {tag}
                        </li>
                      ))}
                    </ul>
                  )}
                </Link>
              </li>
            )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
