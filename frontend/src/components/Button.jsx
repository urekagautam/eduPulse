export default function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-200 cursor-pointer disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-strong)] disabled:bg-opacity-50 disabled:text-[var(--color-primary-foreground)]",
    secondary:
      "bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:bg-gray-100 border border-gray-300",
    danger:
      "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 border border-transparent",
    outline:
      "bg-white text-[var(--color-primary)] border border-[var(--color-primary-border)] hover:bg-[var(--color-primary-bg)] disabled:opacity-50",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-2.5 text-base",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      type={props.type || "button"}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
