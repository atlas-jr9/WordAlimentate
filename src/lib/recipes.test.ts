import { describe, expect, it } from 'vitest'
import { mapRecipeRow } from './recipes'
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
