import { Link } from "@tanstack/react-router";
import { cn } from "@/shared/lib/utils";

export function CavemanMark({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span className={cn("w-8 h-8 flex items-center justify-center shrink-0 text-ink", className)}>
      <img
        src="/yeti-mascot.svg"
        alt=""
        aria-hidden="true"
        className={cn("logo-mark-image block h-full w-full object-contain", iconClassName)}
      />
    </span>
  );
}

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
      <CavemanMark
        className={cn(
          "transition-colors duration-300 group-hover:border-electric-iris/50",
          imgClassName,
        )}
      />
      <span className="text-[16px] font-medium tracking-[0px] text-ink">Caveman</span>
    </Link>
  );
}
