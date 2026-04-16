const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border mt-16 py-8">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <p className="font-mono">
          © {year} The Water Cooler. Headlines belong to their respective publishers.
        </p>
        <p className="font-mono">
          Market data delayed ~15 min • News refreshed every 5 min
        </p>
      </div>
    </footer>
  );
};

export default Footer;
