import { useContext } from "react";
import { AppContext } from "./AppContext.jsx";

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
