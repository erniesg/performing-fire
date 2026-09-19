#!/usr/bin/env python3
"""Board v4: LIVE animated preview signals, godai with gorinto hero,
relit catalogue, proofs. Anim JS inlined."""
import base64, os, subprocess, sys

CAT = os.path.dirname(os.path.abspath(__file__))
SP = os.path.dirname(CAT)

def jpg64(src, maxpx=640, q=74):
    p = os.path.join(CAT, src)
    if not os.path.exists(p):
        print("MISSING:", src, file=sys.stderr)
        return None
    tmp = os.path.join(CAT, "_tmp.jpg")
    subprocess.run(["sips", "-Z", str(maxpx), "-s", "format", "jpeg",
                    "-s", "formatOptions", str(q), p, "--out", tmp], capture_output=True)
    b = base64.b64encode(open(tmp, "rb").read()).decode()
    os.remove(tmp)
    return "data:image/jpeg;base64," + b

CHANNELS = [
    ("1", "ABOUT",       "#37FF8B", [("a","ignition rings"),("b","flame wisps"),("c","station test card"),("d","lissajous knot"),("e","typed ident")]),
    ("2", "CONTRIBUTE",  "#FF3EA5", [("a","record ring"),("b","tone bars"),("c","incoming pulse"),("d","waveform rain"),("e","voice hole")]),
    ("3", "EXPERIMENTS", "#FFB300", [("a","bent raster"),("b","glitch slices"),("c","lissajous specimens"),("d","moiré interference"),("e","burn grid")]),
    ("4", "RESEARCH",    "#2BD9FF", [("a","program guide"),("b","index card"),("c","microfilm"),("d","punch data"),("e","polar trace")]),
    ("5", "LOG",         "#E8E9EE", [("a","flip digits"),("b","tally field"),("c","moon phases"),("d","burn-down trace"),("e","sign-off dot")]),
]

GODAI = [
    ("空", "VOID · ku",    "the jewel — what remains when the broadcast ends",
     [("e-jewel.png", "DEAD TUBE JEWEL", "a switched-off CRT ground to a jewel; only the standby dot survives"),
      ("pv-ch5e.png", "SIGN-OFF", "the picture collapses to one white dot — the oldest image of nothing")]),
    ("風", "WIND · fū",    "the crescent — what moves and carries",
     [("c-dish.png", "SATELLITE DISH", "a crescent that catches what the air carries"),
      ("e-tapewind.png", "TAPE IN THE WIND", "a reel lets go; the recording streams")]),
    ("火", "FIRE · ka",    "the triangle — what transforms",
     [("e-flamecone.png", "FABRIC FIRE CONE", "the installation itself: translucent textile, projected flame"),
      ("e-candle.png", "CANDLE TV", "Paik 1975 — the tube replaced by fire")]),
    ("水", "WATER · sui",  "the sphere — what holds and reflects",
     [("e-orb.png", "ORB TV", "a round tube carrying a fully round signal"),
      ("e-crystal.png", "CRYSTAL OF STATIC", "the signal seen through water"),
      ("c-moon.png", "MOON", "Moon is the Oldest TV, 1965"),
      ("e-moonjar2.png", "ABSTRACT MOON JARS", "the seam where two halves join, lit; beside it the same jar, faceted")]),
    ("地", "EARTH · chi",  "the cube — what stores and stands",
     [("e-columbarium.png", "COLUMBARIUM DATA CENTRE", "a wall of niches for what remains — the reliquary and the server hall are the same building"),
      ("e-slabs.png", "SLABS", "mute monoliths, one seam of light"),
      ("e-rackB.png", "OPEN-FRAME RACK", "the archive as working machine"),
      ("e-catalog.png", "CARD CATALOG", "drawers of records — the archive as foundation")]),
]

MACHINES = [
    ("c-about.png","CONSOLE TV"), ("e-orb.png","ORB TV"), ("c-dish.png","SATELLITE DISH"),
    ("e-rotary.png","ROTARY TELEPHONE"), ("e-mic.png","STUDIO MIC"), ("c-experiments.png","OSCILLOSCOPE"),
    ("e-magnettv.png","MAGNET TV"), ("e-synth.png","VIDEO SYNTH"), ("e-reeldeck.png","REEL-TO-REEL"),
    ("e-skewer.png","RECORD SKEWER"), ("e-catalog.png","CARD CATALOG"), ("c-log.png","FLIP CLOCK"),
    ("c-moon.png","MOON"), ("e-candle.png","CANDLE TV"), ("e-rack.png","SERVER RACK"),
    ("e-crystal.png","CRYSTAL"), ("e-flamecone.png","FIRE CONE"), ("e-tapewind.png","TAPE WIND"),
    ("e-jewel.png","VOID JEWEL"),
    ("e-beacon.png","BEACON TOWER 봉수대"), ("e-tvbuddha.png","TV BUDDHA (1974)"),
    ("e-moktak.png","MOKTAK 목탁"), ("e-bell.png","TEMPLE BELL 범종"),
    ("e-moonjar.png","MOON JAR 달항아리"), ("e-brazier.png","BRAZIER 화로"),
    ("e-lantern.png","LOTUS LANTERN 연등"), ("e-cheomseongdae.png","CHEOMSEONGDAE 첨성대"),
    ("e-theremin.png","THEREMIN (1920)"), ("e-zoetrope.png","ZOETROPE"),
    ("e-tvgarden.png","TV GARDEN (1974)"), ("e-videofish.png","VIDEO FISH (1975)"),
    ("e-jangseung.png","DATA JANGSEUNG 장승"), ("e-antennabonsai.png","ANTENNA BONSAI"),
    ("e-rackA.png","RACK A · CABINET"), ("e-rackB.png","RACK B · OPEN FRAME"),
    ("e-rackC.png","RACK C · BROADCAST"), ("e-columbarium.png","COLUMBARIUM"),
    ("e-slabs.png","SLABS"), ("e-moonjar2.png","ABSTRACT MOON JARS"),
]

GLBKEYS = {"e-orb.png":"orb","e-magnettv.png":"magnettv","e-rack.png":"rack",
  "e-reeldeck.png":"reeldeck","e-jewel.png":"jewel","e-beacon.png":"beacon","e-bell.png":"bell",
  "e-tvbuddha.png":"tvbuddha","e-moonjar.png":"moonjar","e-tvgarden.png":"tvgarden","e-videofish.png":"videofish","e-jangseung.png":"jangseung","e-antennabonsai.png":"antennabonsai"}
def rotbtn(f):
    k = GLBKEYS.get(f)
    return f'<button class="rot" data-glb="{k}">&#10227; rotate</button>' if k else ""

PROOFS = [
    ("e-proof-orb-l.png", "camera −38°"), ("e-proof-orb-f.png", "camera 0°"),
    ("e-proof-orb-r.png", "camera +38°"), ("e-proof-orb-clay.png", "clay pass +20°"),
    ("e-proof-stupa-l.png", "stupa −30°"), ("e-proof-stupa-r.png", "stupa +30°"),
]

fonts = open(os.path.join(SP, "fonts-totem.css")).read() + "\n" + open(os.path.join(SP, "fonts-broadcast.css")).read()
rows = []

rows.append('<header><h1>PERFORMING FIRE</h1>'
            '<p class="k">CHANNEL PREVIEWS · GODAI ELEMENTS · CATALOGUE · 2026.07.27</p>'
            '<p class="lead">Live animated preview signals per channel (canvas — any winner exports '
            'to the site as-is), the stupa read as 五大 godai with a rendered gorintō of machines, '
            'the relit catalogue, and multi-angle proof renders. '
            '<a href="__VIEWER_URL__" style="color:#FFB300">Rotate every model yourself in the ORBIT VIEWER →</a></p></header>')

# --- 01: LIVE preview signals ---
ANIMS = [
    ("1", "ABOUT — round 3 · signal phenomena", "#37FF8B", [("g7","chromatic lock ✦"),("g1","buoyant field"),("g2","five-phase lock (mono)"),("g3","harmonic build"),("g4","convection"),("g5","unstable orbit"),("g6","shimmer rise")]),
    ("2", "CONTRIBUTE — round 3 · signal phenomena", "#FF3EA5", [("hi","braided field — your open braid, dense"),("hj","chimera field ✦ — coherence and chaos, one system"),("hk","head &amp; tail — the phase snapshot"),("hh","open braid — sparse, for comparison")]),
    ("3", "EXPERIMENTS — your six", "#FFB300", [("x1","scope sweep"),("x3","magnet breathe ★"),("x4","lissajous morph"),("x5","noise to order"),("x6","grid pulse"),("x7","rgb drift")]),
]
rows.append('<section><h2>01 · PREVIEW SIGNALS — LIVE, ANIMATED</h2>'
            '<p class="lead">New idea batches for the three open channels — every tile below is '
            'animating right now (canvas, no video). Research and Log keep their picked winners, '
            'also animated. Tap any tile label you like and it ships to the site as-is.</p>')
for n, name, tint, items in ANIMS:
    rows.append(f'<div class="strip"><h3 style="color:{tint}">CH 0{n} · {name}</h3><div class="rowa">')
    for key, label in items:
        rows.append(f'<figure class="atile"><canvas data-anim="{key}"></canvas><figcaption>{label}</figcaption></figure>')
    rows.append('</div></div>')
rows.append('<div class="strip"><h3 style="color:#2BD9FF">CH 04 · RESEARCH — picked winner, live</h3>'
            '<div class="rowa"><figure class="atile"><canvas data-anim="r1"></canvas><figcaption>punch data</figcaption></figure></div></div>')
rows.append('<div class="strip"><h3 style="color:#E8E9EE">CH 05 · LOG — picked winner, live</h3>'
            '<div class="rowa"><figure class="atile"><canvas data-anim="l1"></canvas><figcaption>moon phases</figcaption></figure></div></div>')
rows.append('</section>')

# --- 02: godai ---
H2 = jpg64("e-stupa2.png", maxpx=1100, q=80)
rows.append('<section><h2>02 · THE STUPA AS FIVE ELEMENTS — 五大</h2>')
if H2:
    rows.append(f'<div class="hero"><figure style="margin:0;display:flex;flex-direction:column;align-items:center;gap:8px">'
                f'<img src="{H2}" alt="gorinto of machines render">'
                f'<button class="rot big" data-glb="stupa2">&#10227; rotate the gorintō</button></figure></div>')
rows.append('<p class="lead" style="text-align:center">the gorintō of machines: catalog cube · orb sphere · fire pyramid · dish crescent · hōju jewel</p>')
rows.append('<p class="lead">A five-ring stupa stacks void over wind over fire over water over earth. '
            'Five rings, five channels. Candidates per element, top of the stupa first:</p>')
for hanja, name, sub, items in GODAI:
    rows.append(f'<div class="strip godai"><h3><span class="hanja">{hanja}</span> {name}</h3>'
                f'<p class="gsub">{sub}</p><div class="row rowg">')
    for f, title, why in items:
        img = jpg64(f, maxpx=640, q=74)
        body = f'<img src="{img}" alt="{title} render">' if img else '<div class="pend">RENDER PENDING</div>'
        rows.append(f'<figure class="tile"><div class="ph">{body}</div>'
                    f'<figcaption><b>{title}</b><span>{why}</span>{rotbtn(f)}</figcaption></figure>')
    rows.append('</div></div>')
rows.append('</section>')

# --- 03: catalogue ---
rows.append('<section><h2>03 · MACHINE CATALOGUE</h2><div class="grid">')
for f, name in MACHINES:
    img = jpg64(f, maxpx=460, q=70)
    body = f'<img src="{img}" alt="{name} render">' if img else '<div class="pend">PENDING</div>'
    rows.append(f'<figure class="tile sm"><div class="ph">{body}</div><figcaption><b>{name}</b>{rotbtn(f)}</figcaption></figure>')
rows.append('</div></section>')

# --- 04: proof of 3D ---
rows.append('<section><h2>04 · PROOF THESE ARE 3D</h2>'
            '<p class="lead">Blender 5.1.1 · Cycles · Metal GPU · parametric Python. Same objects, '
            'different camera azimuths — parallax does not lie — plus a materials-off clay pass. '
            'The scene file <code>catalogue.blend</code> is saved next to the script; open it and orbit.</p>'
            '<div class="row rowp">')
for f, label in PROOFS:
    img = jpg64(f, maxpx=520, q=72)
    body = f'<img src="{img}" alt="{label}">' if img else '<div class="pend">PENDING</div>'
    rows.append(f'<figure class="ptile">{body}<figcaption>{label}</figcaption></figure>')
rows.append('</div></section>')

html = """<title>PF — Machine Catalogue & Casting</title>
<style>
""" + fonts + """
:root { --bg:#08080D; --ink:#C9C2B8; --dim:#6E6862; --line:rgba(201,194,184,.16); --amber:#FFB300; }
html,body { background:var(--bg); }
body { color:var(--ink); font-family:'Azeret Mono',"Apple SD Gothic Neo",ui-monospace,monospace; font-weight:300; margin:0; padding:28px clamp(14px,4vw,48px) 80px; }
header h1 { font-family:'VT323',monospace; font-size:clamp(38px,6vw,64px); color:#fff; letter-spacing:2px; margin:0; }
.k { color:var(--dim); letter-spacing:2px; font-size:12px; margin:4px 0 14px; }
.lead { max-width:64ch; line-height:1.65; font-size:13.5px; margin:0 0 10px; }
.note { max-width:64ch; font-size:12px; color:var(--dim); line-height:1.6; }
h2 { font-family:'VT323',monospace; font-size:clamp(22px,3vw,30px); color:#fff; letter-spacing:2px; border-top:1px solid var(--line); padding-top:26px; margin:44px 0 18px; }
h3 { font-size:14px; letter-spacing:1.5px; margin:26px 0 10px; color:#fff; }
.hanja { font-size:26px; margin-right:8px; vertical-align:-3px; }
.gsub { margin:-4px 0 10px; font-size:12px; color:var(--dim); }
.row { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; }
.rowg { grid-template-columns:repeat(auto-fit,minmax(190px,240px)); }
.rowp { grid-template-columns:repeat(auto-fit,minmax(170px,220px)); }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:12px; }
.hero { display:flex; justify-content:center; margin:8px 0 18px; }
.hero img { max-width:min(520px,92vw); border:1px solid var(--line); }
.rowa { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:12px; }
.atile { margin:0; display:flex; flex-direction:column; gap:6px; }
.atile canvas { width:100%; height:auto; display:block; border-radius:12px; border:1px solid var(--line); background:#050507; box-shadow:inset 0 0 40px rgba(0,0,0,0.55); }
.atile figcaption { font-size:11px; color:var(--ink); letter-spacing:.5px; text-align:center; }
.ptile { margin:0; display:flex; flex-direction:column; gap:6px; }
.ptile img { width:100%; height:auto; display:block; border:1px solid var(--line); border-radius:10px; }
.ptile figcaption { font-size:11px; color:var(--ink); letter-spacing:.5px; text-align:center; }
.tile { margin:0; border:1px solid var(--line); background:#0B0B12; display:flex; flex-direction:column; }
.ph { aspect-ratio:1/1.05; display:flex; align-items:center; justify-content:center; overflow:hidden; }
.ph img { width:100%; height:100%; object-fit:contain; display:block; }
.pend { color:var(--dim); font-size:11px; letter-spacing:2px; border:1px dashed var(--line); padding:14px 10px; }
figcaption { padding:9px 11px 11px; display:flex; flex-direction:column; gap:3px; border-top:1px solid var(--line); }
figcaption b { font-weight:500; color:#fff; font-size:11.5px; letter-spacing:1px; }
figcaption span { font-size:10.5px; line-height:1.5; color:var(--ink); }
code { color:var(--amber); font-family:inherit; }
@media (max-width:980px) { .row { grid-template-columns:repeat(3,1fr); } }
@media (max-width:560px) { .row { grid-template-columns:repeat(2,1fr); } }
.rot { font:inherit; font-size:10.5px; letter-spacing:1px; color:var(--amber); background:none;
  border:1px solid rgba(255,179,0,.4); padding:4px 8px; cursor:pointer; margin-top:6px; align-self:flex-start; }
.rot:hover { border-color:var(--amber); background:rgba(255,179,0,.08); }
.rot.big { font-size:12px; padding:7px 14px; }
#orbmodal { position:fixed; inset:0; z-index:80; background:rgba(4,4,8,0.92); display:none; }
#orbmodal.on { display:block; }
#orbwrap { position:absolute; inset:0; }
#orbclose { position:absolute; top:14px; right:16px; z-index:5; font:inherit; font-size:13px;
  color:#C9C2B8; background:#12121A; border:1px solid rgba(201,194,184,.25); padding:8px 14px; cursor:pointer; }
#orbclose:hover { color:var(--amber); border-color:var(--amber); }
#orblabel { position:absolute; top:18px; left:20px; z-index:5; font-size:12px; letter-spacing:2px; color:var(--amber); }
#orbhint { position:absolute; bottom:12px; left:20px; z-index:5; font-size:10.5px; color:#6E6862; letter-spacing:1px; }
:focus-visible { outline:2px solid var(--amber); outline-offset:2px; }
</style>
""" + "\n".join(rows)

anims = open(os.path.join(CAT, "preview-anims.js")).read() + "\n" + open(os.path.join(CAT, "preview-anims2.js")).read() + "\n" + open(os.path.join(CAT, "preview-anims3.js")).read()
html += "\n<script>\n" + anims + "\nwindow.PF_INIT && window.PF_INIT();\n</script>\n"

# ---- in-board orbit modal ----
html += ("<div id=\"orbmodal\"><div id=\"orbwrap\"></div>"
         "<span id=\"orblabel\"></span>"
         "<button id=\"orbclose\">CLOSE ✕</button>"
         "<span id=\"orbhint\">drag to rotate · scroll to zoom · geometry from catalogue.blend (materials simplified)</span></div>")
V = os.path.join(CAT, "vendor")
libs = "".join(open(os.path.join(V, f)).read() + "\n" for f in ("three.min.js", "GLTFLoader.js", "OrbitControls.js"))
glbjs = []
for k in sorted(set(GLBKEYS.values()) | {"stupa2"}):
    p = os.path.join(CAT, "glb", k + ".glb")
    if os.path.exists(p):
        glbjs.append('PF_GLB["%s"]="%s";' % (k, base64.b64encode(open(p, "rb").read()).decode()))
html += "<script>\n" + libs + "\nconst PF_GLB={};\n" + "\n".join(glbjs) + "\n" + open(os.path.join(CAT, "board-orbit.js")).read() + "\n</script>\n"
out = os.path.join(CAT, "board.html")
open(out, "w").write(html)
print("board.html", len(html) // 1024, "KB")
