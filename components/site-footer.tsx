import { CirclePlay, MessageCircle } from "lucide-react";

export function SiteFooter() {
  return <footer className="site-footer">
    <span>© {new Date().getFullYear()} Amaazbots</span>
    <nav className="footer-social-links" aria-label="Amaazbots community">
      <a href="https://www.youtube.com/@vTxMazi" target="_blank" rel="noopener noreferrer"><CirclePlay size={17} aria-hidden="true"/>YouTube</a>
      <a href="https://discord.com/invite/Kt2UkD4Q8k" target="_blank" rel="noopener noreferrer"><MessageCircle size={17} aria-hidden="true"/>Discord</a>
    </nav>
    <div><a href="/help">Installation help</a><a href="/privacy">Privacy</a><a href="/admin">Owner dashboard</a></div>
  </footer>;
}
