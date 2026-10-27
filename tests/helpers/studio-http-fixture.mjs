import { EventEmitter } from "node:events";
import { createServer, request as httpRequest } from "node:http";
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { testSiteBridge } from "../../scripts/test-site-bridge.mjs";
import { revisionOf } from "../../scripts/test-site-store.mjs";
import { loadViteModule } from "../production-module.mjs";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
let contracts;
async function fixtureContracts() {
  contracts ??= Promise.all([
    loadViteModule(path.join(projectRoot,"app/studio/test-site/contract.ts"),{root:projectRoot}),
    loadViteModule(path.join(projectRoot,"app/studio/template-model.ts"),{root:projectRoot}),
  ]).then(([contract,templates])=>({contract:contract.module,templates:templates.module}));
  return contracts;
}

/** Real HTTP, gateway, renderer and file stores; only their storage roots are temporary. */
export async function createStudioHttpFixture({ frontendURL } = {}) {
  const upstream = frontendURL ? new URL(frontendURL) : null;
  if (upstream && (upstream.protocol !== "http:" || !["localhost","127.0.0.1"].includes(upstream.hostname) || !upstream.port || upstream.pathname !== "/" || upstream.search || upstream.username || upstream.password)) throw new Error("Use an explicit loopback frontend origin.");
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(),"acm-studio-http-")));
  let server;
  let plugin;
  let closed = false;
  async function close() {
    if (closed) return;
    closed = true;
    await plugin?.closeBundle();
    if (server?.listening) await new Promise((resolve,reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(root,{recursive:true,force:true});
  }
  try {
  const fixtureRoots = {test:path.join(root,"test"),test2:path.join(root,"test2")};
  const globalRoot = path.join(root,"global");
  const {contract,templates} = await fixtureContracts();
  for (const [siteId,directory] of Object.entries(fixtureRoots)) {
    await mkdir(path.join(directory,"content"),{recursive:true});await mkdir(path.join(directory,"dist"));
    const home={id:`${siteId}-home`,kind:"page",title:"Temporary home",slug:"",excerpt:"",status:"draft",updatedAt:"2026-10-27T00:00:00.000Z",tags:[],seoTitle:"",seoDescription:"",blocks:[{id:`${siteId}-paragraph`,type:"paragraph",text:"Temporary gateway fixture"}]};
    const initial=contract.testSiteCollection({format:"acm-test-site",version:3,siteId,documents:[home],categories:[],bin:[],activeDocumentId:home.id,homeDocumentId:home.id,templates:templates.emptyTemplateStore(),browserImportComplete:true});
    if (!contract.validTestSiteDocument(initial)) throw new Error("Invalid temporary fixture.");
    await writeFile(path.join(directory,"content/site.json"),JSON.stringify(initial,null,2)+"\n");
    await writeFile(path.join(directory,"dist/index.html"),`<meta name="acm-test-revision" content="${revisionOf(initial)}">`);
  }
  await mkdir(globalRoot);
  const mounts=[],requests=[];
  server=createServer(async(request,response)=>{
    const url=new URL(request.url,"http://localhost");
    requests.push({method:request.method,path:url.pathname});
    const mount=mounts.find(item=>url.pathname===item.prefix||url.pathname.startsWith(`${item.prefix}/`));
    if(mount){const original=request.url;request.url=request.url.slice(mount.prefix.length)||"/";try{await mount.handler(request,response);}catch{response.statusCode=500;response.end("Temporary gateway failure");}finally{request.url=original;}return;}
    // An unknown gateway must never reach a real development server or fixture.
    if(url.pathname.startsWith("/__studio")||!upstream||!["GET","HEAD"].includes(request.method)){response.statusCode=404;response.end();return;}
    const forwarded=httpRequest({hostname:upstream.hostname,port:upstream.port,path:request.url,method:request.method,headers:request.headers},incoming=>{response.writeHead(incoming.statusCode,incoming.headers);incoming.pipe(response);});
    forwarded.on("error",()=>{response.statusCode=502;response.end("Frontend unavailable");});request.pipe(forwarded);
  });
  const watcher=new EventEmitter();watcher.add=()=>{};
  plugin=testSiteBridge({fixtureRoots,globalRoot});
  plugin.configureServer({config:{root:projectRoot,logger:{error:message=>{throw new Error(message);}}},watcher,httpServer:server,middlewares:{use(prefix,handler){mounts.push({prefix,handler});}}});
  await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
  const origin=`http://localhost:${server.address().port}`;
  const initialSources=await Promise.all(Object.values(fixtureRoots).map(directory=>readFile(path.join(directory,"content/site.json"),"utf8")));
  return {origin,root,fixtureRoots,globalRoot,requests,initialSources,close};
  } catch (error) {
    try { await close(); } catch (cleanupError) { throw new AggregateError([error,cleanupError],"Temporary Studio construction and cleanup failed."); }
    throw error;
  }
}
