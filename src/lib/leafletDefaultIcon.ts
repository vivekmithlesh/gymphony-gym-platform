// =============================================================================
// Leaflet default-marker icon fix for Vite.
// -----------------------------------------------------------------------------
// Leaflet's default `L.Icon.Default` loads its marker images by relative URL,
// which Vite's bundler can't resolve — so default <Marker> pins render blank
// (the marker is there, but its image is missing). Importing the images through
// the bundler (`?url` forces a resolved URL string) and pointing the default
// icon at them restores the stock blue pin.
//
// IMPORTANT: this module must NOT `import "leaflet"` at the top level — a
// top-level leaflet import crashes SSR ("window is not defined") on every route
// (see the leaflet-ssr-safety note). Instead each map applies the fix to the
// SAME Leaflet instance it uses, by calling applyDefaultMarkerIcons(L). That
// also avoids the static-vs-dynamic-import double-instance trap where
// mergeOptions lands on a different `L` than the one drawing the marker.
// =============================================================================
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png?url";
import iconUrl from "leaflet/dist/images/marker-icon.png?url";
import shadowUrl from "leaflet/dist/images/marker-shadow.png?url";

type LeafletLike = {
  Icon: { Default: { mergeOptions: (options: Record<string, unknown>) => void } };
};

/** Point a Leaflet instance's default marker icon at the bundled images. */
export function applyDefaultMarkerIcons(L: LeafletLike): void {
  L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });
}
