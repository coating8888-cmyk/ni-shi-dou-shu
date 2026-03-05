import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AIReadingResponse } from '@/lib/api';
import { AstrolabeData } from '@/lib/astrolabe';

function formatPdfContent(text: string): string {
  if (!text) return '';

  let result = text
    .replace(/##/g, '')
    .replace(/\[\[.*?\]\]/g, '')
    .replace(/化祿在/g, '<br/><br/><strong style="color: #6ee7b7; font-size: 24px;">🌸 化祿</strong><br/>化祿在')
    .replace(/化權在/g, '<br/><br/><strong style="color: #fda4af; font-size: 24px;">🌺 化權</strong><br/>化權在')
    .replace(/化科在/g, '<br/><br/><strong style="color: #7dd3fc; font-size: 24px;">🦋 化科</strong><br/>化科在')
    .replace(/化忌在/g, '<br/><br/><strong style="color: #c4b5fd; font-size: 24px;">🔮 化忌</strong><br/>化忌在')
    .replace(/(事業運方面)[，,]/g, '<div style="margin: 20px 0; padding: 15px; background: #f0f9ff; border-left: 5px solid #7dd3fc; border-radius: 0 10px 10px 0;"><strong style="color: #7dd3fc; font-size: 24px;">💼 $1</strong><br/>')
    .replace(/(財運方面)[，,]/g, '</div><div style="margin: 20px 0; padding: 15px; background: #ecfdf5; border-left: 5px solid #6ee7b7; border-radius: 0 10px 10px 0;"><strong style="color: #6ee7b7; font-size: 24px;">💰 $1</strong><br/>')
    .replace(/(感情運方面)[，,]/g, '</div><div style="margin: 20px 0; padding: 15px; background: #fdf2f8; border-left: 5px solid #f9a8d4; border-radius: 0 10px 10px 0;"><strong style="color: #f9a8d4; font-size: 24px;">💕 $1</strong><br/>')
    .replace(/(健康方面)[，,]/g, '</div><div style="margin: 20px 0; padding: 15px; background: #fff1f2; border-left: 5px solid #fda4af; border-radius: 0 10px 10px 0;"><strong style="color: #fda4af; font-size: 24px;">🌷 $1</strong><br/>')
    .replace(/([\u4e00-\u9fa5]{2,8}(?:建議|分析|方面|重點))：/g,
      '<div style="margin: 15px 0 10px 0; font-weight: bold; color: #a5b4fc; font-size: 22px;">▸ $1：</div>')
    .replace(/([一二三四五六七八九十]+)、/g,
      '<div style="margin: 10px 0; padding: 10px 15px; background: #faf5ff; border-left: 4px solid #c4b5fd; border-radius: 0 8px 8px 0;"><strong style="color: #c4b5fd; font-size: 22px;">$1、</strong>')
    .replace(/(\d+)[\.、]/g,
      '<div style="margin: 10px 0; padding: 10px 15px; background: #faf5ff; border-left: 4px solid #c4b5fd; border-radius: 0 8px 8px 0;"><strong style="color: #c4b5fd; font-size: 22px;">$1.</strong> ')
    .replace(/。建議/g, '。</div><div style="margin: 12px 0; padding: 12px 15px; background: #f0f9ff; border-left: 5px solid #7dd3fc; border-radius: 0 8px 8px 0;"><strong style="color: #7dd3fc; font-size: 22px;">💡</strong> 建議')
    + '</div>';

  result = result
    .replace(/<\/div><\/div>/g, '</div>')
    .replace(/^<\/div>/g, '')
    .replace(/<div[^>]*>\s*<\/div>/g, '');

  return result;
}

export async function exportPDF(
  aiResponse: AIReadingResponse,
  astrolabeData: AstrolabeData,
  userName?: string,
): Promise<void> {
  const reportDiv = document.createElement('div');
  reportDiv.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: 1000px;
    padding: 50px;
    background: white;
    font-family: "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif;
    font-size: 24px;
    line-height: 1.8;
    color: #1f2937;
  `;

  const sections = [
    { title: '🎀 總盤解析', content: aiResponse.overall_reading, color: '#f9a8d4', lightBg: '#fdf2f8' },
    { title: '🌿 整張盤最好的地方', content: aiResponse.best_parts, color: '#6ee7b7', lightBg: '#ecfdf5' },
    { title: '⚠️ 最需要注意的地方', content: aiResponse.caution_parts, color: '#fdba74', lightBg: '#fff7ed' },
    { title: '🌟 來因宮解析', content: aiResponse.origin_palace_reading, color: '#fcd34d', lightBg: '#fefce8' },
    { title: '🎯 身宮解析', content: aiResponse.body_palace_reading, color: '#7dd3fc', lightBg: '#f0f9ff' },
    { title: '⭐ 四化解析', content: aiResponse.sihua_reading, color: '#c4b5fd', lightBg: '#f5f3ff' },
    { title: '🔮 大限解析（十年大運）', content: aiResponse.decadal_reading, color: '#a5b4fc', lightBg: '#eef2ff' },
    { title: '📅 流年解析', content: aiResponse.yearly_reading, color: '#67e8f9', lightBg: '#ecfeff' },
    { title: '💼 事業發展', content: aiResponse.career_reading, color: '#6ee7b7', lightBg: '#ecfdf5' },
    { title: '💕 感情婚姻', content: aiResponse.relationship_reading, color: '#fbcfe8', lightBg: '#fdf2f8' },
    { title: '🌷 健康分析', content: aiResponse.health_reading, color: '#fda4af', lightBg: '#fff1f2' },
    { title: '🦋 修練心法與建議', content: aiResponse.recommendations, color: '#99f6e4', lightBg: '#f0fdfa' },
  ];

  let html = `
    <div style="text-align: center; margin-bottom: 50px; border-bottom: 3px solid #f9a8d4; padding-bottom: 30px;">
      <h1 style="font-size: 48px; background: linear-gradient(135deg, #f9a8d4, #c4b5fd); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; font-weight: bold;">🌸 紫微斗數 AI 批命報告 ✨</h1>
      <p style="color: #f9a8d4; margin-top: 15px; font-size: 22px;">基於倪海廈老師紫微斗數理論</p>
    </div>

    <div style="background: linear-gradient(135deg, #fdf2f8, #fce7f3); border-radius: 20px; padding: 35px; margin-bottom: 40px; border: 2px solid #fbcfe8;">
      <h3 style="color: #ec4899; margin: 0 0 25px 0; font-size: 30px; font-weight: bold;">🎀 基本資料</h3>
      <table style="width: 100%; font-size: 22px;">
        <tr>
          <td style="padding: 12px 0; width: 50%;"><strong>陽曆：</strong>${astrolabeData.solarDate}</td>
          <td style="padding: 12px 0;"><strong>農曆：</strong>${astrolabeData.lunarDate}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0;"><strong>時辰：</strong>${astrolabeData.time}時 (${astrolabeData.timeRange})</td>
          <td style="padding: 12px 0;"><strong>性別：</strong>${astrolabeData.gender}　<strong>生肖：</strong>${astrolabeData.zodiac}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0;"><strong>五行局：</strong>${astrolabeData.fiveElementsClass}</td>
          <td style="padding: 12px 0;"><strong>命主：</strong>${astrolabeData.soulStar}　<strong>身主：</strong>${astrolabeData.bodyStar}</td>
        </tr>
        ${astrolabeData.age ? `<tr><td style="padding: 12px 0;"><strong>虛歲：</strong>${astrolabeData.age}</td><td style="padding: 12px 0;"><strong>實歲：</strong>${astrolabeData.realAge}</td></tr>` : ''}
      </table>
    </div>
  `;

  for (const section of sections) {
    if (section.content) {
      const formattedContent = formatPdfContent(section.content);
      html += `
        <div style="margin-bottom: 40px; page-break-inside: avoid;">
          <div style="background: ${section.color}; color: white; padding: 18px 30px; border-radius: 16px 16px 0 0; font-size: 28px; font-weight: bold;">
            ${section.title}
          </div>
          <div style="background: ${section.lightBg}; border: 3px solid ${section.color}40; border-top: none; border-radius: 0 0 16px 16px; padding: 30px;">
            <div style="margin: 0; line-height: 1.8; font-size: 22px;">${formattedContent}</div>
          </div>
        </div>
      `;
    }
  }

  if (aiResponse.palace_readings && Object.keys(aiResponse.palace_readings).length > 0) {
    const palaceColors: Record<string, { header: string; bg: string; border: string }> = {
      '命宮': { header: '#fda4af', bg: '#fff1f2', border: '#fecdd3' },
      '兄弟宮': { header: '#fdba74', bg: '#fff7ed', border: '#fed7aa' },
      '夫妻宮': { header: '#f9a8d4', bg: '#fdf2f8', border: '#fbcfe8' },
      '子女宮': { header: '#c4b5fd', bg: '#faf5ff', border: '#e9d5ff' },
      '財帛宮': { header: '#6ee7b7', bg: '#ecfdf5', border: '#a7f3d0' },
      '疾厄宮': { header: '#fca5a5', bg: '#fef2f2', border: '#fecaca' },
      '遷移宮': { header: '#67e8f9', bg: '#ecfeff', border: '#a5f3fc' },
      '交友宮': { header: '#fcd34d', bg: '#fefce8', border: '#fef08a' },
      '官祿宮': { header: '#7dd3fc', bg: '#f0f9ff', border: '#bae6fd' },
      '田宅宮': { header: '#bef264', bg: '#f7fee7', border: '#d9f99d' },
      '福德宮': { header: '#c4b5fd', bg: '#f5f3ff', border: '#ddd6fe' },
      '父母宮': { header: '#99f6e4', bg: '#f0fdfa', border: '#a7f3d0' },
    };
    const defaultColor = { header: '#e2e8f0', bg: '#f8fafc', border: '#e2e8f0' };

    html += `
      <div style="margin-bottom: 30px;">
        <div style="background: linear-gradient(135deg, #f9a8d4, #c4b5fd); color: white; padding: 20px 35px; border-radius: 16px; font-size: 30px; font-weight: bold; text-align: center;">
          🏛️ 各宮位解析
        </div>
      </div>
    `;

    for (const [palaceName, reading] of Object.entries(aiResponse.palace_readings)) {
      const formattedReading = formatPdfContent(reading);
      const colors = palaceColors[palaceName] || defaultColor;
      html += `
        <div style="margin-bottom: 30px; border-radius: 16px; overflow: hidden; border: 3px solid ${colors.border};">
          <div style="background: ${colors.header}; color: white; padding: 15px 25px; font-size: 26px; font-weight: bold;">
            ◆ ${palaceName}
          </div>
          <div style="background: ${colors.bg}; padding: 25px; line-height: 1.8; font-size: 22px;">
            ${formattedReading}
          </div>
        </div>
      `;
    }
  }

  html += `
    <div style="text-align: center; margin-top: 50px; padding-top: 30px; border-top: 2px solid #fbcfe8; color: #f9a8d4; font-size: 20px;">
      <p style="margin: 8px 0;">🌸 以上批命僅供參考，基於倪海廈老師之紫微斗數教學 🌸</p>
      <p style="margin: 8px 0;">報告產生時間：${new Date().toLocaleString('zh-TW')}</p>
    </div>
  `;

  reportDiv.innerHTML = html;
  document.body.appendChild(reportDiv);

  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    const maxContentHeight = pageHeight - margin * 2;

    const pdfSections = reportDiv.querySelectorAll(':scope > div');
    let currentY = margin;
    let isFirstPage = true;

    for (let i = 0; i < pdfSections.length; i++) {
      const pdfSection = pdfSections[i] as HTMLElement;

      const sectionCanvas = await html2canvas(pdfSection, {
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 1000,
        scale: 2,
      });

      const sectionImgHeight = (sectionCanvas.height * contentWidth) / sectionCanvas.width;
      const remainingPageSpace = pageHeight - margin - currentY;

      if (!isFirstPage && sectionImgHeight > remainingPageSpace * 0.8 && sectionImgHeight <= maxContentHeight) {
        pdf.addPage();
        currentY = margin;
      }

      if (sectionImgHeight > maxContentHeight) {
        if (remainingPageSpace < maxContentHeight * 0.3) {
          pdf.addPage();
          currentY = margin;
        }

        let remainingHeight = sectionImgHeight;
        let sourceY = 0;

        while (remainingHeight > 0) {
          const availableHeight = pageHeight - margin - currentY;
          const heightToDraw = Math.min(remainingHeight, availableHeight);
          const sourceHeight = (heightToDraw / sectionImgHeight) * sectionCanvas.height;

          const croppedCanvas = document.createElement('canvas');
          croppedCanvas.width = sectionCanvas.width;
          croppedCanvas.height = Math.ceil(sourceHeight);
          const ctx = croppedCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(
              sectionCanvas,
              0, sourceY, sectionCanvas.width, sourceHeight,
              0, 0, sectionCanvas.width, sourceHeight
            );
          }

          const croppedImgData = croppedCanvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(croppedImgData, 'JPEG', margin, currentY, contentWidth, heightToDraw);

          remainingHeight -= heightToDraw;
          sourceY += sourceHeight;
          currentY += heightToDraw;

          if (remainingHeight > 0) {
            pdf.addPage();
            currentY = margin;
          }
        }
      } else {
        const imgData = sectionCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', margin, currentY, contentWidth, sectionImgHeight);
        currentY += sectionImgHeight + 3;
      }

      isFirstPage = false;
    }

    const fileName = userName ? `${userName}-倪師斗數分析.pdf` : `倪師斗數分析_${astrolabeData.solarDate?.replace(/\//g, '-') || 'report'}.pdf`;
    pdf.save(fileName);
  } finally {
    document.body.removeChild(reportDiv);
  }
}
