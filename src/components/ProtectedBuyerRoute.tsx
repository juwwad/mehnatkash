import { Navigate, Outlet } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

const ProtectedBuyerRoute = () => {
  const { userType, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!userType) {
    return <Navigate to="/auth" replace />;
  }

  if (userType !== "customer") {
    return <Navigate to="/pro/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedBuyerRoute;
