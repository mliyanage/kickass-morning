import logoSvg from "@/assets/logo.svg";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function Logo({ className = "", size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "h-8",
    md: "h-12", 
    lg: "h-16"
  };

  return (
    <img 
      src={logoSvg} 
      alt="KickAss Morning Logo" 
      className={`${sizeClasses[size]} ${className}`} 
    />
  );
}