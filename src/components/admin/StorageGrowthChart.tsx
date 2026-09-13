"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";
import { getGlobalStorageHistoryAdminAction } from "@/actions/admin-storage.action";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function StorageGrowthChart() {
  const [data, setData] = useState<{ date: string; totalBytes: number }[] | null>(null);

  useEffect(() => {
    getGlobalStorageHistoryAdminAction(30).then((res) => {
      setData(res.history.map((h) => ({ date: h.date.slice(5), totalBytes: h.totalBytes })));
    });
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-48 text-text-secondary">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <p className="text-xs text-text-secondary py-8 text-center">
        Ainda não há snapshots suficientes para mostrar crescimento. Snapshots rodam diariamente às 06:00 UTC (ou
        manualmente em &quot;Atualizar snapshot&quot;).
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="storageGrowthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
        <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatBytes} width={70} />
        <Tooltip formatter={(v) => formatBytes(Number(v))} />
        <Area type="monotone" dataKey="totalBytes" stroke="#3b82f6" strokeWidth={2} fill="url(#storageGrowthFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
