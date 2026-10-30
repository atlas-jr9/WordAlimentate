import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [sessionError, setSessionError] = useState('')

  useEffect(() => {
    let isMounted = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession)
        setIsLoadingSession(false)
      }
    })

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return
        if (error) {
          console.error('Error al restaurar la sesión de Supabase:', error)
          setSessionError('No se pudo comprobar la sesión. Recarga la página para volver a intentarlo.')
        } else {
          setSession(data.session)
        }
        setIsLoadingSession(false)
      })
      .catch((error: unknown) => {
        if (!isMounted) return
        console.error('Error inesperado al restaurar la sesión:', error)
        setSessionError('No se pudo comprobar la sesión. Recarga la página para volver a intentarlo.')
        setIsLoadingSession(false)
      })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (isLoadingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <p className="text-stone-600" role="status">Comprobando sesión…</p>
      </main>
    )
  }

  if (sessionError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <p className="max-w-md rounded-lg bg-red-50 px-4 py-3 text-center text-sm text-red-800" role="alert">
          {sessionError}
        </p>
      </main>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate replace to="/" /> : <LoginPage onAuthenticated={setSession} />}
      />
      <Route
        path="*"
        element={session ? <AuthenticatedHome /> : <RedirectToLogin />}
      />
    </Routes>
  )
}

function RedirectToLogin() {
  const location = useLocation()
  return <Navigate replace state={{ from: location }} to="/login" />
}

function LoginPage({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
        if (error.code === 'email_not_confirmed') {
          setErrorMessage(
            'El correo de esta cuenta no está confirmado. Confírmalo en Supabase → Authentication → Users e inténtalo de nuevo.',
          )
        } else if (
          error.code === 'invalid_credentials' ||
          error.message.toLowerCase().includes('invalid login credentials')
        ) {
          setErrorMessage('El correo o la contraseña no son correctos.')
        } else {
          setErrorMessage(`No se pudo iniciar sesión: ${error.message}`)
        }
        return
      }

      if (!data.session) {
        setErrorMessage('No se pudo crear la sesión. Inténtalo de nuevo.')
        return
      }

      onAuthenticated(data.session)
    } catch (error) {
      console.error('Error inesperado al iniciar sesión:', error)
      setErrorMessage('No se pudo conectar con el servicio. Inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
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

function AuthenticatedHome() {
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
