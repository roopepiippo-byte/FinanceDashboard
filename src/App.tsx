import { createHashRouter, RouterProvider } from "react-router-dom";
import { ToastProvider } from "@/components/ui/toast";
import { Layout } from "@/components/layout/Layout";
import { Dashboard } from "@/routes/Dashboard";
import { Import } from "@/routes/Import";
import { Unmapped } from "@/routes/Unmapped";
import { Transactions } from "@/routes/Transactions";
import { Budget } from "@/routes/Budget";
import { Wealth } from "@/routes/Wealth";
import { Settings } from "@/routes/Settings";

const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/transactions", element: <Transactions /> },
      { path: "/budget", element: <Budget /> },
      { path: "/wealth", element: <Wealth /> },
      { path: "/unmapped", element: <Unmapped /> },
      { path: "/import", element: <Import /> },
      { path: "/settings", element: <Settings /> },
    ],
  },
]);

export function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}
