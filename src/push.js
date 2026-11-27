import {Capacitor,registerPlugin} from '@capacitor/core';
const plugin=registerPlugin('ZamakanPush');
export const pushAvailable=()=>Capacitor.getPlatform()==='android'&&Capacitor.isPluginAvailable('ZamakanPush');
export async function pushDetails(){return pushAvailable()?await plugin.status():{enabled:false,lastReceived:0};}
export async function pushStatus(){return !!(await pushDetails()).enabled;}
export async function setPush(enabled){if(!pushAvailable())throw Error('Firebase project not configured');return enabled?plugin.enable():plugin.disable();}
