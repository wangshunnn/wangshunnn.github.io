---
title: About Me
aside: false
---

<style>
.about-profile {
  max-width: 43rem;
  margin-inline: auto;
}

@media (min-width: 768px) {
  .about-profile {
    /* Align with the homepage titles after the date column and its gap. */
    padding-inline-start: calc(3rem + 1.75rem);
  }
}

.about-name {
  position: relative;
  display: inline-block;
  color: var(--site-ink);
  letter-spacing: -0.025em;
}

.about-name::after {
  position: absolute;
  bottom: -0.18em;
  left: 0.04em;
  width: 2.25rem;
  height: 2px;
  border-radius: 999px;
  background: var(--site-accent);
  opacity: 0.72;
  content: '';
}

.about-content {
  max-width: 38rem;
  margin-top: 2.75rem;
}

.about-timeline {
  display: grid;
  gap: 0.45rem;
  max-width: 24rem;
  color: var(--site-ink-muted);
  font-family: var(--vp-font-family-mono);
  font-size: 0.875rem;
  font-style: italic;
}

.about-role {
  display: grid;
  grid-template-columns: 5.1rem 0.75rem 5.1rem minmax(0, 1fr);
  gap: 0.35rem;
  align-items: center;
}

.about-role-separator {
  color: var(--site-ink-faint);
  text-align: center;
}

.about-company {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  justify-self: start;
  color: var(--site-ink) !important;
  font-family: var(--vp-font-family-base);
  font-style: normal;
  font-weight: 400 !important;
  text-decoration-line: underline !important;
  text-decoration-color: var(--site-rule) !important;
  text-decoration-style: dotted !important;
  text-underline-offset: 0.2em;
}

.about-company:hover {
  color: var(--site-accent-hover) !important;
  text-decoration-color: currentColor !important;
}

.about-company-icon {
  display: inline-block;
  width: 1.125rem;
  height: 1.125rem;
  opacity: 0.72;
  vertical-align: text-bottom;
}

.about-copy {
  margin-top: 4rem;
}

.about-copy p {
  margin: 0 0 1.15rem;
}

.about-social {
  display: flex;
  width: max-content;
  gap: 0.9rem;
  margin-top: 4rem;
  border-top: 1px solid var(--site-rule);
  padding-top: 1.4rem;
}

.about-social a {
  display: grid;
  width: 1.25rem;
  height: 1.25rem;
  place-items: center;
  color: var(--site-ink-muted) !important;
  text-decoration: none !important;
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

.about-social a:hover,
.about-social a:focus-visible {
  color: var(--site-accent-hover) !important;
  transform: translateY(-1px);
}

.about-social a:focus-visible {
  border-radius: 3px;
  outline: 2px solid var(--site-accent);
  outline-offset: 4px;
}

.about-social-icon {
  width: 1rem;
  height: 1rem;
}

@media (max-width: 480px) {
  .about-content {
    margin-top: 2.25rem;
  }

  .about-role {
    grid-template-columns: 4.65rem 0.6rem 4.5rem minmax(0, 1fr);
    gap: 0.25rem;
  }

  .about-copy,
  .about-social {
    margin-top: 3.25rem;
  }
}
</style>

<div class="about-profile">

<h1><span class="about-name">Soon Wang</span></h1>

<div class="about-content">
  <div class="about-timeline" aria-label="工作经历">
    <div class="about-role">
      <time datetime="2023-08">2023.08</time>
      <span class="about-role-separator" aria-hidden="true">–</span>
      <span>至今</span>
      <a class="about-company" href="https://www.didiglobal.com/">
        <span class="about-company-icon i-arcticons-didi-food" aria-hidden="true"></span>
        <span>滴滴</span>
      </a>
    </div>
    <div class="about-role">
      <time datetime="2021-01">2021.01</time>
      <span class="about-role-separator" aria-hidden="true">–</span>
      <time datetime="2023-07">2023.07</time>
      <a class="about-company" href="https://www.meituan.com/">
        <IconMeituan class="about-company-icon" />
        <span>美团</span>
      </a>
    </div>
  </div>

  <div class="about-copy">
    <p>AI 时代坚持手写博客。</p>
    <p><Typewriter prefix="编程之外，喜欢 " :items="['音乐', '动漫', 'FPS 游戏']" /></p>
  </div>

  <nav class="about-social" aria-label="社交链接">
    <a href="https://github.com/wangshunnn/" aria-label="GitHub">
      <span class="about-social-icon i-simple-icons-github" aria-hidden="true"></span>
    </a>
    <a href="https://juejin.cn/user/2129123907471864/posts" aria-label="稀土掘金">
      <span class="about-social-icon i-simple-icons-juejin" aria-hidden="true"></span>
    </a>
    <a href="https://www.zhihu.com/people/wangshunnn" aria-label="知乎">
      <span class="about-social-icon i-simple-icons-zhihu" aria-hidden="true"></span>
    </a>
    <a href="https://twitter.com/wangshunnn" aria-label="X">
      <span class="about-social-icon i-simple-icons-x" aria-hidden="true"></span>
    </a>
  </nav>
</div>

</div>
