export default function Button({ children, variant = "primary", ...props }) {
  return <button {...props}>{children}</button>;
}
