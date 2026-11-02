import { useEffect, useState } from "react";
import { useMadpomo } from "../store.jsx";
import { formatHeaderDate } from "../lib/stats.js";
import { currentLanguage, setLanguage } from "../lib/i18n.js";

export default function Header({ route }) {
  const { settings } = useMadpomo();
  const [now, setNow] = useState(() => new Date());
  const language = currentLanguage();

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
        <span className="header__sep" aria-hidden="true">|</span>
        <span className="lang" role="group" aria-label="language" data-no-i18n>
          <button
            type="button"
            className="lang__btn"
            data-lang="EN"
            aria-pressed={language === "EN"}
            aria-label="english"
            title="english"
            onClick={() => setLanguage("EN")}
          >
            {/* drawn, not an emoji: Chrome on Windows has no flag glyphs and
                falls back to the two letters of the country code */}
            <svg className="lang__flag" viewBox="0 0 60 40" aria-hidden="true" focusable="false">
              <rect width="60" height="40" fill="#012169" />
              <path d="M0 0L60 40M60 0L0 40" stroke="#ffffff" strokeWidth="8" />
              <path d="M0 0L60 40M60 0L0 40" stroke="#c8102e" strokeWidth="4" />
              <path d="M30 0V40M0 20H60" stroke="#ffffff" strokeWidth="12" />
              <path d="M30 0V40M0 20H60" stroke="#c8102e" strokeWidth="7" />
            </svg>
          </button>
          <button
            type="button"
            className="lang__btn"
            data-lang="PT"
            aria-pressed={language === "PT"}
            aria-label="português do Brasil"
            title="português do Brasil"
            onClick={() => setLanguage("PT")}
          >
            <svg className="lang__flag" viewBox="0 0 70 49" aria-hidden="true" focusable="false">
              <rect width="70" height="49" fill="#009b3a" />
              <path d="M35 6L64 24.5L35 43L6 24.5Z" fill="#fedd00" />
              <circle cx="35" cy="24.5" r="12" fill="#002776" />
            </svg>
          </button>
        </span>
      </nav>
    </header>
  );
}
