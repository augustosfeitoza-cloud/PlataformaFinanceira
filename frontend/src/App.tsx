import { Navigate, Route, BrowserRouter, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Categories from "./pages/Categories";
import Transactions from "./pages/Transactions";
import Investments from "./pages/Investments";
import Goals from "./pages/Goals";
import Budgets from "./pages/Budgets";
import Obligations from "./pages/Obligations";
import Clients from "./pages/Clients";
import ObligationTypes from "./pages/ObligationTypes";

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="contas" element={<Accounts />} />
            <Route path="categorias" element={<Categories />} />
            <Route path="transacoes" element={<Transactions />} />
            <Route path="investimentos" element={<Investments />} />
            <Route path="metas" element={<Goals />} />
            <Route path="orcamento" element={<Budgets />} />
            <Route path="obrigacoes" element={<Obligations />} />
            <Route path="clientes" element={<Clients />} />
            <Route path="tipos-obrigacao" element={<ObligationTypes />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
