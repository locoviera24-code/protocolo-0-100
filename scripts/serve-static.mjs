import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,join,normalize,resolve,sep} from 'node:path';

const root=resolve(process.env.STATIC_ROOT||process.argv[3]||process.cwd());
const port=Number(process.env.PORT||process.argv[2]||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};

const server=http.createServer(async (request,response)=>{
  try{
    const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    const relative=normalize(pathname==='/'?'index.html':pathname.replace(/^\/+/,''));
    const file=resolve(join(root,relative));
    if(file!==root&&!file.startsWith(root+sep)) throw new Error('outside root');
    const info=await stat(file);
    const target=info.isDirectory()?join(file,'index.html'):file;
    response.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream','Cache-Control':'no-store'});
    response.end(await readFile(target));
  }catch(error){response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});response.end('No encontrado');}
});

server.listen(port,'127.0.0.1',()=>console.log(`http://127.0.0.1:${port}`));
