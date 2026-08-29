import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Вход · TutorFlow" };

export default function LoginPage() {
  return <main className="login-page">
    <section className="login-card">
      <div className="login-lock" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2"/></svg></div>
      <h1>TutorFlow</h1>
      <p className="login-welcome">Добро пожаловать!</p>
      <p className="login-helper">Введите пароль для доступа к панели.</p>
      <LoginForm />
    </section>
  </main>;
}
