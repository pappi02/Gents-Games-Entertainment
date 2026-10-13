/** Inner-page heading block — one consistent scale for every route's h1. */
export function PageIntro({
  eyebrow,
  title,
  lede,
  children,
  theme = "theme-dark",
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  children?: React.ReactNode;
  theme?: "theme-dark" | "theme-light";
}) {
  return (
    <header className={`page-intro ${theme}`}>
      <div className="container">
        <div className="page-intro-inner">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="display">{title}</h1>
          {lede && <p className="lede">{lede}</p>}
        </div>
        {children && <div className="page-intro-aside">{children}</div>}
      </div>
    </header>
  );
}
