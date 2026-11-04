import { describe, expect, it } from 'vitest'
import { generateShoppingList } from './shopping-list'
import type { ShoppingListPlanSlot } from './shopping-list'
import type { RecipeIngredient } from './recipes'

function slot(
  ingredients: Pick<RecipeIngredient, 'name' | 'quantity' | 'unit' | 'pantry'>[],
): ShoppingListPlanSlot {
  return { recipe: { ingredients } }
}

describe('shopping list generation', () => {
  it.each([
    {
      name: 'sums the same ingredient and unit',
      slots: [
        slot([{ name: 'Zanahorias', quantity: 2, unit: 'uds', pantry: false }]),
        slot([{ name: 'zanahorias', quantity: 3, unit: 'uds', pantry: false }]),
      ],
      expected: [{ name: 'Zanahorias', quantity: 5, unit: 'uds' }],
    },
    {
      name: 'keeps different units for the same ingredient separate',
      slots: [
        slot([{ name: 'Arroz', quantity: 500, unit: 'g', pantry: false }]),
        slot([{ name: 'arroz', quantity: 1, unit: 'approx', pantry: false }]),
      ],
      expected: [
        { name: 'Arroz', quantity: 500, unit: 'g' },
        { name: 'arroz', quantity: 1, unit: 'approx' },
      ],
    },
    {
      name: 'adds the registered recipe quantities for each planned occurrence',
      slots: [
        slot([{ name: 'Carne', quantity: 400, unit: 'g', pantry: false }]),
        slot([{ name: 'carne', quantity: 400, unit: 'g', pantry: false }]),
      ],
      expected: [{ name: 'Carne', quantity: 800, unit: 'g' }],
    },
    {
      name: 'excludes pantry ingredients',
      slots: [
        slot([
          { name: 'Sal', quantity: 1, unit: 'approx', pantry: true },
          { name: 'Patatas', quantity: 3, unit: 'uds', pantry: false },
        ]),
      ],
      expected: [{ name: 'Patatas', quantity: 3, unit: 'uds' }],
    },
  ])('$name', ({ slots, expected }) => {
    expect(generateShoppingList(slots)).toEqual(expected)
  })

  it('ignores empty plan slots and does not mutate recipe ingredients', () => {
    const ingredients = [{ name: 'Tomate', quantity: 2, unit: 'uds' as const, pantry: false }]
    const slots: ShoppingListPlanSlot[] = [
      { recipe: null },
      { recipe: { ingredients } },
    ]

    expect(generateShoppingList(slots)).toEqual([
      { name: 'Tomate', quantity: 2, unit: 'uds' },
    ])
    expect(ingredients[0].quantity).toBe(2)
  })
})
