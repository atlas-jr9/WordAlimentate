import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteManualShoppingListItem,
  listShoppingListItems,
  upsertShoppingListItem,
} from './shopping-list-data'

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: { from: supabaseMocks.from },
}))

interface QueryResponse<T> {
  data: T
  error: { message: string } | null
}

class FakeQuery<T> {
  calls: Array<[string, ...unknown[]]> = []
  private readonly response: QueryResponse<T>

  constructor(response: QueryResponse<T>) {
    this.response = response
  }

  select(...args: unknown[]) {
    this.calls.push(['select', ...args])
    return this
  }

  eq(...args: unknown[]) {
    this.calls.push(['eq', ...args])
    return this
  }

  order(...args: unknown[]) {
    this.calls.push(['order', ...args])
    return this
  }

  upsert(...args: unknown[]) {
    this.calls.push(['upsert', ...args])
    return this
  }

  delete() {
    this.calls.push(['delete'])
    return this
  }

  single() {
    return Promise.resolve(this.response)
  }

  then<TResult1 = QueryResponse<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResponse<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.response).then(onfulfilled ?? undefined, onrejected ?? undefined)
  }
}

const persistedItem = {
  id: 'item-1',
  week_start: '2026-11-02',
  name: 'Papel de cocina',
  quantity: null,
  unit: null,
  manual: true,
  checked: true,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('shopping list data access', () => {
  it('saves an optional-quantity manual item by week, name, and unit', async () => {
    const query = new FakeQuery({ data: persistedItem, error: null })
    supabaseMocks.from.mockReturnValue(query)

    await upsertShoppingListItem({
      weekStart: '2026-11-02',
      name: ' Papel de cocina ',
      quantity: null,
      unit: null,
      manual: true,
      checked: true,
    })

    expect(query.calls).toContainEqual([
      'upsert',
      {
        week_start: '2026-11-02',
        name: 'Papel de cocina',
        quantity: null,
        unit: null,
        manual: true,
        checked: true,
      },
      { onConflict: 'week_start,name,unit' },
    ])
  })

  it('reloads checked state and manual items for the requested week', async () => {
    const query = new FakeQuery({ data: [persistedItem], error: null })
    supabaseMocks.from.mockReturnValue(query)

    const items = await listShoppingListItems('2026-11-02')

    expect(items).toEqual([{
      id: 'item-1',
      weekStart: '2026-11-02',
      name: 'Papel de cocina',
      quantity: null,
      unit: null,
      manual: true,
      checked: true,
    }])
    expect(query.calls).toContainEqual(['eq', 'week_start', '2026-11-02'])
  })

  it('deletes only the manual item in the requested week', async () => {
    const query = new FakeQuery({ data: null, error: null })
    supabaseMocks.from.mockReturnValue(query)

    await deleteManualShoppingListItem('2026-11-02', 'item-1')

    expect(query.calls).toContainEqual(['eq', 'id', 'item-1'])
    expect(query.calls).toContainEqual(['eq', 'week_start', '2026-11-02'])
    expect(query.calls).toContainEqual(['eq', 'manual', true])
  })

  it('rejects invalid input before making database requests', async () => {
    await expect(listShoppingListItems('2026-11-03')).rejects.toThrow(
      'La semana debe comenzar en lunes.',
    )
    await expect(upsertShoppingListItem({
      weekStart: '2026-11-02',
      name: 'Papel de cocina',
      quantity: 1,
      unit: null,
      manual: true,
      checked: false,
    })).rejects.toThrow('La cantidad y la unidad deben indicarse juntas.')
    await expect(upsertShoppingListItem({
      weekStart: '2026-11-02',
      name: 'Azúcar',
      quantity: null,
      unit: null,
      manual: false,
      checked: false,
    })).rejects.toThrow('Los artículos generados deben tener cantidad y unidad.')
    expect(supabaseMocks.from).not.toHaveBeenCalled()
  })

  it('surfaces database errors', async () => {
    supabaseMocks.from.mockReturnValue(new FakeQuery({
      data: null,
      error: { message: 'connection failed' },
    }))

    await expect(listShoppingListItems('2026-11-02')).rejects.toThrow(
      'No se pudo cargar la lista de la compra: connection failed',
    )
  })
})
