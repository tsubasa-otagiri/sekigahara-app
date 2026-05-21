import { TTW, CTW, PCL } from "../../constants/index.js";

export const TeamBadge = ({ team }) => {
  const m = TTW[team] ?? TTW["全社FS"];
  return (
    <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${m.bg} ${m.txt} ${m.bd}`}>
      {team}
    </span>
  );
};

export const ConfBadge = ({ conf }) => {
  const m = CTW[conf] ?? CTW["30%"];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${m.bg} ${m.txt} ${m.bd}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {conf}
    </span>
  );
};

export const PlanBadge = ({ plan }) => {
  const cls = PCL[plan] ?? "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${cls}`}>
      {plan}
    </span>
  );
};
