// Explicit development-only monitor fixtures; never report as real observations.
export async function mockSourceFetch(url){
 const t=Date.now(),iso=new Date(t).toISOString(),features={type:'FeatureCollection',features:[],metadata:{generated:t}};
 let d;
 if(url.includes('gdacs.org'))return new Response('<rss><channel><lastBuildDate>'+new Date(t-20*60000).toUTCString()+'</lastBuildDate></channel></rss>');
 if(url.includes('earthquake.usgs')||url.includes('weather.gov'))d=features;
 else if(url.includes('geocoding-api'))d={results:[{name:'Fixture'}]};
 else if(url.includes('open-meteo'))d={current:{time:iso}};
 else if(url.includes('eonet'))d={events:[]};
 else if(url.includes('planetary-k'))d=[['time_tag','kp'],[iso,2]];
 else if(url.includes('swpc'))d=[{time_tag:iso,active:true,proton_speed:300,bt:4,flux:1e-7}];
 else if(url.includes('rainviewer'))d={radar:{past:[{time:t/1000}]}};
 else if(url.includes('celestrak'))d=[{EPOCH:iso.slice(0,-1)}];
 else if(url.includes('openfreemap'))d={tiles:['https://example.invalid/{z}/{x}/{y}']};
 else return new Response('',{status:404});
 return Response.json(d);
}
