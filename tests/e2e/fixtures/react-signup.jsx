// Controlled React inputs: React ignores a plain `input.value = …` assignment,
// the fill must go through the native setter + an input event.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'

function Signup() {
    const [form, setForm] = useState({ email: '', confirm: '', password: '' })
    const [touched, setTouched] = useState(false)
    const set = (key) => (event) => setForm(f => ({ ...f, [key]: event.target.value }))

    return (
        <form id="signup" onSubmit={e => e.preventDefault()}>
            <label htmlFor="email">Adresse e-mail</label>
            <input id="email" name="user_email" value={form.email} onChange={set('email')} />
            <label htmlFor="confirm">Confirmez l'adresse e-mail</label>
            <input id="confirm" name="user_email_confirm" value={form.confirm} onChange={set('confirm')}
                onBlur={() => setTouched(true)} />
            <input type="password" value={form.password} onChange={set('password')} />
            <p id="validation">{touched ? (form.email === form.confirm ? 'ok' : 'mismatch') : ''}</p>
            <pre id="state">{JSON.stringify(form)}</pre>
        </form>
    )
}

createRoot(document.getElementById('root')).render(<Signup />)
