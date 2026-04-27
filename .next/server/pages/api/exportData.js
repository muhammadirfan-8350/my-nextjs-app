"use strict";(()=>{var e={};e.id=799,e.ids=[799],e.modules={145:e=>{e.exports=require("next/dist/compiled/next-server/pages-api.runtime.prod.js")},6249:(e,t)=>{Object.defineProperty(t,"l",{enumerable:!0,get:function(){return function e(t,a){return a in t?t[a]:"then"in t&&"function"==typeof t.then?t.then(t=>e(t,a)):"function"==typeof t&&"default"===a?t:void 0}}})},83:(e,t,a)=>{a.r(t),a.d(t,{config:()=>p,default:()=>l,routeModule:()=>S});var r={};a.r(r),a.d(r,{default:()=>A});var n=a(1802),s=a(7153),o=a(6249),i=a(6074),u=a(9102);async function A(e,t){let a=(e.headers.cookie||"").split(";").map(e=>e.trim()).find(e=>e.startsWith("saas_dashboard_token=")),r=a?a.split("=")[1]:null;if(!(r?(0,i.WX)(r):null))return t.status(401).json({message:"Unauthorized"});try{let e=await u.Z.$queryRawUnsafe(`
      SELECT
        CAST([Account_ID] AS NVARCHAR(50)) as Account_ID,
        [Account_Name],
        [Campaign],
        CONVERT(NVARCHAR(10), [Date], 120) as Date,
        CAST([Spend] AS FLOAT) as Spend,
        CAST([Clicks] AS BIGINT) as Clicks,
        CAST([CPC] AS FLOAT) as CPC,
        CAST([Impressions] AS BIGINT) as Impressions,
        CAST([CPM] AS FLOAT) as CPM,
        CAST([Conversions] AS FLOAT) as Conversions,
        CAST([Cost_Per_Conversion] AS FLOAT) as Cost_Per_Conversion,
        CAST([In_App_actions] AS FLOAT) as In_App_actions,
        CAST([Cost_Per_In_app_action] AS FLOAT) as Cost_Per_In_app_action,
        CAST([Installs] AS FLOAT) as Installs,
        CAST([CPI] AS FLOAT) as CPI,
        CAST([Views] AS BIGINT) as Views,
        CAST([CPV] AS FLOAT) as CPV,
        [Ad_group_Name],
        [Platform]
      FROM [Campaign Data].[dbo].[fact_valuation_jazz_cash]
      ORDER BY [Date] DESC
    `);return t.status(200).json({rows:e})}catch(e){return console.error("Export error:",e),t.status(500).json({message:"Export failed"})}}let l=(0,o.l)(r,"default"),p=(0,o.l)(r,"config"),S=new n.PagesAPIRouteModule({definition:{kind:s.x.PAGES_API,page:"/api/exportData",pathname:"/api/exportData",bundlePath:"",filename:""},userland:r})},6074:(e,t,a)=>{a.d(t,{I2:()=>p,qV:()=>l,V3:()=>u,WX:()=>A});let r=require("crypto");var n=a.n(r);let s="saas_dashboard_token",o=process.env.NEXTAUTH_SECRET||"development-secret",i=e=>n().createHmac("sha256",o).update(e).digest("hex");function u(e){let t=Math.floor(Date.now()/1e3)+2592e3,a=JSON.stringify({...e,exp:t}),r=i(a);return Buffer.from(`${a}|${r}`).toString("base64url")}function A(e){try{let t=Buffer.from(e,"base64url").toString("utf8"),a=t.lastIndexOf("|");if(-1===a)return null;let r=t.substring(0,a),n=t.substring(a+1);if(!r||!n||i(r)!==n)return null;let s=JSON.parse(r);if(s.exp<Math.floor(Date.now()/1e3))return null;return s}catch{return null}}function l(e){return`${s}=${e}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`}function p(){return`${s}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`}},9102:(e,t,a)=>{a.d(t,{Z:()=>n});let r=require("@prisma/client"),n=global.prisma??new r.PrismaClient({datasources:{db:{url:"sqlserver://223.123.92.220:1433;database=Campaign Data;user=saas_user;password=SaasPass123!;trustServerCertificate=true"}}})},7153:(e,t)=>{var a;Object.defineProperty(t,"x",{enumerable:!0,get:function(){return a}}),function(e){e.PAGES="PAGES",e.PAGES_API="PAGES_API",e.APP_PAGE="APP_PAGE",e.APP_ROUTE="APP_ROUTE"}(a||(a={}))},1802:(e,t,a)=>{e.exports=a(145)}};var t=require("../../webpack-api-runtime.js");t.C(e);var a=t(t.s=83);module.exports=a})();