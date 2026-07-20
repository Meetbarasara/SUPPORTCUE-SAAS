// Tiny shim so components originally written for react-router-dom can keep
// their import shape while running on @tanstack/react-router. No behavior
// changes; signatures match the subset used by the original components.

import {
  Link as TLink,
  useNavigate as useTanstackNavigate,
  useRouterState,
} from "@tanstack/react-router";

export function Link({ to, children, ...rest }) {
  return (
    <TLink to={to} {...rest}>
      {children}
    </TLink>
  );
}

export function useNavigate() {
  const navigate = useTanstackNavigate();
  return (target) => {
    if (typeof target === "string") navigate({ to: target });
    else if (target && typeof target === "object") navigate(target);
  };
}

export function useSearchParams() {
  const search = useRouterState({ select: (s) => s.location.search });
  const sp = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  // Merge in any router-known typed search params (shallow).
  if (search && typeof search === "object") {
    Object.entries(search).forEach(([k, v]) => {
      if (v != null && !sp.has(k)) sp.set(k, String(v));
    });
  }
  return [sp];
}