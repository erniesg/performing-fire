"""NJP element catalogue — every machine from the element library as its own
parametric model, plus the assembled stupa hero.

Run:  blender -b -P catalogue.py -- rotary mic          (named renders)
      blender -b -P catalogue.py -- ALL                 (everything)
"""
import bpy
import math
import sys
from mathutils import Vector

OUT = "/private/tmp/claude-501/-Users-erniesg-code-erniesg-performing-fire/e5f7896b-6272-4212-83ce-fd9a75854159/scratchpad/cat/"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------------- materials ----------------
def plastic(name, rgb, rough=0.5, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m

def wood_mat():
    m = bpy.data.materials.new("wood")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.38
    # glTF fallback when the ramp link can't export: a real wood brown, not white
    b.inputs["Base Color"].default_value = (0.15, 0.075, 0.032, 1)
    tex = nt.nodes.new("ShaderNodeTexWave")
    tex.inputs["Scale"].default_value = 1.6
    tex.inputs["Distortion"].default_value = 6.0
    tex.inputs["Detail"].default_value = 2.5
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1.0, 0.12, 0.12)
    coord = nt.nodes.new("ShaderNodeTexCoord")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.086, 0.040, 0.018, 1)
    ramp.color_ramp.elements[1].color = (0.180, 0.086, 0.038, 1)
    nt.links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    return m

def glass_mat():
    m = bpy.data.materials.new("glass")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    mix = nt.nodes.new("ShaderNodeMixShader")
    transp = nt.nodes.new("ShaderNodeBsdfTransparent")
    gloss = nt.nodes.new("ShaderNodeBsdfGlossy")
    gloss.inputs["Roughness"].default_value = 0.12
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.15
    nt.links.new(lw.outputs["Fresnel"], mix.inputs["Fac"])
    nt.links.new(transp.outputs["BSDF"], mix.inputs[1])
    nt.links.new(gloss.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    return m

def emiss(name, rgb, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1)
    em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    return m

def screen_mat(img, strength=3.2, scan=True, round_mask=False):
    m = bpy.data.materials.new("scr-" + img)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = strength
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(OUT + img)
    coord = nt.nodes.new("ShaderNodeTexCoord")
    nt.links.new(coord.outputs["UV"], tex.inputs["Vector"])
    if round_mask:
        # kill the square: emission only inside the inscribed circle, transparent outside
        sub = nt.nodes.new("ShaderNodeVectorMath")
        sub.operation = "SUBTRACT"
        sub.inputs[1].default_value = (0.5, 0.5, 0.0)
        ln = nt.nodes.new("ShaderNodeVectorMath")
        ln.operation = "LENGTH"
        gt = nt.nodes.new("ShaderNodeMath")
        gt.operation = "GREATER_THAN"
        gt.inputs[1].default_value = 0.5
        transp = nt.nodes.new("ShaderNodeBsdfTransparent")
        mixs = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(coord.outputs["UV"], sub.inputs[0])
        nt.links.new(sub.outputs["Vector"], ln.inputs[0])
        nt.links.new(ln.outputs["Value"], gt.inputs[0])
        nt.links.new(gt.outputs["Value"], mixs.inputs["Fac"])
        nt.links.new(em.outputs["Emission"], mixs.inputs[1])
        nt.links.new(transp.outputs["BSDF"], mixs.inputs[2])
        nt.links.new(tex.outputs["Color"], em.inputs["Color"])
        nt.links.new(mixs.outputs["Shader"], out.inputs["Surface"])
        return m
    if scan:
        waves = nt.nodes.new("ShaderNodeTexWave")
        waves.inputs["Scale"].default_value = 150.0
        mapping = nt.nodes.new("ShaderNodeMapping")
        mapping.inputs["Rotation"].default_value = (0, math.radians(90), 0)
        wramp = nt.nodes.new("ShaderNodeValToRGB")
        wramp.color_ramp.elements[0].position = 0.35
        wramp.color_ramp.elements[0].color = (0.74, 0.74, 0.74, 1)
        mul = nt.nodes.new("ShaderNodeMix")
        mul.data_type = "RGBA"
        mul.blend_type = "MULTIPLY"
        mul.inputs["Factor"].default_value = 1.0
        nt.links.new(coord.outputs["UV"], mapping.inputs["Vector"])
        nt.links.new(mapping.outputs["Vector"], waves.inputs["Vector"])
        nt.links.new(waves.outputs["Fac"], wramp.inputs["Fac"])
        nt.links.new(tex.outputs["Color"], mul.inputs["A"])
        nt.links.new(wramp.outputs["Color"], mul.inputs["B"])
        nt.links.new(mul.outputs["Result"], em.inputs["Color"])
    else:
        nt.links.new(tex.outputs["Color"], em.inputs["Color"])
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    return m

MAT = {
    "wood": wood_mat(),
    "cream": plastic("cream", (0.52, 0.47, 0.37), rough=0.42),
    "steel": plastic("steel", (0.062, 0.062, 0.072), rough=0.42, metal=0.35),
    "lab": plastic("lab", (0.085, 0.102, 0.088), rough=0.5),
    "grey": plastic("grey", (0.16, 0.16, 0.17), rough=0.5),
    "bezel": plastic("bezel", (0.018, 0.018, 0.022), rough=0.55),
    "cloth": plastic("cloth", (0.055, 0.048, 0.040), rough=0.92),
    "knob": plastic("knob", (0.05, 0.05, 0.055), rough=0.22, metal=0.85),
    "slat": plastic("slat", (0.012, 0.012, 0.015), rough=0.6),
    "chrome": plastic("chrome", (0.35, 0.35, 0.38), rough=0.15, metal=1.0),
    "tape": plastic("tape", (0.010, 0.009, 0.009), rough=0.3),
    "phone": plastic("phone", (0.022, 0.022, 0.026), rough=0.32),
    "vinyl": plastic("vinyl", (0.012, 0.012, 0.014), rough=0.22),
    "brass": plastic("brass", (0.62, 0.44, 0.18), rough=0.35, metal=1.0),
    "wax": plastic("wax", (0.86, 0.82, 0.72), rough=0.65),
    "magnet": plastic("magnetred", (0.55, 0.04, 0.03), rough=0.4),
    "kamber": plastic("kamber", (0.85, 0.55, 0.10), rough=0.35),
    "kcyan": plastic("kcyan", (0.10, 0.55, 0.60), rough=0.35),
    "kmag": plastic("kmag", (0.60, 0.10, 0.38), rough=0.35),
    "cable": plastic("cable", (0.70, 0.62, 0.10), rough=0.5),
    "glass": glass_mat(),
    "reddot": emiss("reddot", (1.0, 0.06, 0.03), 22.0),
    "flame": emiss("flame", (1.0, 0.52, 0.12), 30.0),
    "flamecore": emiss("flamecore", (1.0, 0.92, 0.72), 60.0),
}

parts = []
def box(dims, loc, mat, bevel=0.0, segs=3, rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.scale = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if rot:
        o.rotation_euler = rot
    if bevel > 0:
        bv = o.modifiers.new("bev", "BEVEL")
        bv.width = bevel
        bv.segments = segs
    o.data.materials.append(mat)
    parts.append(o)
    return o

def cyl(r, depth, loc, rot, mat, verts=48):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.object
    o.data.materials.append(mat)
    parts.append(o)
    return o

def cone(r1, r2, depth, loc, rot, mat):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.data.materials.append(mat)
    parts.append(o)
    return o

def sphere(r, loc, mat, scale=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=r, location=loc)
    o = bpy.context.object
    if scale:
        o.scale = scale
        bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    parts.append(o)
    return o

def torus(major, minor, loc, rot, mat):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=loc, rotation=rot)
    o = bpy.context.object
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    parts.append(o)
    return o

def screen_plane(w, h, loc, img, strength=3.2, scan=True, round_mask=False):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    o = bpy.context.object
    o.rotation_euler = (math.pi / 2, 0, 0)
    o.scale = (w, h, 1)
    bpy.ops.object.transform_apply(location=False, scale=True, rotation=True)
    o.data.materials.append(screen_mat(img, strength, scan, round_mask))
    parts.append(o)
    return o

def strut(p0, p1, r, mat):
    """cylinder between two points (for tape runs, arms)"""
    v = Vector(p1) - Vector(p0)
    mid = (Vector(p0) + Vector(p1)) / 2
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=v.length, location=mid, vertices=24)
    o = bpy.context.object
    o.rotation_euler = v.to_track_quat("Z", "Y").to_euler()
    o.data.materials.append(mat)
    parts.append(o)
    return o

def ribbon(p0, p1, width, thick, mat):
    """flat tape segment between two points in the XZ face plane"""
    v = Vector(p1) - Vector(p0)
    mid = (Vector(p0) + Vector(p1)) / 2
    bpy.ops.mesh.primitive_cube_add(size=1, location=mid)
    o = bpy.context.object
    o.scale = (v.length, width, thick)
    bpy.ops.object.transform_apply(scale=True)
    o.rotation_euler = (0, -math.atan2(v.z, v.x), 0)
    o.data.materials.append(mat)
    parts.append(o)
    return o

def cable(pts, r, mat):
    """smooth sagging cable through points — Bezier spline with bevel"""
    cu = bpy.data.curves.new("cbl", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = r
    cu.bevel_resolution = 6
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = p
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"
    ob = bpy.data.objects.new("cbl", cu)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    parts.append(ob)
    return ob

def plight(loc, power, color=(1.0, 0.62, 0.25), size=0.05):
    bpy.ops.object.light_add(type="POINT", location=loc)
    L = bpy.context.object
    L.data.energy = power
    L.data.color = color
    L.data.shadow_soft_size = size
    parts.append(L)
    return L

RX = (math.pi / 2, 0, 0)

# ---------------- existing five (kept for stupa assembly / reuse) ----------------
def g_console(tex="screen-about.png"):
    F = -0.275
    box((1.24, 0.55, 0.66), (0, 0, 0.10), MAT["wood"], bevel=0.04, segs=4)
    for sx, sy in [(-0.52, -0.16), (-0.52, 0.16), (0.52, -0.16), (0.52, 0.16)]:
        cone(0.038, 0.018, 0.30, (sx, sy, -0.36), (math.radians(-8 if sy > 0 else 8), math.radians(-6 if sx > 0 else 6), 0), MAT["slat"])
    box((0.70, 0.05, 0.55), (-0.22, F + 0.012, 0.10), MAT["bezel"], bevel=0.02)
    screen_plane(0.62, 0.465, (-0.22, F - 0.014, 0.10), tex)
    sphere(1, (-0.22, F + 0.045, 0.10), MAT["glass"], scale=(0.32, 0.075, 0.24))
    box((0.36, 0.03, 0.55), (0.40, F + 0.004, 0.10), MAT["cloth"], bevel=0.012)
    for i in range(6):
        box((0.013, 0.02, 0.50), (0.28 + i * 0.048, F - 0.008, 0.10), MAT["wood"])
    for kx in (0.31, 0.45):
        cyl(0.042, 0.05, (kx, F - 0.02, -0.115), RX, MAT["knob"])
    cyl(0.011, 0.02, (0.55, F - 0.012, -0.13), RX, MAT["reddot"])
    return 1000, 780, -3.75

def g_orb(tex="tex-roundrec.png"):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=0.50, location=(0, 0, 0.05))
    o = bpy.context.object
    o.data.materials.append(MAT["cream"])
    bpy.ops.object.shade_smooth()
    parts.append(o)
    cone(0.42, 0.345, 0.24, (0, -0.40, 0.05), RX, MAT["cream"])
    bpy.ops.object.shade_smooth()
    bpy.ops.mesh.primitive_torus_add(major_radius=0.30, minor_radius=0.05,
                                     location=(0, -0.53, 0.05), rotation=RX,
                                     major_segments=96, minor_segments=32)
    t = bpy.context.object
    t.data.materials.append(MAT["bezel"])
    bpy.ops.object.shade_smooth()
    parts.append(t)
    # circular tube face: masked round screen fills the aperture — no square anywhere
    screen_plane(0.52, 0.52, (0, -0.527, 0.05), tex, round_mask=True)
    sphere(1, (0, -0.55, 0.05), MAT["glass"], scale=(0.245, 0.055, 0.245))
    cyl(0.20, 0.10, (0, 0, -0.50), (0, 0, 0), MAT["bezel"])
    cyl(0.27, 0.035, (0, 0, -0.555), (0, 0, 0), MAT["bezel"])
    return 900, 900, -3.35

def g_scope():
    F = -0.31
    box((0.92, 0.62, 0.74), (0, 0, -0.02), MAT["lab"], bevel=0.03)
    box((0.52, 0.05, 0.52), (-0.155, F + 0.012, -0.02), MAT["bezel"], bevel=0.02)
    screen_plane(0.44, 0.44, (-0.155, F - 0.030, -0.02), "tex-scope.png")
    sphere(1, (-0.155, F + 0.020, -0.02), MAT["glass"], scale=(0.23, 0.050, 0.23))
    for kx in (0.27, 0.40):
        for kz in (0.20, 0.045, -0.11):
            cyl(0.040, 0.05, (kx, F - 0.018, kz), RX, MAT["knob"])
    for tx in (0.29, 0.38):
        box((0.03, 0.05, 0.07), (tx, F - 0.01, -0.26), MAT["slat"])
    for px in (-0.26, 0.26):
        box((0.05, 0.05, 0.10), (px, 0, 0.38), MAT["lab"])
    box((0.60, 0.055, 0.055), (0, 0, 0.445), MAT["bezel"], bevel=0.02)
    cyl(0.011, 0.02, (0.34, F - 0.012, -0.30), RX, MAT["reddot"])
    return 940, 860, -3.3

def g_clockradio():
    F = -0.23
    box((0.92, 0.46, 0.44), (0, 0, 0), MAT["wood"], bevel=0.07, segs=5)
    box((0.56, 0.03, 0.27), (-0.13, F + 0.006, 0.0), MAT["bezel"], bevel=0.015)
    screen_plane(0.52, 0.236, (-0.13, F - 0.010, 0.0), "tex-logclock.png", strength=1.8, scan=False)
    for i in range(6):
        box((0.013, 0.02, 0.28), (0.26 + i * 0.030, F - 0.006, 0.0), MAT["slat"])
    for sx in (-0.32, 0.32):
        cyl(0.032, 0.045, (sx, 0, -0.245), (0, 0, 0), MAT["slat"])
    cyl(0.011, 0.02, (0.20, F - 0.010, -0.16), RX, MAT["reddot"])
    return 940, 620, -3.0

def g_moon():
    """Moon with a real terminator: single hard sun, crater bump, dark maria,
    NO self-glow — sunlight does the work."""
    m = bpy.data.materials.new("moon")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 1.0
    b.inputs["Base Color"].default_value = (0.34, 0.33, 0.31, 1)  # glTF fallback
    # albedo: grey with darker maria patches
    nlarge = nt.nodes.new("ShaderNodeTexNoise")
    nlarge.inputs["Scale"].default_value = 2.3
    nlarge.inputs["Detail"].default_value = 4.0
    aramp = nt.nodes.new("ShaderNodeValToRGB")
    aramp.color_ramp.elements[0].position = 0.38
    aramp.color_ramp.elements[0].color = (0.16, 0.155, 0.145, 1)
    aramp.color_ramp.elements[1].position = 0.62
    aramp.color_ramp.elements[1].color = (0.44, 0.43, 0.40, 1)
    nt.links.new(nlarge.outputs["Fac"], aramp.inputs["Fac"])
    nt.links.new(aramp.outputs["Color"], b.inputs["Base Color"])
    # craters: voronoi wells + fine noise
    vor = nt.nodes.new("ShaderNodeTexVoronoi")
    vor.inputs["Scale"].default_value = 9.0
    vramp = nt.nodes.new("ShaderNodeValToRGB")
    vramp.color_ramp.elements[0].position = 0.10
    vramp.color_ramp.elements[1].position = 0.35
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 22.0
    noise.inputs["Detail"].default_value = 8.0
    mixv = nt.nodes.new("ShaderNodeMix")
    mixv.data_type = "RGBA"
    mixv.inputs["Factor"].default_value = 0.45
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 2.0
    nt.links.new(vor.outputs["Distance"], vramp.inputs["Fac"])
    nt.links.new(vramp.outputs["Color"], mixv.inputs["A"])
    nt.links.new(noise.outputs["Fac"], mixv.inputs["B"])
    nt.links.new(mixv.outputs["Result"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    bpy.ops.mesh.primitive_uv_sphere_add(segments=128, ring_count=64, radius=0.52, location=(0, 0, 0.10))
    s = bpy.context.object
    s.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    parts.append(s)
    # the sun: hard raking light from right — terminator falls across the face
    bpy.ops.object.light_add(type="SUN", location=(4, -2, 1.5))
    sun = bpy.context.object
    sun.data.energy = 6.5
    sun.data.angle = math.radians(0.6)
    sun.rotation_euler = Vector((0, 0, 0.10)) and (Vector((0, 0, 0.10)) - Vector((4, -2, 1.5))).to_track_quat("-Z", "Y").to_euler()
    parts.append(sun)
    return 820, 880, -3.1

def g_dish():
    metal = plastic("dishmetal", (0.34, 0.35, 0.37), rough=0.32, metal=0.7)
    ax = math.radians(20)
    C = (0, 0.02, -0.02)
    def along(t):
        return (C[0], C[1] - t * math.sin(ax), C[2] + t * math.cos(ax))
    cyl(0.15, 0.34, (0, 0, -0.46), (0, 0, 0), MAT["bezel"])
    cyl(0.24, 0.04, (0, 0, -0.63), (0, 0, 0), MAT["bezel"])
    box((0.10, 0.10, 0.30), (0, 0.05, -0.22), MAT["steel"], bevel=0.02)
    cone(0.06, 0.66, 0.24, C, (ax, 0, 0), metal)
    torus(0.655, 0.022, along(0.12), (ax, 0, 0), metal)
    cyl(0.020, 0.55, along(0.30), (ax, 0, 0), MAT["chrome"], verts=24)
    cone(0.07, 0.02, 0.12, along(0.60), (ax + math.pi, 0, 0), MAT["bezel"])
    cyl(0.011, 0.02, (0.10, -0.055, -0.40), RX, MAT["reddot"])
    return 940, 830, -3.9

# ---------------- new machines ----------------
def g_rotary():
    """Rotary telephone — the call-in machine."""
    t = math.radians(22)
    box((0.84, 0.64, 0.16), (0, 0, -0.44), MAT["phone"], bevel=0.05, segs=4)
    box((0.80, 0.58, 0.30), (0, 0.03, -0.26), MAT["phone"], bevel=0.05, segs=5, rot=(-t, 0, 0))
    # dial sits ON the sloped front face: face center + n*offset, raised up-plane
    n = Vector((0, -math.cos(t), math.sin(t)))
    u = Vector((1, 0, 0))
    v = Vector((0, math.sin(t), math.cos(t)))
    C = Vector((0, 0.03, -0.26)) + n * 0.295 + v * 0.045
    drot = (math.radians(90) - t, 0, 0)
    cyl(0.215, 0.035, C + n * 0.012, drot, plastic("dialring", (0.80, 0.78, 0.72), rough=0.3))
    cyl(0.085, 0.048, C + n * 0.020, drot, MAT["phone"])
    for k in range(10):
        a = math.radians(-58 - k * 27)
        p = C + u * (0.150 * math.cos(a)) + v * (0.150 * math.sin(a)) + n * 0.036
        cyl(0.027, 0.02, p, drot, MAT["bezel"], verts=24)
    cyl(0.014, 0.055, C + u * 0.175 + v * (-0.105) + n * 0.030, drot, MAT["chrome"], verts=24)  # finger stop
    # cradle + handset held high above the body
    for hx in (-0.22, 0.22):
        box((0.07, 0.11, 0.16), (hx, 0.16, -0.02), MAT["phone"], bevel=0.03)
    hz = 0.13
    strut((-0.30, 0.16, hz), (0.30, 0.16, hz), 0.040, MAT["phone"])
    for hx in (-0.31, 0.31):
        s = sphere(0.105, (hx, 0.16, hz - 0.02), MAT["phone"], scale=(1, 1, 0.78))
        s.rotation_euler = (0, math.radians(10 if hx > 0 else -10), 0)
    cyl(0.011, 0.02, (0.30, -0.245, -0.42), RX, MAT["reddot"])
    return 900, 800, -3.3

def g_mic():
    """Studio ribbon microphone — the voice of the station."""
    cyl(0.22, 0.045, (0, 0, -0.66), (0, 0, 0), MAT["bezel"])
    cyl(0.030, 0.06, (0, 0, -0.615), (0, 0, 0), MAT["bezel"])
    cyl(0.016, 0.72, (0, 0, -0.26), (0, 0, 0), MAT["chrome"], verts=24)
    box((0.06, 0.05, 0.07), (0, 0, 0.115), MAT["bezel"], bevel=0.015)
    for sx in (-0.155, 0.155):
        box((0.03, 0.045, 0.30), (sx, 0, 0.26), MAT["chrome"], bevel=0.012)
    box((0.30, 0.05, 0.05), (0, 0, 0.115), MAT["chrome"], bevel=0.015)
    # capsule pill
    box((0.30, 0.22, 0.46), (0, 0, 0.30), plastic("micshell", (0.10, 0.10, 0.115), rough=0.32, metal=0.5), bevel=0.10, segs=7)
    for i in range(7):
        box((0.27, 0.012, 0.017), (0, -0.115, 0.135 + i * 0.055), MAT["chrome"])
    box((0.20, 0.14, 0.045), (0, 0, 0.545), MAT["bezel"], bevel=0.015)
    box((0.20, 0.14, 0.045), (0, 0, 0.058), MAT["bezel"], bevel=0.015)
    cyl(0.011, 0.02, (0.16, -0.115, -0.64), RX, MAT["reddot"])
    return 760, 1000, -3.0

def g_magnettv():
    """Magnet on a TV — participation as distortion (Magnet TV, 1965)."""
    F = -0.265
    bake = plastic("bakelite", (0.055, 0.032, 0.020), rough=0.18)
    box((0.86, 0.52, 0.60), (0, 0, -0.14), bake, bevel=0.07, segs=7)
    box((0.70, 0.045, 0.48), (-0.03, F + 0.014, -0.13), MAT["bezel"], bevel=0.025, segs=5)
    screen_plane(0.58, 0.42, (-0.03, F - 0.014, -0.13), "tex-magnet.png")
    sphere(1, (-0.03, F + 0.040, -0.13), MAT["glass"], scale=(0.29, 0.050, 0.215))
    for kz in (0.00, -0.15, -0.30):
        cyl(0.030, 0.045, (0.36, F - 0.016, kz), RX, MAT["knob"])
    # industrial U-magnet (Whitney: "industrial-size magnet resting on top"):
    # grey steel bar bent into a U, silver pole faces down on the cabinet top
    TOP = 0.17
    MX = 0.12
    tiltz = math.radians(-6)
    mag = plastic("magsteel", (0.16, 0.165, 0.175), rough=0.45, metal=0.85)
    for lx in (-0.145, 0.145):
        box((0.085, 0.11, 0.20), (MX + lx, 0.02, TOP + 0.115), mag, bevel=0.015, segs=4, rot=(0, tiltz, 0))
        box((0.095, 0.12, 0.035), (MX + lx, 0.02, TOP + 0.018), MAT["chrome"], bevel=0.008, rot=(0, tiltz, 0))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.145, minor_radius=0.052,
                                     location=(MX, 0.02, TOP + 0.215), rotation=(math.pi / 2, tiltz, 0),
                                     major_segments=72, minor_segments=24)
    tt = bpy.context.object
    tt.data.materials.append(mag)
    bpy.ops.object.shade_smooth()
    parts.append(tt)
    cyl(0.011, 0.02, (0.36, F - 0.012, -0.39), RX, MAT["reddot"])
    return 940, 900, -3.4

def g_synth():
    """Paik–Abe video synthesizer — knobs, patch cables, a rainbow monitor."""
    t = math.radians(28)
    box((1.18, 0.62, 0.26), (0, 0, -0.47), MAT["steel"], bevel=0.03)
    box((1.18, 0.60, 0.07), (0, 0.015, -0.24), MAT["lab"], bevel=0.025, rot=(-t, 0, 0))
    C = Vector((0, -0.10, -0.185)) + Vector((0, math.sin(t), math.cos(t))) * -0.02
    u = Vector((1, 0, 0))
    v = Vector((0, math.sin(t), math.cos(t)))
    n = Vector((0, -math.cos(t), math.sin(t)))
    krot = (math.radians(90) - t, 0, 0)
    caps = [MAT["kamber"], MAT["kcyan"], MAT["kmag"], MAT["cream"]]
    for row in range(3):
        for col in range(8):
            p = C + u * ((col - 3.5) * 0.135) + v * ((row - 1.0) * 0.115) + n * 0.052
            cyl(0.030, 0.045, p, krot, caps[(row * 3 + col) % 4], verts=24)
            cyl(0.012, 0.06, p + n * 0.012, krot, MAT["bezel"], verts=16)
    # patch cables — arcs standing out of the panel
    for (cx, cv, s) in [(-0.38, 0.10, 0.11), (-0.10, -0.06, 0.14), (0.22, 0.08, 0.09), (0.40, -0.02, 0.12)]:
        p = C + u * cx + v * cv + n * 0.02
        torus(s, 0.009, p, (math.radians(90) - t, 0, math.radians(14)), MAT["cable"])
    # side monitor
    box((0.36, 0.34, 0.32), (0.47, 0.06, 0.05), MAT["steel"], bevel=0.025)
    box((0.28, 0.03, 0.24), (0.47, -0.115, 0.05), MAT["bezel"], bevel=0.015)
    screen_plane(0.24, 0.19, (0.47, -0.135, 0.05), "tex-synthmon.png", strength=3.6)
    cyl(0.011, 0.02, (-0.54, -0.30, -0.44), RX, MAT["reddot"])
    return 1050, 780, -3.55

def g_reeldeck():
    """Reel-to-reel, rebuilt: two spoked reels side by side, visible tape path,
    head block, VU meters — a machine that plays memory, not a speaker."""
    F = -0.14
    box((1.04, 0.26, 1.06), (0, 0, -0.04), MAT["steel"], bevel=0.03)
    for sx in (-0.545, 0.545):
        box((0.05, 0.28, 1.08), (sx, 0, -0.04), MAT["wood"], bevel=0.02)
    RZ = 0.22
    for rx, wound in ((-0.245, 0.170), (0.245, 0.082)):
        cyl(0.215, 0.014, (rx, F + 0.010, RZ), RX, MAT["bezel"])          # back flange
        cyl(wound, 0.050, (rx, F - 0.016, RZ), RX, MAT["tape"])           # wound tape
        torus(0.208, 0.011, (rx, F - 0.052, RZ), RX, plastic("flange%d" % (1 if rx > 0 else 0), (0.72, 0.70, 0.66), rough=0.35, metal=0.6))
        for k in range(3):
            box((0.34, 0.010, 0.020), (rx, F - 0.052, RZ), MAT["chrome"], rot=(0, math.radians(k * 60), 0))
        cyl(0.040, 0.095, (rx, F - 0.035, RZ), RX, MAT["chrome"], verts=32)
    # tape path: L reel rim -> guide -> heads -> guide -> R reel rim (thin cylinders)
    TY = F - 0.026
    g_l = (-0.40, TY, -0.13)
    h_l = (-0.10, TY, -0.165)
    h_r = (0.10, TY, -0.165)
    g_r = (0.40, TY, -0.13)
    p_l = (-0.245 - 0.155, TY, RZ - 0.06)
    p_r = (0.245 + 0.070, TY, RZ - 0.035)
    for a, b2 in [(p_l, g_l), (g_l, h_l), (h_l, h_r), (h_r, g_r), (g_r, p_r)]:
        strut(a, b2, 0.007, MAT["tape"])
    for gp in (g_l, g_r):
        cyl(0.018, 0.05, gp, RX, MAT["chrome"], verts=24)
    box((0.26, 0.06, 0.10), (0, F - 0.005, -0.20), MAT["bezel"], bevel=0.012)   # head block
    for hx in (-0.06, 0.02, 0.09):
        box((0.035, 0.03, 0.055), (hx, F - 0.030, -0.185), MAT["chrome"])
    # VU meters
    for vx in (-0.30, -0.12):
        box((0.17, 0.03, 0.12), (vx, F + 0.002, -0.40), MAT["bezel"], bevel=0.01)
        screen_plane(0.15, 0.10, (vx, F - 0.032, -0.40), "tex-vu.png", strength=1.5, scan=False)
    # transport buttons
    for i in range(5):
        box((0.055, 0.045, 0.045), (0.13 + i * 0.075, F - 0.005, -0.415), MAT["slat"], bevel=0.008)
    cyl(0.011, 0.02, (0.44, F - 0.010, -0.415), RX, MAT["reddot"])
    return 980, 1000, -3.3

def g_skewer():
    """Record skewer (Schallplatten-Schaschlik) — the archive as spire."""
    cyl(0.30, 0.06, (0, 0, -0.62), (0, 0, 0), MAT["wood"])
    cyl(0.017, 1.32, (0, 0, 0.05), (0, 0, 0), MAT["chrome"], verts=24)
    import random
    random.seed(11)
    lab = [MAT["kamber"], MAT["kmag"], MAT["kcyan"], MAT["cream"]]
    z = -0.48
    i = 0
    while z < 0.55 and i < 7:
        rr = 0.25 + random.uniform(-0.02, 0.025)
        tilt = (math.radians(random.uniform(-10, 10)), math.radians(random.uniform(-8, 8)), 0)
        cyl(rr, 0.007, (0, 0, z), tilt, MAT["vinyl"], verts=64)
        cyl(0.055, 0.009, (0, 0, z), tilt, lab[i % 4], verts=32)
        z += random.uniform(0.14, 0.19)
        i += 1
    sphere(0.030, (0, 0, 0.72), MAT["chrome"])
    cyl(0.011, 0.02, (0.20, -0.22, -0.585), RX, MAT["reddot"])
    return 800, 1080, -3.6

def g_catalog():
    """Card catalog — drawers of records: the reliquary of research."""
    box((1.00, 0.58, 0.10), (0, 0, -0.60), MAT["bezel"], bevel=0.02)
    box((0.94, 0.54, 1.02), (0, 0, -0.04), MAT["wood"], bevel=0.025)
    box((1.00, 0.58, 0.05), (0, 0, 0.50), MAT["wood"], bevel=0.015)
    F = -0.27
    open_dr = (1, 2)   # col, row — one drawer pulled out
    for col in range(3):
        for row in range(5):
            x = (col - 1) * 0.295
            z = -0.44 + row * 0.195
            if (col, row) == open_dr:
                box((0.255, 0.24, 0.150), (x, F - 0.075, z), MAT["wood"])
                box((0.235, 0.20, 0.02), (x, F - 0.085, z - 0.055), MAT["bezel"])
                box((0.20, 0.012, 0.115), (x, F - 0.10, z + 0.035), plastic("card", (0.88, 0.85, 0.76), rough=0.7), rot=(math.radians(-14), 0, 0))
                box((0.265, 0.03, 0.160), (x, F - 0.19, z), MAT["wood"], bevel=0.008)
                cyl(0.017, 0.035, (x, F - 0.215, z - 0.01), RX, MAT["brass"], verts=24)
                box((0.13, 0.014, 0.05), (x, F - 0.205, z + 0.045), MAT["brass"])
            else:
                box((0.265, 0.03, 0.160), (x, F - 0.005, z), MAT["wood"], bevel=0.008)
                cyl(0.017, 0.035, (x, F - 0.028, z - 0.01), RX, MAT["brass"], verts=24)
                box((0.13, 0.014, 0.05), (x, F - 0.020, z + 0.045), MAT["brass"])
    cyl(0.011, 0.02, (0.40, -0.296, -0.575), RX, MAT["reddot"])
    return 900, 950, -3.35

def g_candle():
    """Candle TV — a gutted cabinet, one flame where the tube was. No power light:
    nothing here is plugged in."""
    dark = plastic("cavity", (0.010, 0.009, 0.008), rough=0.9)
    # hollow cabinet: frame walls, open front
    box((0.92, 0.10, 0.72), (0, 0.23, 0.02), MAT["wood"], bevel=0.03)          # back slab
    box((0.92, 0.56, 0.10), (0, 0, 0.33), MAT["wood"], bevel=0.03)            # top
    box((0.92, 0.56, 0.10), (0, 0, -0.29), MAT["wood"], bevel=0.03)           # bottom
    for sx in (-0.41, 0.41):
        box((0.10, 0.56, 0.72), (sx, 0, 0.02), MAT["wood"], bevel=0.03)       # sides
    box((0.72, 0.02, 0.52), (0, 0.175, 0.02), dark)                            # cavity back
    cyl(0.048, 0.26, (0, -0.02, -0.11), (0, 0, 0), MAT["wax"])
    cyl(0.004, 0.030, (0, -0.02, 0.033), (0, 0, 0), MAT["bezel"], verts=12)
    cone(0.020, 0.002, 0.085, (0, -0.02, 0.095), (0, 0, 0), MAT["flame"])
    sphere(0.012, (0, -0.02, 0.075), MAT["flamecore"])
    plight((0, -0.06, 0.10), 18.0)
    for sx, sy in [(-0.40, -0.16), (-0.40, 0.16), (0.40, -0.16), (0.40, 0.16)]:
        cone(0.036, 0.016, 0.24, (sx, sy, -0.46), (math.radians(-8 if sy > 0 else 8), math.radians(-6 if sx > 0 else 6), 0), MAT["slat"])
    return 940, 800, -3.45

# ---------------- element objects (godai studies) ----------------
def g_rack():
    """Server rack v3 — 地 EARTH. A real 19-inch open frame: posts with mounting
    holes, mixed units (switches, servers, patch panel, vents, cable ring, PDU),
    depth, casters. The modern reliquary."""
    F = -0.30
    # open frame: four posts + top/bottom caps
    for px, py in [(-0.36, F + 0.02), (0.36, F + 0.02), (-0.36, 0.34), (0.36, 0.34)]:
        box((0.055, 0.045, 1.34), (px, py, 0.02), MAT["steel"], bevel=0.008)
    for pz in (0.70, -0.66):
        box((0.80, 0.44, 0.05), (0, 0.02, pz), MAT["steel"], bevel=0.01)
    # mounting-hole strips on front posts
    for px in (-0.36, 0.36):
        for hz in range(24):
            cyl(0.008, 0.06, (px, F + 0.012, -0.585 + hz * 0.052), RX, MAT["bezel"], verts=10)
    # casters
    for cx2, cy2 in [(-0.30, F + 0.06), (0.30, F + 0.06), (-0.30, 0.30), (0.30, 0.30)]:
        cyl(0.045, 0.035, (cx2, cy2, -0.715), (0, math.radians(90), 0), MAT["bezel"], verts=24)
    # units bottom -> top; each 0.115 tall on 0.125 pitch, faces proud at F
    UW, UD = 0.655, 0.55
    uz = -0.585
    def uface(h):
        return box((UW, 0.03, h), (0, F + 0.015, uz + h / 2), MAT["bezel"], bevel=0.006)
    def ubody(h):
        box((UW - 0.02, UD, h - 0.01), (0, 0.02, uz + h / 2), MAT["steel"])
    ledn = [0]
    def leds(n, z, amber_every=4):
        for i in range(n):
            ledn[0] += 1
            e = emiss("rled%d" % ledn[0],
                      (1.0, 0.70, 0.10) if i % amber_every == 0 else (0.20, 1.0, 0.45), 14.0)
            cyl(0.006, 0.012, (-UW / 2 + 0.05 + i * 0.028, F - 0.002, z), RX, e, verts=8)
    def unit_switch():
        nonlocal uz
        h = 0.115
        uface(h); ubody(h)
        leds(18, uz + h * 0.62)
        for i in range(18):  # port row
            box((0.020, 0.015, 0.026), (-UW / 2 + 0.05 + i * 0.028, F - 0.002, uz + h * 0.28), MAT["slat"])
        uz += 0.125
    def unit_server():
        nonlocal uz
        h = 0.24
        uface(h); ubody(h)
        for hx in (-UW / 2 + 0.06, UW / 2 - 0.06):  # rack handles
            box((0.025, 0.02, h * 0.7), (hx, F - 0.006, uz + h / 2), MAT["knob"], bevel=0.006)
        for i in range(8):  # drive bays
            box((0.062, 0.012, 0.075), (-UW / 2 + 0.16 + i * 0.068, F - 0.002, uz + h * 0.30), MAT["slat"])
        leds(4, uz + h * 0.78, amber_every=3)
        uz += 0.25
    def unit_patch():
        nonlocal uz
        h = 0.115
        uface(h); ubody(h)
        for row in range(2):
            for i in range(16):
                box((0.024, 0.015, 0.030), (-UW / 2 + 0.06 + i * 0.036, F - 0.002, uz + h * (0.30 + row * 0.42)), MAT["bezel"])
        uz += 0.125
    def unit_vent():
        nonlocal uz
        h = 0.115
        uface(h)
        for i in range(5):
            box((UW - 0.08, 0.012, 0.011), (0, F - 0.001, uz + 0.022 + i * 0.020), MAT["slat"])
        uz += 0.125
    def unit_ring():
        nonlocal uz
        h = 0.115
        uface(h)
        for hx in (-0.18, 0.0, 0.18):
            torus(0.036, 0.010, (hx, F - 0.015, uz + h / 2), (0, 0, 0), MAT["slat"])
        uz += 0.125
    def unit_pdu():
        nonlocal uz
        h = 0.115
        uface(h)
        for i in range(8):
            box((0.030, 0.014, 0.030), (-UW / 2 + 0.07 + i * 0.055, F - 0.002, uz + h / 2), MAT["knob"])
        cyl(0.010, 0.018, (UW / 2 - 0.05, F - 0.004, uz + h / 2), RX, MAT["reddot"])
        uz += 0.125
    unit_pdu(); unit_vent(); unit_server(); unit_patch(); unit_ring()
    unit_switch(); unit_switch(); unit_server(); unit_vent()
    # patch cables, dressed for real: port -> short sag -> up through the
    # cable-manager ring one unit above -> gone behind it. Nothing leaves
    # the rack silhouette; nothing ends in mid-air.
    zp = -0.585 + 0.125 + 0.125 + 0.25 + 0.048          # patch-panel port row
    zring = -0.585 + 0.125 + 0.125 + 0.25 + 0.125 + 0.058   # ring centres
    ring_x = [-0.18, 0.0, 0.18]
    for k, mtl in enumerate(["cable", "kcyan", "kmag", "kamber", "kcyan"]):
        x0 = -UW / 2 + 0.09 + k * 0.115
        hx = ring_x[k % 3] + (k // 3) * 0.02
        box((0.018, 0.030, 0.024), (x0, F - 0.018, zp), MAT["bezel"])   # boot
        cable([(x0, F - 0.034, zp),
               (x0 * 0.7 + hx * 0.3, F - 0.070, zp + 0.008 - 0.018),
               (hx, F - 0.058, (zp + zring) / 2 - 0.012),
               (hx, F - 0.030, zring - 0.012),
               (hx, F + 0.012, zring + 0.004)], 0.0080, MAT[mtl])
    return 820, 1150, (-3.6, 0.35, 0.0)

def g_crystal():
    """Crystal ball of static — 水 WATER. The signal seen through water."""
    cyl(0.30, 0.09, (0, 0, -0.50), (0, 0, 0), MAT["wood"])
    cyl(0.24, 0.07, (0, 0, -0.42), (0, 0, 0), MAT["bezel"])
    # inner static core
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=0.30, location=(0, 0, 0.02))
    core = bpy.context.object
    core.data.materials.append(screen_mat("tex-staticf.png", strength=1.6, scan=False))
    bpy.ops.object.shade_smooth()
    parts.append(core)
    # glass shell
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=0.40, location=(0, 0, 0.02))
    sh = bpy.context.object
    sh.data.materials.append(MAT["glass"])
    bpy.ops.object.shade_smooth()
    parts.append(sh)
    return 860, 900, -3.1

def g_flamecone():
    """The fabric fire cone — 火 FIRE. Translucent textile, projected flame:
    the installation itself, miniature."""
    m = bpy.data.materials.new("fabricfire")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    outn = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = 2.6
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(OUT + "tex-flame.png")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    transp = nt.nodes.new("ShaderNodeBsdfTransparent")
    mixs = nt.nodes.new("ShaderNodeMixShader")
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.35
    nt.links.new(coord.outputs["Generated"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], em.inputs["Color"])
    nt.links.new(lw.outputs["Facing"], mixs.inputs["Fac"])
    nt.links.new(transp.outputs["BSDF"], mixs.inputs[1])
    nt.links.new(em.outputs["Emission"], mixs.inputs[2])
    nt.links.new(mixs.outputs["Shader"], outn.inputs["Surface"])
    bpy.ops.mesh.primitive_cone_add(radius1=0.52, radius2=0.06, depth=1.30,
                                    location=(0, 0, 0.05), vertices=96)
    o = bpy.context.object
    o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    parts.append(o)
    cyl(0.56, 0.05, (0, 0, -0.63), (0, 0, 0), MAT["bezel"])
    plight((0, -0.2, -0.1), 26.0)
    return 820, 1050, -3.4

def g_tapewind():
    """Tape in the wind — 風 WIND. A reel lets go; the recording streams."""
    cyl(0.26, 0.05, (0, 0, -0.55), (0, 0, 0), MAT["bezel"])
    cyl(0.03, 0.30, (0, 0, -0.42), (0, 0, 0), MAT["chrome"], verts=24)
    cyl(0.215, 0.014, (0, 0.02, -0.20), RX, MAT["bezel"])
    torus(0.208, 0.011, (0, -0.015, -0.20), RX, plastic("twfl", (0.72, 0.70, 0.66), rough=0.35, metal=0.6))
    cyl(0.09, 0.05, (0, -0.005, -0.20), RX, MAT["tape"])
    cyl(0.040, 0.075, (0, -0.01, -0.20), RX, MAT["chrome"], verts=32)
    # streaming tape — smooth curves peeling off the reel into the air
    import random
    random.seed(23)
    for s in range(4):
        pts = []
        a0 = 0.5 + s * 0.35
        for i in range(6):
            t = i / 5
            pts.append((
                -0.19 + t * (0.60 + s * 0.10) + math.sin(t * 4 + s) * 0.06,
                -0.02 + math.sin(t * 5.1 + s * 2.0) * 0.07,
                -0.18 + t * (0.60 + s * 0.15) + math.sin(t * 3 + a0) * 0.12,
            ))
        cable(pts, 0.006, MAT["tape"])
    return 940, 900, -3.3

def hoju(z0, scale, mat):
    """canonical 宝珠 hōju: squashed sphere swelling into a pointed bud — built
    from three smooth-joined pieces sharing one material"""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=0.40 * scale, location=(0, 0, z0))
    o = bpy.context.object
    o.scale = (1, 1, 0.92)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    parts.append(o)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=0.26 * scale, location=(0, 0, z0 + 0.26 * scale))
    o2 = bpy.context.object
    o2.scale = (0.78, 0.78, 1.05)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o2.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    parts.append(o2)
    cone(0.115 * scale, 0.002, 0.30 * scale, (0, 0, z0 + 0.52 * scale), (0, 0, 0), mat)
    bpy.ops.object.shade_smooth()

def g_jewel():
    """空 VOID — the hōju: a dead tube ground to the wish-jewel; only the
    standby dot survives, glowing inside the glass."""
    m = bpy.data.materials.new("voidglass")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.03, 0.032, 0.045, 1)
    b.inputs["Roughness"].default_value = 0.04
    b.inputs["Metallic"].default_value = 0.0
    try:
        b.inputs["Transmission Weight"].default_value = 0.55
        b.inputs["IOR"].default_value = 1.48
        b.inputs["Coat Weight"].default_value = 1.0
    except Exception:
        pass
    hoju(-0.06, 1.0, m)
    # standby ember inside the glass
    sphere(0.018, (0, 0, -0.10), MAT["reddot"])
    # lotus seat: two tori + plinth
    torus(0.335, 0.055, (0, 0, -0.44), (0, 0, 0), MAT["bezel"])
    torus(0.26, 0.045, (0, 0, -0.51), (0, 0, 0), MAT["bezel"])
    cyl(0.30, 0.08, (0, 0, -0.60), (0, 0, 0), MAT["steel"])
    return 800, 1000, -3.2

def g_stupa2():
    """The gorintō, machine for machine — five canonical shapes, five channels:
    catalog cube (earth) -> orb sphere (water) -> fabric fire PYRAMID (fire) ->
    dish crescent (wind) -> hōju jewel (void)."""
    def at(builder, dz, **kw):
        n0 = len(parts)
        builder(**kw)
        for p in parts[n0:]:
            p.location.z += dz
    at(g_catalog, 0.0)                      # 地 cube, top ~0.53
    at(g_orb, 1.12)                          # 水 sphere, top ~1.67
    # 火 four-sided pyramid in fire fabric
    m = bpy.data.materials.new("pyrofabric")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    outn = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = 2.4
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(OUT + "tex-flame.png")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    transp = nt.nodes.new("ShaderNodeBsdfTransparent")
    mixs = nt.nodes.new("ShaderNodeMixShader")
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.32
    nt.links.new(coord.outputs["Generated"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], em.inputs["Color"])
    nt.links.new(lw.outputs["Facing"], mixs.inputs["Fac"])
    nt.links.new(transp.outputs["BSDF"], mixs.inputs[1])
    nt.links.new(em.outputs["Emission"], mixs.inputs[2])
    nt.links.new(mixs.outputs["Shader"], outn.inputs["Surface"])
    bpy.ops.mesh.primitive_cone_add(radius1=0.62, radius2=0.02, depth=0.78,
                                    location=(0, 0, 2.10), vertices=4)
    pyr = bpy.context.object
    pyr.rotation_euler = (0, 0, math.radians(45))
    pyr.data.materials.append(m)
    parts.append(pyr)
    plight((0, -0.15, 2.0), 22.0)
    # 風 crescent: the dish bowl turned skyward
    dm = plastic("dishmetal2", (0.30, 0.31, 0.33), rough=0.30, metal=0.75)
    cone(0.09, 0.55, 0.20, (0, 0, 2.62), (math.radians(6), 0, 0), dm)
    torus(0.545, 0.020, (0, -0.012, 2.725), (math.radians(6), 0, 0), dm)
    # 空 hōju
    vg = bpy.data.materials.new("voidglass2")
    vg.use_nodes = True
    vb = vg.node_tree.nodes["Principled BSDF"]
    vb.inputs["Base Color"].default_value = (0.03, 0.032, 0.045, 1)
    vb.inputs["Roughness"].default_value = 0.05
    try:
        vb.inputs["Transmission Weight"].default_value = 0.5
        vb.inputs["Coat Weight"].default_value = 1.0
    except Exception:
        pass
    hoju(3.15, 0.62, vg)
    sphere(0.014, (0, 0, 3.12), MAT["reddot"])
    # moon far behind-left, its own sun handled by studio
    n0 = len(parts)
    g_moon()
    for p in parts[n0:]:
        if p.type == "MESH":
            p.location = (1.55, 3.4, 3.6)
            p.scale = (1.35, 1.35, 1.35)
    return 1000, 1500, (-7.2, 1.85, 1.75)

# ---------------- earth & water studies: racks, columbarium, slabs, jars ----------------
RSTEEL = plastic("racksteel", (0.052, 0.055, 0.062), rough=0.42, metal=0.55)
RDARK = plastic("rackdark", (0.018, 0.019, 0.023), rough=0.6)

def g_rackA():
    """Server rack A — closed enterprise cabinet: 42U proportions, perforated
    door, LEDs breathing behind the mesh."""
    W2, D2, H3 = 0.52, 0.60, 1.62
    box((W2, D2, H3), (0, 0.02, 0.12), RSTEEL, bevel=0.012, segs=2)
    box((W2 * 0.94, 0.02, H3 * 0.955), (0, -0.285, 0.12), RDARK)          # door frame inset
    screen_plane(W2 * 0.86, H3 * 0.91, (0, -0.298, 0.12), "tex-mesh.png", strength=0.55, scan=False)
    box((0.05, 0.015, 0.16), (W2 / 2 - 0.055, -0.297, 0.12), RDARK, bevel=0.006)   # handle
    for hz in (0.55, -0.35):                                              # hinges
        box((0.018, 0.02, 0.07), (-W2 / 2 + 0.02, -0.295, hz + 0.12), MAT["chrome"])
    for i in range(7):                                                    # top vents
        box((W2 * 0.8, 0.012, 0.011), (0, -0.15 + i * 0.05 - 0.15, H3 / 2 + 0.115), RDARK)
    box((W2 + 0.04, D2 + 0.04, 0.07), (0, 0.02, -0.73), RDARK)            # plinth
    cyl(0.011, 0.02, (W2 / 2 - 0.05, -0.30, H3 / 2 + 0.06), RX, MAT["reddot"])
    return 640, 1350, (-4.4, 0.28, 0.10)

def g_rackB():
    """Server rack B — open four-post frame, dense 1U units, finger ducts,
    one dressed vertical bundle."""
    H3, W2 = 1.60, 0.56
    for px, py in [(-0.26, -0.24), (0.26, -0.24), (-0.26, 0.30), (0.26, 0.30)]:
        box((0.045, 0.04, H3), (px, py, 0.10), RSTEEL, bevel=0.006, segs=2)
    for pz in (H3 / 2 + 0.115, -H3 / 2 + 0.085):
        box((0.60, 0.62, 0.045), (0, 0.03, pz), RSTEEL, bevel=0.008)
    for cx2, cy2 in [(-0.22, -0.20), (0.22, -0.20), (-0.22, 0.26), (0.22, 0.26)]:
        cyl(0.040, 0.03, (cx2, cy2, -0.745), (0, math.radians(90), 0), RDARK, verts=20)
    UW2, pitch = 0.46, 0.058
    uz = -0.66
    F2 = -0.26
    kinds = ["patch", "duct", "switch", "srv", "duct", "patch", "switch", "vent"]
    ln = [0]
    for u in range(24):
        kind = kinds[u % len(kinds)]
        box((UW2, 0.025, pitch * 0.82), (0, F2 + 0.012, uz), RDARK, bevel=0.004, segs=2)
        if kind == "patch":
            for c2 in range(20):
                box((0.016, 0.012, 0.020), (-UW2 / 2 + 0.03 + c2 * 0.021, F2 - 0.002, uz), plastic("pp%d" % (u * 100 + c2), (0.01, 0.01, 0.012), rough=0.7))
        elif kind == "duct":
            for c2 in range(9):
                box((0.022, 0.02, pitch * 0.6), (-UW2 / 2 + 0.05 + c2 * 0.048, F2 - 0.006, uz), RSTEEL, bevel=0.004)
        elif kind == "switch":
            for c2 in range(14):
                ln[0] += 1
                e = emiss("rbl%d" % ln[0], (0.20, 1.0, 0.45) if c2 % 5 else (1.0, 0.70, 0.10), 10.0)
                cyl(0.005, 0.010, (-UW2 / 2 + 0.03 + c2 * 0.018, F2 - 0.002, uz + pitch * 0.16), RX, e, verts=8)
            for c2 in range(12):
                box((0.018, 0.010, 0.018), (-UW2 / 2 + 0.05 + c2 * 0.024, F2 - 0.002, uz - pitch * 0.14), RDARK)
        elif kind == "srv":
            for hx in (-UW2 / 2 + 0.035, UW2 / 2 - 0.035):
                box((0.016, 0.014, pitch * 0.55), (hx, F2 - 0.004, uz), MAT["knob"], bevel=0.004)
            ln[0] += 1
            cyl(0.005, 0.010, (UW2 / 2 - 0.08, F2 - 0.002, uz), RX, emiss("rsl%d" % ln[0], (0.2, 1.0, 0.45), 10.0), verts=8)
        uz += pitch
    # the bundle: six cables dressed down the right channel, clamped
    for k in range(6):
        xx = 0.305 + (k % 3) * 0.012
        yy = -0.10 + (k // 3) * 0.05
        cable([(xx, yy, 0.70), (xx + 0.006, yy + 0.01, 0.2), (xx, yy, -0.3), (xx + 0.004, yy, -0.68)], 0.0075,
              MAT[["cable", "kcyan", "kmag"][k % 3]])
    for cz in (0.45, -0.05, -0.5):
        box((0.05, 0.09, 0.03), (0.31, -0.085, cz), RDARK, bevel=0.006)
    return 700, 1350, (-4.4, 0.30, 0.08)

def g_rackC():
    """Server rack C — the broadcast rack: VU pair, jack field, round scope,
    blinkers; wooden cheeks. The TV-station species."""
    H3 = 1.06
    for sx in (-0.34, 0.34):
        box((0.06, 0.50, H3), (sx, 0.02, 0.02), MAT["wood"], bevel=0.015)
    box((0.62, 0.46, H3 - 0.04), (0, 0.04, 0.02), RDARK)
    F2 = -0.20
    uz = 0.42
    box((0.56, 0.025, 0.15), (0, F2, uz), RDARK, bevel=0.004)
    for vx in (-0.14, 0.14):
        screen_plane(0.24, 0.16, (vx, F2 - 0.018, uz), "tex-vu.png", strength=1.5, scan=False)
    uz -= 0.20
    box((0.56, 0.025, 0.16), (0, F2, uz), RDARK, bevel=0.004)
    screen_plane(0.52, 0.15, (0, F2 - 0.018, uz), "tex-jackfield.png", strength=0.9, scan=False)
    uz -= 0.24
    box((0.56, 0.025, 0.26), (0, F2, uz), RDARK, bevel=0.004)
    cyl(0.105, 0.03, (-0.15, F2 - 0.012, uz), RX, MAT["bezel"], verts=48)
    screen_plane(0.19, 0.19, (-0.15, F2 - 0.030, uz), "tex-scope.png", strength=2.6, round_mask=True)
    for kx in (0.10, 0.22):
        for kz2 in (uz + 0.06, uz - 0.06):
            cyl(0.028, 0.04, (kx, F2 - 0.014, kz2), RX, MAT["knob"])
    uz -= 0.25
    box((0.56, 0.025, 0.12), (0, F2, uz), RDARK, bevel=0.004)
    ln = [0]
    for c2 in range(9):
        ln[0] += 1
        col = [(0.2, 1.0, 0.45), (1.0, 0.7, 0.1), (1.0, 0.25, 0.15)][c2 % 3]
        cyl(0.008, 0.014, (-0.22 + c2 * 0.055, F2 - 0.012, uz), RX, emiss("bcl%d" % ln[0], col, 12.0), verts=10)
    box((0.30, 0.02, 0.045), (-0.09, F2 - 0.008, uz - 0.045), RDARK)
    cyl(0.014, 0.03, (0.22, F2 - 0.012, uz - 0.04), RX, MAT["chrome"], verts=16)
    box((0.70, 0.54, 0.05), (0, 0.02, -0.55), MAT["wood"], bevel=0.01)
    return 780, 1150, (-3.8, 0.18, 0.02)

def g_columbarium():
    """Columbarium data centre — 地 EARTH. A wall of niches for what remains:
    the reliquary and the server hall are the same building."""
    stone2 = plastic("colstone", (0.16, 0.155, 0.15), rough=0.85)
    W2, H3 = 0.78, 1.58
    box((W2, 0.5, H3), (0, 0.06, 0.10), stone2, bevel=0.01, segs=2)
    box((W2 + 0.08, 0.58, 0.08), (0, 0.06, -0.73), stone2)
    box((W2 + 0.06, 0.56, 0.06), (0, 0.06, H3 / 2 + 0.13), stone2)
    import random
    random.seed(41)
    COLS, ROWS = 5, 11
    ln = 0
    for r2 in range(ROWS):
        for c2 in range(COLS):
            px = -W2 / 2 + 0.115 + c2 * 0.138
            pz = -0.62 + r2 * 0.128
            box((0.105, 0.05, 0.096), (px, -0.20, pz), RDARK)            # niche cavity
            lit = random.random() < 0.30
            if lit:
                ln += 1
                warm = random.random() < 0.6
                e = emiss("nch%d" % ln, (1.0, 0.62, 0.18) if warm else (0.25, 1.0, 0.5), 3.2)
                bpy.ops.mesh.primitive_plane_add(size=1, location=(px, -0.2255, pz))
                o = bpy.context.object
                o.rotation_euler = (math.pi / 2, 0, 0)
                o.scale = (0.085, 0.076, 1)
                bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
                o.data.materials.append(e)
                parts.append(o)
            else:
                box((0.098, 0.012, 0.088), (px, -0.225, pz), stone2, bevel=0.004)   # sealed lid
    return 760, 1250, (-4.2, 0.24, 0.06)

def g_slabs():
    """Abstract slabs — 地 EARTH, mute version: monoliths with one seam of light."""
    mono = plastic("monolith", (0.030, 0.030, 0.034), rough=0.75)
    box((0.46, 0.26, 1.34), (-0.12, 0.05, -0.02), mono, bevel=0.008, segs=2)
    box((0.34, 0.20, 0.92), (0.42, 0.34, -0.23), mono, bevel=0.008, segs=2)
    box((0.58, 0.30, 0.34), (0.30, -0.28, -0.52), mono, bevel=0.008, segs=2)
    # one thin seam of amber light on the tall slab
    box((0.462, 0.005, 0.008), (-0.12, -0.083, 0.32), emiss("seam1", (1.0, 0.62, 0.18), 9.0))
    box((0.008, 0.005, 0.60), (0.255, 0.235, -0.23), emiss("seam2", (1.0, 0.62, 0.18), 6.0))
    return 900, 1050, (-4.0, 0.30, -0.02)

def g_moonjar2():
    """Abstract moon jars — 水 WATER: the seam where two halves join, lit;
    beside it, the same jar faceted."""
    # jar 1: porcelain, glowing equator seam
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=0.34, location=(-0.30, 0, -0.16))
    o = bpy.context.object
    o.scale = (1, 1, 0.94)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(PORCELAIN)
    bpy.ops.object.shade_smooth()
    parts.append(o)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.336, minor_radius=0.004,
                                     location=(-0.30, 0, -0.16), major_segments=96, minor_segments=12)
    tt = bpy.context.object
    tt.data.materials.append(emiss("jarseam", (1.0, 0.85, 0.6), 4.0))
    parts.append(tt)
    cyl(0.115, 0.055, (-0.30, 0, 0.175), (0, 0, 0), PORCELAIN, verts=48)
    # jar 2: faceted low-poly ghost
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.30, location=(0.36, 0.14, -0.20))
    f2 = bpy.context.object
    f2.scale = (1, 1, 0.95)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    fmat = plastic("facetjar", (0.82, 0.81, 0.78), rough=0.5)
    f2.data.materials.append(fmat)
    parts.append(f2)                                    # flat-shaded: facets stay
    cyl(0.10, 0.05, (0.36, 0.14, 0.10), (0, 0, 0), fmat, verts=12)
    cyl(0.42, 0.03, (0, 0.05, -0.52), (0, 0, 0), MAT["bezel"], verts=64)
    return 980, 850, -3.4

# ---------------- tradition & media-archeology bench ----------------
STONE = plastic("stone", (0.30, 0.29, 0.27), rough=0.9)
BRONZE = plastic("bronze", (0.23, 0.17, 0.09), rough=0.45, metal=0.9)
PORCELAIN = plastic("porcelain", (0.90, 0.89, 0.84), rough=0.25)

def g_beacon():
    """봉수대 beacon tower — Joseon's signal-fire network: fire as telegraph."""
    cone(0.55, 0.42, 0.35, (0, 0, -0.47), (0, 0, 0), STONE)
    cyl(0.42, 0.55, (0, 0, -0.02), (0, 0, 0), STONE, verts=24)
    # stone courses
    for i in range(4):
        torus(0.425, 0.018, (0, 0, -0.22 + i * 0.15), (0, 0, 0), STONE)
    cyl(0.46, 0.06, (0, 0, 0.28), (0, 0, 0), STONE, verts=24)
    # fire crown
    for k in range(5):
        a = k / 5 * math.pi * 2
        cone(0.05, 0.004, 0.30 + 0.06 * (k % 2), (0.16 * math.cos(a), 0.16 * math.sin(a), 0.48), (math.radians(8 * math.cos(a)), math.radians(8 * math.sin(a)), 0), MAT["flame"])
    cone(0.09, 0.004, 0.42, (0, 0, 0.53), (0, 0, 0), MAT["flame"])
    sphere(0.03, (0, 0, 0.40), MAT["flamecore"])
    plight((0, -0.1, 0.5), 30.0)
    return 860, 980, -3.3

def g_tvbuddha():
    """TV Buddha (Paik 1974) — the statue watches itself on closed-circuit."""
    # seated figure: stacked rounded forms
    fig = plastic("giltstone", (0.45, 0.36, 0.18), rough=0.5, metal=0.6)
    FX = -0.30
    sphere(0.16, (FX, 0, 0.185), fig, scale=(1, 0.9, 1.05))          # head
    sphere(0.26, (FX, 0, -0.12), fig, scale=(1, 0.85, 1.15))         # body
    sphere(0.30, (FX, 0, -0.38), fig, scale=(1.15, 0.9, 0.55))       # crossed legs
    cyl(0.36, 0.06, (FX, 0, -0.58), (0, 0, 0), STONE)
    # small monitor facing the figure
    box((0.34, 0.30, 0.30), (0.32, 0, -0.42), MAT["grey"], bevel=0.04, segs=5)
    box((0.24, 0.03, 0.20), (0.32, -0.16, -0.42), MAT["bezel"], bevel=0.012, rot=(0, 0, math.radians(-14)))
    screen_plane(0.20, 0.16, (0.305, -0.175, -0.42), "tex-staticf.png", strength=1.4)
    # CCTV camera on a stalk, watching the buddha
    cyl(0.012, 0.55, (0.42, 0.05, 0.02), (0, 0, 0), MAT["chrome"], verts=16)
    box((0.16, 0.09, 0.09), (0.36, 0.03, 0.30), MAT["bezel"], bevel=0.015, rot=(0, 0, math.radians(-155)))
    cyl(0.035, 0.05, (0.27, 0.01, 0.295), (0, math.radians(75), math.radians(-20)), MAT["knob"], verts=24)
    cyl(0.011, 0.02, (0.32, -0.155, -0.30), RX, MAT["reddot"])
    return 1000, 800, -3.2

def g_moktak():
    """목탁 moktak — the wooden fish bell: notification, long before the ping."""
    wood2 = plastic("moktakwood", (0.42, 0.28, 0.13), rough=0.55)
    sphere(0.34, (0, 0, -0.05), wood2, scale=(1, 0.92, 0.88))
    # sound slit
    box((0.50, 0.30, 0.055), (0, -0.12, -0.16), plastic("slitdark", (0.02, 0.012, 0.008), rough=0.9), rot=(math.radians(-9), 0, 0))
    # handle
    cyl(0.055, 0.30, (0, 0, -0.42), (math.radians(12), 0, 0), wood2, verts=24)
    # striker resting against it
    cyl(0.022, 0.55, (0.38, -0.10, -0.28), (0, math.radians(58), math.radians(10)), wood2, verts=16)
    sphere(0.05, (0.60, -0.16, -0.13), wood2)
    cyl(0.40, 0.05, (0, 0, -0.60), (0, 0, 0), MAT["bezel"])
    return 900, 760, -3.0

def g_bell():
    """범종 temple bell — sound cast to carry over distance: the first broadcast."""
    # bell body: dome + flared skirt
    sphere(0.40, (0, 0, 0.22), BRONZE, scale=(1, 1, 0.72))
    cone(0.435, 0.395, 0.55, (0, 0, -0.11), (0, 0, 0), BRONZE)
    torus(0.435, 0.025, (0, 0, -0.375), (0, 0, 0), BRONZE)
    # horizontal bands + lotus bosses
    for bz in (0.28, 0.05):
        torus(0.405 if bz > 0.1 else 0.425, 0.014, (0, 0, bz), (0, 0, 0), BRONZE)
    for k in range(9):
        a = k / 9 * math.pi * 2
        sphere(0.022, (0.41 * math.cos(a), 0.41 * math.sin(a), 0.17), BRONZE)
    # dragon hook + beam
    torus(0.07, 0.028, (0, 0, 0.56), (0, math.radians(90), 0), BRONZE)
    cyl(0.035, 0.9, (0, 0, 0.66), (math.radians(90), 0, math.radians(90)), MAT["wood"], verts=16)
    # striker log
    cyl(0.05, 0.7, (0.62, -0.25, -0.05), (0, math.radians(90), math.radians(-25)), MAT["wood"], verts=20)
    return 900, 950, -3.3

def g_moonjar():
    """달항아리 moon jar — the vessel that holds nothing perfectly."""
    sphere(0.40, (0, 0, 0.10), PORCELAIN, scale=(1, 1, 0.92))
    sphere(0.34, (0, 0, -0.28), PORCELAIN, scale=(1, 1, 0.78))
    cyl(0.16, 0.10, (0, 0, 0.48), (0, 0, 0), PORCELAIN, verts=48)
    torus(0.165, 0.018, (0, 0, 0.53), (0, 0, 0), PORCELAIN)
    cyl(0.20, 0.05, (0, 0, -0.56), (0, 0, 0), PORCELAIN, verts=48)
    cyl(0.30, 0.04, (0, 0, -0.60), (0, 0, 0), MAT["bezel"])
    return 800, 950, -3.1

def g_brazier():
    """화로 brazier — the hearth bowl: where offerings actually burn."""
    sphere(0.42, (0, 0, -0.10), BRONZE, scale=(1, 1, 0.62))
    cyl(0.30, 0.05, (0, 0, -0.38), (0, 0, 0), BRONZE)
    for k in range(3):
        a = k / 3 * math.pi * 2 + 0.5
        cone(0.05, 0.03, 0.22, (0.30 * math.cos(a), 0.30 * math.sin(a), -0.48), (math.radians(-10 * math.sin(a)), math.radians(10 * math.cos(a)), 0), BRONZE)
    for hx in (-0.44, 0.44):
        torus(0.07, 0.016, (hx, 0, 0.02), (0, math.radians(90), 0), BRONZE)
    # embers + small flames
    import random
    random.seed(3)
    for e in range(12):
        a, rr2 = random.random() * math.pi * 2, random.random() * 0.26
        sphere(0.025 + random.random() * 0.02, (rr2 * math.cos(a), rr2 * math.sin(a), 0.08), MAT["flame"] if e % 3 else MAT["flamecore"])
    cone(0.06, 0.003, 0.24, (0.05, -0.03, 0.24), (0, math.radians(6), 0), MAT["flame"])
    plight((0, -0.05, 0.25), 24.0)
    return 940, 760, -3.2

def g_lantern():
    """연등 lotus lantern — light offered upward."""
    paper = bpy.data.materials.new("paper")
    paper.use_nodes = True
    pb = paper.node_tree.nodes["Principled BSDF"]
    pb.inputs["Base Color"].default_value = (1.0, 0.55, 0.35, 1)
    pb.inputs["Roughness"].default_value = 0.9
    try:
        pb.inputs["Emission Color"].default_value = (1.0, 0.45, 0.22, 1)
        pb.inputs["Emission Strength"].default_value = 1.6
    except Exception:
        pass
    sphere(0.36, (0, 0, 0.02), paper, scale=(1, 1, 0.94))
    for k in range(10):
        a = k / 10 * math.pi * 2
        cyl(0.008, 0.66, (0.355 * math.cos(a), 0.355 * math.sin(a), 0.02), (0, 0, 0), MAT["magnet"], verts=8)
    cyl(0.10, 0.06, (0, 0, 0.38), (0, 0, 0), MAT["magnet"])
    cyl(0.10, 0.06, (0, 0, -0.34), (0, 0, 0), MAT["magnet"])
    # tassel
    cyl(0.012, 0.24, (0, 0, -0.50), (0, 0, 0), MAT["kamber"], verts=8)
    sphere(0.035, (0, 0, -0.40), MAT["kamber"])
    # hanging cord
    cyl(0.006, 0.30, (0, 0, 0.56), (0, 0, 0), MAT["bezel"], verts=8)
    plight((0, 0, 0.02), 16.0, color=(1.0, 0.5, 0.25))
    return 780, 950, -3.0

def g_cheomseongdae():
    """첨성대 — the 7th-century observatory: research as a tower."""
    for i in range(9):
        r2 = 0.34 - i * 0.021
        cyl(r2, 0.115, (0, 0, -0.52 + i * 0.115), (0, 0, 0), STONE, verts=32)
    box((0.34, 0.34, 0.05), (0, 0, 0.56), STONE)
    box((0.26, 0.26, 0.05), (0, 0, 0.61), STONE)
    # the window
    box((0.10, 0.10, 0.12), (0, -0.27, -0.05), plastic("winDark", (0.01, 0.01, 0.012), rough=0.9))
    cyl(0.42, 0.05, (0, 0, -0.62), (0, 0, 0), STONE, verts=32)
    return 760, 1000, -3.2

def g_theremin():
    """Theremin 1920 — played without touching: the ancestor of the hand-tracked fire."""
    box((0.80, 0.42, 0.22), (0, 0, -0.30), MAT["wood"], bevel=0.03)
    for lx in (-0.30, 0.30):
        cone(0.035, 0.018, 0.35, (lx, 0, -0.58), (0, 0, 0), MAT["slat"])
    # pitch antenna: vertical rod
    cyl(0.012, 0.75, (0.34, 0, 0.18), (0, 0, 0), MAT["chrome"], verts=16)
    # volume antenna: horizontal loop
    torus(0.14, 0.011, (-0.42, 0, -0.16), (0, math.radians(90), 0), MAT["chrome"])
    for kx in (-0.16, -0.02, 0.12):
        cyl(0.030, 0.045, (kx, -0.20, -0.235), RX, MAT["knob"])
    cyl(0.011, 0.02, (0.24, -0.205, -0.235), RX, MAT["reddot"])
    # the field, faintly visible: concentric arcs around the pitch rod
    for r3 in (0.10, 0.17, 0.24):
        torus(r3, 0.004, (0.34, 0, 0.30), (0, 0, 0), emiss("field%d" % int(r3 * 100), (0.3, 1.0, 0.6), 2.2))
    return 950, 820, -3.2

def g_zoetrope():
    """Zoetrope — motion before broadcast: the wheel that made pictures move."""
    drum = plastic("drumdark", (0.06, 0.055, 0.05), rough=0.6)
    cyl(0.38, 0.30, (0, 0, 0.05), (0, 0, 0), drum, verts=48)
    cyl(0.36, 0.28, (0, 0, 0.08), (0, 0, 0), plastic("drumin", (0.9, 0.86, 0.78), rough=0.8), verts=48)
    # slits
    for k in range(12):
        a = k / 12 * math.pi * 2
        box((0.018, 0.06, 0.16), (0.38 * math.cos(a), 0.38 * math.sin(a), 0.12), plastic("slit2", (0.01, 0.01, 0.01), rough=0.9), rot=(0, 0, a))
    torus(0.38, 0.014, (0, 0, 0.20), (0, 0, 0), drum)
    # spindle + base
    cyl(0.02, 0.50, (0, 0, -0.28), (0, 0, 0), MAT["chrome"], verts=16)
    cone(0.20, 0.05, 0.16, (0, 0, -0.50), (0, 0, 0), MAT["wood"])
    cyl(0.26, 0.04, (0, 0, -0.60), (0, 0, 0), MAT["bezel"])
    return 880, 820, -3.1

# ---------------- divergent bench ----------------
def g_tvgarden():
    """TV Garden (Paik 1974) — monitors blooming among the leaves."""
    leaf = plastic("leaf", (0.020, 0.070, 0.025), rough=0.7)
    import random
    random.seed(9)
    # foliage: a back arc of slim dark fronds
    for i in range(11):
        u = i / 10
        lx = -0.62 + u * 1.24 + random.uniform(-0.05, 0.05)
        ly = 0.18 + random.random() * 0.25
        h = 0.45 + random.random() * 0.40
        tilt = (math.radians(random.uniform(-10, 10)), math.radians(random.uniform(-14, 14)), 0)
        cone(0.055 + random.random() * 0.035, 0.003, h, (lx, ly, -0.62 + h / 2), tilt, leaf)
    # monitors: front row, upright, screens to camera
    for (tx, tz, s) in [(-0.33, -0.42, 1.0), (0.05, -0.36, 0.85), (0.40, -0.45, 0.72)]:
        ty = -0.16
        box((0.36 * s, 0.30 * s, 0.28 * s), (tx, ty, tz), MAT["grey"], bevel=0.03, segs=5)
        box((0.26 * s, 0.03, 0.19 * s), (tx, ty - 0.15 * s, tz), MAT["bezel"], bevel=0.01)
        screen_plane(0.22 * s, 0.155 * s, (tx, ty - 0.15 * s - 0.018, tz), "tex-synthmon.png", strength=3.2)
    return 1000, 760, -3.9

def g_videofish():
    """Video Fish (Paik 1975) — an aquarium in front of the broadcast."""
    tank_glass = glass_mat()
    box((0.90, 0.40, 0.52), (0, 0, -0.08), tank_glass, bevel=0.01)
    box((0.86, 0.36, 0.05), (0, 0, -0.36), plastic("gravel", (0.10, 0.09, 0.075), rough=0.9))
    # the monitor behind, playing static through the water
    box((0.74, 0.22, 0.50), (0, 0.36, -0.05), MAT["grey"], bevel=0.03)
    screen_plane(0.60, 0.40, (0, 0.245, -0.05), "tex-staticf.png", strength=2.4)
    # fish: simple silhouettes suspended
    fish = plastic("fish", (0.85, 0.45, 0.10), rough=0.5)
    for (fx, fz, s, flip) in [(-0.2, -0.05, 1.0, 1), (0.15, 0.06, 0.7, -1), (0.05, -0.18, 0.55, 1)]:
        sphere(0.055 * s, (fx, 0, fz), fish, scale=(1.6, 0.5, 0.9))
        cone(0.035 * s, 0.002, 0.07 * s, (fx - 0.095 * s * flip, 0, fz), (0, math.radians(90 * flip), 0), fish)
    for i in range(8):
        sphere(0.008, (-0.3 + i * 0.08, 0.05, -0.28 + (i % 3) * 0.05), tank_glass)
    return 1000, 720, -3.0

def g_jangseung():
    """장승 data guardian — the village totem pole, face now an LED matrix."""
    post = plastic("postwood", (0.20, 0.11, 0.05), rough=0.7)
    cyl(0.13, 1.15, (0, 0, -0.06), (0, 0, 0), post, verts=24)
    cyl(0.155, 0.16, (0, 0, 0.42), (0, 0, 0), post, verts=24)   # head
    cyl(0.16, 0.055, (0, 0, 0.54), (0, 0, 0), post, verts=24)   # hat brim
    cyl(0.09, 0.09, (0, 0, 0.60), (0, 0, 0), post, verts=24)    # hat top
    # LED face panel wrapped on the head front
    box((0.20, 0.03, 0.13), (0, -0.145, 0.42), MAT["bezel"], bevel=0.008)
    for r2 in range(4):
        for c2 in range(6):
            on = (r2 * 6 + c2) % 3 != 1
            if r2 == 1 and c2 in (1, 4):   # eyes brighter
                e = emiss("jseye%d" % c2, (1.0, 0.3, 0.1), 20.0)
            elif on:
                e = emiss("jsled%d_%d" % (r2, c2), (1.0, 0.62, 0.10), 8.0)
            else:
                continue
            cyl(0.0075, 0.012, (-0.062 + c2 * 0.025, -0.163, 0.465 - r2 * 0.028), RX, e, verts=8)
    cyl(0.30, 0.06, (0, 0, -0.62), (0, 0, 0), STONE, verts=24)
    return 700, 1050, -3.2

def g_antennabonsai():
    """Antenna bonsai — a tree pruned for reception."""
    pot = plastic("pot", (0.28, 0.14, 0.09), rough=0.5)
    cone(0.30, 0.24, 0.20, (0, 0, -0.52), (0, 0, 0), pot)
    trunk = plastic("trunk", (0.16, 0.10, 0.05), rough=0.8)
    cable([(0, 0, -0.44), (0.05, 0.01, -0.25), (-0.04, -0.02, -0.05), (0.03, 0.02, 0.10)], 0.030, trunk)
    # branches ending in chrome whip tips with ball ends
    import random
    random.seed(15)
    tips = [(0.28, 0.06, 0.38), (-0.25, -0.04, 0.42), (0.10, -0.10, 0.55),
            (-0.12, 0.10, 0.30), (0.34, -0.02, 0.16), (-0.30, 0.02, 0.12)]
    for (tx2, ty2, tz2) in tips:
        base_pt = (0.03 * (1 if tx2 > 0 else -1), 0.02, 0.10 - random.random() * 0.15)
        mid = ((base_pt[0] + tx2) / 2, (base_pt[1] + ty2) / 2 + 0.03, (base_pt[2] + tz2) / 2)
        cable([base_pt, mid, (tx2 * 0.8, ty2 * 0.8, tz2 * 0.85)], 0.012, trunk)
        strut((tx2 * 0.8, ty2 * 0.8, tz2 * 0.85), (tx2, ty2, tz2), 0.004, MAT["chrome"])
        sphere(0.012, (tx2, ty2, tz2), MAT["chrome"])
    return 860, 950, -3.0

# ---------------- the assembled stupa ----------------
def g_stupa():
    """The stupa, machine by machine: catalog plinth -> console body -> orb dome ->
    clock harmika -> record-skewer yasti with vinyl chattra -> flame finial; the
    moon hangs behind — the oldest TV watching over the newest."""
    def at(builder, dz, **kw):
        n0 = len(parts)
        builder(**kw)
        for p in parts[n0:]:
            p.location.z += dz
    # floor
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.66))
    fl = bpy.context.object
    fl.data.materials.append(plastic("floor", (0.012, 0.012, 0.015), rough=0.85))
    parts.append(fl)
    at(g_catalog, 0.0)
    at(g_console, 1.06)
    at(g_orb, 2.10)
    at(g_clockradio, 2.94)
    at(g_skewer, 3.86)
    # flame finial replacing the chrome tip
    cyl(0.030, 0.10, (0, 0, 4.585), (0, 0, 0), MAT["wax"])
    cone(0.020, 0.002, 0.09, (0, 0, 4.69), (0, 0, 0), MAT["flame"])
    sphere(0.012, (0, 0, 4.665), MAT["flamecore"])
    plight((0, -0.06, 4.68), 20.0)
    # the moon behind
    n0 = len(parts)
    g_moon()
    moonparts = parts[n0:]
    for p in moonparts[1:]:
        bpy.data.objects.remove(p, do_unlink=True)
    del parts[n0 + 1:]
    mp = parts[n0]
    mp.location = (1.35, 2.6, 3.9)
    mp.scale = (1.5, 1.5, 1.5)
    # high fill so the top tiers read
    bpy.ops.object.light_add(type="AREA", location=(2.6, -3.4, 4.6),
                             rotation=(math.radians(55), math.radians(18), math.radians(22)))
    L = bpy.context.object
    L.data.energy = 300
    L.data.size = 3.0
    L.data.color = (1.0, 0.90, 0.80)
    parts.append(L)
    return 1000, 1500, (-7.6, 2.05, 1.95)

# ---------------- world / studio lighting / camera ----------------
world = bpy.data.worlds.new("w")
scene.world = world
world.use_nodes = True
wnt = world.node_tree
wbg = wnt.nodes["Background"]
# soft vertical gradient environment: near-black floor to deep blue-grey zenith
wtex = wnt.nodes.new("ShaderNodeTexGradient")
wmap = wnt.nodes.new("ShaderNodeMapping")
wmap.inputs["Rotation"].default_value = (0, math.radians(-90), 0)
wcoord = wnt.nodes.new("ShaderNodeTexCoord")
wramp = wnt.nodes.new("ShaderNodeValToRGB")
wramp.color_ramp.elements[0].position = 0.42
wramp.color_ramp.elements[0].color = (0.0016, 0.0016, 0.0028, 1)
wramp.color_ramp.elements[1].position = 0.95
wramp.color_ramp.elements[1].color = (0.020, 0.024, 0.040, 1)
wnt.links.new(wcoord.outputs["Generated"], wmap.inputs["Vector"])
wnt.links.new(wmap.outputs["Vector"], wtex.inputs["Vector"])
wnt.links.new(wtex.outputs["Fac"], wramp.inputs["Fac"])
wnt.links.new(wramp.outputs["Color"], wbg.inputs["Color"])
wbg.inputs["Strength"].default_value = 1.0

def lightcard(name, loc, rot, size_xy, rgb, strength):
    """emissive softbox plane: lights the scene AND draws long reflections on gloss;
    invisible to camera"""
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = (size_xy[0], size_xy[1], 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    m = bpy.data.materials.new("lc-" + name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    outn = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1)
    em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs["Emission"], outn.inputs["Surface"])
    o.data.materials.append(m)
    try:
        o.visible_camera = False
    except Exception:
        pass
    return o

# studio: warm key softbox up-left, tall magenta gel rim right-back,
# cyan gel rim left-back, thin white strip overhead
lightcard("key", (2.6, -2.6, 2.6), (math.radians(50), math.radians(20), math.radians(30)), (3.4, 2.4), (1.0, 0.94, 0.86), 34)
lightcard("rimM", (2.9, 1.9, 0.7), (math.radians(86), 0, math.radians(-125)), (0.9, 3.4), (1.0, 0.24, 0.65), 26)
lightcard("rimC", (-3.0, 1.6, 0.5), (math.radians(86), 0, math.radians(125)), (0.9, 3.4), (0.17, 0.85, 1.0), 20)
lightcard("top", (0, 0.4, 3.4), (0, 0, 0), (5.0, 0.5), (0.9, 0.92, 1.0), 12)

# glossy dark floor: grounds every object with a soft reflection
fm = bpy.data.materials.new("studiofloor")
fm.use_nodes = True
fb = fm.node_tree.nodes["Principled BSDF"]
fb.inputs["Base Color"].default_value = (0.010, 0.010, 0.013, 1)
fb.inputs["Roughness"].default_value = 0.22
fb.inputs["Metallic"].default_value = 0.1
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -0.665))
FLOOR = bpy.context.object
FLOOR.data.materials.append(fm)

try:
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Punchy"
except Exception as e:
    print("AgX unavailable:", e)

bpy.ops.object.camera_add(location=(0, -3.0, 0.08))
cam = bpy.context.object
cam.data.lens = 85
scene.camera = cam

scene.render.engine = "CYCLES"
scene.cycles.samples = 128
try:
    scene.cycles.use_denoising = True
except Exception:
    pass
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    scene.cycles.device = "GPU"
    print("USING METAL GPU")
except Exception as e:
    print("CPU fallback:", e)

GADGETS = {
    "console":   g_console,
    "orb":       g_orb,
    "scope":     g_scope,
    "clock":     g_clockradio,
    "moon":      g_moon,
    "dish":      g_dish,
    "rotary":    g_rotary,
    "mic":       g_mic,
    "magnettv":  g_magnettv,
    "synth":     g_synth,
    "reeldeck":  g_reeldeck,
    "skewer":    g_skewer,
    "catalog":   g_catalog,
    "candle":    g_candle,
    "rack":      g_rack,
    "crystal":   g_crystal,
    "flamecone": g_flamecone,
    "tapewind":  g_tapewind,
    "jewel":     g_jewel,
    "stupa":     g_stupa,
    "stupa2":    g_stupa2,
    "beacon":    g_beacon,
    "tvbuddha":  g_tvbuddha,
    "moktak":    g_moktak,
    "bell":      g_bell,
    "moonjar":   g_moonjar,
    "brazier":   g_brazier,
    "lantern":   g_lantern,
    "cheomseongdae": g_cheomseongdae,
    "theremin":  g_theremin,
    "zoetrope":  g_zoetrope,
    "tvgarden":  g_tvgarden,
    "videofish": g_videofish,
    "jangseung": g_jangseung,
    "antennabonsai": g_antennabonsai,
    "rackA":     g_rackA,
    "rackB":     g_rackB,
    "rackC":     g_rackC,
    "columbarium": g_columbarium,
    "slabs":     g_slabs,
    "moonjar2":  g_moonjar2,
}

# per-name studio dimming: the moon needs its sun to dominate for a terminator
DIM = {"moon": 0.10, "stupa2": 0.7}
STUDIO_EMS = [m for m in bpy.data.materials if m.name.startswith("lc-")]
def studio_dim(mult):
    for m in STUDIO_EMS:
        em = next(n for n in m.node_tree.nodes if n.type == "EMISSION")
        if not em.get("base"):
            em["base"] = em.inputs["Strength"].default_value
        em.inputs["Strength"].default_value = em["base"] * mult

# proof renders: same geometry, different camera azimuths (parallax = 3D), plus clay
PROOFS = {
    "proof-orb-l":   ("orb", -38, False),
    "proof-orb-f":   ("orb", 0, False),
    "proof-orb-r":   ("orb", 38, False),
    "proof-orb-clay":("orb", 20, True),
    "proof-stupa-l": ("stupa", -30, False),
    "proof-stupa-r": ("stupa", 30, False),
}
CLAY = plastic("clay", (0.55, 0.53, 0.50), rough=0.85)

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

if argv and argv[0] == "EXPORT":
    import os
    os.makedirs(OUT + "glb", exist_ok=True)
    for name in argv[1:]:
        parts.clear()
        GADGETS[name]()
        bpy.ops.object.select_all(action="DESELECT")
        nmesh = 0
        for p in parts:
            if p.type in ("MESH", "CURVE"):
                p.select_set(True)
                nmesh += 1
        bpy.ops.export_scene.gltf(
            filepath=OUT + "glb/" + name + ".glb",
            export_format="GLB", use_selection=True,
            export_image_format="JPEG", export_apply=True)
        print("EXPORTED", name, nmesh, "meshes")
        for p in parts:
            bpy.data.objects.remove(p, do_unlink=True)
    sys.exit(0)

if argv and argv[0] == "INSPECT":
    parts.clear()
    GADGETS_INSPECT = argv[1]
    globals()["g_" + GADGETS_INSPECT]() if ("g_" + GADGETS_INSPECT) in globals() else None
    for p in parts:
        if p.type != "MESH":
            continue
        d = p.dimensions
        r = p.rotation_euler
        print(f"PART dims=({d.x:.3f},{d.y:.3f},{d.z:.3f}) loc=({p.location.x:.3f},{p.location.y:.3f},{p.location.z:.3f}) rot=({math.degrees(r.x):.0f},{math.degrees(r.y):.0f},{math.degrees(r.z):.0f})")
    sys.exit(0)

names = list(GADGETS.keys()) if (not argv or argv == ["ALL"]) else argv

for name in names:
    azimuth, clay = 0, False
    if name in PROOFS:
        gname, azimuth, clay = PROOFS[name]
        builder = GADGETS[gname]
    else:
        builder = GADGETS[name]
    parts.clear()
    studio_dim(DIM.get(name if name not in PROOFS else PROOFS[name][0], 1.0))
    ret = builder()
    rx, ry, cam_pos = ret
    if clay:
        for p in parts:
            if p.type == "MESH":
                p.data.materials.clear()
                p.data.materials.append(CLAY)
    scene.render.resolution_x = rx
    scene.render.resolution_y = ry
    if isinstance(cam_pos, tuple):
        cy, cz, aim_z = cam_pos
        cam.data.lens = 40
        d = abs(cy)
        cam.location = (0.55 + d * math.sin(math.radians(azimuth)),
                        -d * math.cos(math.radians(azimuth)), cz)
        direction = Vector((0, 0, aim_z)) - cam.location
    else:
        cam.data.lens = 85
        d = abs(cam_pos)
        cam.location = (d * math.sin(math.radians(azimuth)),
                        -d * math.cos(math.radians(azimuth)), 0.08)
        direction = Vector((0, 0, -0.01)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = OUT + "e-" + name + ".png"
    bpy.ops.render.render(write_still=True)
    print("WROTE e-" + name + ".png")
    for p in parts:
        bpy.data.objects.remove(p, do_unlink=True)

bpy.ops.wm.save_as_mainfile(filepath=OUT + "catalogue.blend")
print("DONE")
