import { clsx } from 'clsx';
import { AstrolabeData } from '@/lib/astrolabe';
import { SihuaInfo } from '@/utils/extractSihua';

export function OverallAnalysisSection({
  astrolabeData,
  sihuaList
}: {
  astrolabeData: AstrolabeData;
  sihuaList: SihuaInfo[];
}) {
  // 找出命宮主星
  const soulPalace = astrolabeData.palaces.find(p => p.isSoulPalace);
  const mainStars = soulPalace?.majorStars.map(s => s.name).join('、') || '無主星';

  // 找出身宮
  const bodyPalace = astrolabeData.palaces.find(p => p.isBodyPalace);

  return (
    <div className="space-y-5 text-lg leading-relaxed">
      <div className="bg-amber-50 rounded-lg p-5">
        <h4 className="font-bold text-amber-800 mb-3 text-xl">命盤基本格局</h4>
        <ul className="space-y-3 text-gray-800 text-lg">
          <li>• <strong>命宮主星：</strong>{mainStars}</li>
          <li>• <strong>命宮位置：</strong>{soulPalace?.name}（{soulPalace?.earthlyBranch}宮）</li>
          <li>• <strong>身宮位置：</strong>{bodyPalace?.name}（{bodyPalace?.earthlyBranch}宮）</li>
          <li>• <strong>五行局：</strong>{astrolabeData.fiveElementsClass}</li>
          <li>• <strong>命主星：</strong>{astrolabeData.soulStar}</li>
          <li>• <strong>身主星：</strong>{astrolabeData.bodyStar}</li>
        </ul>
      </div>

      <div className="bg-purple-50 rounded-lg p-5">
        <h4 className="font-bold text-purple-800 mb-3 text-xl">本命四化</h4>
        <div className="grid grid-cols-2 gap-4">
          {sihuaList.map((sihua, idx) => (
            <div key={idx} className={clsx('rounded-lg p-4', sihua.bgColor)}>
              <span className={clsx('font-bold text-xl', sihua.color)}>化{sihua.type}</span>
              <span className="text-gray-700 ml-2 text-lg">{sihua.star}</span>
              <span className="text-gray-500 text-base ml-1">在{sihua.palace}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
