"use client";

import AvatarSelector from "@/components/game/avatar-selector";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from 'next-intl';

export default function SelectAvatarPage() {
  const t = useTranslations('common');
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 dark:from-red-900 dark:via-orange-800 dark:to-yellow-700">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="absolute top-4 left-4 md:top-6 md:left-6 z-10"
      >
        <Button 
          variant="outline"
          onClick={() => router.push('/')}
          className="flex items-center gap-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </Button>
      </motion.div>
      <AvatarSelector />
    </div>
  );
} 