import React from 'react';
import { getInitials } from '../domain/dates';

const AVATAR_PALETTES = [
  'bg-[#0F2557] text-white dark:bg-[#1E3A8A] dark:text-[#E0E7FF]',
  'bg-[#3730A3] text-white dark:bg-[#4338CA] dark:text-[#EEF2FF]',
  'bg-[#1E40AF] text-white dark:bg-[#1D4ED8] dark:text-[#DBEAFE]',
  'bg-[#0F766E] text-white dark:bg-[#0D9488] dark:text-[#CCFBF1]',
  'bg-[#334155] text-white dark:bg-[#475569] dark:text-[#F1F5F9]',
  'bg-[#4F46E5] text-white dark:bg-[#6366F1] dark:text-white',
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 'md' }) => {
  const palette = AVATAR_PALETTES[hashName(name.toLowerCase()) % AVATAR_PALETTES.length];
  const sizeClass =
    size === 'sm'
      ? 'h-8 w-8 text-xs'
      : size === 'lg'
      ? 'h-12 w-12 text-base'
      : 'h-10 w-10 text-sm';

  return (
    <div
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold tracking-tight select-none ${sizeClass} ${palette}`}
    >
      {getInitials(name)}
    </div>
  );
};
