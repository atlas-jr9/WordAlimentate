import { supabase } from './supabase'

export const FOOD_TYPES = [
  { value: 'breakfast', label: 'Desayuno' },
  { value: 'lunch', label: 'Comida' },
  { value: 'dinner', label: 'Cena' },
  { value: 'snack', label: 'Merienda' },
  { value: 'dessert', label: 'Postre' },
  { value: 'other', label: 'Otro' },
] as const

export const INGREDIENT_UNITS = [
  { value: 'uds', label: 'Unidades' },
  { value: 'g', label: 'Gramos' },
  { value: 'ml', label: 'Mililitros' },
  { value: 'approx', label: 'Aproximado' },
] as const

export type FoodType = (typeof FOOD_TYPES)[number]['value']
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number]['value']

export interface RecipeIngredient {
  id: string
  name: string
  quantity: number
  unit: IngredientUnit
  pantry: boolean
}

export interface Recipe {
  id: string
  name: string
  foodType: FoodType
  servings: number
  instructions: string
  createdAt: string
  ingredients: RecipeIngredient[]
  tags: string[]
}

export interface RecipeIngredientInput {
  name: string
  quantity: number
  unit: IngredientUnit
  pantry: boolean
}

export interface RecipeInput {
  name: string
  foodType: FoodType
  servings: number
  instructions: string
  ingredients: RecipeIngredientInput[]
  tags?: string[]
}

export interface RecipeRow {
  id: string
  name: string
  food_type: FoodType
  servings: number
  instructions: string
  created_at: string
  recipe_ingredients: Array<{
    id: string
    name: string
    quantity: number
    unit: IngredientUnit
    pantry: boolean
  }> | null
  recipe_tags: Array<{
    tags: { name: string } | Array<{ name: string }> | null
  }> | null
}

const RECIPE_SELECT =
  'id, name, food_type, servings, instructions, created_at, recipe_ingredients(id, name, quantity, unit, pantry), recipe_tags(tags(name))'

function throwQueryError(operation: string, error: { message: string } | null) {
  if (error) {
    throw new Error(`${operation}: ${error.message}`)
  }
}

export function mapRecipeRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    name: row.name,
    foodType: row.food_type,
    servings: row.servings,
    instructions: row.instructions,
    createdAt: row.created_at,
    ingredients: (row.recipe_ingredients ?? []).map((ingredient) => ({
      ...ingredient,
      quantity: Number(ingredient.quantity),
    })),
    tags: (row.recipe_tags ?? []).flatMap(({ tags }) => {
      if (!tags) return []
      return Array.isArray(tags) ? tags.map(({ name }) => name) : [tags.name]
    }),
  }
}

function normalizeInput(input: RecipeInput): RecipeInput {
  const name = input.name.trim()
  const instructions = input.instructions.trim()

  if (!name) throw new Error('El nombre de la receta es obligatorio.')
  if (!FOOD_TYPES.some(({ value }) => value === input.foodType)) {
    throw new Error('El tipo de comida no es válido.')
  }
  if (!Number.isInteger(input.servings) || input.servings < 1) {
    throw new Error('El número de raciones debe ser un entero positivo.')
  }
  if (!instructions) throw new Error('Las instrucciones son obligatorias.')
  if (input.ingredients.length === 0) {
    throw new Error('Añade al menos un ingrediente.')
  }

  const ingredients = input.ingredients.map((ingredient) => {
    const ingredientName = ingredient.name.trim()
    if (!ingredientName) throw new Error('El nombre de cada ingrediente es obligatorio.')
    if (!Number.isFinite(ingredient.quantity) || ingredient.quantity <= 0) {
      throw new Error(`La cantidad de "${ingredientName}" debe ser mayor que cero.`)
    }
    if (!INGREDIENT_UNITS.some(({ value }) => value === ingredient.unit)) {
      throw new Error(`La unidad de "${ingredientName}" no es válida.`)
    }
    return { ...ingredient, name: ingredientName }
  })

  return {
    ...input,
    name,
    instructions,
    ingredients,
    tags: [...new Set((input.tags ?? []).map((tag) => tag.trim()).filter(Boolean))],
  }
}

async function replaceIngredients(recipeId: string, ingredients: RecipeIngredientInput[]) {
  const { data: currentIngredients, error: readError } = await supabase
    .from('recipe_ingredients')
    .select('id, name, unit')
    .eq('recipe_id', recipeId)
  throwQueryError('No se pudieron leer los ingredientes actuales', readError)
  if (!currentIngredients) throw new Error('La consulta de ingredientes no devolvió datos.')

  const { error: upsertError } = await supabase.from('recipe_ingredients').upsert(
    ingredients.map((ingredient) => ({
      recipe_id: recipeId,
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      pantry: ingredient.pantry,
    })),
    { onConflict: 'recipe_id,name,unit' },
  )
  throwQueryError('No se pudieron guardar los ingredientes', upsertError)

  const retainedKeys = new Set(ingredients.map(({ name, unit }) => `${name}\0${unit}`))
  const obsoleteIds = currentIngredients
    .filter((ingredient) => !retainedKeys.has(`${ingredient.name}\0${ingredient.unit}`))
    .map((ingredient) => ingredient.id)

  if (obsoleteIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('recipe_ingredients')
      .delete()
      .in('id', obsoleteIds)
    throwQueryError('No se pudieron quitar los ingredientes eliminados', deleteError)
  }
}

async function replaceTags(recipeId: string, tagNames: string[]) {
  const { data: currentLinks, error: readError } = await supabase
    .from('recipe_tags')
    .select('tag_id')
    .eq('recipe_id', recipeId)
  throwQueryError('No se pudieron leer las etiquetas actuales', readError)
  if (!currentLinks) throw new Error('La consulta de etiquetas asociadas no devolvió datos.')

  let nextTagIds: string[] = []
  if (tagNames.length > 0) {
    const { data: tags, error: tagError } = await supabase
      .from('tags')
      .upsert(tagNames.map((name) => ({ name })), { onConflict: 'name' })
      .select('id')
    throwQueryError('No se pudieron guardar las etiquetas', tagError)
    if (!tags) throw new Error('La consulta de etiquetas no devolvió datos.')
    nextTagIds = tags.map((tag) => tag.id)

    const { error: linkError } = await supabase
      .from('recipe_tags')
      .upsert(
        nextTagIds.map((tagId) => ({ recipe_id: recipeId, tag_id: tagId })),
        { onConflict: 'recipe_id,tag_id' },
      )
    throwQueryError('No se pudieron asociar las etiquetas a la receta', linkError)
  }

  const retainedIds = new Set(nextTagIds)
  const obsoleteIds = currentLinks
    .map((link) => link.tag_id)
    .filter((tagId) => !retainedIds.has(tagId))

  if (obsoleteIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('recipe_tags')
      .delete()
      .eq('recipe_id', recipeId)
      .in('tag_id', obsoleteIds)
    throwQueryError('No se pudieron quitar las etiquetas eliminadas', deleteError)
  }
}

export async function listRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_SELECT)
    .order('created_at', { ascending: false })
  throwQueryError('No se pudieron cargar las recetas', error)
  if (!data) throw new Error('La consulta de recetas no devolvió datos.')
  return data.map((row) => mapRecipeRow(row))
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_SELECT)
    .eq('id', id)
    .maybeSingle()
  throwQueryError('No se pudo cargar la receta', error)
  return data ? mapRecipeRow(data) : null
}

export async function createRecipe(input: RecipeInput): Promise<Recipe> {
  const recipe = normalizeInput(input)
  const { data, error } = await supabase
    .from('recipes')
    .insert({
      name: recipe.name,
      food_type: recipe.foodType,
      servings: recipe.servings,
      instructions: recipe.instructions,
    })
    .select('id')
    .single()
  throwQueryError('No se pudo crear la receta', error)
  if (!data) throw new Error('La creación de receta no devolvió ningún identificador.')

  try {
    await replaceIngredients(data.id, recipe.ingredients)
    await replaceTags(data.id, recipe.tags ?? [])
    const savedRecipe = await getRecipe(data.id)
    if (!savedRecipe) throw new Error('La receta se guardó, pero no se pudo volver a leer.')
    return savedRecipe
  } catch (saveError) {
    const { error: rollbackError } = await supabase.from('recipes').delete().eq('id', data.id)
    if (rollbackError) {
      const saveMessage = saveError instanceof Error ? saveError.message : String(saveError)
      throw new Error(
        `${saveMessage}. Además, no se pudo eliminar la receta incompleta: ${rollbackError.message}`,
      )
    }
    throw saveError
  }
}

export async function updateRecipe(id: string, input: RecipeInput): Promise<Recipe> {
  const recipe = normalizeInput(input)
  const { data, error } = await supabase
    .from('recipes')
    .update({
      name: recipe.name,
      food_type: recipe.foodType,
      servings: recipe.servings,
      instructions: recipe.instructions,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle()
  throwQueryError('No se pudo actualizar la receta', error)
  if (!data) throw new Error('No se encontró la receta que se quería actualizar.')

  await replaceIngredients(id, recipe.ingredients)
  await replaceTags(id, recipe.tags ?? [])

  const savedRecipe = await getRecipe(id)
  if (!savedRecipe) throw new Error('La receta se actualizó, pero no se pudo volver a leer.')
  return savedRecipe
}

export async function deleteRecipe(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()
  throwQueryError('No se pudo eliminar la receta', error)
  if (!data) throw new Error('No se encontró la receta que se quería eliminar.')
}
