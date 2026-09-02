'use client';

import Link from 'next/link';
import { Shield, Users, Play } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] bg-amber-50">
      <div className="mb-12 text-center">
        <h1 className="text-6xl font-extrabold tracking-tight text-slate-800 drop-shadow-sm mb-2">GRIDFORGE</h1>
        <p className="text-slate-500 font-semibold tracking-wide">タクティカルボードゲーム</p>
      </div>
      
      <div className="flex flex-col gap-5 w-full max-w-sm">
        <Link href="/creator" className="group flex items-center gap-4 p-5 bg-white rounded-3xl border-4 border-slate-200 hover:border-emerald-400 hover:-translate-y-1 hover:shadow-xl transition-all duration-200 shadow-sm">
          <div className="bg-emerald-100 p-3 rounded-2xl group-hover:scale-110 transition-transform">
            <Shield className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">クリーチャー作成</div>
            <div className="text-sm text-slate-500 font-medium">ポイントを割り振る</div>
          </div>
        </Link>

        <Link href="/builder" className="group flex items-center gap-4 p-5 bg-white rounded-3xl border-4 border-slate-200 hover:border-blue-400 hover:-translate-y-1 hover:shadow-xl transition-all duration-200 shadow-sm">
          <div className="bg-blue-100 p-3 rounded-2xl group-hover:scale-110 transition-transform">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">チーム編成・図鑑</div>
            <div className="text-sm text-slate-500 font-medium">パーティを組む</div>
          </div>
        </Link>
        
        <Link href="/battle" className="group flex items-center gap-4 p-5 bg-rose-50 rounded-3xl border-4 border-rose-200 hover:border-rose-400 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-200 transition-all duration-200 mt-4 shadow-sm">
          <div className="bg-rose-500 p-3 rounded-2xl group-hover:scale-110 transition-transform">
            <Play className="w-8 h-8 text-white fill-white" />
          </div>
          <div>
            <div className="text-xl font-bold text-rose-700">バトル開始</div>
            <div className="text-sm text-rose-500 font-medium">CPUと対戦する</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
