type PanelDecorationProps = {
  src: string;
  position?: "bottom-right" | "top-right" | "bottom-left";
  className?: string;
};

export function PanelDecoration({ src, position = "bottom-right", className = "" }: PanelDecorationProps) {
  return <img className={`panel-decoration panel-decoration--${position} ${className}`.trim()} src={src} alt="" aria-hidden="true" draggable={false} />;
}
