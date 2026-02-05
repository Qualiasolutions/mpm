import { DemoBanner } from '@/components/layout/demo-banner'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f8fafc] relative overflow-hidden">
      <DemoBanner />
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-brand-400/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[100px]" />
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md relative z-10">
          {children}
        </div>
      </div>
    </div>
  )
}
