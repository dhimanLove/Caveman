import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  imgClassName,
  href = "/",
}: {
  className?: string;
  imgClassName?: string;
  href?: string;
}) {
  return (
    <Link to={href} className={cn("flex items-center gap-2.5 group", className)}>
      <span
        className={cn(
          "w-8 h-8 rounded-md overflow-hidden bg-cream border border-bone flex items-center justify-center shrink-0",
          "transition-colors duration-300 group-hover:border-ink/30",
          imgClassName,
        )}
      >
        <img
          src="/logo-256.png"
          alt="Caveman logo"
          width={32}
          height={32}
          className="w-full h-full object-contain"
        />
      </span>
      <span className="text-[16px] font-medium tracking-[0px] text-ink">Caveman</span>
    </Link>
  );
}
