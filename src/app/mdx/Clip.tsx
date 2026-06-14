import { createContext, useContext } from "react";

/** A clip's resolved CDN reference, keyed by slug. */
export interface ClipRef {
  url: string;
  caption: string | null;
}

export type ClipMap = Record<string, ClipRef>;

/**
 * Carries the loader-built slug→{url,caption} map down to `<Clip>` instances
 * inside the rendered MDX. The map is the *data*; the `Clip` component is
 * referentially stable, which keeps SSR and client markup identical.
 */
export const ClipMapContext = createContext<ClipMap>({});

interface ClipProps {
  slug: string;
  caption?: string;
}

/**
 * Renders a `<Clip slug="..." />` reference from the MDX body as an autoplaying,
 * looping, muted, inline WebM `<video>` pointing at the CDN URL resolved from the
 * clip map. An author-side caption overrides the stored one. An unknown slug
 * renders a visible, non-fatal placeholder rather than throwing, so a single bad
 * reference can't blank the whole page.
 */
export function Clip({ slug, caption }: ClipProps) {
  const map = useContext(ClipMapContext);
  const ref = map[slug];

  if (!ref) {
    return (
      <div className="clip clip--missing" role="note">
        Clip no disponible: {slug}
      </div>
    );
  }

  const text = caption ?? ref.caption;
  return (
    <figure className="clip">
      <video
        className="clip__video"
        src={ref.url}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
      >
        Tu navegador no admite vídeo WebM.
      </video>
      {text ? <figcaption className="clip__caption">{text}</figcaption> : null}
    </figure>
  );
}
