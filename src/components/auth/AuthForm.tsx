"use client";
import { useActionState } from "react";
import Link from "next/link";
import { loginAction, registerAction } from "@/actions/auth";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const register = mode === "register";
  const [state, action] = useActionState(register ? registerAction : loginAction, null);
  return <main style={{ maxWidth: 460, margin: "8vh auto", padding: 24 }}>
    <Link href="/" aria-label="TBB início" style={{ fontSize: 25, fontWeight: 800, textDecoration: "none" }}>TBB <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>To Be Better</span></Link>
    <section className="panel stack" style={{ marginTop: 32 }}>
      <div><h1>{register ? "Comece pelo que importa" : "Seu próximo passo começa aqui"}</h1>
        <p className="muted">{register ? "Crie sua conta e organize um espaço só seu." : "Entre no seu espaço para continuar de onde parou."}</p></div>
      <form action={action} className="stack">
        {register && <label className="field">Seu nome<input name="name" autoComplete="name" required minLength={2} maxLength={100} /></label>}
        <label className="field">E-mail<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label className="field">Senha<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 10 : 1} maxLength={72} /></label>
        {register && <small className="muted">Use pelo menos 10 caracteres.</small>}
        {state?.error && <p role="alert" style={{ color: "var(--danger, #b42318)" }}>{state.error}</p>}
        <PendingSubmitButton className="button" pendingLabel={register ? "Criando sua conta…" : "Entrando…"}>{register ? "Criar minha conta" : "Entrar"}</PendingSubmitButton>
      </form>
      <p className="muted">{register ? "Já tem uma conta? " : "Primeira vez por aqui? "}<Link href={register ? "/login" : "/register"}>{register ? "Entrar" : "Criar conta"}</Link></p>
    </section>
  </main>;
}
