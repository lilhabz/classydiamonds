// pages/for-him.tsx
import type { GetServerSideProps } from "next";

/** Permanently redirect legacy /for-him to /jewelry?audience=him */
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // Preserve any extra query params, but force audience=him (and drop legacy gender)
  const qp = new URLSearchParams();
  for (const [k, v] of Object.entries(ctx.query ?? {})) {
    if (k === "audience" || k === "gender") continue;
    if (Array.isArray(v)) v.forEach((x) => qp.append(k, String(x)));
    else if (v != null) qp.set(k, String(v));
  }
  qp.set("audience", "him");

  return {
    redirect: {
      destination: `/jewelry${qp.toString() ? `?${qp.toString()}` : ""}`,
      permanent: true, // sends 308
    },
  };
};

export default function ForHimRedirect() {
  return null;
}
