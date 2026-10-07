import forge from "node-forge";
import { inspectProfile } from "./profile";
export async function validateCertificate(p12:File,profile:File,password:string){
 if(!p12.size||!profile.size||p12.size>4*1024*1024||profile.size>1024*1024)throw new Error("Use a .p12 up to 4 MB and a provisioning profile up to 1 MB.");
 const profileBytes=new Uint8Array(await profile.arrayBuffer());const profileInfo=inspectProfile(profileBytes);
 try{
  const bytes=new Uint8Array(await p12.arrayBuffer());let binary="";for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
  const parsed=forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(binary),false,password);
  const certs=parsed.getBags({bagType:forge.pki.oids.certBag})[forge.pki.oids.certBag]||[];
  const keys=[...(parsed.getBags({bagType:forge.pki.oids.pkcs8ShroudedKeyBag})[forge.pki.oids.pkcs8ShroudedKeyBag]||[]),...(parsed.getBags({bagType:forge.pki.oids.keyBag})[forge.pki.oids.keyBag]||[])];
  const leaf=certs.map(b=>b.cert).find(cert=>cert&&keys.some(b=>b.key && "n" in b.key && "n" in cert.publicKey && b.key.n.compareTo(cert.publicKey.n)===0));
  if(!leaf)throw new Error("No matching RSA private key and signing certificate were found in this .p12.");
  const team=leaf.subject.getField("OU")?.value;if(team!==profileInfo.teamId)throw new Error("The certificate and profile belong to different Apple teams.");
  if(leaf.validity.notAfter.getTime()<=Date.now())throw new Error("This signing certificate has expired.");if(leaf.validity.notBefore.getTime()>Date.now())throw new Error("This signing certificate is not valid yet.");return profileInfo;
 }catch(error){if(error instanceof Error && /different Apple teams|expired|valid yet|matching RSA/.test(error.message))throw error;throw new Error("The .p12 couldn’t be opened. Check its password and that it contains an RSA signing certificate and private key.");}
}
