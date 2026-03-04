import { MetaPixel } from "@/components/smart-link/MetaPixel"

export default function SmartLinkLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <MetaPixel />
      {children}
    </>
  )
}
