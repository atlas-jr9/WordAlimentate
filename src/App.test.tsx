// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { MemoryRouter } from 'react-router-dom'
import { getWeekStart } from './lib/planner'
import type { PlanSlot, PlanSlotInput } from './lib/planner'
import type { Recipe, RecipeInput } from './lib/recipes'
import type { ShoppingListItem, ShoppingListItemInput } from './lib/shopping-list-data'
import App from './App'

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}))
const recipeMocks = vi.hoisted(() => ({
  listRecipes: vi.fn(),
  getRecipe: vi.fn(),
  createRecipe: vi.fn(),
  updateRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
}))
const plannerMocks = vi.hoisted(() => ({
  listPlanSlots: vi.fn(),
  upsertPlanSlot: vi.fn(),
  clearPlanSlot: vi.fn(),
}))
const shoppingListMocks = vi.hoisted(() => ({
  listShoppingListItems: vi.fn(),
  upsertShoppingListItem: vi.fn(),
  deleteManualShoppingListItem: vi.fn(),
}))

vi.mock('./lib/supabase', () => ({
  supabase: { auth: authMocks },
}))
vi.mock('./lib/recipes', async (importOriginal) => ({
  ...await importOriginal<typeof import('./lib/recipes')>(),
  listRecipes: recipeMocks.listRecipes,
  getRecipe: recipeMocks.getRecipe,
  createRecipe: recipeMocks.createRecipe,
  updateRecipe: recipeMocks.updateRecipe,
  deleteRecipe: recipeMocks.deleteRecipe,
}))
vi.mock('./lib/planner', async (importOriginal) => ({
  ...await importOriginal<typeof import('./lib/planner')>(),
  listPlanSlots: plannerMocks.listPlanSlots,
  upsertPlanSlot: plannerMocks.upsertPlanSlot,
  clearPlanSlot: plannerMocks.clearPlanSlot,
}))
vi.mock('./lib/shopping-list-data', async (importOriginal) => ({
  ...await importOriginal<typeof import('./lib/shopping-list-data')>(),
  listShoppingListItems: shoppingListMocks.listShoppingListItems,
  upsertShoppingListItem: shoppingListMocks.upsertShoppingListItem,
  deleteManualShoppingListItem: shoppingListMocks.deleteManualShoppingListItem,
}))

let authStateListener: ((event: AuthChangeEvent, session: Session | null) => void) | null = null

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.clearAllMocks()
  authStateListener = null
  authMocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
  recipeMocks.listRecipes.mockResolvedValue([])
  plannerMocks.listPlanSlots.mockResolvedValue([])
  plannerMocks.upsertPlanSlot.mockResolvedValue(undefined)
  plannerMocks.clearPlanSlot.mockResolvedValue(undefined)
  shoppingListMocks.listShoppingListItems.mockResolvedValue([])
  shoppingListMocks.upsertShoppingListItem.mockResolvedValue(undefined)
  shoppingListMocks.deleteManualShoppingListItem.mockResolvedValue(undefined)
  authMocks.onAuthStateChange.mockImplementation((listener) => {
    authStateListener = listener
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })
})

describe('login', () => {
  it('renders the login form', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'WordAlimentate' })).toBeInTheDocument()
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('shows an error when credentials are invalid', async () => {
    const user = userEvent.setup()
    authMocks.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    )

    await user.type(await screen.findByLabelText('Correo electrónico'), 'usuario@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El correo o la contraseña no son correctos.',
    )
  })

  it('returns to login and hides protected content after signing out', async () => {
    const user = userEvent.setup()
    authMocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-id' } } },
      error: null,
    })
    authMocks.signOut.mockImplementation(() => {
      authStateListener?.('SIGNED_OUT', null)
      return Promise.resolve({ error: null })
    })

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Recetas' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(await screen.findByLabelText('Correo electrónico')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Recetas' })).not.toBeInTheDocument()
  })
})

describe('navigation and empty states', () => {
  beforeEach(() => {
    authMocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-id' } } },
      error: null,
    })
  })

  it('guides the user from each empty view and marks the active navigation link', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByText(
      'Aún no hay recetas. Añade la primera para empezar tu recetario.',
    )).toBeInTheDocument()
    const navigation = screen.getByRole('navigation', { name: 'Navegación principal' })
    expect(within(navigation).getByRole('link', { name: 'Recetas' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await user.click(screen.getByRole('link', { name: 'Crear primera receta' }))
    expect(await screen.findByRole('heading', { name: 'Nueva receta' })).toBeInTheDocument()

    await user.click(within(navigation).getByRole('link', { name: 'Plan semanal' }))
    expect(await screen.findByText('Todavía no tienes recetas para planificar.'))
      .toBeInTheDocument()
    expect(within(navigation).getByRole('link', { name: 'Plan semanal' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Crear una receta' })).toHaveAttribute(
      'href',
      '/recipes/new',
    )

    await user.click(within(navigation).getByRole('link', { name: 'Compra' }))
    expect(await screen.findByText('Aún no hay artículos en esta lista.')).toBeInTheDocument()
    expect(within(navigation).getByRole('link', { name: 'Compra' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Ir al plan semanal' })).toHaveAttribute(
      'href',
      '/plan',
    )
  })
})

describe('recipe catalog', () => {
  const recipe = {
    id: 'recipe-id',
    name: 'Tortilla de patata',
    foodType: 'lunch',
    servings: 2,
    instructions: 'Cuajar en la sartén.',
    createdAt: '2026-10-30T12:00:00.000Z',
    ingredients: [{ id: 'ingredient-id', name: 'Patata', quantity: 2, unit: 'uds', pantry: false }],
    tags: ['rápida'],
  }

  beforeEach(() => {
    authMocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-id' } } },
      error: null,
    })
  })

  it('shows a recipe returned by the catalog data layer', async () => {
    recipeMocks.listRecipes.mockResolvedValue([recipe])

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Tortilla de patata' })).toBeInTheDocument()
    expect(screen.getByText('Comida · 2 raciones')).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: 'Etiquetas de Tortilla de patata' })).getByText(
        'rápida',
      ),
    ).toBeInTheDocument()
  })

  it('creates a recipe with its ingredient and returns to the catalog', async () => {
    const user = userEvent.setup()
    recipeMocks.createRecipe.mockResolvedValue(recipe)
    recipeMocks.listRecipes.mockResolvedValue([recipe])

    render(
      <MemoryRouter initialEntries={['/recipes/new']}>
        <App />
      </MemoryRouter>,
    )

    await user.type(await screen.findByLabelText('Nombre de la receta'), recipe.name)
    await user.type(screen.getByLabelText('Cantidad'), '2')
    await user.type(screen.getByLabelText('Nombre'), 'Patata')
    await user.type(screen.getByLabelText('Instrucciones'), recipe.instructions)
    await user.click(screen.getByRole('button', { name: 'Guardar receta' }))

    expect(recipeMocks.createRecipe).toHaveBeenCalledWith({
      name: recipe.name,
      foodType: 'lunch',
      servings: 2,
      instructions: recipe.instructions,
      tags: [],
      ingredients: [{ name: 'Patata', quantity: 2, unit: 'uds', pantry: false }],
    })
    expect(await screen.findByRole('heading', { name: recipe.name })).toBeInTheDocument()
  })

  it('requires at least one ingredient before saving', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/recipes/new']}>
        <App />
      </MemoryRouter>,
    )

    await user.type(await screen.findByLabelText('Nombre de la receta'), 'Sopa')
    await user.type(screen.getByLabelText('Instrucciones'), 'Hervir.')
    await user.click(screen.getByRole('button', { name: 'Quitar ingrediente 1' }))
    await user.click(screen.getByRole('button', { name: 'Guardar receta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Añade al menos un ingrediente.')
    expect(recipeMocks.createRecipe).not.toHaveBeenCalled()
  })

  it('combines type, selected tags, and accent-insensitive name search', async () => {
    const user = userEvent.setup()
    recipeMocks.listRecipes.mockResolvedValue([
      {
        ...recipe,
        id: 'dinner',
        name: 'Puré de patata',
        foodType: 'dinner',
        tags: ['rápida', 'sin gluten'],
      },
      {
        ...recipe,
        id: 'lunch',
        name: 'Tortilla rápida',
        foodType: 'lunch',
        tags: ['rápida'],
      },
    ])

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Puré de patata' })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Tipo de comida'), 'dinner')
    await user.click(screen.getByLabelText('rápida'))
    await user.click(screen.getByLabelText('sin gluten'))
    await user.type(screen.getByLabelText('Buscar por nombre'), 'PURE DE')

    expect(screen.getByRole('heading', { name: 'Puré de patata' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Tortilla rápida' })).not.toBeInTheDocument()
  })

  it('asks for confirmation before deleting a recipe', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm')
    recipeMocks.listRecipes.mockResolvedValue([recipe])
    recipeMocks.deleteRecipe.mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: recipe.name })).toBeInTheDocument()
    confirm.mockReturnValue(false)
    await user.click(screen.getByRole('button', { name: `Eliminar ${recipe.name}` }))
    expect(recipeMocks.deleteRecipe).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: recipe.name })).toBeInTheDocument()

    confirm.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: `Eliminar ${recipe.name}` }))
    expect(recipeMocks.deleteRecipe).toHaveBeenCalledWith(recipe.id)
    expect(await screen.findByText('Aún no hay recetas. Añade la primera para empezar tu recetario.'))
      .toBeInTheDocument()
  })

  it('keeps the recipe visible and reports errors when deletion fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    recipeMocks.listRecipes.mockResolvedValue([recipe])
    recipeMocks.deleteRecipe.mockRejectedValue(new Error('No se pudo eliminar la receta.'))

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: `Eliminar ${recipe.name}` }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo eliminar la receta.')
    expect(screen.getByRole('heading', { name: recipe.name })).toBeInTheDocument()
  })
})

describe('weekly planner', () => {
  beforeEach(() => {
    authMocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-id' } } },
      error: null,
    })
  })

  describe('shopping list', () => {
    beforeEach(() => {
      authMocks.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-id' } } },
        error: null,
      })
    })

    it('adds manual items, persists checking and unchecking, and removes manual items', async () => {
      const user = userEvent.setup()
      const weekStart = getWeekStart()
      const arrozRecipe: Recipe = {
        id: 'recipe-arroz',
        name: 'Arroz de prueba',
        foodType: 'lunch',
        servings: 2,
        instructions: '',
        createdAt: '',
        ingredients: [{
          id: 'ingredient-arroz',
          name: 'Arroz',
          quantity: 500,
          unit: 'g',
          pantry: false,
        }],
        tags: [],
      }
      let items: ShoppingListItem[] = [{
        id: 'generated-1',
        weekStart,
        name: 'Arroz',
        quantity: 500,
        unit: 'g' as const,
        manual: false,
        checked: false,
      }]
      recipeMocks.listRecipes.mockResolvedValue([arrozRecipe])
      plannerMocks.listPlanSlots.mockResolvedValue([{
        id: 'slot-arroz',
        weekStart,
        dayOfWeek: 0,
        slot: 'lunch',
        recipeId: arrozRecipe.id,
        recipe: {
          id: arrozRecipe.id,
          name: arrozRecipe.name,
          foodType: arrozRecipe.foodType,
          servings: arrozRecipe.servings,
        },
      }])
      shoppingListMocks.listShoppingListItems.mockImplementation(async () => items)
      shoppingListMocks.upsertShoppingListItem.mockImplementation(async (input: ShoppingListItemInput) => {
        const current = items.find((item) => item.name === input.name && item.unit === input.unit)
        const saved = { ...input, id: current?.id ?? 'manual-1' }
        items = current
          ? items.map((item) => item.id === current.id ? saved : item)
          : [...items, saved]
        return saved
      })
      shoppingListMocks.deleteManualShoppingListItem.mockImplementation(async (
        _requestedWeek: string,
        itemId: string,
      ) => {
        items = items.filter((item) => item.id !== itemId)
      })

      render(
        <MemoryRouter initialEntries={['/shopping-list']}>
          <App />
        </MemoryRouter>,
      )

      expect(await screen.findByText('500 gramos')).toBeInTheDocument()
      await user.click(screen.getByRole('checkbox', { name: 'Marcar Arroz como comprado' }))
      await waitFor(() => expect(items[0].checked).toBe(true))
      expect(shoppingListMocks.upsertShoppingListItem).toHaveBeenCalledWith({
        weekStart,
        name: 'Arroz',
        quantity: 500,
        unit: 'g',
        manual: false,
        checked: true,
      })

      await user.click(screen.getByRole('checkbox', { name: 'Marcar Arroz como comprado' }))
      await waitFor(() => expect(items[0].checked).toBe(false))

      await user.type(screen.getByLabelText('Artículo'), 'Papel de cocina')
      await user.click(screen.getByRole('button', { name: 'Añadir' }))
      expect(await screen.findByText('Manual')).toBeInTheDocument()
      expect(screen.getByText('Papel de cocina')).toBeInTheDocument()
      expect(shoppingListMocks.upsertShoppingListItem).toHaveBeenLastCalledWith({
        weekStart,
        name: 'Papel de cocina',
        quantity: null,
        unit: null,
        manual: true,
        checked: false,
      })

      await user.click(screen.getByRole('button', { name: 'Eliminar Papel de cocina' }))
      await waitFor(() => expect(items).toHaveLength(1))
      expect(screen.queryByText('Papel de cocina')).not.toBeInTheDocument()
      expect(shoppingListMocks.deleteManualShoppingListItem).toHaveBeenCalledWith(
        weekStart,
        'manual-1',
      )
    })

    it('rebuilds the list from the current plan when revisiting the shopping list', async () => {
      const user = userEvent.setup()
      const weekStart = getWeekStart()
      const testRecipe: Recipe = {
        id: 'recipe-for-shopping-list',
        name: 'Sopa de prueba',
        foodType: 'dinner',
        servings: 2,
        instructions: '',
        createdAt: '',
        ingredients: [{
          id: 'ingredient-tomatoes',
          name: 'Tomates',
          quantity: 3,
          unit: 'uds',
          pantry: false,
        }],
        tags: [],
      }
      let savedSlots: PlanSlot[] = []
      recipeMocks.listRecipes.mockResolvedValue([testRecipe])
      plannerMocks.listPlanSlots.mockImplementation(async (requestedWeek: string) =>
        savedSlots.filter((slot) => slot.weekStart === requestedWeek),
      )
      plannerMocks.upsertPlanSlot.mockImplementation(async (input: PlanSlotInput) => {
        const savedSlot: PlanSlot = {
          id: 'slot-for-shopping-list',
          ...input,
          recipe: {
            id: testRecipe.id,
            name: testRecipe.name,
            foodType: testRecipe.foodType,
            servings: testRecipe.servings,
          },
        }
        savedSlots = [...savedSlots.filter(
          (slot) =>
            slot.weekStart !== input.weekStart ||
            slot.dayOfWeek !== input.dayOfWeek ||
            slot.slot !== input.slot,
        ), savedSlot]
        return savedSlot
      })
      plannerMocks.clearPlanSlot.mockImplementation(async (input: {
        weekStart: string
        dayOfWeek: number
        slot: 'lunch' | 'dinner'
      }) => {
        savedSlots = savedSlots.filter(
          (slot) =>
            slot.weekStart !== input.weekStart ||
            slot.dayOfWeek !== input.dayOfWeek ||
            slot.slot !== input.slot,
        )
      })

      render(
        <MemoryRouter initialEntries={['/shopping-list']}>
          <App />
        </MemoryRouter>,
      )

      expect(await screen.findByText('Aún no hay artículos en esta lista.')).toBeInTheDocument()
      expect(plannerMocks.listPlanSlots).toHaveBeenCalledWith(weekStart)
      await user.click(screen.getByRole('link', { name: 'Plan semanal' }))
      await user.selectOptions(
        await screen.findByLabelText('Receta para Comida del Lunes'),
        testRecipe.id,
      )

      await user.click(screen.getByRole('link', { name: 'Compra' }))
      expect(await screen.findByText('Tomates')).toBeInTheDocument()
      expect(screen.getByText('3 unidades')).toBeInTheDocument()

      await user.click(screen.getByRole('link', { name: 'Plan semanal' }))
      await user.click(await screen.findByRole('button', { name: 'Vaciar comida del Lunes' }))
      await user.click(screen.getByRole('link', { name: 'Compra' }))

      expect(await screen.findByText('Aún no hay artículos en esta lista.')).toBeInTheDocument()
    })

    it('creates a recipe, plans it twice, and builds an aggregated list from fixtures', async () => {
      const user = userEvent.setup()
      const weekStart = getWeekStart()
      let recipes: Recipe[] = []
      let savedSlots: PlanSlot[] = []

      recipeMocks.createRecipe.mockImplementation(async (input: RecipeInput) => {
        const recipe: Recipe = {
          id: 'recipe-integration',
          ...input,
          createdAt: '2026-11-05T12:00:00.000Z',
          ingredients: input.ingredients.map((ingredient, index) => ({
            ...ingredient,
            id: `ingredient-${index}`,
          })),
          tags: input.tags ?? [],
        }
        recipes = [recipe]
        return recipe
      })
      recipeMocks.listRecipes.mockImplementation(async () => recipes)
      plannerMocks.listPlanSlots.mockImplementation(async (requestedWeek: string) =>
        savedSlots.filter((slot) => slot.weekStart === requestedWeek),
      )
      plannerMocks.upsertPlanSlot.mockImplementation(async (input: PlanSlotInput) => {
        const recipe = recipes.find(({ id }) => id === input.recipeId)
        if (!recipe) throw new Error('No se encontró la receta de prueba.')

        const savedSlot: PlanSlot = {
          id: `${input.dayOfWeek}-${input.slot}`,
          ...input,
          recipe: {
            id: recipe.id,
            name: recipe.name,
            foodType: recipe.foodType,
            servings: recipe.servings,
          },
        }
        savedSlots = [
          ...savedSlots.filter(
            (slot) =>
              slot.weekStart !== input.weekStart ||
              slot.dayOfWeek !== input.dayOfWeek ||
              slot.slot !== input.slot,
          ),
          savedSlot,
        ]
        return savedSlot
      })

      render(
        <MemoryRouter initialEntries={['/recipes/new']}>
          <App />
        </MemoryRouter>,
      )

      await user.type(await screen.findByLabelText('Nombre de la receta'), 'Sopa de zanahoria')
      await user.type(screen.getByLabelText('Cantidad'), '2')
      await user.type(screen.getByLabelText('Nombre'), 'Zanahoria')
      await user.click(screen.getByRole('button', { name: 'Añadir ingrediente' }))
      await user.type(screen.getAllByLabelText('Nombre')[1], 'Sal')
      await user.type(screen.getAllByLabelText('Cantidad')[1], '1')
      await user.selectOptions(screen.getAllByLabelText('Unidad')[1], 'approx')
      await user.click(screen.getAllByLabelText('Es un ingrediente de despensa')[1])
      await user.type(screen.getByLabelText('Instrucciones'), 'Hervir y triturar.')
      await user.click(screen.getByRole('button', { name: 'Guardar receta' }))

      const recipe = await screen.findByRole('heading', { name: 'Sopa de zanahoria' })
      expect(recipe).toBeInTheDocument()
      expect(recipeMocks.createRecipe).toHaveBeenCalledWith({
        name: 'Sopa de zanahoria',
        foodType: 'lunch',
        servings: 2,
        instructions: 'Hervir y triturar.',
        tags: [],
        ingredients: [
          { name: 'Zanahoria', quantity: 2, unit: 'uds', pantry: false },
          { name: 'Sal', quantity: 1, unit: 'approx', pantry: true },
        ],
      })

      await user.click(screen.getByRole('link', { name: 'Plan semanal' }))
      const lunchSlot = await screen.findByLabelText('Receta para Comida del Lunes')
      await user.selectOptions(lunchSlot, 'recipe-integration')
      await waitFor(() => expect(lunchSlot).toHaveValue('recipe-integration'))

      const dinnerSlot = screen.getByLabelText('Receta para Cena del Jueves')
      await user.selectOptions(dinnerSlot, 'recipe-integration')
      await waitFor(() => expect(dinnerSlot).toHaveValue('recipe-integration'))
      expect(savedSlots).toHaveLength(2)
      expect(savedSlots.every((slot) => slot.weekStart === weekStart)).toBe(true)

      await user.click(screen.getByRole('link', { name: 'Compra' }))
      expect(await screen.findByText('Zanahoria')).toBeInTheDocument()
      expect(screen.getByText('4 unidades')).toBeInTheDocument()
      expect(screen.queryByText('Sal')).not.toBeInTheDocument()
    })
  })

  it('shows seven days with lunch and dinner and loads a separate plan for the next week', async () => {
    const user = userEvent.setup()
    const firstWeek = getWeekStart()
    const nextWeekDate = new Date(`${firstWeek}T00:00:00.000Z`)
    nextWeekDate.setUTCDate(nextWeekDate.getUTCDate() + 7)
    const nextWeek = nextWeekDate.toISOString().slice(0, 10)
    recipeMocks.listRecipes.mockResolvedValue([
      {
        id: 'recipe-first',
        name: 'Menú primera semana',
        foodType: 'lunch',
        servings: 2,
        instructions: '',
        createdAt: '',
        ingredients: [],
        tags: [],
      },
      {
        id: 'recipe-next',
        name: 'Menú siguiente semana',
        foodType: 'dinner',
        servings: 4,
        instructions: '',
        createdAt: '',
        ingredients: [],
        tags: [],
      },
    ])

    plannerMocks.listPlanSlots.mockImplementation(async (weekStart: string) => {
      if (weekStart === firstWeek) {
        return [{
          id: 'first-week-slot',
          weekStart,
          dayOfWeek: 0,
          slot: 'lunch',
          recipeId: 'recipe-first',
          recipe: { id: 'recipe-first', name: 'Menú primera semana', foodType: 'lunch', servings: 2 },
        }]
      }
      if (weekStart === nextWeek) {
        return [{
          id: 'next-week-slot',
          weekStart,
          dayOfWeek: 3,
          slot: 'dinner',
          recipeId: 'recipe-next',
          recipe: { id: 'recipe-next', name: 'Menú siguiente semana', foodType: 'dinner', servings: 4 },
        }]
      }
      return []
    })

    render(
      <MemoryRouter initialEntries={['/plan']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(screen.getByLabelText('Receta para Comida del Lunes')).toHaveValue('recipe-first'),
    )
    const plannerTable = screen.getByRole('table', { name: 'Plan semanal' })
    expect(within(plannerTable).getAllByRole('row')).toHaveLength(8)
    expect(within(plannerTable).getAllByRole('combobox')).toHaveLength(14)

    await user.click(screen.getByRole('button', { name: 'Semana siguiente' }))
    await waitFor(() =>
      expect(screen.getByLabelText('Receta para Cena del Jueves')).toHaveValue('recipe-next'),
    )
    expect(screen.getByLabelText('Receta para Comida del Lunes')).toHaveValue('')
    expect(plannerMocks.listPlanSlots).toHaveBeenNthCalledWith(1, firstWeek)
    expect(plannerMocks.listPlanSlots).toHaveBeenNthCalledWith(2, nextWeek)

    await user.click(screen.getByRole('button', { name: 'Hoy' }))
    await waitFor(() =>
      expect(screen.getByLabelText('Receta para Comida del Lunes')).toHaveValue('recipe-first'),
    )
  })

  it('assigns the same recipe to multiple slots and clears only the selected slot', async () => {
    const user = userEvent.setup()
    const weekStart = getWeekStart()
    const testRecipe = {
      id: 'recipe-shared',
      name: 'Guiso de prueba',
      foodType: 'dinner',
      servings: 2,
      instructions: '',
      createdAt: '',
      ingredients: [],
      tags: [],
    }
    const savedSlots: Array<{
      id: string
      weekStart: string
      dayOfWeek: number
      slot: 'lunch' | 'dinner'
      recipeId: string
      recipe: {
        id: string
        name: string
        foodType: string
        servings: number
      }
    }> = []
    recipeMocks.listRecipes.mockResolvedValue([testRecipe])
    plannerMocks.listPlanSlots.mockImplementation(async (requestedWeek: string) =>
      savedSlots.filter(({ weekStart: slotWeek }) => slotWeek === requestedWeek),
    )
    plannerMocks.upsertPlanSlot.mockImplementation(async (input: {
      weekStart: string
      dayOfWeek: number
      slot: 'lunch' | 'dinner'
      recipeId: string
    }) => {
      const recipe = testRecipe
      const existing = savedSlots.find(
        (saved) =>
          saved.weekStart === input.weekStart &&
          saved.dayOfWeek === input.dayOfWeek &&
          saved.slot === input.slot,
      )
      const newSlot = {
        id: existing?.id ?? `${input.dayOfWeek}-${input.slot}`,
        weekStart: input.weekStart,
        dayOfWeek: input.dayOfWeek,
        slot: input.slot,
        recipeId: input.recipeId,
        recipe: {
          id: recipe.id,
          name: recipe.name,
          foodType: recipe.foodType,
          servings: recipe.servings,
        },
      }
      if (existing) {
        savedSlots[savedSlots.indexOf(existing)] = newSlot
      } else {
        savedSlots.push(newSlot)
      }
      return newSlot
    })
    plannerMocks.clearPlanSlot.mockImplementation(async (input: {
      weekStart: string
      dayOfWeek: number
      slot: 'lunch' | 'dinner'
    }) => {
      const index = savedSlots.findIndex(
        (saved) =>
          saved.weekStart === input.weekStart &&
          saved.dayOfWeek === input.dayOfWeek &&
          saved.slot === input.slot,
      )
      if (index >= 0) savedSlots.splice(index, 1)
    })

    render(
      <MemoryRouter initialEntries={['/plan']}>
        <App />
      </MemoryRouter>,
    )

    const mondayLunch = await screen.findByLabelText('Receta para Comida del Lunes')
    await user.selectOptions(mondayLunch, testRecipe.id)
    const thursdayDinner = screen.getByLabelText('Receta para Cena del Jueves')
    await user.selectOptions(thursdayDinner, testRecipe.id)

    expect(await screen.findAllByRole('combobox', { name: /Receta para/ })).toHaveLength(14)
    expect(screen.getByLabelText('Receta para Comida del Lunes')).toHaveValue(testRecipe.id)
    expect(screen.getByLabelText('Receta para Cena del Jueves')).toHaveValue(testRecipe.id)
    expect(plannerMocks.upsertPlanSlot).toHaveBeenNthCalledWith(1, {
      weekStart,
      dayOfWeek: 0,
      slot: 'lunch',
      recipeId: testRecipe.id,
    })
    expect(plannerMocks.upsertPlanSlot).toHaveBeenNthCalledWith(2, {
      weekStart,
      dayOfWeek: 3,
      slot: 'dinner',
      recipeId: testRecipe.id,
    })

    await user.click(screen.getByRole('button', { name: 'Vaciar comida del Lunes' }))

    expect(plannerMocks.clearPlanSlot).toHaveBeenCalledWith({
      weekStart,
      dayOfWeek: 0,
      slot: 'lunch',
    })
    expect(screen.getByLabelText('Receta para Comida del Lunes')).toHaveValue('')
    expect(screen.getByLabelText('Receta para Cena del Jueves')).toHaveValue(testRecipe.id)
  })
})
