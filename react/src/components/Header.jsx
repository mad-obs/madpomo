import { useEffect, useState } from "react";
import { useMadpomo } from "../store.jsx";
import { formatHeaderDate } from "../lib/stats.js";

export default function Header({ route }) {
  const { settings } = useMadpomo();
  const [now, setNow] = useState(() => new Date());

  // The clock shows seconds, so it redraws every second.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="header">
      <p className="header__brand">&gt;_ madpomo</p>
      <nav className="header__nav">
        <p className="header__date">{formatHeaderDate(now, settings)}</p>
        <span className="header__sep" aria-hidden="true">|</span>
        <a
          href="#/settings"
          className={"header__link" + (route === "settings" ? " header__link--active" : "")}
          aria-current={route === "settings" ? "page" : undefined}
        >
          settings
        </a>
        <span className="header__sep" aria-hidden="true">|</span>
        <a
          href="#/about"
          className={"header__link" + (route === "about" ? " header__link--active" : "")}
          aria-current={route === "about" ? "page" : undefined}
        >
          about
        </a>
      </nav>
    </header>
  );
}
