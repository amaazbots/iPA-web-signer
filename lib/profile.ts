export type ProfileInfo = { expiresAt: string | null; profileType: string; teamId: string; appIdentifier: string; };
export function profileBundleIdPattern(details: ProfileInfo): string {
  const separator = details.appIdentifier.indexOf(".");
  if (separator < 1 || separator === details.appIdentifier.length - 1) throw new Error("The profile has an invalid app identifier.");
  return details.appIdentifier.slice(separator + 1);
}
export function profileAllowsBundleId(details: ProfileInfo, bundleId: string): boolean {
  if (!/^[A-Za-z0-9._-]{1,255}$/.test(bundleId)) return false;
  const pattern = profileBundleIdPattern(details);
  if (pattern === "*") return true;
  if (pattern.endsWith(".*") && !pattern.slice(0, -1).includes("*")) {
    const prefix = pattern.slice(0, -1);
    return bundleId.startsWith(prefix) && bundleId.length > prefix.length;
  }
  return bundleId === pattern;
}
export function resolveBundleId(details: ProfileInfo, originalBundleId: string, matchProfile: boolean): string {
  if (profileAllowsBundleId(details, originalBundleId)) return originalBundleId;
  const pattern = profileBundleIdPattern(details);
  if (!matchProfile) throw new Error(`This profile doesn’t allow the app ID “${originalBundleId}” (${pattern} required). Enable “Match app ID to profile” or choose a matching profile.`);
  const bundleId = pattern.endsWith(".*") ? pattern.slice(0, -1) + originalBundleId : pattern;
  if (!profileAllowsBundleId(details, bundleId)) throw new Error("This profile can’t provide a valid app ID for this IPA. Choose a different profile.");
  return bundleId;
}
export function appIdentifierForBundleId(details: ProfileInfo, bundleId: string): string {
  if (!profileAllowsBundleId(details, bundleId)) throw new Error("The signing app ID isn’t allowed by this provisioning profile.");
  return details.appIdentifier.slice(0, details.appIdentifier.indexOf(".") + 1) + bundleId;
}
export function inspectProfile(bytes: Uint8Array): ProfileInfo {
  const raw = new TextDecoder().decode(bytes); const start=raw.indexOf("<?xml"); const end=raw.indexOf("</plist>",start);
  if(start<0 || end<0) throw new Error("This provisioning profile could not be read. Choose a signed Apple .mobileprovision file.");
  const xml=raw.slice(start,end+8);
  const string=(key:string,tag="string")=>xml.match(new RegExp("<key>"+key+"</key>\\s*<"+tag+">([^<]+)</"+tag+">"))?.[1] || "";
  const expires=string("ExpirationDate","date");
  if(expires && Date.parse(expires)<=Date.now()) throw new Error("This provisioning profile has expired. Choose a different profile.");
  const enterprise=/<key>ProvisionsAllDevices<\/key>\s*<true\s*\/>/.test(xml);
  const devices=/<key>ProvisionedDevices<\/key>/.test(xml); const development=/<key>get-task-allow<\/key>\s*<true\s*\/>/.test(xml);
  const appIdentifier=string("application-identifier");const teamId=string("com.apple.developer.team-identifier");
  if(!appIdentifier || !teamId)throw new Error("The profile is missing its app identifier or team identifier.");
  return { expiresAt:expires || null, profileType:enterprise?"enterprise":devices?(development?"development":"adhoc"):"appstore",teamId,appIdentifier };
}
export function signingEntitlements(bytes:Uint8Array,bundleId:string){
 const details=inspectProfile(bytes);const appIdentifier=appIdentifierForBundleId(details,bundleId);const raw=new TextDecoder().decode(bytes);const key=raw.indexOf("<key>Entitlements</key>");const start=raw.indexOf("<dict>",key);if(key<0||start<0)throw new Error("The profile is missing signing entitlements.");
 const tags=/<\/?dict>/g;tags.lastIndex=start;let depth=0,end=-1,m;while((m=tags.exec(raw))){depth+=m[0]==="<dict>"?1:-1;if(depth===0){end=tags.lastIndex;break;}}if(end<0)throw new Error("The provisioning profile’s entitlements are damaged.");
 let dict=raw.slice(start,end);
 dict=dict.replace(/(<key>application-identifier<\/key>\s*<string>)[^<]*(<\/string>)/,(_all:string,open:string,close:string)=>open+appIdentifier+close);
 dict=dict.replace(/(<key>keychain-access-groups<\/key>\s*<array>)([\s\S]*?)(<\/array>)/,(_all:string,open:string,values:string,close:string)=>open+values.replace(/<string>([^<]*)<\/string>/g,(_match:string,value:string)=>{const prefix=value.slice(0,-1);const group=value.endsWith("*")?(appIdentifier.startsWith(prefix)?appIdentifier:prefix+bundleId):value;return "<string>"+group+"</string>";})+close);
 return new File(['<?xml version="1.0" encoding="UTF-8"?><plist version="1.0">'+dict+'</plist>'],"entitlements.plist",{type:"application/xml"});
}
