// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { MemoryRouter } from 'react-router-dom'
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
}))

vi.mock('./lib/supabase', () => ({
  supabase: { auth: authMocks },
}))
vi.mock('./lib/recipes', () => ({
  FOOD_TYPES: [
    { value: 'breakfast', label: 'Desayuno' },
    { value: 'lunch', label: 'Comida' },
    { value: 'dinner', label: 'Cena' },
    { value: 'snack', label: 'Merienda' },
    { value: 'dessert', label: 'Postre' },
    { value: 'other', label: 'Otro' },
  ],
  INGREDIENT_UNITS: [
    { value: 'uds', label: 'Unidades' },
    { value: 'g', label: 'Gramos' },
    { value: 'ml', label: 'Mililitros' },
    { value: 'approx', label: 'Aproximado' },
  ],
  listRecipes: recipeMocks.listRecipes,
  getRecipe: recipeMocks.getRecipe,
  createRecipe: recipeMocks.createRecipe,
  updateRecipe: recipeMocks.updateRecipe,
}))

let authStateListener: ((event: AuthChangeEvent, session: Session | null) => void) | null = null

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  authStateListener = null
  authMocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
  recipeMocks.listRecipes.mockResolvedValue([])
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
    expect(screen.getByText('rápida')).toBeInTheDocument()
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
})
