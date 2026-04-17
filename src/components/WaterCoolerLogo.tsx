/**
 * The Water Cooler logo.
 * The image file lives at /public/watercooler-logo.png.
 * Vite serves files from /public at the site root, so referencing
 * "/watercooler-logo.png" works both in dev and in production builds.
 */
interface WaterCoolerLogoProps {
  className?: string;
}

const WaterCoolerLogo = ({ className }: WaterCoolerLogoProps) => (
  <img
    src="/watercooler-logo.png"
    alt="The Water Cooler"
    className={className}
    draggable={false}
  />
);

export default WaterCoolerLogo;
