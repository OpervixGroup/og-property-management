export const weatherCities = [
 {id:'san-antonio',name:'San Antonio, TX',lat:29.4241,lon:-98.4936},
 {id:'san-juan',name:'San Juan, Puerto Rico',lat:18.4655,lon:-66.1057},
 {id:'ponce',name:'Ponce, Puerto Rico',lat:18.0111,lon:-66.6141},
 {id:'miami',name:'Miami, FL',lat:25.7617,lon:-80.1918},
 {id:'orlando',name:'Orlando, FL',lat:28.5383,lon:-81.3792},
 {id:'houston',name:'Houston, TX',lat:29.7604,lon:-95.3698},
 {id:'dallas',name:'Dallas, TX',lat:32.7767,lon:-96.797},
 {id:'austin',name:'Austin, TX',lat:30.2672,lon:-97.7431},
 {id:'new-york',name:'New York, NY',lat:40.7128,lon:-74.006},
 {id:'chicago',name:'Chicago, IL',lat:41.8781,lon:-87.6298},
 {id:'los-angeles',name:'Los Angeles, CA',lat:34.0522,lon:-118.2437},
 {id:'atlanta',name:'Atlanta, GA',lat:33.749,lon:-84.388},
] as const;
export type PublicForecast={city:string;updated:string;retrievedAt:string;periods:{name:string;startTime:string;temperature:number;temperatureUnit:string;shortForecast:string;windSpeed:string}[]};
export async function loadForecast(id:string,request:typeof fetch=fetch):Promise<PublicForecast>{
 const city=weatherCities.find(c=>c.id===id);if(!city)throw Error('Choose a supported city');
 const get=async(url:string)=>{const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.hostname!=='api.weather.gov')throw Error('Invalid forecast source');const response=await request(url,{headers:{'User-Agent':'OGPropertyManagement (https://og.opervixgroup.com, support@opervixgroup.com)','Accept':'application/geo+json'},signal:AbortSignal.timeout(10000),redirect:'error'});if(!response.ok)throw Error('Forecast temporarily unavailable');return response.json();};
 const point=await get(`https://api.weather.gov/points/${city.lat},${city.lon}`);
 const forecast=await get(point.properties?.forecast);
 const periods=forecast.properties?.periods;
 if(!Array.isArray(periods)||!periods.length)throw Error('Forecast temporarily unavailable');
 const cleaned=periods.slice(0,4).map(p=>{if(typeof p.name!=='string'||typeof p.startTime!=='string'||!Number.isFinite(p.temperature)||!['F','C'].includes(p.temperatureUnit)||typeof p.shortForecast!=='string'||typeof p.windSpeed!=='string')throw Error('Invalid forecast data');return {name:p.name,startTime:p.startTime,temperature:p.temperature,temperatureUnit:p.temperatureUnit,shortForecast:p.shortForecast,windSpeed:p.windSpeed};});
 const updated=forecast.properties.updateTime??forecast.properties.updated;if(typeof updated!=='string'||!Number.isFinite(Date.parse(updated)))throw Error('Invalid forecast date');
 return {city:city.name,updated,retrievedAt:new Date().toISOString(),periods:cleaned};
}
