export default function Logo({
  size = 36,
  width,
  height,
  className,
  ...props
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="GPC OBT"
      viewBox="0 0 345.84 174.76"
      width={width ?? size}
      height={height ?? size}
      className={className}
      fill="currentColor"
      {...props}
    >
      <path d="m1.09,114.92L114.93,1.08c.69-.69,1.62-1.07,2.59-1.07h107.13c3.27,0,4.9,3.95,2.59,6.26L59.84,173.69c-1.43,1.43-3.75,1.43-5.19,0L1.07,120.11c-1.43-1.43-1.43-3.75,0-5.19h.02Z" />
      <path d="m294.87,56.17l49.89-49.91c2.31-2.31.67-6.26-2.59-6.26h-99.8c-3.27,0-4.9,3.95-2.59,6.26l49.91,49.91c1.43,1.43,3.76,1.43,5.19,0h-.01Z" />
      <circle cx="233.51" cy="58.77" r="18.7" />
    </svg>
  );
}
