import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setErrorMessage(
          error.message.toLowerCase().includes('invalid login credentials')
            ? 'El correo o la contraseña no son correctos.'
            : 'No se pudo iniciar sesión. Comprueba tus datos e inténtalo de nuevo.',
        )
        return
      }

      if (!data.session) {
        setErrorMessage('No se pudo crear la sesión. Inténtalo de nuevo.')
        return
      }

      setIsAuthenticated(true)
    } catch (error) {
      console.error('Error inesperado al iniciar sesión:', error)
      setErrorMessage('No se pudo conectar con el servicio. Inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg shadow-stone-200/70">
          <h1 className="text-2xl font-semibold text-stone-900">WordAlimentate</h1>
          <p className="mt-4 text-stone-600" role="status">
            Sesión iniciada correctamente.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg shadow-stone-200/70 sm:p-10">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
            Tu espacio personal
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-stone-900">WordAlimentate</h1>
          <p className="mt-2 text-stone-600">Inicia sesión para continuar.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="email">
              Correo electrónico
            </label>
            <input
              autoComplete="email"
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              id="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="password">
              Contraseña
            </label>
            <input
              autoComplete="current-password"
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              id="password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          {errorMessage && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {errorMessage}
            </p>
          )}

          <button
            className="w-full rounded-lg bg-emerald-800 px-4 py-3 font-medium text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>
      </section>
    </main>
  )
}
