"""Blender material studies for the Performing Fire godai machine family.

The scene is intentionally procedural: no downloaded texture maps are required.
Every material, light, and model is generated here so the five studies can be
re-rendered consistently and later controlled through Blender MCP.

Run:
    blender -b -P godai_layers.py -- all
    blender -b -P godai_layers.py -- earth water fire wind void
    blender -b -P godai_layers.py -- water-states

Outputs:
    docs/design/renders/godai-layers/<element>.png
    docs/design/renders/browser-proofs/water-{bearing,flow,surge}.png
"""

from __future__ import annotations

import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector


DESIGN_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = DESIGN_DIR / "renders" / "godai-layers"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
PBR_DIR = DESIGN_DIR / "textures" / "pbr" / "granite-tile-03"

TAU = math.tau
ELEMENTS = ("earth", "water", "fire", "wind", "void")
WATER_STATES = ("bearing", "flow", "surge")


def socket(node, name, value):
    """Set a named socket when Blender's current shader exposes it."""
    if name in node.inputs:
        node.inputs[name].default_value = value


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_percentage = 100
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.filepath = ""
    scene.render.fps = 30
    scene.frame_start = 1
    scene.frame_end = 120

    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass

    world = bpy.data.worlds.new("Performing Fire black")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.0012, 0.0015, 0.0024, 1)
    background.inputs["Strength"].default_value = 0.06
    scene.world = world
    return scene


def material(name, base, roughness=0.45, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    socket(bsdf, "Base Color", (*base, 1))
    socket(bsdf, "Roughness", roughness)
    socket(bsdf, "Metallic", metallic)
    return mat


def emission(name, color, strength=5.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeEmission")
    shader.inputs["Color"].default_value = (*color, 1)
    shader.inputs["Strength"].default_value = strength
    links.new(shader.outputs["Emission"], out.inputs["Surface"])
    return mat


def granite(name, low, high, polished=False, scale=5.5):
    """Two-frequency mineral texture with a real micro-bump."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    socket(bsdf, "Roughness", 0.16 if polished else 0.72)
    socket(bsdf, "Metallic", 0.0)
    socket(bsdf, "Coat Weight", 0.5 if polished else 0.0)
    socket(bsdf, "Coat Roughness", 0.12)

    coord = nodes.new("ShaderNodeTexCoord")
    coarse = nodes.new("ShaderNodeTexNoise")
    coarse.noise_dimensions = "3D"
    coarse.inputs["Scale"].default_value = scale
    coarse.inputs["Detail"].default_value = 7.0
    coarse.inputs["Roughness"].default_value = 0.72
    coarse.inputs["Distortion"].default_value = 0.35
    fine = nodes.new("ShaderNodeTexNoise")
    fine.noise_dimensions = "3D"
    fine.inputs["Scale"].default_value = 72.0
    fine.inputs["Detail"].default_value = 3.0
    fine.inputs["Roughness"].default_value = 0.8
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.25
    ramp.color_ramp.elements[0].color = (*low, 1)
    ramp.color_ramp.elements[1].position = 0.78
    ramp.color_ramp.elements[1].color = (*high, 1)
    speck = nodes.new("ShaderNodeMix")
    speck.data_type = "RGBA"
    speck.blend_type = "MULTIPLY"
    speck.inputs["Factor"].default_value = 0.22
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.16 if polished else 0.32
    bump.inputs["Distance"].default_value = 0.05

    links.new(coord.outputs["Generated"], coarse.inputs["Vector"])
    links.new(coord.outputs["Generated"], fine.inputs["Vector"])
    links.new(coarse.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], speck.inputs["A"])
    links.new(fine.outputs["Color"], speck.inputs["B"])
    links.new(speck.outputs["Result"], bsdf.inputs["Base Color"])
    links.new(fine.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def photographic_granite(name, tint, roughness, polished=False, scale=1.0):
    """CC0 photographed granite with a matched displacement-derived normal.

    The source is Poly Haven's Granite Tile 03. We crop within one stone tile
    before use so its photographed grout does not become fake seams on objects.
    """
    diffuse_path = PBR_DIR / "granite_single_diff_768.jpg"
    displacement_path = PBR_DIR / "granite_single_disp_768.png"
    if not diffuse_path.exists() or not displacement_path.exists():
        raise FileNotFoundError(f"Missing PBR granite maps in {PBR_DIR}")

    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    socket(bsdf, "Roughness", roughness)
    socket(bsdf, "Metallic", 0.0)
    socket(bsdf, "Coat Weight", 0.34 if polished else 0.04)
    socket(bsdf, "Coat Roughness", 0.10 if polished else 0.32)

    coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (scale, scale, scale)
    diffuse = nodes.new("ShaderNodeTexImage")
    diffuse.image = bpy.data.images.load(str(diffuse_path), check_existing=True)
    diffuse.projection = "BOX"
    diffuse.projection_blend = 0.22

    tint_mix = nodes.new("ShaderNodeMixRGB")
    tint_mix.blend_type = "MULTIPLY"
    tint_mix.inputs["Fac"].default_value = 0.78
    tint_mix.inputs["Color2"].default_value = (*tint, 1)

    displacement = nodes.new("ShaderNodeTexImage")
    displacement.image = bpy.data.images.load(str(displacement_path), check_existing=True)
    displacement.image.colorspace_settings.name = "Non-Color"
    displacement.projection = "BOX"
    displacement.projection_blend = 0.22
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.11 if polished else 0.23
    bump.inputs["Distance"].default_value = 0.012 if polished else 0.025

    links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], diffuse.inputs["Vector"])
    links.new(mapping.outputs["Vector"], displacement.inputs["Vector"])
    links.new(diffuse.outputs["Color"], tint_mix.inputs["Color1"])
    links.new(tint_mix.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(displacement.outputs["Color"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def water_material(name="pressurised water"):
    """Neutral dielectric water with only sub-millimetre surface disturbance."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    socket(bsdf, "Base Color", (0.97, 0.985, 1.0, 1))
    socket(bsdf, "Roughness", 0.018)
    socket(bsdf, "IOR", 1.333)
    socket(bsdf, "Transmission Weight", 1.0)
    socket(bsdf, "Coat Weight", 0.0)
    socket(bsdf, "Metallic", 0.0)

    coord = nodes.new("ShaderNodeTexCoord")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.noise_dimensions = "3D"
    noise.inputs["Scale"].default_value = 3.5
    noise.inputs["Detail"].default_value = 1.5
    noise.inputs["Roughness"].default_value = 0.32
    noise.inputs["Distortion"].default_value = 0.16
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.12
    bump.inputs["Distance"].default_value = 0.0070
    links.new(coord.outputs["Generated"], noise.inputs["Vector"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

    # A very low neutral absorption makes the wet region legible over granite
    # without tinting it into blue glass.
    absorption = nodes.new("ShaderNodeVolumeAbsorption")
    absorption.inputs["Color"].default_value = (0.78, 0.79, 0.80, 1)
    absorption.inputs["Density"].default_value = 2.5
    output = nodes.get("Material Output")
    links.new(absorption.outputs["Volume"], output.inputs["Volume"])
    return mat


def kiln_heat_material():
    """Turbulent heat behind a kiln opening, without a flame-shaped mesh."""
    mat = bpy.data.materials.new("kiln chamber heat")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    glow = nodes.new("ShaderNodeEmission")
    glow.inputs["Strength"].default_value = 0.9
    coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (3.2, 3.2, 7.5)
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 1.5
    noise.inputs["Detail"].default_value = 7.0
    noise.inputs["Roughness"].default_value = 0.78
    noise.inputs["Distortion"].default_value = 0.48
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.25
    ramp.color_ramp.elements[0].color = (0.24, 0.002, 0.0, 1)
    ramp.color_ramp.elements[1].position = 0.76
    ramp.color_ramp.elements[1].color = (1.0, 0.28, 0.018, 1)
    hot = ramp.color_ramp.elements.new(0.91)
    hot.color = (0.82, 0.22, 0.012, 1)
    links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], glow.inputs["Color"])
    links.new(glow.outputs["Emission"], out.inputs["Surface"])
    return mat


def smoked_glass():
    mat = bpy.data.materials.new("void smoked glass")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    socket(bsdf, "Base Color", (0.0045, 0.0075, 0.018, 1))
    socket(bsdf, "Roughness", 0.12)
    socket(bsdf, "Metallic", 0.0)
    socket(bsdf, "Transmission Weight", 0.42)
    socket(bsdf, "IOR", 1.46)
    socket(bsdf, "Coat Weight", 0.92)
    socket(bsdf, "Coat Roughness", 0.06)
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def dead_phosphor_material():
    mat = bpy.data.materials.new("void dead CRT phosphor")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    socket(bsdf, "Base Color", (0.008, 0.010, 0.017, 1))
    socket(bsdf, "Roughness", 0.38)
    socket(bsdf, "Metallic", 0.24)
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 95.0
    noise.inputs["Detail"].default_value = 4.0
    noise.inputs["Roughness"].default_value = 0.82
    wave = nodes.new("ShaderNodeTexWave")
    wave.wave_type = "BANDS"
    wave.bands_direction = "Z"
    wave.inputs["Scale"].default_value = 185.0
    mix = nodes.new("ShaderNodeMix")
    mix.data_type = "FLOAT"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.09
    bump.inputs["Distance"].default_value = 0.008
    links.new(noise.outputs["Fac"], mix.inputs["A"])
    links.new(wave.outputs["Fac"], mix.inputs["B"])
    links.new(mix.outputs["Result"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def textile_material():
    mat = material("charred ceramic textile", (0.032, 0.014, 0.008), 0.48)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    socket(bsdf, "Sheen Weight", 0.35)
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 165.0
    noise.inputs["Detail"].default_value = 2.0
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.32
    bump.inputs["Distance"].default_value = 0.02
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def fire_projection_textile():
    """Woven black cloth carrying a projected, vertically stretched heat field."""
    mat = bpy.data.materials.new("projected fire textile")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    add = nodes.new("ShaderNodeAddShader")
    cloth = nodes.new("ShaderNodeBsdfPrincipled")
    socket(cloth, "Base Color", (0.018, 0.004, 0.0015, 1))
    socket(cloth, "Roughness", 0.72)
    socket(cloth, "Sheen Weight", 0.28)
    glow = nodes.new("ShaderNodeEmission")
    glow.inputs["Strength"].default_value = 2.2

    coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (2.2, 2.2, 5.8)
    noise = nodes.new("ShaderNodeTexNoise")
    noise.noise_dimensions = "3D"
    noise.inputs["Scale"].default_value = 1.8
    noise.inputs["Detail"].default_value = 8.0
    noise.inputs["Roughness"].default_value = 0.72
    noise.inputs["Distortion"].default_value = 0.55
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.28
    ramp.color_ramp.elements[0].color = (0.003, 0.0, 0.0, 1)
    ramp.color_ramp.elements[1].position = 0.72
    ramp.color_ramp.elements[1].color = (1.0, 0.055, 0.002, 1)
    middle = ramp.color_ramp.elements.new(0.48)
    middle.color = (0.22, 0.004, 0.0, 1)
    hot = ramp.color_ramp.elements.new(0.88)
    hot.color = (1.0, 0.58, 0.06, 1)

    weave = nodes.new("ShaderNodeTexWave")
    weave.wave_type = "BANDS"
    weave.bands_direction = "X"
    weave.inputs["Scale"].default_value = 210.0
    weave.inputs["Distortion"].default_value = 3.0
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.22
    bump.inputs["Distance"].default_value = 0.012

    links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    links.new(mapping.outputs["Vector"], weave.inputs["Vector"])
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], glow.inputs["Color"])
    links.new(weave.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], cloth.inputs["Normal"])
    links.new(cloth.outputs["BSDF"], add.inputs[0])
    links.new(glow.outputs["Emission"], add.inputs[1])
    links.new(add.outputs["Shader"], out.inputs["Surface"])
    return mat


def add_material(obj, mat):
    obj.data.materials.append(mat)
    return obj


def cube(name, size, location, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    add_material(obj, mat)
    if bevel:
        modifier = obj.modifiers.new("soft stone edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
    return obj


def sphere(name, radius, location, mat, segments=96, rings=64, scale=None):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, radius=radius, location=location
    )
    obj = bpy.context.object
    obj.name = name
    if scale:
        obj.scale = scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    add_material(obj, mat)
    bpy.ops.object.shade_smooth()
    return obj


def cylinder(name, radius, depth, location, mat, vertices=96, rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation or (0, 0, 0),
    )
    obj = bpy.context.object
    obj.name = name
    add_material(obj, mat)
    bevel = obj.modifiers.new("edge rolloff", "BEVEL")
    bevel.width = min(radius, depth) * 0.035
    bevel.segments = 3
    return obj


def torus(name, major_radius, minor_radius, location, mat, rotation=None):
    bpy.ops.mesh.primitive_torus_add(
        align="WORLD",
        major_segments=128,
        minor_segments=20,
        location=location,
        rotation=rotation or (0, 0, 0),
        major_radius=major_radius,
        minor_radius=minor_radius,
    )
    obj = bpy.context.object
    obj.name = name
    add_material(obj, mat)
    bpy.ops.object.shade_smooth()
    return obj


def curve(name, points, radius, mat, cyclic=False):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.resolution_u = 2
    data.bevel_depth = radius
    data.bevel_resolution = 4
    spline = data.splines.new("NURBS")
    spline.points.add(len(points) - 1)
    for point, xyz in zip(spline.points, points):
        point.co = (*xyz, 1)
    spline.use_cyclic_u = cyclic
    spline.order_u = min(3, len(points))
    spline.use_endpoint_u = not cyclic
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    add_material(obj, mat)
    return obj


def strip_mesh(name, points, width, mat):
    """Flat magnetic-tape strip following points in the X/Z plane."""
    vertices = []
    faces = []
    for x, y, z in points:
        vertices.extend(((x, y - width / 2, z), (x, y + width / 2, z)))
    for index in range(len(points) - 1):
        a = index * 2
        faces.append((a, a + 1, a + 3, a + 2))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    add_material(obj, mat)
    solidify = obj.modifiers.new("tape thickness", "SOLIDIFY")
    solidify.thickness = 0.0022
    bevel = obj.modifiers.new("tape edge", "BEVEL")
    bevel.width = 0.0014
    bevel.segments = 2
    return obj


def front_strip_mesh(name, points, width, mat):
    """Camera-facing ribbon whose width follows the normal of its X/Z path."""
    vertices = []
    faces = []
    for index, (x, y, z) in enumerate(points):
        previous = points[max(0, index - 1)]
        following = points[min(len(points) - 1, index + 1)]
        dx = following[0] - previous[0]
        dz = following[2] - previous[2]
        length = max(0.0001, math.hypot(dx, dz))
        nx, nz = -dz / length, dx / length
        vertices.extend(
            (
                (x + nx * width / 2, y, z + nz * width / 2),
                (x - nx * width / 2, y, z - nz * width / 2),
            )
        )
    for index in range(len(points) - 1):
        a = index * 2
        faces.append((a, a + 1, a + 3, a + 2))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    add_material(obj, mat)
    solidify = obj.modifiers.new("real tape thickness", "SOLIDIFY")
    solidify.thickness = 0.002
    bevel = obj.modifiers.new("soft tape edge", "BEVEL")
    bevel.width = 0.0015
    bevel.segments = 2
    return obj


def radial_surface(name, profile, mat, segments=128):
    """Surface of revolution around Z from a list of (radius, z) points."""
    vertices = []
    faces = []
    for radius, z in profile:
        for index in range(segments):
            angle = TAU * index / segments
            vertices.append((radius * math.cos(angle), radius * math.sin(angle), z))
    rings = len(profile)
    for ring in range(rings - 1):
        for index in range(segments):
            nxt = (index + 1) % segments
            a = ring * segments + index
            b = ring * segments + nxt
            c = (ring + 1) * segments + nxt
            d = (ring + 1) * segments + index
            faces.append((a, b, c, d))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    add_material(obj, mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth()
    obj.select_set(False)
    return obj


def annular_water_volume(
    name,
    inner_radius,
    outer_radius,
    top_height,
    mat,
    radial_steps=28,
    segments=192,
    thickness=0.006,
    radial_offset=None,
):
    """Closed annular liquid volume with a continuous, optionally wavy top.

    ``top_height`` receives ``(radius, theta, radial_fraction)``. Keeping the
    ripples in one manifold surface avoids the stack of torus rings that made
    the old proof read like black plastic rather than a moving film.
    """
    vertices = []
    faces = []
    ring_count = radial_steps + 1

    def vertex_index(surface, ring, segment):
        return surface * ring_count * segments + ring * segments + segment

    for surface in range(2):
        for ring in range(ring_count):
            t = ring / radial_steps
            radius = inner_radius + (outer_radius - inner_radius) * t
            for index in range(segments):
                theta = TAU * index / segments
                warped_radius = (
                    radius + radial_offset(theta, t)
                    if radial_offset is not None
                    else radius
                )
                top_z = top_height(radius, theta, t)
                z = top_z if surface == 0 else top_z - thickness
                vertices.append(
                    (
                        warped_radius * math.cos(theta),
                        warped_radius * math.sin(theta),
                        z,
                    )
                )

    for ring in range(radial_steps):
        for index in range(segments):
            nxt = (index + 1) % segments
            top_a = vertex_index(0, ring, index)
            top_b = vertex_index(0, ring, nxt)
            top_c = vertex_index(0, ring + 1, nxt)
            top_d = vertex_index(0, ring + 1, index)
            faces.append((top_a, top_d, top_c, top_b))

            bottom_a = vertex_index(1, ring, index)
            bottom_b = vertex_index(1, ring, nxt)
            bottom_c = vertex_index(1, ring + 1, nxt)
            bottom_d = vertex_index(1, ring + 1, index)
            faces.append((bottom_a, bottom_b, bottom_c, bottom_d))

    for index in range(segments):
        nxt = (index + 1) % segments
        top_inner = vertex_index(0, 0, index)
        top_inner_next = vertex_index(0, 0, nxt)
        bottom_inner = vertex_index(1, 0, index)
        bottom_inner_next = vertex_index(1, 0, nxt)
        faces.append(
            (top_inner, top_inner_next, bottom_inner_next, bottom_inner)
        )

        top_outer = vertex_index(0, radial_steps, index)
        top_outer_next = vertex_index(0, radial_steps, nxt)
        bottom_outer = vertex_index(1, radial_steps, index)
        bottom_outer_next = vertex_index(1, radial_steps, nxt)
        faces.append(
            (top_outer, bottom_outer, bottom_outer_next, top_outer_next)
        )

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    add_material(obj, mat)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def raised_water_sheet(name, mat):
    """One restrained surge sheet, attached to the front-right outlet arc."""
    arc_steps = 38
    radial_steps = 14
    center_angle = math.radians(-54)
    half_span = math.radians(36)
    inner_radius = 0.50
    outer_radius = 0.70
    vertices = []
    faces = []

    for arc_index in range(arc_steps):
        u = arc_index / (arc_steps - 1)
        theta = center_angle + (u * 2.0 - 1.0) * half_span
        side_envelope = math.sin(math.pi * u) ** 1.35
        for radial_index in range(radial_steps):
            v = radial_index / (radial_steps - 1)
            lift = 0.185 * side_envelope * (v ** 1.28)
            curl = 0.018 * side_envelope * math.sin(math.pi * v)
            radius = inner_radius + (outer_radius - inner_radius) * v + curl
            base_z = -0.266 - 0.006 * (v ** 0.55)
            vertices.append(
                (
                    radius * math.cos(theta),
                    radius * math.sin(theta),
                    base_z + lift,
                )
            )

    for arc_index in range(arc_steps - 1):
        for radial_index in range(radial_steps - 1):
            a = arc_index * radial_steps + radial_index
            b = a + 1
            c = (arc_index + 1) * radial_steps + radial_index + 1
            d = (arc_index + 1) * radial_steps + radial_index
            faces.append((a, b, c, d))

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    add_material(obj, mat)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    solidify = obj.modifiers.new("surge sheet thickness", "SOLIDIFY")
    solidify.thickness = 0.0022
    solidify.offset = 0.0
    bevel = obj.modifiers.new("surge sheet edge tension", "BEVEL")
    bevel.width = 0.0011
    bevel.segments = 2
    return obj


def spherical_water_skin(
    name,
    center,
    sphere_radius,
    mat,
    state,
    segments=192,
    rings=72,
):
    """A closed clear-water cap that grips the granite instead of pooling below it.

    The lower boundary is intentionally irregular in polar angle. Narrow
    gravity lobes are authored into that boundary so the three stills can
    interpolate from a taut top film to a visibly overflowing wet skin.
    """
    parameters = {
        "bearing": {
            "base_angle": 72.0,
            "max_angle": 86.0,
            "thickness": 0.018,
            "undulation": 0.0035,
            "hem_radius": 0.007,
            "phase": 0.30,
            "lobes": (
                (-148.0, 6.0, 20.0),
                (-101.0, 10.0, 18.0),
                (-47.0, 8.0, 19.0),
                (10.0, 5.0, 22.0),
            ),
        },
        "flow": {
            "base_angle": 80.0,
            "max_angle": 136.0,
            "thickness": 0.022,
            "undulation": 0.0075,
            "hem_radius": 0.014,
            "phase": 0.85,
            "lobes": (
                (-148.0, 34.0, 14.0),
                (-102.0, 50.0, 12.0),
                (-57.0, 43.0, 13.0),
                (-14.0, 31.0, 15.0),
            ),
        },
        "surge": {
            "base_angle": 90.0,
            "max_angle": 146.0,
            "thickness": 0.026,
            "undulation": 0.011,
            "hem_radius": 0.018,
            "phase": 1.45,
            "lobes": (
                (-154.0, 26.0, 20.0),
                (-108.0, 55.0, 14.0),
                (-64.0, 30.0, 18.0),
                (-20.0, 48.0, 13.0),
            ),
        },
    }[state]

    def wrapped_delta_degrees(angle, center_angle):
        return (angle - center_angle + 180.0) % 360.0 - 180.0

    def edge_angle(phi):
        degrees = math.degrees(phi)
        scallop = (
            3.2 * math.sin(phi * 5.0 + parameters["phase"])
            + 1.5 * math.sin(phi * 9.0 - parameters["phase"] * 0.7)
        )
        lobe_extension = 0.0
        for lobe_center, extension, width in parameters["lobes"]:
            delta = wrapped_delta_degrees(degrees, lobe_center)
            lobe_extension += extension * math.exp(-0.5 * (delta / width) ** 2)
        return math.radians(
            min(
                parameters["max_angle"],
                parameters["base_angle"] + scallop + lobe_extension,
            )
        )

    thickness = parameters["thickness"]
    surface_radius = sphere_radius + thickness
    vertices = [(center[0], center[1], center[2] + surface_radius)]
    faces = []

    # The cap uses one north pole and concentric, angle-warped rings. Keeping
    # the topology continuous is what makes the lobes read as one wet skin.
    for ring in range(1, rings + 1):
        t = ring / rings
        for segment in range(segments):
            phi = TAU * segment / segments
            theta = edge_angle(phi) * t
            disturbance = (
                parameters["undulation"]
                * (
                    0.68
                    * math.sin(phi * 3.0 + theta * 5.0 + parameters["phase"])
                    + 0.32 * math.sin(phi * 6.0 - theta * 3.0)
                )
                * (math.sin(math.pi * t) ** 1.7)
            )
            radius = surface_radius + disturbance
            vertices.append(
                (
                    center[0] + radius * math.sin(theta) * math.cos(phi),
                    center[1] + radius * math.sin(theta) * math.sin(phi),
                    center[2] + radius * math.cos(theta),
                )
            )

    first_ring = 1
    for segment in range(segments):
        nxt = (segment + 1) % segments
        faces.append((0, first_ring + segment, first_ring + nxt))

    for ring in range(rings - 1):
        ring_a = 1 + ring * segments
        ring_b = ring_a + segments
        for segment in range(segments):
            nxt = (segment + 1) % segments
            faces.append(
                (
                    ring_a + segment,
                    ring_b + segment,
                    ring_b + nxt,
                    ring_a + nxt,
                )
            )

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    add_material(obj, mat)
    for polygon in mesh.polygons:
        polygon.use_smooth = True

    solidify = obj.modifiers.new("closed water-film volume", "SOLIDIFY")
    solidify.thickness = thickness * 1.04
    solidify.offset = -1.0
    solidify.use_even_offset = True
    bevel = obj.modifiers.new("rounded surface-tension edge", "BEVEL")
    bevel.width = 0.0040 if state == "bearing" else 0.0065
    bevel.segments = 3

    hem_points = []
    for segment in range(segments):
        phi = TAU * segment / segments
        theta = edge_angle(phi)
        radius = surface_radius - parameters["hem_radius"] * 0.22
        hem_points.append(
            (
                center[0] + radius * math.sin(theta) * math.cos(phi),
                center[1] + radius * math.sin(theta) * math.sin(phi),
                center[2] + radius * math.cos(theta),
            )
        )
    hem = curve(
        f"{name} swollen continuous hem",
        hem_points,
        parameters["hem_radius"],
        mat,
        cyclic=True,
    )
    hem.data.resolution_u = 2
    hem.data.bevel_resolution = 6
    return obj


def attached_water_crest(name, center, sphere_radius, mat):
    """A small surface-bound surge ridge, not a detached impact splash."""
    vertices = []
    faces = []
    samples = 32
    for index in range(samples):
        u = index / (samples - 1)
        phi = math.radians(-82.0 + 48.0 * u)
        envelope = math.sin(math.pi * u) ** 1.5
        theta = math.radians(52.0 - 3.5 * envelope)
        for row in range(2):
            radius = sphere_radius + 0.021 + row * (0.012 + 0.030 * envelope)
            shifted_theta = theta - math.radians(row * 2.8 * envelope)
            vertices.append(
                (
                    center[0]
                    + radius * math.sin(shifted_theta) * math.cos(phi),
                    center[1]
                    + radius * math.sin(shifted_theta) * math.sin(phi),
                    center[2] + radius * math.cos(shifted_theta),
                )
            )
    for index in range(samples - 1):
        a = index * 2
        b = a + 1
        c = a + 3
        d = a + 2
        faces.append((a, b, c, d))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    add_material(obj, mat)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    solidify = obj.modifiers.new("crest water thickness", "SOLIDIFY")
    solidify.thickness = 0.004
    solidify.offset = 0.0
    bevel = obj.modifiers.new("crest surface tension", "BEVEL")
    bevel.width = 0.0025
    bevel.segments = 3
    return obj


def aim(obj, target=(0, 0, 0)):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def area_light(name, location, color, power, size, target=(0, 0, 0)):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.color = color
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    aim(obj, target)
    return obj


def point_light(name, location, color, power, radius=0.2):
    data = bpy.data.lights.new(name, "POINT")
    data.energy = power
    data.color = color
    data.shadow_soft_size = radius
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    return obj


def water_reflection_world():
    """Keep the set black to camera while giving clear water a sky to reflect."""
    world = bpy.context.scene.world
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputWorld")
    dark = nodes.new("ShaderNodeBackground")
    dark.inputs["Color"].default_value = (0.0012, 0.0015, 0.0024, 1)
    dark.inputs["Strength"].default_value = 0.05
    reflection = nodes.new("ShaderNodeBackground")
    reflection.inputs["Color"].default_value = (0.34, 0.36, 0.39, 1)
    reflection.inputs["Strength"].default_value = 0.62
    light_path = nodes.new("ShaderNodeLightPath")
    mix = nodes.new("ShaderNodeMixShader")
    links.new(light_path.outputs["Is Glossy Ray"], mix.inputs[0])
    links.new(dark.outputs["Background"], mix.inputs[1])
    links.new(reflection.outputs["Background"], mix.inputs[2])
    links.new(mix.outputs["Shader"], output.inputs["Surface"])


def setup_studio(accent=(0.12, 0.62, 1.0), camera_z=0.12, camera_y=-4.3, camera_x=0.0):
    floor_mat = material("obsidian studio", (0.003, 0.004, 0.006), 0.18, 0.22)
    cube("studio plinth", (3.5, 3.5, 0.08), (0, 0.15, -0.76), floor_mat, 0.025)

    area_light(
        "large warm key",
        (-2.8, -3.0, 3.8),
        (1.0, 0.78, 0.58),
        1150,
        3.0,
        (0, 0, 0.1),
    )
    area_light(
        "accent rim",
        (2.8, 1.2, 2.1),
        accent,
        1250,
        2.1,
        (0, 0, 0.1),
    )
    area_light(
        "top strip",
        (0.0, 0.6, 4.0),
        (0.68, 0.80, 1.0),
        900,
        1.8,
        (0, 0, 0.1),
    )

    bpy.ops.object.camera_add(location=(camera_x, camera_y, camera_z))
    camera = bpy.context.object
    camera.name = "comparison camera"
    camera.data.lens = 58
    aim(camera, (0, 0, 0.0))
    bpy.context.scene.camera = camera


def build_earth():
    stone = photographic_granite(
        "upright data archive granite PBR",
        (0.028, 0.036, 0.046),
        roughness=0.44,
        scale=1.35,
    )

    # Direct comparison requested by the owner: one complete vertical record
    # versus a bank of four complete vertical records. There is no active seam
    # or centre crack—the monoliths themselves are the data.
    slab_width = 0.18
    slab_gap = 0.040
    slab_height = 1.30
    slab_depth = 0.62
    base_z = -0.65
    y = 0.055
    one_x = -0.62
    many_start = 0.05
    positions = [("one", 0, one_x)]
    positions.extend(
        ("multiple", index, many_start + index * (slab_width + slab_gap))
        for index in range(4)
    )
    for group, slab_index, x in positions:
        cube(
            f"earth {group} upright data slab {slab_index:02d}",
            (slab_width, slab_depth, slab_height),
            (x, y, base_z + slab_height / 2),
            stone,
            0.008,
        )

    setup_studio((0.34, 0.38, 0.44), camera_z=0.03, camera_y=-3.65, camera_x=0.05)
    bpy.data.objects["comparison camera"].data.lens = 52
    bpy.data.lights["large warm key"].color = (0.72, 0.79, 0.90)
    bpy.data.lights["large warm key"].energy = 920
    bpy.data.lights["accent rim"].energy = 420
    bpy.data.lights["top strip"].energy = 700


def build_water(state="bearing"):
    if state not in WATER_STATES:
        raise ValueError(f"Unknown water state: {state}")

    red_granite = photographic_granite(
        "Swiss red granite PBR",
        (0.52, 0.105, 0.068),
        roughness=0.20,
        polished=True,
        scale=1.45,
    )
    basalt = photographic_granite(
        "three tonne basalt socket PBR",
        (0.035, 0.044, 0.052),
        roughness=0.55,
        scale=1.20,
    )
    polished_socket = photographic_granite(
        "polished hydrostatic socket PBR",
        (0.075, 0.090, 0.105),
        roughness=0.30,
        polished=True,
        scale=1.55,
    )
    water = water_material()

    # The sphere is embedded in a fitted pressure bearing. The lowest cap
    # disappears into the three-tonne base rather than hovering above a plate.
    cube("basalt bearing block", (1.52, 1.42, 0.44), (0, 0.08, -0.50), basalt, 0.042)
    cylinder(
        "polished recessed bearing socket",
        0.40,
        0.012,
        (0, 0, -0.282),
        polished_socket,
        vertices=160,
    )

    ball_center = (0, 0, 0.25)
    ball_radius = 0.60
    ball = sphere("700 kg rotating granite sphere", ball_radius, ball_center, red_granite)
    ball.rotation_euler = (math.radians(7), 0, math.radians(-14))
    ball.keyframe_insert(data_path="rotation_euler", frame=1)
    ball.rotation_euler = (math.radians(7), 0, math.radians(346))
    ball.keyframe_insert(data_path="rotation_euler", frame=120)

    # The browser states are authored as one clear skin gripping the sphere.
    # Scroll changes how far gravity pulls its scalloped lower edge; it never
    # becomes a stack of basin rings or an impact-splash pictogram.
    spherical_water_skin(
        f"{state} attached clear-water skin",
        ball_center,
        ball_radius,
        water,
        state,
    )

    if state == "surge":
        attached_water_crest(
            "surge attached surface crest",
            ball_center,
            ball_radius,
            water,
        )

    setup_studio((0.72, 0.74, 0.78), camera_z=0.20, camera_y=-3.85)
    key = bpy.data.lights["large warm key"]
    key.color = (0.96, 0.96, 0.97)
    key.energy = 560
    key.shape = "RECTANGLE"
    key.size = 2.25
    key.size_y = 0.32
    rim = bpy.data.lights["accent rim"]
    rim.color = (0.92, 0.94, 0.97)
    rim.energy = 390
    rim.shape = "RECTANGLE"
    rim.size = 1.70
    rim.size_y = 0.20
    top = bpy.data.lights["top strip"]
    top.color = (0.95, 0.96, 0.98)
    top.energy = 430
    top.shape = "RECTANGLE"
    top.size = 2.40
    top.size_y = 0.18
    grazing = area_light(
        "water grazing reflection",
        (-0.9, -2.8, 0.35),
        (0.92, 0.94, 0.97),
        360,
        1.8,
        (0, 0, 0.28),
    )
    grazing.data.shape = "RECTANGLE"
    grazing.data.size = 1.80
    grazing.data.size_y = 0.16
    front = area_light(
        "water front softbox",
        (1.35, -2.35, 1.25),
        (0.90, 0.93, 0.98),
        300,
        1.25,
        (0.30, -0.38, 0.30),
    )
    front.data.shape = "RECTANGLE"
    front.data.size = 1.10
    front.data.size_y = 0.24

    # A camera-invisible black card breaks the white reflection ribbons, giving
    # the clear shell readable contrast without tinting the liquid.
    flag_mat = material("water neutral dark flag", (0.001, 0.001, 0.001), 1.0)
    flag = cube(
        "water dark reflection flag",
        (0.30, 0.018, 1.15),
        (0.92, 0.76, 0.36),
        flag_mat,
    )
    try:
        flag.visible_camera = False
        flag.visible_diffuse = False
        flag.visible_shadow = False
    except AttributeError:
        pass
    water_reflection_world()


def build_fire():
    brick_mats = [
        granite("kiln old firebrick", (0.008, 0.004, 0.002), (0.095, 0.028, 0.008), False, 8.5),
        granite("kiln vitrified brick", (0.004, 0.003, 0.002), (0.055, 0.017, 0.006), False, 12.0),
        granite("kiln ash brick", (0.010, 0.009, 0.007), (0.072, 0.047, 0.025), False, 6.0),
    ]
    mortar = material("kiln soot mortar", (0.003, 0.002, 0.0015), 0.98)
    heat = kiln_heat_material()
    coal = material("kiln charcoal silhouette", (0.0015, 0.001, 0.0006), 0.94)

    # One long dragon-kiln section. The barrel roof is a refractory cylinder
    # buried halfway into the base, so its silhouette is architectural rather
    # than a rectangular bank of glowing panels.
    cube("dragon kiln lower body", (1.55, 0.82, 0.58), (0, 0.10, -0.39), brick_mats[2], 0.045)
    cylinder(
        "dragon kiln barrel vault",
        0.43,
        1.54,
        (0, 0.10, -0.08),
        brick_mats[0],
        vertices=96,
        rotation=(0, math.pi / 2, 0),
    )

    front_y = -0.322
    # One arched firemouth and three smaller stoke holes climb toward exhaust.
    ports = [
        (-0.47, -0.34, 0.34, 0.42, True),
        (0.00, -0.27, 0.18, 0.20, False),
        (0.30, -0.20, 0.16, 0.18, False),
        (0.56, -0.12, 0.14, 0.16, False),
    ]
    random.seed(214)
    for index, (ox, oz, ow, oh, arched) in enumerate(ports):
        # A black cavity larger than the heat creates a real soot-black reveal.
        cube(
            f"kiln port {index} cavity",
            (ow + 0.055, 0.026, oh + 0.055),
            (ox, front_y - 0.004, oz),
            coal,
            0.025 if arched else 0.018,
        )
        cube(
            f"kiln port {index} chamber heat",
            (ow * 0.78, 0.018, oh * 0.72),
            (ox, front_y - 0.018, oz - 0.008),
            heat,
            0.045 if arched else 0.022,
        )
        if arched:
            # The circular crown overlaps the rectangular firebox to form an arch.
            cylinder(
                "kiln arched firemouth crown",
                ow * 0.39,
                0.020,
                (ox, front_y - 0.030, oz + oh * 0.27),
                heat,
                vertices=64,
                rotation=(math.pi / 2, 0, 0),
            )
        point_light(
            f"kiln port {index} warm bounce",
            (ox, -0.46, oz),
            (1.0, 0.12, 0.008),
            62 if arched else 26,
            0.13,
        )
        # Charred shelves and fuel interrupt the glow; no flame geometry.
        for fuel_index in range(4 if arched else 2):
            fuel = cube(
                f"kiln port {index} charred fuel {fuel_index}",
                (
                    ow * random.uniform(0.22, 0.42),
                    0.028,
                    random.uniform(0.018, 0.035),
                ),
                (
                    ox + random.uniform(-ow * 0.22, ow * 0.22),
                    front_y - 0.050,
                    oz - oh * 0.22 + fuel_index * 0.035,
                ),
                coal,
                0.010,
            )
            fuel.rotation_euler[1] = math.radians(random.uniform(-14, 14))

    # Broken, uneven front courses reveal that this is fired masonry, not a skin.
    rows = 5
    brick_w, brick_h = 0.17, 0.095
    for row in range(rows):
        z = -0.63 + row * 0.105
        offset = brick_w / 2 if row % 2 else 0.0
        for col in range(10):
            x = -0.78 + col * brick_w + offset
            if x > 0.78:
                continue
            if any(abs(x - ox) < ow * 0.65 and abs(z - oz) < oh * 0.60 for ox, oz, ow, oh, _ in ports):
                continue
            brick = cube(
                f"dragon kiln exposed brick {row}.{col}",
                (
                    brick_w * random.uniform(0.78, 1.03),
                    random.uniform(0.08, 0.15),
                    brick_h * random.uniform(0.74, 1.0),
                ),
                (
                    x + random.uniform(-0.012, 0.012),
                    front_y - random.uniform(0.018, 0.055),
                    z + random.uniform(-0.010, 0.010),
                ),
                brick_mats[(row + col) % len(brick_mats)],
                random.uniform(0.005, 0.012),
            )
            brick.rotation_euler[2] = math.radians(random.uniform(-2.8, 2.8))

    # A stepped chimney at the high end completes the dragon-kiln silhouette.
    for level in range(4):
        cube(
            f"dragon kiln chimney course {level}",
            (0.30 - level * 0.022, 0.48 - level * 0.025, 0.12),
            (0.55, 0.20, 0.31 + level * 0.105),
            brick_mats[(level + 1) % len(brick_mats)],
            0.014,
        )

    setup_studio((1.0, 0.075, 0.01), camera_z=0.08, camera_x=0.24)
    bpy.data.lights["large warm key"].energy = 360
    bpy.data.lights["top strip"].energy = 260


def dish_mesh(mat):
    profile = []
    radius = 0.61
    for index in range(18):
        r = 0.055 + index / 17 * radius
        z = 0.26 * (r / radius) ** 2
        profile.append((r, z))
    dish = radial_surface("wind receiving dish", profile, mat, segments=128)
    dish.rotation_euler = (math.radians(70), math.radians(-16), math.radians(-9))
    dish.location = (0.30, 0.28, 0.14)
    solidify = dish.modifiers.new("dish shell", "SOLIDIFY")
    solidify.thickness = 0.018
    return dish


def build_wind():
    nickel = material("wind nickel", (0.065, 0.075, 0.088), 0.20, 0.88)
    tape = material("magnetic tape oxide", (0.018, 0.006, 0.003), 0.20, 0.12)
    socket(tape.node_tree.nodes.get("Principled BSDF"), "Anisotropic IOR Level", 0.38)
    tape_edge = material("wind tape polished edge", (0.06, 0.11, 0.13), 0.13, 0.72)
    pale = material("wind ceramic hub", (0.30, 0.31, 0.30), 0.48, 0.12)

    dish_mesh(nickel)
    torus(
        "wind dish rim",
        0.61,
        0.018,
        (0.30, 0.28, 0.14),
        nickel,
        (math.radians(70), math.radians(-16), math.radians(-9)),
    )

    # One reel is the protagonist and source of every visible wave.
    reel_x, reel_z = -0.68, -0.22
    cylinder(
        "wind source reel rear",
        0.27,
        0.045,
        (reel_x, -0.02, reel_z),
        nickel,
        rotation=(math.pi / 2, 0, 0),
    )
    cylinder(
        "wind source reel front",
        0.27,
        0.028,
        (reel_x, -0.29, reel_z),
        pale,
        rotation=(math.pi / 2, 0, 0),
    )
    cylinder(
        "wind source hub",
        0.085,
        0.34,
        (reel_x, -0.14, reel_z),
        nickel,
        rotation=(math.pi / 2, 0, 0),
    )
    for spoke in range(6):
        angle = spoke * TAU / 6
        end = (
            reel_x + 0.21 * math.cos(angle),
            -0.31,
            reel_z + 0.21 * math.sin(angle),
        )
        curve(
            f"wind reel spoke {spoke}",
            [(reel_x, -0.31, reel_z), end],
            0.018,
            nickel,
        )

    # Real oxide tape, wide enough to read as material rather than cyan line art.
    for ribbon_index in range(8):
        phase = ribbon_index * 0.71
        points = []
        for step in range(42):
            t = step / 41
            x = -0.46 + 1.12 * t
            envelope = math.sin(math.pi * t) ** 0.85
            y = -0.42 + ribbon_index * 0.018 + 0.035 * math.sin(t * TAU + phase)
            z = (
                -0.20
                + ribbon_index * 0.070
                + envelope
                * (0.085 + ribbon_index * 0.005)
                * math.sin(t * TAU * 1.72 + phase)
            )
            points.append((x, y, z))
        front_strip_mesh(
            f"wind standing tape {ribbon_index:02d}",
            points,
            0.032 + (ribbon_index % 3) * 0.006,
            tape,
        )
        edge = [(x, y - 0.002, z + 0.014) for x, y, z in points]
        curve(f"wind reflected tape edge {ribbon_index:02d}", edge, 0.0014, tape_edge)

    curve(
        "wind released leader",
        [
            (-0.78, -0.32, -0.49),
            (-0.65, -0.34, -0.40),
            (-0.59, -0.35, -0.25),
            (-0.56, -0.36, -0.18),
        ],
        0.013,
        tape,
    )
    setup_studio((0.03, 0.78, 1.0), camera_z=0.04)


def hoju_radius(z):
    """Dense jewel profile: broad belly, neck, then a flame-like point."""
    if z < 0.46:
        t = (z + 0.58) / 1.04
        return 0.08 + 0.54 * math.sin(math.pi * max(0.0, min(1.0, t))) ** 0.76
    t = (z - 0.46) / 0.42
    return max(0.018, 0.29 * (1 - t) ** 0.66)


def build_void():
    glass = smoked_glass()
    phosphor = dead_phosphor_material()
    black_nickel = material("void black nickel", (0.002, 0.003, 0.006), 0.18, 0.88)
    red = emission("void standby", (1.0, 0.012, 0.006), 18.0)

    profile = []
    for index in range(44):
        z = -0.58 + index / 43 * 1.46
        profile.append((hoju_radius(z), z))
    shell = radial_surface("void hoju shell", profile, glass, segments=160)
    solidify = shell.modifiers.new("void shell thickness", "SOLIDIFY")
    solidify.thickness = 0.024

    # A full dead phosphor volume supplies material density. The scanline texture
    # lives in its micro-bump; it is not a glowing cage around the jewel.
    core_profile = []
    for index in range(44):
        z = -0.54 + index / 43 * 1.34
        core_profile.append((hoju_radius(z) * 0.80, z))
    radial_surface(
        "void dead CRT phosphor body",
        core_profile,
        phosphor,
        segments=160,
    )

    # One standby witness, embedded just inside the lower front of the tube.
    sphere("void standby point", 0.016, (0, -0.50, -0.48), red, segments=48, rings=32)
    point_light("void red witness", (0, -0.34, -0.47), (1.0, 0.006, 0.003), 24, 0.05)
    torus("void jewel foot", 0.34, 0.045, (0, 0, -0.58), black_nickel)
    cylinder("void jewel plinth", 0.33, 0.055, (0, 0, -0.66), black_nickel)
    setup_studio((0.18, 0.08, 0.52), camera_z=0.06)
    bpy.data.lights["large warm key"].energy = 520
    bpy.data.lights["top strip"].energy = 420
    area_light(
        "void body fill",
        (-1.8, -3.4, 0.8),
        (0.11, 0.18, 0.42),
        150,
        3.6,
        (0, 0, 0.02),
    )


BUILDERS = {
    "earth": build_earth,
    "water": build_water,
    "water-bearing": lambda: build_water("bearing"),
    "water-flow": lambda: build_water("flow"),
    "water-surge": lambda: build_water("surge"),
    "fire": build_fire,
    "wind": build_wind,
    "void": build_void,
}


def render(name):
    scene = reset_scene()
    if name.startswith("water") or name == "void":
        # Refraction is the concept here, so Water gets the physically traced
        # path while the other rapid comparison studies stay in Eevee.
        scene.render.engine = "CYCLES"
        scene.cycles.samples = 128 if name.startswith("water") else 48
        scene.cycles.use_denoising = True
        scene.cycles.max_bounces = 10
        scene.cycles.transmission_bounces = 8
        scene.cycles.transparent_max_bounces = 8
        try:
            preferences = bpy.context.preferences.addons["cycles"].preferences
            preferences.compute_device_type = "METAL"
            preferences.get_devices()
            for device in preferences.devices:
                device.use = True
            scene.cycles.device = "GPU"
        except Exception as error:
            print("Cycles Metal unavailable; using CPU:", error)
    BUILDERS[name]()
    scene.frame_set(42)

    if name.startswith("water-"):
        browser_dir = DESIGN_DIR / "renders" / "browser-proofs"
        browser_dir.mkdir(parents=True, exist_ok=True)
        scene.render.resolution_x = 960
        scene.render.resolution_y = 720
        scene.camera.data.lens = 50
        scene.render.filepath = str(browser_dir / f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print(f"WROTE {scene.render.filepath}")
        return

    scene.render.filepath = str(OUTPUT_DIR / f"{name}.png")
    bpy.ops.render.render(write_still=True)
    print(f"WROTE {scene.render.filepath}")
    if name == "water":
        browser_dir = DESIGN_DIR / "renders" / "browser-proofs"
        browser_dir.mkdir(parents=True, exist_ok=True)
        scene.render.resolution_x = 960
        scene.render.resolution_y = 720
        scene.camera.data.lens = 50
        scene.render.filepath = str(browser_dir / "water-source.png")
        bpy.ops.render.render(write_still=True)
        print(f"WROTE {scene.render.filepath}")


def main():
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else ["all"]
    names = list(ELEMENTS) if not args or args == ["all"] else args
    if "water-states" in names:
        names = [
            name
            for requested in names
            for name in (
                tuple(f"water-{state}" for state in WATER_STATES)
                if requested == "water-states"
                else (requested,)
            )
        ]
    unknown = [name for name in names if name not in BUILDERS]
    if unknown:
        raise SystemExit(f"Unknown studies: {', '.join(unknown)}")
    for name in names:
        render(name)


if __name__ == "__main__":
    main()
