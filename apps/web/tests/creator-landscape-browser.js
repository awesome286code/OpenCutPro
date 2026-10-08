import { CREATOR_STYLES } from '/src/lib/creator-styles.ts'
import { createIntelligenceSequence, createTemplateSceneSvg, getIntelligenceSceneCount } from '/src/lib/short-video.ts'
import { applyProfessionalLyricStyle, makeBilingualCaptions } from '/src/lib/bilingual-captions.ts'
const batch='intelligence-landscape-qa', duration=12, title={enabled:true,title:'北方 · Northern Lights',subtitle:'A song to remember',design:'auto'}
async function db(){if(location.port!=='5175')throw Error('QA port only');return await new Promise((resolve,reject)=>{const r=indexedDB.open('opencut-local-media',2);r.onupgradeneeded=()=>{for(const n of ['files','projects'])if(!r.result.objectStoreNames.contains(n))r.result.createObjectStore(n,{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
document.querySelector('#seed').onclick=async()=>{
 const database=await db(), template=CREATOR_STYLES[0], ids=Array.from({length:getIntelligenceSceneCount(duration)},(_,i)=>`${batch}-art-${i}`)
 const sequence=createIntelligenceSequence(template,ids,`${batch}-asset`,duration,[{text:'你知道被風吹過的夜晚',timestamp:[0,4]},{text:'走得越遠才越知道什麼叫故鄉',timestamp:[4,8]},{text:'願我們在明天再次相遇',timestamp:[8,12]}],0,0,0,batch,title)
 const sources=sequence.captions.filter(c=>!c.creatorTitle), titles=sequence.captions.filter(c=>c.creatorTitle).map(c=>({...c,track:c.track+2}))
 const captions=[...applyProfessionalLyricStyle([...sources,...makeBilingualCaptions(sources,['Bạn có biết đêm gió lướt qua','Càng đi xa, càng hiểu quê nhà','Mong ngày mai chúng ta lại gặp nhau'],'both',1,2)]),...titles]
 const samples=48000*duration,bytes=new ArrayBuffer(44+samples*2),view=new DataView(bytes),ascii=(offset,text)=>Array.from(text).forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)))
 ascii(0,'RIFF');view.setUint32(4,36+samples*2,true);ascii(8,'WAVE');ascii(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,48000,true);view.setUint32(28,96000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);ascii(36,'data');view.setUint32(40,samples*2,true)
 const tx=database.transaction(['projects','files'],'readwrite'), files=tx.objectStore('files'),projects=tx.objectStore('projects')
 files.put({id:`${batch}-asset`,name:'Northern Lights QA.wav',type:'AUDIO',duration,blob:new Blob([bytes],{type:'audio/wav'})})
 ids.forEach((id,i)=>files.put({id,name:`Jade QA ${i}`,type:'IMAGE',duration:duration/ids.length,blob:new Blob([createTemplateSceneSvg(template,i)],{type:'image/svg+xml'})}))
 projects.put({id:'subtitle-draft',draft:null})
 projects.put({id:'current',version:3,name:'Landscape QA',aspectRatio:'9:16',clips:sequence.clips.map(c=>c.id===`${batch}-audio`?{...c,creatorTitleContent:title}:c),textCaptions:captions,timelineLayers:[{id:'qa-video',type:'VIDEO',index:0,name:'Video QA'},{id:'qa-audio',type:'AUDIO',index:0,name:'Audio QA'},...['Lời từ audio','Pinyin','Việt sub','Title · Tên bài hát','Title · Design label','Title · Dòng phụ'].map((name,index)=>({id:`qa-text-${index}`,type:'TEXT',index,name}))],hiddenLayers:{},mutedLayers:{},selectedClipId:sequence.clips[0].id})
 await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)});database.close();location.href='/editor'
}
document.querySelector('#verify').onclick=async()=>{
 const database=await db(),tx=database.transaction(['projects','files'],'readonly'),r=tx.objectStore('projects').get('current'),media=tx.objectStore('files').getAll()
 tx.oncomplete=()=>{const s=r.result;document.querySelector('#result').textContent=JSON.stringify({ratio:s.aspectRatio,clips:s.clips,media:media.result.map(f=>({id:f.id,type:f.type,mime:f.blob.type,bytes:f.blob.size})),subtitles:s.textCaptions.filter(c=>!c.creatorTitle).map(c=>({id:c.id,text:c.text,start:c.start,duration:c.duration,track:c.track,size:c.size,y:c.y,style:c.creatorStyleId,presentation:c.lyricPresentation,viewport:c.lyricViewport})),titles:s.textCaptions.filter(c=>c.creatorTitle).map(c=>({id:c.id,text:c.text,start:c.start,duration:c.duration,track:c.track,size:c.size,x:c.x,y:c.y,design:c.creatorTitleDesignId})),layers:s.timelineLayers},null,2);database.close()}
}
