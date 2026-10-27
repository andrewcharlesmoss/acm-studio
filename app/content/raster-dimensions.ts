export type RasterDimensions = { width: number; height: number; orientation: number };
const jpegFrames = new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
function exifOrientation(bytes: Uint8Array, start: number, end: number): number {
  if (end - start < 14 || String.fromCharCode(...bytes.subarray(start,start+6)) !== "Exif\0\0") return 1;
  const offset=start+6, view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const little=bytes[offset]===0x49 && bytes[offset+1]===0x49;
  if (!little && !(bytes[offset]===0x4d && bytes[offset+1]===0x4d)) return 1;
  if(view.getUint16(offset+2,little)!==42)return 1;
  const table=offset+view.getUint32(offset+4,little);
  if(table<offset||table+2>end)return 1;
  const count=view.getUint16(table,little);
  if(count>256||table+2+count*12>end)return 1;
  for(let index=0;index<count;index++){
    const entry=table+2+index*12;
    if(view.getUint16(entry,little)===0x112&&view.getUint16(entry+2,little)===3&&view.getUint32(entry+4,little)===1){const value=view.getUint16(entry+8,little);return value>=1&&value<=8?value:1;}
  }
  return 1;
}
/** Header inspection precedes decoding or pixel-buffer allocation. Animated inputs stay Original-only. */
export function inspectStaticRaster(bytes: Uint8Array, type: string): RasterDimensions | null {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(type==="image/png"){
    if(bytes.length<33||!bytes.subarray(0,8).every((byte,index)=>byte===[137,80,78,71,13,10,26,10][index]))return null;
    let width=0,height=0,ended=false;
    for(let offset=8;offset+12<=bytes.length;){
      const length=view.getUint32(offset);if(length>bytes.length-offset-12)return null;
      const chunk=String.fromCharCode(...bytes.subarray(offset+4,offset+8));
      if(offset===8){if(chunk!=="IHDR"||length!==13)return null;width=view.getUint32(offset+8);height=view.getUint32(offset+12);}
      else if(chunk==="IHDR")return null;
      if(chunk==="acTL")return null;
      if(chunk==="IEND"){if(length!==0||offset+12!==bytes.length)return null;ended=true;break;}offset+=length+12;
    }
    return ended&&width&&height?{width,height,orientation:1}:null;
  }
  if(type==="image/jpeg"||type==="image/jpg"){
    if(bytes[0]!==0xff||bytes[1]!==0xd8)return null;
    let width=0,height=0,orientation=1,foundFrame=false;
    for(let offset=2;offset+4<=bytes.length;){
      if(bytes[offset++]!==0xff)return null;while(bytes[offset]===0xff)offset++;
      const marker=bytes[offset++];if(marker===0xda||marker===0xd9)break;
      if(marker===0x01||marker>=0xd0&&marker<=0xd7)continue;
      if(offset+2>bytes.length)return null;const length=view.getUint16(offset);
      if(length<2||offset+length>bytes.length)return null;
      if(marker===0xe1)orientation=exifOrientation(bytes,offset+2,offset+length);
      if(jpegFrames.has(marker)){if(length<8||foundFrame)return null;foundFrame=true;height=view.getUint16(offset+3);width=view.getUint16(offset+5);}
      offset+=length;
    }
    return width&&height?{width:orientation>=5?height:width,height:orientation>=5?width:height,orientation}:null;
  }
  if(type==="image/webp"){
    if(bytes.length<20||String.fromCharCode(...bytes.subarray(0,4))!=="RIFF"||String.fromCharCode(...bytes.subarray(8,12))!=="WEBP"||view.getUint32(4,true)+8!==bytes.length)return null;
    let width=0,height=0,imageWidth=0,imageHeight=0,extended=false,foundImage=false;
    let offset=12;
    for(;offset+8<=bytes.length;){
      const chunk=String.fromCharCode(...bytes.subarray(offset,offset+4)),length=view.getUint32(offset+4,true),data=offset+8;
      if(length>bytes.length-data)return null;
      // Animated and EXIF-oriented WebP files remain Original-only until their
      // canvas and orientation can be bounded before the browser decodes them.
      if(chunk==="ANIM"||chunk==="ANMF"||chunk==="EXIF")return null;
      if(chunk==="VP8X"){if(extended||foundImage||length!==10||bytes[data]&2)return null;extended=true;width=1+bytes[data+4]+(bytes[data+5]<<8)+(bytes[data+6]<<16);height=1+bytes[data+7]+(bytes[data+8]<<8)+(bytes[data+9]<<16);}
      else if(chunk==="VP8 "){if(foundImage||length<10||bytes[data+3]!==0x9d||bytes[data+4]!==1||bytes[data+5]!==0x2a)return null;foundImage=true;imageWidth=view.getUint16(data+6,true)&0x3fff;imageHeight=view.getUint16(data+8,true)&0x3fff;}
      else if(chunk==="VP8L"){if(foundImage||length<5||bytes[data]!==0x2f)return null;foundImage=true;const bits=view.getUint32(data+1,true);imageWidth=(bits&0x3fff)+1;imageHeight=((bits>>>14)&0x3fff)+1;}
      offset=data+length+(length&1);
      if(offset>bytes.length)return null;
    }
    if(offset!==bytes.length||!foundImage||!imageWidth||!imageHeight)return null;
    if(extended&&(width!==imageWidth||height!==imageHeight))return null;
    return {width:extended?width:imageWidth,height:extended?height:imageHeight,orientation:1};
  }
  return null;
}
