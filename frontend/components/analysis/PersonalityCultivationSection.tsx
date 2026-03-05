import { AstrolabeData } from '@/lib/astrolabe';

export function PersonalityCultivationSection({ astrolabeData }: { astrolabeData: AstrolabeData }) {
  const soulPalace = astrolabeData.palaces.find(p => p.isSoulPalace);
  const mainStars = soulPalace?.majorStars || [];

  const getPersonalityAnalysis = () => {
    const analyses: { trait: string; cultivation: string }[] = [];

    for (const star of mainStars) {
      if (star.name.includes('紫微')) {
        analyses.push({
          trait: '【紫微星性格】天生具有領導氣質，自尊心強，不喜歡被人指揮。有帝王般的氣度，但也容易顯得高傲。',
          cultivation: '【修練心法】學習放下身段，傾聽他人意見。真正的領導者懂得授權與信任。培養謙虛的心態，不要凡事都要自己扛。'
        });
      }
      if (star.name.includes('天機')) {
        analyses.push({
          trait: '【天機星性格】聰明機智，思維敏捷，善於分析。但容易想太多，有時會猶豫不決。',
          cultivation: '【修練心法】學習果斷決策，不要過度分析。信任自己的直覺，該行動時就行動。培養定力，減少胡思亂想。'
        });
      }
      if (star.name.includes('太陽')) {
        analyses.push({
          trait: '【太陽星性格】熱情開朗，樂於助人，有正義感。但容易過度付出，忽略自己的需求。',
          cultivation: '【修練心法】學習適度付出，照顧好自己才能照顧別人。不要當濫好人，學會說不。保持熱情但要有界限。'
        });
      }
      if (star.name.includes('武曲')) {
        analyses.push({
          trait: '【武曲星性格】剛毅果斷，重視實際，有財運頭腦。但容易過於嚴肅，缺乏柔軟度。',
          cultivation: '【修練心法】學習柔軟處事，不要太過強硬。錢財重要但不是一切，培養興趣愛好，豐富生活。'
        });
      }
      if (star.name.includes('天同')) {
        analyses.push({
          trait: '【天同星性格】溫和善良，隨和好相處，喜歡享受生活。但容易懶散，缺乏進取心。',
          cultivation: '【修練心法】培養積極進取的態度，不要太安逸。設定目標並努力達成，享受生活也要有所成就。'
        });
      }
      if (star.name.includes('廉貞')) {
        analyses.push({
          trait: '【廉貞星性格】精明能幹，有企圖心，善於交際。但容易固執己見，有時顯得強勢。',
          cultivation: '【修練心法】學習接納不同意見，不要太堅持己見。處事圓融，不要樹敵太多。修練心性，減少物慾。'
        });
      }
      if (star.name.includes('天府')) {
        analyses.push({
          trait: '【天府星性格】穩重大方，有包容心，善於理財。但容易保守，不願冒險。',
          cultivation: '【修練心法】適度嘗試新事物，不要太過保守。保持開放心態，學習新知識新技能。'
        });
      }
      if (star.name.includes('太陰')) {
        analyses.push({
          trait: '【太陰星性格】細膩敏感，富有藝術氣質，重視家庭。但容易多愁善感，情緒起伏大。',
          cultivation: '【修練心法】培養情緒管理能力，不要太過敏感。多曬太陽，保持樂觀心態。發揮藝術天分，找到情感出口。'
        });
      }
      if (star.name.includes('貪狼')) {
        analyses.push({
          trait: '【貪狼星性格】多才多藝，交際能力強，追求享受。但容易貪心不足，慾望較重。',
          cultivation: '【修練心法】學習知足常樂，減少不必要的慾望。專注在真正重要的事情上，不要太過分心。'
        });
      }
      if (star.name.includes('巨門')) {
        analyses.push({
          trait: '【巨門星性格】口才好，有分析能力，善於發現問題。但容易多疑，有時言語傷人。',
          cultivation: '【修練心法】說話前三思，不要太過直接。培養信任感，不要過度懷疑。把口才用在正面的地方。'
        });
      }
      if (star.name.includes('天相')) {
        analyses.push({
          trait: '【天相星性格】重視形象，人緣好，善於協調。但容易優柔寡斷，過度在意別人看法。',
          cultivation: '【修練心法】培養獨立思考能力，不要太在意他人眼光。做自己，不要為了討好別人而失去自我。'
        });
      }
      if (star.name.includes('天梁')) {
        analyses.push({
          trait: '【天梁星性格】有正義感，樂於助人，能化解災厄。但容易管太多，有時顯得嘮叨。',
          cultivation: '【修練心法】學習適可而止，不要過度干涉他人。幫助別人也要尊重對方的選擇。修練慈悲心。'
        });
      }
      if (star.name.includes('七殺')) {
        analyses.push({
          trait: '【七殺星性格】勇敢果斷，有開創精神，不畏困難。但容易衝動，有時過於強勢。',
          cultivation: '【修練心法】三思而後行，不要太衝動。學習耐心等待，不是所有事情都要馬上解決。收斂鋒芒，以和為貴。'
        });
      }
      if (star.name.includes('破軍')) {
        analyses.push({
          trait: '【破軍星性格】勇於變革，不滿現狀，追求突破。但容易破壞多於建設，難以持久。',
          cultivation: '【修練心法】學習堅持到底，不要輕易放棄。破壞之後要懂得建設。培養耐心，不要急於求成。'
        });
      }
    }

    return analyses.length > 0 ? analyses : [{
      trait: '【無主星】命宮無主星，需借對宮主星來看。性格較為複雜多變。',
      cultivation: '【修練心法】培養穩定的核心價值觀，不要隨波逐流。找到自己的人生方向。'
    }];
  };

  return (
    <div className="space-y-5">
      {getPersonalityAnalysis().map((analysis, idx) => (
        <div key={idx} className="rounded-xl overflow-hidden border-2 border-gray-300">
          <div className="bg-rose-600 px-5 py-3">
            <span className="font-bold text-xl text-white">性格特質</span>
          </div>
          <div className="bg-rose-50 p-5">
            <p className="text-lg text-gray-800 leading-relaxed">{analysis.trait}</p>
          </div>

          <div className="bg-teal-600 px-5 py-3">
            <span className="font-bold text-xl text-white">修練心法</span>
          </div>
          <div className="bg-teal-50 p-5">
            <p className="text-lg text-gray-800 leading-relaxed">{analysis.cultivation}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
