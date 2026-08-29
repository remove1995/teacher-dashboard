"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);
  const [visible, setVisible] = useState(false);
  return <form className="login-form" action={action}>
    <label className="login-password-field">
      <span className="sr-only">Пароль</span>
      <input name="password" type={visible ? "text" : "password"} placeholder="Пароль" autoComplete="current-password" required autoFocus />
      <button type="button" aria-label={visible ? "Скрыть пароль" : "Показать пароль"} aria-pressed={visible} onClick={() => setVisible((value) => !value)}>{visible ? "Скрыть" : "Показать"}</button>
    </label>
    {state.error ? <p className="login-error" role="alert">{state.error}</p> : null}
    <button className="login-submit" type="submit" disabled={pending}>{pending ? "Входим…" : "Войти"}</button>
  </form>;
}
