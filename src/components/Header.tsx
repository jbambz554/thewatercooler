import WaterCoolerLogo from "./WaterCoolerLogo";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatToday(d: Date): { weekday: string; date: string } {
  return {
    weekday: WEEKDAYS[d.getDay()],
    date: `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
  };
}

const Header = () => {
  const today = new Date();
  const { weekday, date } = formatToday(today);

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="container py-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <WaterCoolerLogo className="h-14 w-auto shrink-0 text-foreground -mt-1" />
            <div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-none">
                The Water Cooler
              </h1>
              <p className="text-muted-foreground text-sm mt-2 font-medium">
                Your 5-minute briefing on what matters.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <p className="font-display text-xl font-semibold leading-tight">{weekday}</p>
            <p className="text-muted-foreground text-sm font-mono tabular-nums">{date}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
