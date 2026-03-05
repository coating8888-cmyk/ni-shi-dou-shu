import { AstrolabeData } from '@/lib/astrolabe';

export function CareerSection({ astrolabeData }: { astrolabeData: AstrolabeData }) {
  const soulPalace = astrolabeData.palaces.find(p => p.isSoulPalace);
  const careerPalace = astrolabeData.palaces.find(p => p.name === '官祿宮');
  const wealthPalace = astrolabeData.palaces.find(p => p.name === '財帛宮');

  const getCareerSuggestions = () => {
    const mainStars = soulPalace?.majorStars.map(s => s.name) || [];
    const suggestions: string[] = [];

    if (mainStars.some(s => s.includes('紫微'))) suggestions.push('領導管理、企業主、高階主管、政府官員');
    if (mainStars.some(s => s.includes('天機'))) suggestions.push('策劃顧問、分析師、工程師、研發人員');
    if (mainStars.some(s => s.includes('太陽'))) suggestions.push('公職人員、教育工作、媒體傳播、公益事業');
    if (mainStars.some(s => s.includes('武曲'))) suggestions.push('金融財務、銀行業、會計師、投資理財');
    if (mainStars.some(s => s.includes('天同'))) suggestions.push('服務業、餐飲業、社工、心理諮商');
    if (mainStars.some(s => s.includes('廉貞'))) suggestions.push('法律相關、政治、公關、談判專家');
    if (mainStars.some(s => s.includes('天府'))) suggestions.push('財務管理、銀行業、保險業、資產管理');
    if (mainStars.some(s => s.includes('太陰'))) suggestions.push('不動產、室內設計、藝術創作、夜間工作');
    if (mainStars.some(s => s.includes('貪狼'))) suggestions.push('業務銷售、演藝娛樂、公關行銷、美容時尚');
    if (mainStars.some(s => s.includes('巨門'))) suggestions.push('律師、教師、演說家、命理師、醫生');
    if (mainStars.some(s => s.includes('天相'))) suggestions.push('秘書助理、人資管理、公關協調、服務業');
    if (mainStars.some(s => s.includes('天梁'))) suggestions.push('醫療保健、社會服務、宗教、教育');
    if (mainStars.some(s => s.includes('七殺'))) suggestions.push('軍警消防、運動員、開創型創業、冒險性工作');
    if (mainStars.some(s => s.includes('破軍'))) suggestions.push('變革創新、拆除重建、投機買賣、自由業');

    return suggestions.length > 0 ? suggestions : ['需綜合分析命宮與官祿宮的星曜組合'];
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl overflow-hidden border-2 border-blue-300">
        <div className="bg-blue-600 px-5 py-4">
          <span className="font-bold text-2xl text-white">命宮主星適合職業</span>
        </div>
        <div className="bg-blue-50 p-5">
          <div className="space-y-3">
            {getCareerSuggestions().map((suggestion, idx) => (
              <p key={idx} className="text-lg text-gray-700 flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>{suggestion}</span>
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border-2 border-green-300">
        <div className="bg-green-600 px-5 py-4 flex items-center justify-between">
          <span className="font-bold text-2xl text-white">官祿宮</span>
          <span className="bg-white/20 px-4 py-1 rounded-full text-white font-bold text-lg">
            {careerPalace?.majorStars.map(s => s.name).join('、') || '無主星'}
          </span>
        </div>
        <div className="bg-green-50 p-5">
          <p className="text-lg text-gray-700">
            官祿宮代表你的事業運和工作態度，是判斷職業方向的重要宮位。
          </p>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border-2 border-amber-300">
        <div className="bg-amber-500 px-5 py-4 flex items-center justify-between">
          <span className="font-bold text-2xl text-white">財帛宮</span>
          <span className="bg-white/20 px-4 py-1 rounded-full text-white font-bold text-lg">
            {wealthPalace?.majorStars.map(s => s.name).join('、') || '無主星'}
          </span>
        </div>
        <div className="bg-amber-50 p-5">
          <p className="text-lg text-gray-700">
            財帛宮代表你的財運和賺錢方式，與職業選擇息息相關。
          </p>
        </div>
      </div>
    </div>
  );
}
