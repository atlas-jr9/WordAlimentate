// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { MemoryRouter } from 'react-router-dom'
import { getWeekStart } from './lib/planner'
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

  it('shows seven days with lunch and dinner and loads a separate plan for the next week', async () => {
    const user = userEvent.setup()
    const firstWeek = getWeekStart()
    const nextWeekDate = new Date(`${firstWeek}T00:00:00.000Z`)
    nextWeekDate.setUTCDate(nextWeekDate.getUTCDate() + 7)
    const nextWeek = nextWeekDate.toISOString().slice(0, 10)

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

    expect(await screen.findByText('Menú primera semana')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(7)
    expect(screen.getAllByText('Comida')).toHaveLength(7)
    expect(screen.getAllByText('Cena')).toHaveLength(7)

    await user.click(screen.getByRole('button', { name: 'Semana siguiente' }))
    expect(await screen.findByText('Menú siguiente semana')).toBeInTheDocument()
    expect(screen.queryByText('Menú primera semana')).not.toBeInTheDocument()
    expect(plannerMocks.listPlanSlots).toHaveBeenNthCalledWith(1, firstWeek)
    expect(plannerMocks.listPlanSlots).toHaveBeenNthCalledWith(2, nextWeek)

    await user.click(screen.getByRole('button', { name: 'Hoy' }))
    expect(await screen.findByText('Menú primera semana')).toBeInTheDocument()
  })
})
