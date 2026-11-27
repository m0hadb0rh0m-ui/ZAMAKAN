// Lazy browser-only Cesium viewer. No streamed provider content is cached by this module.
import {ionToken} from './provider-config.js';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import {Viewer,Ion,IonGeocodeProviderType,Cartesian3,Math as CesiumMath,createGooglePhotorealistic3DTileset} from 'cesium';
export async function openRealistic3D(container,{token,lon,lat,signal,lowPower=false,onStatus=()=>{}}){
 const access=ionToken(token);
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 Ion.defaultAccessToken=access;
 // The default globe and imagery are disabled: Google's tiles are the only rendered base.
 const viewer=new Viewer(container,{globe:false,baseLayer:false,baseLayerPicker:false,geocoder:IonGeocodeProviderType.GOOGLE,animation:false,timeline:false,homeButton:false,sceneModePicker:false,navigationHelpButton:false,fullscreenButton:false,selectionIndicator:false,infoBox:false,requestRenderMode:true,maximumRenderTimeChange:Infinity,shadows:false,showRenderLoopErrors:false});
 viewer.targetFrameRate=lowPower?24:45;
 viewer.resolutionScale=lowPower?.75:1;
 const destroy=()=>{if(!viewer.isDestroyed())viewer.destroy();};
 signal?.addEventListener('abort',destroy,{once:true});
 try{
  viewer.camera.setView({destination:Cartesian3.fromDegrees(lon,lat,1800),orientation:{heading:0,pitch:CesiumMath.toRadians(-50),roll:0}});
  const tiles=await createGooglePhotorealistic3DTileset({onlyUsingWithGoogleGeocoder:true},{cacheBytes:(lowPower?96:192)*1024*1024,maximumCacheOverflowBytes:64*1024*1024,maximumScreenSpaceError:lowPower?32:20,showCreditsOnScreen:true});
  if(signal?.aborted||viewer.isDestroyed()){tiles.destroy();throw new DOMException('Aborted','AbortError');}
  viewer.scene.primitives.add(tiles);
  tiles.tileFailed.addEventListener(()=>onStatus('tile-error'));
  tiles.initialTilesLoaded.addEventListener(()=>onStatus('visible'));
  viewer.scene.renderError.addEventListener(()=>onStatus('render-error'));
  viewer.scene.requestRender();return destroy;
 }catch(e){destroy();throw e;}
}
