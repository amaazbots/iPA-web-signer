export function readPlist(bytes: Uint8Array): Record<string, unknown> {
 const text=new TextDecoder().decode(bytes); if(!text.startsWith("bplist00")){
  const decode=(s:string)=>s.replace(/&(?:amp|lt|gt|quot|apos);/g,v=>({"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&apos;":"'"}[v] || v));
  const result:Record<string,unknown>={}; const re=/<key>([^<]*)<\/key>\s*<(string|date|integer)>([^<]*)<\/(?:string|date|integer)>/g;let m;
  while((m=re.exec(text))) result[decode(m[1])]=m[2]==="integer"?Number(m[3]):decode(m[3]); return result;
 }
 if(bytes.length<40)throw new Error("Invalid binary property list."); const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const readInt=(offset:number,length:number)=>{if(length<1||length>8||offset<0||offset+length>bytes.length)throw new Error("Invalid property list offset.");let v=0;for(let n=0;n<length;n++)v=v*256+bytes[offset+n];if(!Number.isSafeInteger(v))throw new Error("Property list value is too large.");return v;};
 const trailer=bytes.length-32,offsetSize=bytes[trailer+6],refSize=bytes[trailer+7],count=readInt(trailer+8,8),root=readInt(trailer+16,8),table=readInt(trailer+24,8);
 if(count>100000 || table+count*offsetSize>trailer)throw new Error("Invalid property list table."); const active=new Set<number>();
 function item(id:number,depth=0):unknown{if(id>=count||depth>30||active.has(id))throw new Error("Invalid property list reference.");active.add(id);try{
  let offset=readInt(table+id*offsetSize,offsetSize);const marker=bytes[offset++],type=marker>>4;let size=marker&15;
  if([4,5,6,10,13].includes(type)&&size===15){const intMarker=bytes[offset++];if(intMarker>>4!==1)throw new Error("Invalid property list length.");const len=2**(intMarker&15);size=readInt(offset,len);offset+=len;}
  if(size>1048576)throw new Error("Property list entry is too large.");
  if(type===0)return size===9?true:size===8?false:null;if(type===1)return readInt(offset,2**size);
  if(type===5){if(offset+size>table)throw new Error("Invalid property list string.");return new TextDecoder().decode(bytes.subarray(offset,offset+size));}
  if(type===6){if(offset+size*2>table)throw new Error("Invalid property list string.");let out="";for(let i=0;i<size;i++)out+=String.fromCharCode(view.getUint16(offset+i*2));return out;}
  if(type===10)return Array.from({length:size},(_,i)=>item(readInt(offset+i*refSize,refSize),depth+1));
  if(type===13){const out:Record<string,unknown>={};for(let i=0;i<size;i++){const key=item(readInt(offset+i*refSize,refSize),depth+1);if(typeof key==="string")out[key]=item(readInt(offset+(size+i)*refSize,refSize),depth+1);}return out;}
  return null;
 }finally{active.delete(id);}}
 const result=item(root);if(!result||typeof result!=="object"||Array.isArray(result))throw new Error("Info.plist is not a dictionary.");return result as Record<string,unknown>;
}
