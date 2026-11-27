import {Capacitor,registerPlugin} from '@capacitor/core';
const plugin=registerPlugin('ZamakanPush');
export const pushAvailable=()=>Capacitor.getPlatform()==='android'&&Capacitor.isPluginAvailable('ZamakanPush');
export async function pushStatus(){return pushAvailable()?!!(await plugin.status()).enabled:false;}
export async function setPush(enabled){if(!pushAvailable())throw Error('Firebase project not configured');return enabled?plugin.enable():plugin.disable();}
