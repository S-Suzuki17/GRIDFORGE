'use client';

import Link from 'next/link';
import { Shield, Users, Play } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <h1 className="text-4xl font-bold mb-10 tracking-wider text-cyan-400">VS OMEGA</h1>
      
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Link href="/creator" className="flex items-center justify-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700">
          <Shield className="w-6 h-6 text-emerald-400" />
          <span className="text-xl font-semibold">クリーチャー作成</span>
        </Link>

        <Link href="/builder" className="flex items-center justify-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700">
          <Users className="w-6 h-6 text-blue-400" />
          <span className="text-xl font-semibold">チーム編成・図鑑</span>
        </Link>
        
        <Link href="/battle" className="flex items-center justify-center gap-3 p-4 bg-orange-900/50 hover:bg-orange-800/60 text-orange-200 rounded-lg transition-colors border border-orange-700/50 shadow-[0_0_15px_rgba(194,65,12,0.3)]">
          <Play className="w-6 h-6 text-orange-400" />
          <span className="text-xl font-semibold">バトル (荒野ステージ)</span>
        </Link>
      </div>
    </div>
  );
}
