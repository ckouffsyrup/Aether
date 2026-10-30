export const IMAGE_MIME:Record<string,string>={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',bmp:'image/bmp'};
export const mimeForFile=(name:string,fallback='image/png')=>IMAGE_MIME[(name.split('.').pop()||'').toLowerCase()]||fallback;

export const blobToDataUrl=(blob:Blob)=>new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>typeof r.result==='string'?resolve(r.result):reject(Error('read failed'));r.onerror=()=>reject(r.error);r.readAsDataURL(blob)});

/** Decode any image, downscale to <=1000px and re-encode as WebP (JPEG fallback). */
export async function prepareCardImage(file:File):Promise<string>{
 if(!['image/png','image/jpeg','image/webp','image/gif','image/bmp'].includes(file.type))throw Error('Choose a PNG, JPG, WebP, GIF or BMP image.');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.src=url;await img.decode();
  const scale=Math.min(1,1000/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image conversion is unavailable');
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  let result=canvas.toDataURL('image/webp',0.8);
  if(!result.startsWith('data:image/webp'))result=canvas.toDataURL('image/jpeg',0.78);
  if(result.length>900000){const reduced=document.createElement('canvas');reduced.width=Math.max(1,Math.round(canvas.width*.65));reduced.height=Math.max(1,Math.round(canvas.height*.65));reduced.getContext('2d')?.drawImage(canvas,0,0,reduced.width,reduced.height);result=reduced.toDataURL('image/webp',0.7)}
  return result;
 }finally{URL.revokeObjectURL(url)}
}

export function readIconFile(file:File):Promise<string>{
 if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>350000)return Promise.reject(Error('Choose a PNG, JPG, WebP or GIF icon under 350 KB.'));
 return blobToDataUrl(file);
}

export const formatBytes=(n:number)=>n<1048576?`${Math.max(1,Math.round(n/1024))} KB`:`${(n/1048576).toFixed(1)} MB`;
