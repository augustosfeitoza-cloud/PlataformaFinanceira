import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { extractErrorMessage } from "../api/client";
import { Button, ErrorText, Input, Label } from "../components/ui";

export default function Login() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState("demo@plataforma.local");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-xl font-bold text-center mb-1">Plataforma Financeira</h1>
        <p className="text-sm text-slate-500 text-center mb-6">Entre para acessar seu planejamento</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <ErrorText message={error} />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <p className="text-sm text-center text-slate-500 mt-4">
          Não tem conta?{" "}
          <Link to="/register" className="text-brand-600 font-medium hover:underline">
            Cadastre-se
          </Link>
        </p>
        <p className="text-xs text-center text-slate-400 mt-4">
          Conta demo pré-preenchida: demo@plataforma.local / demo1234
        </p>
      </div>
    </div>
  );
}
