import Link from 'next/link'

export function Footer() {
  return (
    <footer className="py-6 text-center">
      <p className="text-xs text-slate-400">
        &copy; {new Date().getFullYear()} MPM Distributors Ltd.
      </p>
      <p className="mt-1 text-[11px] text-slate-400">
        Powered by:{' '}
        <Link
          href="https://qualiasolutions.net"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#0d9488] hover:text-[#0f766e] transition-colors"
        >
          Qualia Solutions
        </Link>
      </p>
    </footer>
  )
}
