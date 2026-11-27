export const destinations=[
 ['earth','earth','الرئيسية','Home'],['map','map','الخريطة','Map'],['observe','weather','الرصد','Observe'],['lab','fft','المختبر','Lab'],['more','settings','المزيد','More']
];
export const modules=[
 ['weather','weather','الطقس','Weather','توقعات ومقارنة النماذج','Forecasts and model comparisons','observe'],
 ['disasters','disasters','الكوارث','Natural events','زلازل وحرائق وبراكين','Earthquakes, fires and volcanoes','observe'],
 ['space','space','الفضاء','Space','نشاط شمسي ومدارات','Solar activity and orbits','observe'],
 ['air','air','البيئة','Environment','جودة الهواء والغبار','Air quality and dust','observe'],
 ['marine','marine','المحيطات','Oceans','الأمواج والتيارات','Waves and currents','observe'],
 ['climate','weather','المناخ وآلة الزمن','Climate & time machine','ERA5 · مقارنة الفترات','ERA5 · period comparison','observe'],
 ['imagery','map','الصور الفضائية','Satellite imagery','صور NASA بتاريخ محدد','Dated NASA imagery','observe'],
 ['radar','radar','الرادار','Radar','الأمطار وحقل الرياح','Precipitation and wind fields','observe'],
 ['gis','map','نظم المعلومات الجغرافية','GIS','قياس واستيراد هندسات','Measurement and geometry import','lab'],
 ['fft','fft','الإشارات','Signals','FFT · PSD · Spectrogram','FFT · PSD · Spectrogram','lab'],
 ['models','models','النماذج الجوية','Forecast models','IFS · GFS · ICON','IFS · GFS · ICON','lab'],
 ['orbit','orbit','المدارات','Orbits','SGP4 والأقمار المدنية','SGP4 and civil satellites','lab'],
 ['cap','cap','رسائل CAP','CAP alerts','تحقق من التحذيرات','Alert verification','lab'],
 ['twin','twin','المباني 3D','3D buildings','طبقات المباني والملفات','Buildings and file layers','map'],
 ['projects','sources','المشاريع المحلية','Local projects','حفظ واستعادة وتصدير','Save, restore and export','more'],
 ['analysis','analysis','التحليل والتقارير','Analysis & reports','تحليل علمي وتصدير','Scientific analysis and export','more'],
 ['ai','ai','زَمَكان AI','ZAMAKAN AI','مساعد اختياري','Optional assistant','more'],
 ['sources','sources','المصادر','Sources','سجل البيانات والمراجع','Data registry and references','more'],
 ['status','status','حالة المصادر','Source health','فحوص الاتصال والحداثة','Connectivity and freshness','more']
];
export const MAP_MODULES=new Set(['map','twin','radar','orbit','cap']);
export function groupFor(tab){return destinations.some(x=>x[0]===tab)?tab:modules.find(x=>x[0]===tab)?.[6]||'earth';}
export function loadFavorites(storage=globalThis.localStorage){try{let a=JSON.parse(storage.getItem('zamakan.favorites')||'[]');return Array.isArray(a)?a.filter(x=>typeof x.name==='string'&&Number.isFinite(x.lat)&&Math.abs(x.lat)<=90&&Number.isFinite(x.lon)&&Math.abs(x.lon)<=180).slice(0,12):[];}catch{return [];}}
export function saveFavorites(items,storage=globalThis.localStorage){try{storage.setItem('zamakan.favorites',JSON.stringify(items.slice(0,12)));}catch{}}
