export function Footer({ text }: { text?: string }) {
  return (
    <footer className="site-footer">
      <div className="wrap">{text || "Phoenix of War 973 · From ashes, to flame."}</div>
    </footer>
  );
}