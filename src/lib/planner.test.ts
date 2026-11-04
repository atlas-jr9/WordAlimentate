import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearPlanSlot, getWeekStart, listPlanSlots, upsertPlanSlot } from './planner'
import type { PlanSlotRow } from './planner'

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

  delete(...args: unknown[]) {
    this.calls.push(['delete', ...args])
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

function slotRow(weekStart: string, id: string): PlanSlotRow {
  return {
    id,
    week_start: weekStart,
    day_of_week: 0,
    slot: 'lunch',
    recipe_id: 'recipe-id',
    recipes: {
      id: 'recipe-id',
      name: `Receta de ${weekStart}`,
      food_type: 'lunch',
      servings: 2,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('planner date helpers', () => {
  it('calculates the ISO Monday for a local calendar date', () => {
    expect(getWeekStart(new Date(2026, 9, 30, 12))).toBe('2026-10-26')
    expect(getWeekStart(new Date(2026, 10, 1, 12))).toBe('2026-10-26')
  })
})

describe('weekly plan data access', () => {
  it('loads two weeks independently without mixing their slots', async () => {
    const firstWeek = new FakeQuery({
      data: [slotRow('2026-10-26', 'slot-one')],
      error: null,
    })
    const secondWeek = new FakeQuery({
      data: [slotRow('2026-11-02', 'slot-two')],
      error: null,
    })
    supabaseMocks.from
      .mockReturnValueOnce(firstWeek)
      .mockReturnValueOnce(secondWeek)

    const first = await listPlanSlots('2026-10-26')
    const second = await listPlanSlots('2026-11-02')

    expect(first.map(({ id, weekStart }) => [id, weekStart])).toEqual([
      ['slot-one', '2026-10-26'],
    ])
    expect(second.map(({ id, weekStart }) => [id, weekStart])).toEqual([
      ['slot-two', '2026-11-02'],
    ])
    expect(firstWeek.calls).toContainEqual(['eq', 'week_start', '2026-10-26'])
    expect(secondWeek.calls).toContainEqual(['eq', 'week_start', '2026-11-02'])
  })

  it('upserts one slot using the week/day/meal unique key', async () => {
    const query = new FakeQuery({
      data: slotRow('2026-10-26', 'slot-one'),
      error: null,
    })
    supabaseMocks.from.mockReturnValue(query)

    const result = await upsertPlanSlot({
      weekStart: '2026-10-26',
      dayOfWeek: 0,
      slot: 'lunch',
      recipeId: 'recipe-id',
    })

    expect(query.calls).toContainEqual([
      'upsert',
      {
        week_start: '2026-10-26',
        day_of_week: 0,
        slot: 'lunch',
        recipe_id: 'recipe-id',
      },
      { onConflict: 'week_start,day_of_week,slot' },
    ])
    expect(result.recipe?.name).toBe('Receta de 2026-10-26')
  })

  it('clears only the requested slot in the requested week', async () => {
    const query = new FakeQuery({ data: null, error: null })
    supabaseMocks.from.mockReturnValue(query)

    await clearPlanSlot({
      weekStart: '2026-11-02',
      dayOfWeek: 4,
      slot: 'dinner',
    })

    expect(query.calls).toContainEqual(['eq', 'week_start', '2026-11-02'])
    expect(query.calls).toContainEqual(['eq', 'day_of_week', 4])
    expect(query.calls).toContainEqual(['eq', 'slot', 'dinner'])
  })

  it('rejects dates that are not ISO Mondays before accessing Supabase', async () => {
    await expect(listPlanSlots('2026-10-27')).rejects.toThrow(
      'La semana debe comenzar en lunes.',
    )
    expect(supabaseMocks.from).not.toHaveBeenCalled()
  })
})
