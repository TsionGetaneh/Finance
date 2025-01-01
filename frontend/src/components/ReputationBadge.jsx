import React from 'react';
import { ShieldCheck, Star } from 'lucide-react';

const ReputationBadge = ({ score }) => {
  const getLevel = () => {
    if (score >= 800) return { label: 'Trust Guardian', color: 'bg-green-500', text: 'text-green-500' };
    if (score >= 600) return { label: 'Reliable Partner', color: 'bg-blue-500', text: 'text-blue-500' };
    if (score >= 400) return { label: 'Community Member', color: 'bg-indigo-500', text: 'text-indigo-500' };
    return { label: 'Newcomer', color: 'bg-gray-500', text: 'text-gray-500' };
  };

  const level = getLevel();

  return (
    <div className="flex items-center gap-3">
      <div className={`${level.color} p-2 rounded-full shadow-lg`}>
        <ShieldCheck className="text-white" size={20} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Reputation</p>
        <p className={`font-black text-sm ${level.text}`}>{level.label}</p>
      </div>
      <div className="ml-auto flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star 
            key={i} 
            size={12} 
            className={`${i <= Math.ceil(score / 200) ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`} 
          />
        ))}
      </div>
    </div>
  );
};

export default ReputationBadge;
