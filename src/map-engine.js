// MapLibre style adapter. No third-party credentials or map tiles are persisted.
export const MAPTILER_KEY = (import.meta.env?.VITE_MAPTILER_PUBLIC_KEY || '').trim();
export const OPEN_STYLES = {
 streets:'https://tiles.openfreemap.org/styles/liberty',
 light:'https://tiles.openfreemap.org/styles/positron',
 dark:'https://tiles.openfreemap.org/styles/fiord'
};
const maptilerStyles={satellite:'satellite-v4',hybrid:'hybrid-v4',terrain:'outdoor-v4',topographic:'topo-v4'};
export const MODES=['streets','light','dark','satellite','hybrid','terrain','topographic'];
export function styleUrl(mode,key=MAPTILER_KEY){
 if(OPEN_STYLES[mode])return OPEN_STYLES[mode];
 if(maptilerStyles[mode]&&key)return 'https://api.maptiler.com/maps/'+maptilerStyles[mode]+'/style.json?key='+encodeURIComponent(key);
 throw Error('Map mode requires a configured MapTiler public key');
}
export const emptyGeo=()=>({type:'FeatureCollection',features:[]});
export const motion=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?0:850;
export const isCommercialMode=mode=>Object.hasOwn(maptilerStyles,mode);
export function zoomFor(type){
 const groups={continent:2,country:5,region:7,state:7,county:9,district:14,city:12,place:12,town:13,village:14,municipality:12,locality:14,neighbourhood:15,neighborhood:15,suburb:15,street:17,road:17,address:19,building:19,poi:18,coordinate:18};
 return groups[String(type||'').toLowerCase()]??12;
}
export function gpsZoom(accuracy){
 return !Number.isFinite(accuracy)?16:Math.max(10,Math.min(19,Math.round(19-Math.log2(Math.max(10,accuracy)/10))));
}
export function prepareStyle(style,mode){
 if(style?.version!==8||!Array.isArray(style.layers)||!style.sources)throw Error('Invalid provider style');
 // Preserve the footprints at all high zoom levels. Extrusions are enabled explicitly.
 for(const l of style.layers){
  if(l.type==='fill-extrusion')l.layout={...l.layout,visibility:'none'};
  if(l.type==='fill'&&l['source-layer']==='building')delete l.maxzoom;
 }
 // OpenMapTiles Liberty omits house numbers from its default style.
 if(OPEN_STYLES[mode]&&style.sources.openmaptiles&&!style.layers.some(l=>l['source-layer']==='housenumber')){
  style.layers.push({id:'z-house-number',type:'symbol',source:'openmaptiles','source-layer':'housenumber',minzoom:17,layout:{'text-field':['to-string',['get','housenumber']],'text-font':['Noto Sans Regular'],'text-size':10},paint:{'text-color':mode==='dark'?'#e4e9ef':'#59616a','text-halo-color':mode==='dark'?'#202630':'#fff','text-halo-width':1}});
 }
 return style;
}
export async function fetchStyle(mode,signal,fetcher=globalThis.fetch,key=MAPTILER_KEY){
 const response=await fetcher(styleUrl(mode,key),{signal});
 if(!response.ok)throw Error('Map style HTTP '+response.status);
 return prepareStyle(await response.json(),mode);
}
export function setBuildings(map,enabled){
 for(const layer of map.getStyle().layers||[]){
  if(layer.type==='fill-extrusion'&&layer['source-layer']==='building')map.setLayoutProperty(layer.id,'visibility',enabled?'visible':'none');
 }
 const source=Object.entries(map.getStyle().sources).find(([id,s])=>s.type==='vector'&&id==='openmaptiles')?.[0];
 if(source&&!map.getLayer('z-buildings')&&!(map.getStyle().layers||[]).some(l=>l.type==='fill-extrusion'&&l['source-layer']==='building')){
  map.addLayer({id:'z-buildings',type:'fill-extrusion',source,'source-layer':'building',minzoom:14,filter:['!',['has','hide_3d']],layout:{visibility:enabled?'visible':'none'},paint:{'fill-extrusion-color':'#c6c5bd','fill-extrusion-height':['max',0,['coalesce',['get','render_height'],0]],'fill-extrusion-base':['max',0,['coalesce',['get','render_min_height'],0]],'fill-extrusion-opacity':0.82}});
 }
}
export function restoreOverlays(map,imageryTiles){
 const add=(id,s)=>{if(!map.getSource(id))map.addSource(id,s)};
 const layer=(l,before)=>{if(!map.getLayer(l.id))map.addLayer(l,before)};
 add('events',{type:'geojson',data:emptyGeo(),cluster:true,clusterMaxZoom:10,clusterRadius:45});
 add('selection',{type:'geojson',data:emptyGeo()});
 add('measure',{type:'geojson',data:emptyGeo()});
 layer({id:'event-clusters',type:'circle',source:'events',filter:['has','point_count'],paint:{'circle-color':'#286b80','circle-radius':['step',['get','point_count'],18,30,23,100,28],'circle-stroke-color':'#fff','circle-stroke-width':1.5}});
 // A vector base provides glyphs; clusters remain usable in imagery styles without glyphs.
 if(map.getStyle().glyphs)layer({id:'event-count',type:'symbol',source:'events',filter:['has','point_count'],layout:{'text-field':['to-string',['get','point_count_abbreviated']],'text-font':['Noto Sans Regular'],'text-size':12},paint:{'text-color':'#fff'}});
 layer({id:'quakes',type:'circle',source:'events',filter:['!',['has','point_count']],paint:{'circle-color':['get','color'],'circle-radius':['interpolate',['linear'],['zoom'],0,4,6,6,12,9],'circle-stroke-width':1.5,'circle-stroke-color':'#fff','circle-opacity':0.88}});
 layer({id:'measureline',type:'line',source:'measure',paint:{'line-color':'#e3a72f','line-width':4}});
 layer({id:'selection',type:'circle',source:'selection',paint:{'circle-color':'#1968e4','circle-radius':8,'circle-stroke-color':'#fff','circle-stroke-width':3}});
 if(imageryTiles)addScientific(map,imageryTiles);
}
export function addScientific(map,tiles){
 if(map.getLayer('scientific'))map.removeLayer('scientific');
 if(map.getSource('scientific'))map.removeSource('scientific');
 if(!tiles)return;
 map.addSource('scientific',{type:'raster',tiles,tileSize:256,maxzoom:9,attribution:'NASA EOSDIS GIBS · MODIS Terra'});
 map.addLayer({id:'scientific',type:'raster',source:'scientific',paint:{'raster-opacity':0.72}},'event-clusters');
}
export function setTerrain(map,enabled,key=MAPTILER_KEY){
 if(!enabled){if(map.getTerrain())map.setTerrain(null);return;}
 if(!key)return;
 if(!map.getSource('z-dem'))map.addSource('z-dem',{type:'raster-dem',url:'https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key='+encodeURIComponent(key),tileSize:256,maxzoom:14,encoding:'mapbox'});
 map.setTerrain({source:'z-dem',exaggeration:1});
}
