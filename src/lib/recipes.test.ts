import { describe, expect, it } from 'vitest'
import { filterRecipes, mapRecipeRow } from './recipes'
import type { Recipe } from './recipes'
import type { RecipeRow } from './recipes'

const row: RecipeRow = {
  id: 'recipe-id',
  name: 'Tortilla',
  food_type: 'lunch',
  servings: 2,
  instructions: 'Cuajar.',
  created_at: '2026-10-30T12:00:00.000Z',
  recipe_ingredients: [],
  recipe_tags: [],
}

describe('mapRecipeRow', () => {
  it('maps a singular Supabase tag relation returned as an object', () => {
    const mapped = mapRecipeRow({
      ...row,
      recipe_tags: [{ tags: { name: 'rápida' } }],
    })

    expect(mapped.tags).toEqual(['rápida'])
  })

  it('maps tag relations returned as an array and tolerates missing relations', () => {
    const mapped = mapRecipeRow({
      ...row,
      recipe_tags: [
        { tags: [{ name: 'rápida' }, { name: 'cena' }] },
        { tags: null },
      ],
    })

    expect(mapped.tags).toEqual(['rápida', 'cena'])
  })
})

describe('filterRecipes', () => {
  const recipes: Recipe[] = [
    {
      id: 'dinner',
      name: 'Puré de patata',
      foodType: 'dinner',
      servings: 2,
      instructions: '',
      createdAt: '',
      ingredients: [],
      tags: ['rápida', 'sin gluten'],
    },
    {
      id: 'lunch',
      name: 'Tortilla rápida',
      foodType: 'lunch',
      servings: 2,
      instructions: '',
      createdAt: '',
      ingredients: [],
      tags: ['rápida'],
    },
  ]

  it('combines type, all selected tags, and accent/case-insensitive name search', () => {
    const filtered = filterRecipes(recipes, {
      foodType: 'dinner',
      tags: ['RAPIDA', 'sin gluten'],
      search: 'PURE DE',
    })

    expect(filtered.map(({ id }) => id)).toEqual(['dinner'])
  })

  it('requires every selected tag', () => {
    const filtered = filterRecipes(recipes, {
      tags: ['rápida', 'sin gluten'],
    })

    expect(filtered.map(({ id }) => id)).toEqual(['dinner'])
  })
})
