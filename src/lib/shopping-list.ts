import type { IngredientUnit, RecipeIngredient } from './recipes'

export interface ShoppingListRecipe {
  ingredients: Pick<RecipeIngredient, 'name' | 'quantity' | 'unit' | 'pantry'>[]
}

export interface ShoppingListPlanSlot {
  recipe: ShoppingListRecipe | null
}

export interface ShoppingListIngredient {
  name: string
  quantity: number
  unit: IngredientUnit
}

export function generateShoppingList(
  slots: readonly ShoppingListPlanSlot[],
): ShoppingListIngredient[] {
  const ingredientsByName = new Map<string, Map<IngredientUnit, ShoppingListIngredient>>()

  for (const { recipe } of slots) {
    if (!recipe) continue

    for (const ingredient of recipe.ingredients) {
      if (ingredient.pantry) continue

      const normalizedName = ingredient.name.toLowerCase()
      let ingredientsByUnit = ingredientsByName.get(normalizedName)
      if (!ingredientsByUnit) {
        ingredientsByUnit = new Map()
        ingredientsByName.set(normalizedName, ingredientsByUnit)
      }

      const existing = ingredientsByUnit.get(ingredient.unit)
      if (existing) {
        existing.quantity += ingredient.quantity
      } else {
        ingredientsByUnit.set(ingredient.unit, {
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
        })
      }
    }
  }

  return [...ingredientsByName.values()].flatMap((ingredientsByUnit) =>
    [...ingredientsByUnit.values()],
  )
}
