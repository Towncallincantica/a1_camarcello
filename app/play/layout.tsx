import GPSUploader from '@/components/GPSUploader'
import FontSizeApplier from '@/components/FontSizeApplier'

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GPSUploader />
      <FontSizeApplier />
      {children}
    </>
  )
}