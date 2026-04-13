'use client';
import Image from 'next/image';

export default function MiniLogo({ size = 32, spinning = false }: { size?: number; spinning?: boolean }) {
  return (
    <Image
      src="/icon-512.png"
      alt="Mini"
      width={size}
      height={size}
      className={spinning ? 'animate-spin-slow' : ''}
    />
  );
}
