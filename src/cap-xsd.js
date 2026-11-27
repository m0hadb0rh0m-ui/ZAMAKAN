// Official unmodified OASIS CAP 1.2 OS schema; see schema attribution.
// Validation is local, bounded, and does not establish broadcaster identity.
export async function validateCapSchema(xml,schema,validator){
 if(typeof xml!=='string'||xml.length>500000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Unsafe or oversized CAP XML');
 const validate=validator??(await import('xmllint-wasm')).validateXML;
 const result=await validate({xml:[{fileName:'alert.xml',contents:xml.replace(/^\uFEFF/,'')}],schema:[{fileName:'CAP-v1.2-os.xsd',contents:schema}],initialMemoryPages:256,maxMemoryPages:512,modifyArguments:args=>['--nonet',...args]});
 return {valid:result.valid===true,errors:(result.errors??[]).slice(0,12).map(e=>String(e.message??e.rawMessage??e).slice(0,500))};
}
