import { AstrolabeData } from '@/lib/astrolabe';

export function MajorFortuneSection({ astrolabeData }: { astrolabeData: AstrolabeData }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl overflow-hidden border-2 border-indigo-300">
        <div className="bg-indigo-600 px-5 py-4">
          <span className="font-bold text-2xl text-white">五行局：{astrolabeData.fiveElementsClass}</span>
        </div>
        <div className="bg-indigo-50 p-5">
          <p className="text-lg text-gray-700">
            大運（大限）是紫微斗數中重要的時間概念，每個大限為十年。
            根據你的五行局，可以推算各大限的運勢。
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
        <h4 className="font-bold text-xl text-gray-800 mb-4">大運看法重點</h4>
        <ul className="space-y-3 text-lg text-gray-700">
          <li className="flex gap-3">
            <span className="text-indigo-600 font-bold">•</span>
            <span>大限命宮的星曜組合決定該十年的整體運勢</span>
          </li>
          <li className="flex gap-3">
            <span className="text-indigo-600 font-bold">•</span>
            <span>大限四化會影響該時期的吉凶</span>
          </li>
          <li className="flex gap-3">
            <span className="text-indigo-600 font-bold">•</span>
            <span>大限宮位與本命宮位的互動關係</span>
          </li>
          <li className="flex gap-3">
            <span className="text-indigo-600 font-bold">•</span>
            <span>流年、流月可以更細緻地看短期運勢</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
