/* The owner's own copy, moved across unchanged from about.html. */

export default function AboutView() {
  return (
    <>
      <section className="toolbar">
        <h1 className="toolbar__title">About</h1>
      </section>

      <div className="content">
        <div className="settings-grid">
          <div className="settings-grid__left">
            <div className="card">
              <div className="hero-row">
                <div className="avatar">&gt;_</div>
                <div className="hero-name">
                  <p className="hero-name__label">//hello, i am</p>
                  <p className="hero-name__title">Marcos Ferrs</p>
                  <p className="hero-name__subtitle">UI Designer / Front-End Developer</p>
                </div>
              </div>
              <hr className="divider" />
              <p>
                I built madpomo because most focus timers only count minutes. I wanted to know something
                harder: do I finish what I start, and where do I get pulled away?
              </p>
              <p>
                Madpomo cross-references your tasks with your pomodoros, so a pause is data and not a
                failure. The goal is simple: show real progress and help you work in a way that actually
                fits you.
              </p>
            </div>

            <div className="card">
              <h2 className="card__title">//what madpomo measures</h2>

              {[
                ["01", "follow-through", "How many pomodoros you finish out of the ones you start."],
                ["02", "pauses", "How often a session is interrupted, and in which tasks."],
                ["03", "tasks x pomodoros", "Average pomodoros per task, so you can plan and split work better."]
              ].map(([number, label, hint]) => (
                <div className="item" key={number}>
                  <p className="item__number">{number}</p>
                  <div className="setting__text">
                    <p className="setting__label">{label}</p>
                    <p className="setting__hint">{hint}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="settings-grid__right">
            <div className="card">
              <h2 className="card__title">//find me online</h2>

              {[
                ["linkedin", "linkedin.com/in/marcosferrs", "https://www.linkedin.com/in/marcosferrs"],
                ["instagram", "@madobs.js", "https://www.instagram.com/madobs.js"],
                ["github", "github.com/mad-obs", "https://github.com/mad-obs"],
                ["website", "madobs.com", "https://madobs.com"]
              ].map(([label, hint, href]) => (
                <a href={href} className="link" key={label} target="_blank" rel="noopener">
                  <div className="setting__text">
                    <p className="setting__label">{label}</p>
                    <p className="setting__hint">{hint}</p>
                  </div>
                  <span className="link__arrow">-&gt;</span>
                </a>
              ))}
            </div>

            <div className="card">
              <h2 className="card__title">//madpomo</h2>

              <div className="setting">
                <div className="setting__text">
                  <p className="setting__label">version</p>
                </div>
                <p className="setting__value">v1.0.0</p>
              </div>

              <a href="#/settings?legal=terms" className="link">
                <div className="setting__text">
                  <p className="setting__label">terms of use</p>
                </div>
                <span className="link__arrow">-&gt;</span>
              </a>

              <a href="#/settings?legal=privacy" className="link">
                <div className="setting__text">
                  <p className="setting__label">privacy policy</p>
                </div>
                <span className="link__arrow">-&gt;</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
