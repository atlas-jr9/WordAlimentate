import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FOOD_TYPES, listRecipes } from './lib/recipes'
import type { Recipe } from './lib/recipes'

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

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
        <ul className="grid gap-4 sm:grid-cols-2">
          {recipes.map((recipe) => {
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
    </section>
  )
}
