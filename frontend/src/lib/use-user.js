// Minimal localStorage-backed user state. Mirrors the shape the components
// expect: `user` object passed in via props, plus a `setUser` setter and an
// `onLogout` callback.
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

const KEY = "user";

function readUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useUser() {
  const [user, setUserState] = useState(() => readUser());
  const navigate = useNavigate();

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY) setUserState(readUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setUser = (u) => {
    if (u) window.localStorage.setItem(KEY, JSON.stringify(u));
    else window.localStorage.removeItem(KEY);
    setUserState(u);
  };

  const onLogout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem(KEY);
    setUserState(null);
    navigate({ to: "/" });
  };

  return { user, setUser, onLogout };
}