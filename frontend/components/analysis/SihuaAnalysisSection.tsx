import { clsx } from 'clsx';
import { SihuaInfo } from '@/utils/extractSihua';

export function SihuaAnalysisSection({ sihuaList }: { sihuaList: SihuaInfo[] }) {
  const sihuaMeanings: Record<string, { title: string; meaning: string; headerBg: string }> = {
    '祿': {
      title: '化祿',
      meaning: '代表福氣、財運、享受。化祿所在的宮位是你這輩子容易獲得收穫的領域。',
      headerBg: 'bg-green-600'
    },
    '權': {
      title: '化權',
      meaning: '代表權力、掌控力、執行力。化權所在的宮位是你這輩子能夠掌握主導權的領域。',
      headerBg: 'bg-red-600'
    },
    '科': {
      title: '化科',
      meaning: '代表名聲、貴人、學業。化科所在的宮位是你這輩子容易獲得好名聲或貴人相助的領域。',
      headerBg: 'bg-blue-600'
    },
    '忌': {
      title: '化忌',
      meaning: '代表執著、障礙、業力。化忌所在的宮位是你這輩子需要努力克服的課題。',
      headerBg: 'bg-purple-600'
    },
  };

  const sihuaBorderColors: Record<string, string> = {
    '祿': 'border-green-400',
    '權': 'border-red-400',
    '科': 'border-blue-400',
    '忌': 'border-purple-400',
  };

  return (
    <div className="space-y-4">
      {sihuaList.map((sihua, idx) => (
        <div key={idx} className={clsx('rounded-xl overflow-hidden border-2', sihuaBorderColors[sihua.type])}>
          {/* 標題區 */}
          <div className={clsx('px-5 py-4 flex items-center justify-between', sihuaMeanings[sihua.type]?.headerBg)}>
            <span className="font-bold text-2xl text-white">
              {sihuaMeanings[sihua.type]?.title}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl text-white font-bold">{sihua.star}</span>
              <span className="text-lg text-white/80">在</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-white font-bold text-lg">{sihua.palace}</span>
            </div>
          </div>

          {/* 內容區 */}
          <div className={clsx('p-5', sihua.bgColor)}>
            <p className="text-lg text-gray-700 mb-4">{sihuaMeanings[sihua.type]?.meaning}</p>
            <div className="bg-white/60 rounded-lg p-4">
              <p className="text-lg text-gray-700">
                {sihua.type === '祿' && `${sihua.palace}是你的福氣所在，在這個領域容易獲得好運與收穫。`}
                {sihua.type === '權' && `${sihua.palace}是你的權力所在，在這個領域你有主導權與決策力。`}
                {sihua.type === '科' && `${sihua.palace}是你的貴人所在，在這個領域容易得到幫助與好名聲。`}
                {sihua.type === '忌' && `${sihua.palace}是你的功課所在，在這個領域需要特別注意與努力。`}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
