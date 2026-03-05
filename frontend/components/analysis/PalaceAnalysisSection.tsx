import { clsx } from 'clsx';
import { PalaceData } from '@/lib/astrolabe';

export function PalaceAnalysisSection({
  palaces,
  originPalace
}: {
  palaces: PalaceData[];
  originPalace?: { branch: string; palace: string };
}) {
  const palaceOrder = ['命宮', '兄弟宮', '夫妻宮', '子女宮', '財帛宮', '疾厄宮',
                       '遷移宮', '交友宮', '官祿宮', '田宅宮', '福德宮', '父母宮'];

  const sortedPalaces = [...palaces].sort((a, b) =>
    palaceOrder.indexOf(a.name) - palaceOrder.indexOf(b.name)
  );

  const getPalaceMeaning = (palace: PalaceData) => {
    const meanings: Record<string, string> = {
      '命宮': '代表自己的個性、長相、才華與一生整體運勢',
      '兄弟宮': '代表兄弟姊妹關係、合作夥伴、手足緣分',
      '夫妻宮': '代表婚姻感情、配偶條件、夫妻相處',
      '子女宮': '代表子女緣分、生育運、與晚輩關係',
      '財帛宮': '代表財運、賺錢能力、理財方式',
      '疾厄宮': '代表健康狀況、身體弱點、災厄',
      '遷移宮': '代表外出運、出國運、在外發展',
      '交友宮': '代表朋友關係、人際關係、部屬',
      '官祿宮': '代表事業運、工作能力、社會地位',
      '田宅宮': '代表不動產運、家庭環境、祖業',
      '福德宮': '代表精神生活、福氣、內心世界',
      '父母宮': '代表與父母關係、長輩緣、遺傳',
    };
    return meanings[palace.name] || '';
  };

  return (
    <div className="space-y-4">
      {sortedPalaces.map((palace) => {
        const isOrigin = originPalace && palace.earthlyBranch === originPalace.branch;

        return (
          <div
            key={palace.name}
            className={clsx(
              'rounded-xl overflow-hidden border-2',
              palace.isSoulPalace ? 'border-red-400' :
              palace.isBodyPalace ? 'border-blue-400' :
              isOrigin ? 'border-yellow-400' :
              'border-gray-300'
            )}
          >
            {/* 宮位標題區 */}
            <div className={clsx(
              'px-5 py-4 flex items-center justify-between',
              palace.isSoulPalace ? 'bg-red-500' :
              palace.isBodyPalace ? 'bg-blue-500' :
              isOrigin ? 'bg-yellow-500' :
              'bg-gray-700'
            )}>
              <div className="flex items-center gap-3">
                <span className="font-bold text-2xl text-white">
                  {palace.name}
                </span>
                {palace.isSoulPalace && <span className="text-sm bg-white text-red-600 px-3 py-1 rounded-full font-bold">命</span>}
                {palace.isBodyPalace && <span className="text-sm bg-white text-blue-600 px-3 py-1 rounded-full font-bold">身</span>}
                {isOrigin && <span className="text-sm bg-white text-yellow-600 px-3 py-1 rounded-full font-bold">因</span>}
              </div>
              <span className="text-xl text-white font-bold">
                {palace.heavenlyStem}{palace.earthlyBranch}
              </span>
            </div>

            {/* 內容區 */}
            <div className={clsx(
              'p-5',
              palace.isSoulPalace ? 'bg-red-50' :
              palace.isBodyPalace ? 'bg-blue-50' :
              isOrigin ? 'bg-yellow-50' :
              'bg-gray-50'
            )}>
              <p className="text-base text-gray-600 mb-4">{getPalaceMeaning(palace)}</p>

              {/* 主星 */}
              <div className="mb-3">
                <span className="text-base font-bold text-gray-700">主星：</span>
                {palace.majorStars.length > 0 ? (
                  <span className="ml-2">
                    {palace.majorStars.map((star, idx) => (
                      <span key={idx} className="inline-flex items-center mr-3 text-lg">
                        <span className="font-semibold text-gray-800">{star.name}</span>
                        {star.brightness && <span className="text-sm text-gray-500 ml-1">({star.brightness})</span>}
                        {star.mutagen && (
                          <span className={clsx(
                            'text-base font-bold ml-1 px-1.5 py-0.5 rounded border',
                            star.mutagen === '祿' ? 'bg-green-100 border-green-400 text-green-700' :
                            star.mutagen === '權' ? 'bg-red-100 border-red-400 text-red-700' :
                            star.mutagen === '科' ? 'bg-blue-100 border-blue-400 text-blue-700' :
                            'bg-purple-100 border-purple-400 text-purple-700'
                          )}>
                            {star.mutagen}
                          </span>
                        )}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="ml-2 text-gray-400 text-lg">無主星（借對宮）</span>
                )}
              </div>

              {/* 輔星 */}
              {palace.minorStars.length > 0 && (
                <div>
                  <span className="text-base font-bold text-gray-700">輔星：</span>
                  <span className="ml-2 text-base text-gray-700">
                    {palace.minorStars.map((star, idx) => (
                      <span key={idx} className="mr-3">
                        {star.name}
                        {star.mutagen && (
                          <span className={clsx(
                            'font-bold ml-1 px-1.5 py-0.5 rounded border text-sm',
                            star.mutagen === '祿' ? 'bg-green-100 border-green-400 text-green-700' :
                            star.mutagen === '權' ? 'bg-red-100 border-red-400 text-red-700' :
                            star.mutagen === '科' ? 'bg-blue-100 border-blue-400 text-blue-700' :
                            'bg-purple-100 border-purple-400 text-purple-700'
                          )}>
                            {star.mutagen}
                          </span>
                        )}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
