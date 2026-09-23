import { useDarkTheme } from "../lib/use-dark-theme";
// Renderer-sized copies of the brand marks. The 1024px masters in build/ are
// installer icons for electron-builder; BrandLogo never renders above 64px.
import brandLogoUrlLight from "../assets/brand/logo-light.png";
import brandLogoUrlDark from "../assets/brand/logo-dark.png";

export function BrandLogo({ size = 16 }: { size?: number }) {
  const dark = useDarkTheme();

  return (
    <img
      className="brand-logo"
      src={dark ? brandLogoUrlDark : brandLogoUrlLight}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable={false}
    />
  );
}
