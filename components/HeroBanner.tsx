// components/HeroBanner.tsx
import Image from "next/image";

type Props = {
  title: string;
  subtitle?: string;
  imageSrc: string;
  /** Match your Home hero height by passing "h-[80vh]" */
  heightClass?: string;
  /** If you want the banner to sit under your fixed navbar like Home: pass "-mt-20" */
  topOffsetClass?: string;
  /** Use "solid" to match Home's black/50 overlay; default is a soft gradient */
  overlay?: "gradient" | "solid";
};

export default function HeroBanner({
  title,
  subtitle,
  imageSrc,
  heightClass = "h-[80vh]", // 👈 default to Home's size
  topOffsetClass = "", // e.g. "-mt-20" to match Home
  overlay = "solid", // 👈 default to Home’s solid overlay
}: Props) {
  return (
    <section
      className={`relative w-full ${heightClass} ${topOffsetClass} flex items-center justify-center overflow-hidden bg-black`}
    >
      <Image
        src={imageSrc}
        alt={title}
        fill
        priority
        className="object-cover"
      />
      {overlay === "solid" ? (
        <div className="absolute inset-0 bg-black/50" /> // 👈 same as Home
      ) : (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />
      )}
      <div className="relative z-10 text-center px-4">
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-serif font-bold tracking-wider leading-snug text-[#e0e0e0] mb-6">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-base sm:text-lg md:text-xl text-[#e0e0e0] mb-0 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        ) : null}
      </div>
    </section>
  );
}
