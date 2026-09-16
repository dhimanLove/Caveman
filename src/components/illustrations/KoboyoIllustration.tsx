import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const KOboyoIcons = {
  partyFace: "https://koboyo.com/icons/svg/party-face.svg",
  nervousFace: "https://koboyo.com/icons/svg/nervous-face.svg",
  werewolf: "https://koboyo.com/icons/svg/cartoon-werewolf.svg",
  personApi: "https://koboyo.com/icons/svg/person-configuring-api.svg",
  personIntegration: "https://koboyo.com/icons/svg/person-demoing-integration.svg",
  personWebsite: "https://koboyo.com/icons/svg/person-demoing-website.svg",
  personServer: "https://koboyo.com/icons/svg/person-configuring-server.svg",
  personDemoApi: "https://koboyo.com/icons/svg/person-demoing-api.svg",
  personDemoServer: "https://koboyo.com/icons/svg/person-demoing-server.svg",
  personDashboard: "https://koboyo.com/icons/svg/person-demoing-dashboard.svg",
  personDocumentingApi: "https://koboyo.com/icons/svg/person-documenting-api.svg",
  personDebugApi: "https://koboyo.com/icons/svg/person-debugging-api.svg",
  personBuildDashboard: "https://koboyo.com/icons/svg/person-building-dashboard.svg",
  personDesignSchema: "https://koboyo.com/icons/svg/person-designing-schema.svg",
  personDeployRelease: "https://koboyo.com/icons/svg/person-deploying-release.svg",
  faceBook: "https://koboyo.com/icons/svg/face-behind-book.svg",
  faceTasting: "https://koboyo.com/icons/svg/face-tasting.svg",
  archer: "https://koboyo.com/icons/svg/inkbrush-archer.svg",
  syntaxTree: "https://koboyo.com/icons/svg/abstract-syntax-tree.svg",
  courseCoding: "https://koboyo.com/icons/svg/course-coding.svg",
  folderDown: "https://koboyo.com/icons/svg/folder-down.svg",
  fullTray: "https://koboyo.com/icons/svg/full-tray.svg",
} as const;

export type KoboyoIcon = keyof typeof KOboyoIcons;

type KoboyoIllustrationProps = {
  icon: KoboyoIcon;
  alt: string;
  className?: string;
  fallback?: ReactNode;
};

/**
 * A small, resilient bridge to Koboyo's hand-drawn SVG library. The fallback
 * keeps the layout complete when a visitor is offline or the asset host is
 * unavailable, while the external asset gives the marketing surfaces their
 * illustrated, human-made texture.
 */
export function KoboyoIllustration({ icon, alt, className, fallback }: KoboyoIllustrationProps) {
  const [failed, setFailed] = useState(false);

  return (
    <span className={cn("koboyo-illustration h-16 w-16", className)}>
      {failed ? (
        fallback
      ) : (
        <img
          src={KOboyoIcons[icon]}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
