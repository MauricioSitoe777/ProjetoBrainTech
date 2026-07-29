interface BrandLogoProps {
  className?: string;
}

const LOGO_SRC = "/sos-motors-logo.png";

export function BrandLogo({ className = "h-12 w-auto" }: BrandLogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="SOS Motors"
      className={`block object-contain ${className}`}
    />
  );
}
