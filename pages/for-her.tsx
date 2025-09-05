// pages/for-her.tsx
import type { GetServerSideProps } from "next";

/** Permanently redirect legacy /for-her to /jewelry?audience=her */
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // Preserve any extra query params (e.g., price=, metal=) but force audience=her
  const qp = new URLSearchParams();
  for (const [k, v] of Object.entries(ctx.query ?? {})) {
    if (k === "audience" || k === "gender") continue; // drop legacy audience keys
    if (Array.isArray(v)) v.forEach((x) => qp.append(k, String(x)));
    else if (v != null) qp.set(k, String(v));
  }
  qp.set("audience", "her");

  return {
    redirect: {
      destination: `/jewelry${qp.toString() ? `?${qp.toString()}` : ""}`,
      permanent: true, // 308
    },
  };
};

export default function ForHerRedirect() {
  return null;
}
