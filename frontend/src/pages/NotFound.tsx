import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center gradient-surface">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gradient mb-4">404</h1>
        <p className="text-lg text-muted-foreground mb-6">
          This page doesn't exist.
        </p>
        <Button asChild>
          <Link to="/login">Go home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
