// Fixed NASA GIBS products verified against the EPSG:3857 WMTS GetCapabilities.
// Start dates are first advertised days, not proof every later day is present.
export const IMAGERY_PRODUCTS=Object.freeze({
 terra:{name:'MODIS Terra · True Color',layer:'MODIS_Terra_CorrectedReflectance_TrueColor',start:'2000-02-24',maxzoom:9,format:'jpg'},
 aqua:{name:'MODIS Aqua · True Color',layer:'MODIS_Aqua_CorrectedReflectance_TrueColor',start:'2002-07-03',maxzoom:9,format:'jpg'},
 terra721:{name:'MODIS Terra · False Color 7-2-1',layer:'MODIS_Terra_CorrectedReflectance_Bands721',start:'2000-02-24',maxzoom:9,format:'jpg'},
 viirs20:{name:'VIIRS NOAA-20 · True Color',layer:'VIIRS_NOAA20_CorrectedReflectance_TrueColor',start:'2018-01-05',maxzoom:9,format:'jpg'},
 viirsnpp:{name:'VIIRS Suomi NPP · True Color',layer:'VIIRS_SNPP_CorrectedReflectance_TrueColor',start:'2015-11-24',maxzoom:9,format:'jpg'}
});
export function imageryProduct(id){if(!Object.hasOwn(IMAGERY_PRODUCTS,id))throw Error('Unknown GIBS imagery product');return IMAGERY_PRODUCTS[id];}
export function imageryTiles(day,id='terra',now=new Date()){
 const p=imageryProduct(id);
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day||day>now.toISOString().slice(0,10)||day<p.start)throw Error('Invalid imagery date for selected product');
 return ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/'+p.layer+'/default/'+day+'/GoogleMapsCompatible_Level9/{z}/{y}/{x}.'+p.format];
}
