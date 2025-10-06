import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-6">
      <div className="text-center p-6 sm:p-8 rounded-lg border border-border bg-card shadow-md animate-slide-in max-w-md w-full">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 sm:mb-6 text-primary">404</h1>
        <p className="text-lg sm:text-xl text-card-foreground mb-4 sm:mb-6">Page not found</p>
        <a href="/" className="text-primary hover:text-primary/80 underline transition-colors text-sm sm:text-base">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
