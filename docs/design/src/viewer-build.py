#!/usr/bin/env python3
"""Assemble the self-contained orbit viewer: three.js UMD + GLTFLoader +
OrbitControls inlined, GLB models embedded as base64, drag-to-rotate UI."""
import base64, os, json

CAT = os.path.dirname(os.path.abspath(__file__))
V = os.path.join(CAT, "vendor")
G = os.path.join(CAT, "glb")

MODELS = [
    ("stupa2",   "THE GORINTŌ"),
    ("jewel",    "VOID HŌJU"),
    ("orb",      "ORB TV"),
    ("magnettv", "MAGNET TV"),
    ("rack",     "SERVER RACK"),
    ("reeldeck", "REEL-TO-REEL"),
    ("beacon",   "BEACON TOWER 봉수대"),
    ("bell",     "TEMPLE BELL 범종"),
    ("tvbuddha", "TV BUDDHA"),
    ("moonjar",  "MOON JAR 달항아리"),
]

libs = "".join(open(os.path.join(V, f)).read() + "\n"
               for f in ("three.min.js", "GLTFLoader.js", "OrbitControls.js"))

entries = []
for key, label in MODELS:
    p = os.path.join(G, key + ".glb")
    if not os.path.exists(p):
        print("MISSING GLB:", key)
        continue
    b = base64.b64encode(open(p, "rb").read()).decode()
    entries.append({"key": key, "label": label, "b64": b})
    print(key, os.path.getsize(p) // 1024, "KB")

html = """<title>PF — Orbit Viewer</title>
<style>
html,body { background:#08080D; margin:0; height:100%; overflow:hidden; }
body { color:#C9C2B8; font-family:ui-monospace,Menlo,"Apple SD Gothic Neo",monospace; }
#wrap { position:fixed; inset:0; }
canvas { display:block; }
#panel { position:fixed; top:0; left:0; bottom:0; width:210px; padding:18px 14px; overflow-y:auto;
  background:rgba(8,8,13,0.82); backdrop-filter:blur(6px); border-right:1px solid rgba(201,194,184,.14);
  display:flex; flex-direction:column; gap:8px; z-index:5; }
#panel h1 { font-size:15px; letter-spacing:2px; color:#fff; margin:0 0 4px; font-weight:600; }
#panel p { font-size:10.5px; color:#6E6862; margin:0 0 10px; line-height:1.5; }
#panel button { text-align:left; font:inherit; font-size:11.5px; letter-spacing:1px; color:#C9C2B8;
  background:none; border:1px solid rgba(201,194,184,.18); padding:9px 10px; cursor:pointer; }
#panel button:hover { border-color:#FFB300; color:#fff; }
#panel button.on { border-color:#FFB300; color:#FFB300; }
#hint { position:fixed; right:16px; bottom:12px; font-size:10.5px; color:#6E6862; letter-spacing:1px; z-index:5; }
#spin { margin-top:auto; }
@media (max-width:640px) { #panel { width:150px; } }
:focus-visible { outline:2px solid #FFB300; outline-offset:2px; }
</style>
<div id="wrap"></div>
<div id="panel">
  <h1>PF · ORBIT</h1>
  <p>drag to rotate · scroll to zoom · right-drag to pan. Real geometry from catalogue.blend; viewer materials are simplified — the board renders show final lighting.</p>
</div>
<div id="hint">Blender 5.1 → glTF → WebGL</div>
<script>
""" + libs + """
const MODELS = """ + json.dumps([{"key": e["key"], "label": e["label"]} for e in entries]) + """;
const B64 = {};
""" + "\n".join(f'B64["{e["key"]}"] = "{e["b64"]}";' for e in entries) + """
const wrap = document.getElementById("wrap");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias:true });
} catch (e) {
  const msg = document.createElement("p");
  msg.style.cssText = "position:fixed;left:240px;top:40%;max-width:360px;color:#C9C2B8;font-size:13px;";
  msg.textContent = "WebGL unavailable in this browser/context — the models need GPU rendering. Open this page in a normal desktop browser.";
  document.body.appendChild(msg);
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
wrap.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x08080D);
const cam = new THREE.PerspectiveCamera(40, innerWidth/innerHeight, 0.01, 100);
const controls = new THREE.OrbitControls(cam, renderer.domElement);
controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 1.6;
scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x120e0a, 0.55));
const key = new THREE.DirectionalLight(0xfff1de, 1.5); key.position.set(3,4,3); scene.add(key);
const rimM = new THREE.PointLight(0xff3ea5, 9, 22); rimM.position.set(3.2,1.0,-2.4); scene.add(rimM);
const rimC = new THREE.PointLight(0x2bd9ff, 7, 22); rimC.position.set(-3.2,0.7,-2.2); scene.add(rimC);
const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48),
  new THREE.MeshStandardMaterial({ color:0x060609, roughness:0.85, metalness:0.05 }));
floor.rotation.x = -Math.PI/2; scene.add(floor);
const loader = new THREE.GLTFLoader();
let current = null;
function b64buf(b64){ const s = atob(b64); const a = new Uint8Array(s.length);
  for (let i=0;i<s.length;i++) a[i]=s.charCodeAt(i); return a.buffer; }
function show(keyName, btn){
  document.querySelectorAll("#panel button").forEach(b => b.classList.remove("on"));
  if (btn) btn.classList.add("on");
  loader.parse(b64buf(B64[keyName]), "", (g) => {
    if (current) scene.remove(current);
    current = g.scene;
    // Blender +Z-up exported as glTF +Y-up already; frame it
    const box = new THREE.Box3().setFromObject(current);
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    current.position.sub(c);                       // center at origin
    floor.position.y = -size.y/2 - 0.02;
    scene.add(current);
    const R = Math.max(size.x, size.y, size.z);
    cam.position.set(R*0.9, R*0.45, R*1.6);
    cam.near = R/100; cam.far = R*20; cam.updateProjectionMatrix();
    controls.target.set(0,0,0); controls.update();
  }, (e) => console.warn("parse fail", e));
}
const panel = document.getElementById("panel");
MODELS.forEach((m, i) => {
  const b = document.createElement("button");
  b.textContent = m.label;
  b.addEventListener("click", () => show(m.key, b));
  panel.appendChild(b);
  if (i === 0) setTimeout(() => show(m.key, b), 60);
});
const spin = document.createElement("button");
spin.id = "spin"; spin.textContent = "AUTOROTATE · ON"; spin.classList.add("on");
spin.addEventListener("click", () => {
  controls.autoRotate = !controls.autoRotate;
  spin.textContent = "AUTOROTATE · " + (controls.autoRotate ? "ON" : "OFF");
  spin.classList.toggle("on", controls.autoRotate);
});
panel.appendChild(spin);
addEventListener("resize", () => {
  cam.aspect = innerWidth/innerHeight; cam.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
if (matchMedia("(prefers-reduced-motion: reduce)").matches) controls.autoRotate = false;
(function loop(){ requestAnimationFrame(loop); controls.update(); renderer.render(scene, cam); })();
</script>
"""
open(os.path.join(CAT, "viewer.html"), "w").write(html)
print("viewer.html", len(html) // 1024, "KB")
