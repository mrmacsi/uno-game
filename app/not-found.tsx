import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function NotFound() {
  const t = useTranslations('error')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">{t('pageNotFound')}</h2>
      <p className="text-gray-600 mb-6">{t('pageNotFoundDesc')}</p>
      <Link href="/"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        {t('returnHome')}
      </Link>
    </div>
  )
} 