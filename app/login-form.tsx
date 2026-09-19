"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export default function LoginForm({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: register ? "register" : "login", name: form.get("name"), email: form.get("email"), password: form.get("password") }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível entrar.");
      await onSuccess();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível entrar."); }
    finally { setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-[#fbf7f2] px-6 text-[#401c2b]">
    <section className="w-full max-w-md rounded-2xl border bg-white p-8">
      <h1 className="font-serif text-3xl">Cupcake Gourmet</h1>
      <h2 className="mt-3 text-lg">{register ? "Crie sua conta" : "Entre na sua conta"}</h2>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {register && <div><Label htmlFor="auth-name">Nome</Label><Input id="auth-name" name="name" autoComplete="name" required minLength={2} maxLength={100} /></div>}
        <div><Label htmlFor="auth-email">E-mail</Label><Input id="auth-email" name="email" type="email" autoComplete="email" required maxLength={254} /></div>
        <div><Label htmlFor="auth-password">Senha</Label><Input id="auth-password" name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={12} maxLength={128} /><p className="mt-1 text-sm">Use pelo menos 12 caracteres.</p></div>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full bg-[#5b1932] text-white">{busy ? "Aguarde..." : register ? "Criar conta" : "Entrar"}</Button>
      </form>
      <button type="button" disabled={busy} className="mt-5 underline" onClick={() => { setRegister(!register); setError(""); }}>{register ? "Já tenho conta" : "Ainda não tenho conta"}</button>
    </section>
  </main>;
}
