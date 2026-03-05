export function OriginPalaceSection({ originPalace }: { originPalace: { branch: string; palace: string } }) {
  const originMeanings: Record<string, string> = {
    '命宮': '【自立格】凡事靠自己，操縱命運好壞。一切從自身出發，成敗皆由己。',
    '兄弟宮': '重視手足、媽媽、社交，與人緣、借貸有關。人際網絡是人生重要資源。',
    '夫妻宮': '注重感情、婚姻、人情，桃花多，受配偶影響深遠。另一半是人生關鍵。',
    '子女宮': '重視子女、合夥、桃花，帶驛馬，多應酬。與晚輩緣分深厚。',
    '財帛宮': '【自立格】為錢財辛勞，重視務實面。理財能力決定人生高度。',
    '疾厄宮': '【勞動格】重執行，事必躬親，需注意健康。身體是革命的本錢。',
    '遷移宮': '重視出外、社交、驛馬，常在外奔波。外出發展有貴人相助。',
    '交友宮': '靠眾生、朋友緣，需廣結善緣。人脈即錢脈，貴人運旺。',
    '官祿宮': '【工作型】事業心重，自立格。工作成就是人生價值所在。',
    '田宅宮': '重視家庭、家族、置產，有祖蔭。不動產運與家庭運是人生重點。',
    '福德宮': '重視興趣、享樂、業力，因果觀念重。精神層面的修練是人生課題。',
    '父母宮': '重視親情、長輩、上司，得父母之蔭。與長輩關係影響運勢。',
  };

  return (
    <div className="rounded-xl overflow-hidden border-2 border-yellow-400">
      <div className="bg-yellow-500 px-5 py-4 flex items-center justify-between">
        <span className="font-bold text-2xl text-white">來因宮</span>
        <span className="bg-white/20 px-4 py-1 rounded-full text-white font-bold text-xl">
          {originPalace.palace}（{originPalace.branch}）
        </span>
      </div>
      <div className="bg-yellow-50 p-5">
        <p className="text-lg text-gray-700 leading-relaxed">
          {originMeanings[originPalace.palace] || '來因宮代表此生投胎的原因與人生課題。'}
        </p>
      </div>
    </div>
  );
}
