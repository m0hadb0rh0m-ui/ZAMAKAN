// Per-value links to source/record and transformation without inventing issue times.
export function valueLineage(result,field,{time,unit,record,transform='identity'}={}){
 if(!result||!Number.isFinite(result.retrieved))return null;
 return {source:result.source,kind:result.kind,sourceUrl:result.sourceUrl??null,field,sourceTime:time??null,retrievedAt:result.retrieved,unit:unit??null,record:record??null,transform,state:result.state};
}
