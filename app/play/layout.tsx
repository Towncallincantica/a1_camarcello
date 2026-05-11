import GPSUploader from '@/components/GPSUploader'

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GPSUploader />
      {children}
    </>
  )
}