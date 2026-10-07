// The reviewed detail block replaces the earlier generated receipt-reference list.
// Preserve all notes when no reviewed block exists, and preserve custom notes before it.
export function statementNotes(notes:string){
 const marker='Reviewed work dates and price details:';
 const at=notes.indexOf(marker);
 if(at<0)return notes.trim().split(/\n\s*\n/).filter(Boolean);
 const before=notes.slice(0,at).trim();
 const custom=before.startsWith('Work performed and supporting receipts:')?before.split('\n').filter(line=>line.trim()&&line!=='Work performed and supporting receipts:'&&!/^(Labor|Materials): .+ Reference .+\.$/.test(line)).join('\n'):before;
 return [custom,...notes.slice(at+marker.length).trim().split(/\n\s*\n/)].filter(Boolean);
}

export function statementNoteBlocks(notes:string){
 return statementNotes(notes).map(note=>{
  const parts=note.split('|').map(v=>v.trim());
  if(parts.length>=3&&/^(Labor|Materials)$/i.test(parts[0]))return {title:parts.slice(0,2).join(' / '),body:parts.slice(2).join(' · ')};
  return {title:'',body:note};
 });
}
