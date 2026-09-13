import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/transacoes", label: "Transações" },
  { to: "/contas", label: "Contas" },
  { to: "/categorias", label: "Categorias" },
  { to: "/investimentos", label: "Investimentos" },
  { to: "/metas", label: "Metas" },
  { to: "/orcamento", label: "Orçamento" },
  { to: "/obrigacoes", label: "Obrigações" },
  { to: "/clientes", label: "Clientes" },
  { to: "/tipos-obrigacao", label: "Tipos de Obrigação" },
];

export default function Layout() {
  const { user, entity, logout } = useAuth();

  return (
    <div className="min-h-screen md:flex">
      <aside className="md:w-64 md:flex-shrink-0 bg-brand-900 text-white flex flex-col">
        <div className="p-5 border-b border-brand-800">
          <h1 className="text-lg font-bold leading-tight">Plataforma Financeira</h1>
          {entity && (
            <p className="text-xs text-brand-200 mt-1">
              {entity.name} · {entity.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
            </p>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-x-auto md:overflow-visible flex md:block gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-brand-600 text-white" : "text-brand-100 hover:bg-brand-800"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-brand-800 text-sm">
          <p className="text-brand-100 truncate">{user?.name}</p>
          <button onClick={logout} className="mt-2 text-brand-300 hover:text-white underline">
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
