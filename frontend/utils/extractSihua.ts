import { AstrolabeData } from '@/lib/astrolabe';

export interface SihuaInfo {
  type: '祿' | '權' | '科' | '忌';
  star: string;
  palace: string;
  color: string;
  bgColor: string;
}

const colorMap = {
  '祿': { color: 'text-green-700', bgColor: 'bg-green-50' },
  '權': { color: 'text-red-700', bgColor: 'bg-red-50' },
  '科': { color: 'text-blue-700', bgColor: 'bg-blue-50' },
  '忌': { color: 'text-purple-700', bgColor: 'bg-purple-50' },
};

export function extractSihua(astrolabeData: AstrolabeData): SihuaInfo[] {
  const sihuaList: SihuaInfo[] = [];

  for (const palace of astrolabeData.palaces) {
    for (const star of [...palace.majorStars, ...palace.minorStars]) {
      if (star.mutagen && ['祿', '權', '科', '忌'].includes(star.mutagen)) {
        const type = star.mutagen as '祿' | '權' | '科' | '忌';
        sihuaList.push({
          type,
          star: star.name,
          palace: palace.name,
          ...colorMap[type],
        });
      }
    }
  }

  const order = ['祿', '權', '科', '忌'];
  sihuaList.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  return sihuaList;
}
