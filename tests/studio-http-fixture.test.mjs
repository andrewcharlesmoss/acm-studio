import assert from "node:assert/strict";
import { readFile, access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServer, request as httpRequest } from "node:http";
import test from "node:test";
import { createHash } from "node:crypto";
import { siteImageName } from "../app/content/site-featured-image.mjs";
import { createIsolatedModuleLoader } from "./production-module.mjs";
import { EventEmitter } from "node:events";
import { testSiteBridge } from "../scripts/test-site-bridge.mjs";
import { createStudioHttpFixture } from "./helpers/studio-http-fixture.mjs";

test("default bridge remains available and isolated injection requires every storage root", async () => {
  const plugin = testSiteBridge();
  assert.equal(plugin.name, "studio-test-site");
  await plugin.closeBundle();
  for (const options of [{fixtureRoots:null}, {fixtureRoots:{}}, {fixtureRoots:{test:"/private/tmp/test"}}, {fixtureRoots:{test:"/private/tmp/test",test2:"/private/tmp/test2"}}, {globalRoot:"/private/tmp/global"}, {fixtureRoots:{test:"relative",test2:"/private/tmp/test2"},globalRoot:"/private/tmp/global"}]) {
    assert.throws(() => testSiteBridge(options), /Supply absolute|Supply an absolute/);
  }
});

test("genuine HTTP gateway confines its source/output/history to temporary roots and retains origin checks", {timeout:60000}, async () => {
  const fixture = await createStudioHttpFixture();
  const headers = {"Content-Type":"application/json","X-Studio-Client":"codex-history",Origin:fixture.origin};
  async function request(input, extra = {}) {
    return fetch(`${fixture.origin}/__studio/test-site`,{method:"POST",headers:{...headers,...extra},body:JSON.stringify(input)});
  }
  try {
    assert.equal((await request({siteId:"test",action:"connect"},{Origin:"http://example.com"})).status,403);
    const wrongHost = await new Promise((resolve,reject) => {
      const denied = httpRequest(`${fixture.origin}/__studio/test-site`,{method:"POST",headers:{...headers,Host:"example.com"}},response=>{response.resume();response.on("end",()=>resolve(response.statusCode));});
      denied.on("error",reject);denied.end(JSON.stringify({siteId:"test",action:"connect"}));
    });
    assert.equal(wrongHost,403);
    assert.equal((await fetch(`${fixture.origin}/__studio/unknown`)).status,404);
    const connected = await (await request({siteId:"test",action:"connect"})).json();
    assert.ok(connected.token);assert.equal(connected.document.siteId,"test");
    const token = {"X-Studio-Test-Token":connected.token};
    assert.equal((await request({siteId:"test",action:"claim"},token)).status,200);
    const response = await request({siteId:"test",action:"global-read",initialise:true},token);
    assert.equal(response.status,200,await response.clone().text());
    const global = await response.json();assert.equal(global.initialised,true);
    const bytes = await readFile(new URL("../public/specimens/landscape.png",import.meta.url));
    const name = siteImageName("11111111-1111-4111-8111-111111111111",createHash("sha256").update(bytes).digest("hex"),"image/png");
    await mkdir(path.join(fixture.globalRoot,"work/global-design-media"),{recursive:true});
    await writeFile(path.join(fixture.globalRoot,"work/global-design-media",name),bytes);
    const imageURL = `${fixture.origin}/__studio/site-media/global/${name}`;
    const imageHeaders = {Referer:`${fixture.origin}/studio`,"Sec-Fetch-Site":"same-origin"};
    const image = await fetch(imageURL,{headers:imageHeaders});assert.equal(image.status,200);assert.deepEqual(Buffer.from(await image.arrayBuffer()),bytes);
    assert.equal((await fetch(imageURL,{headers:{...imageHeaders,Referer:"http://example.com/studio"}})).status,403);
    const saved = JSON.parse(await readFile(path.join(fixture.globalRoot,"work/global-template-library.json"),"utf8"));
    assert.equal(saved.format,"acm-global-templates");
    for (const [index,directory] of Object.values(fixture.fixtureRoots).entries()) {
      assert.equal(await readFile(path.join(directory,"content/site.json"),"utf8"),fixture.initialSources[index],"global initialisation must not rewrite site source");
      assert.match(await readFile(path.join(directory,"dist/index.html"),"utf8"),/Temporary home/);
    }
  } finally { await fixture.close(); }
  await assert.rejects(access(fixture.root),error=>error.code==="ENOENT");
});

test("unknown gateway paths never reach an enabled frontend proxy", {timeout:60000}, async () => {
  let forwarded = 0;
  const frontend = createServer((_request,response)=>{forwarded++;response.end("Frontend only");});
  await new Promise(resolve=>frontend.listen(0,"127.0.0.1",resolve));
  const fixture = await createStudioHttpFixture({frontendURL:`http://127.0.0.1:${frontend.address().port}`});
  try {
    assert.equal(await (await fetch(`${fixture.origin}/example`)).text(),"Frontend only");assert.equal(forwarded,1);
    assert.equal((await fetch(`${fixture.origin}/__studio/unknown`)).status,404);assert.equal(forwarded,1);
  } finally {await fixture.close();await new Promise(resolve=>frontend.close(resolve));}
});

test("zero-argument bridge retains the configured project and existing fixture environment defaults", async () => {
  const roots=[];
  const load=createIsolatedModuleLoader({globals:{process},overrides:{
    "node:path":{default:path},
    "./global-template-store.mjs":{createGlobalTemplateStore:options=>{roots.push(["global",options.root]);return {close:async()=>{}};}},
    "./test-site-store.mjs":{TestSiteError:class extends Error {},createTestSiteStore:options=>{roots.push([options.siteId,options.root]);return {close:async()=>{}};}},
    "./test-site-prompt.mjs":{createTestPromptClient:()=>({propose:()=>assert.fail("No prompt should run")})},
    vite:{runnerImport:()=>assert.fail("Construction must not load renderer")},
  }});
  const plugin=load("scripts/test-site-bridge.mjs").testSiteBridge();
  const watcher=new EventEmitter();watcher.add=()=>{};
  plugin.configureServer({config:{root:"/fixture/studio",logger:{error:assert.fail}},watcher,middlewares:{use(){}}});
  assert.deepEqual(roots,[["global","/fixture/studio"],["test",path.resolve(process.env.STUDIO_TEST_PATH??"/fixture/test")],["test2",path.resolve(process.env.STUDIO_TEST2_PATH??"/fixture/test2")]]);
  await plugin.closeBundle();
});
