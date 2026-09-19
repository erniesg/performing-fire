"""Mantaflow liquid proof for the Performing Fire water machine.

This is a real FLIP liquid simulation, not a shader or hand-authored splash:

* a timed liquid inflow starts above the granite sphere;
* scene gravity accelerates the jet;
* the sphere and basin are fluid collision effectors;
* Mantaflow reconstructs the renderable liquid mesh;
* the proof profile also enables secondary spray particles.

Profiles:

* ``smoke`` — 16-frame, resolution-32 pipeline check without a pool;
* ``proof`` — 32-frame connected impact with spray;
* ``splash`` — 24-frame off-axis crown with an exposed sphere;
* ``low-flow`` — 24-frame connected thread and restrained drape.

Setup only, without baking:

    blender -b -P docs/design/src/water_fluid_sim.py -- \
        --profile smoke --cache-dir /private/tmp/water-setup-cache \
        --output /private/tmp/water-setup.blend

Bake and render the selected hero frame:

    blender -b -P docs/design/src/water_fluid_sim.py -- \
        --profile splash --cache-dir /private/tmp/water-splash-cache \
        --output /private/tmp/water-splash.blend \
        --render-path /private/tmp/water-splash-hero.png --bake --render

Bake once and render every frame as ``frame_####.png``:

    blender -b -P docs/design/src/water_fluid_sim.py -- \
        --profile low-flow --cache-dir /private/tmp/water-low-flow-cache \
        --output /private/tmp/water-low-flow.blend \
        --render-sequence --sequence-dir /private/tmp/water-low-flow-frames

Use a fresh, empty cache directory for every bake. Non-smoke profiles use a
shallow one-shot pool and hidden outflow drains.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path

import bpy


SOURCE_DIR = Path(__file__).resolve().parent
if str(SOURCE_DIR) not in sys.path:
    sys.path.insert(0, str(SOURCE_DIR))

import godai_layers as godai  # noqa: E402


DESIGN_DIR = SOURCE_DIR.parent
DEFAULT_OUTPUT_DIR = DESIGN_DIR / "renders" / "browser-proofs"


@dataclass(frozen=True)
class SimulationProfile:
    resolution: int
    frame_end: int
    inflow_end: int
    mesh_scale: int
    render_frame: int
    render_samples: int
    spray: bool
    emitter_radius: float
    emitter_location: tuple[float, float, float]
    emitter_velocity: tuple[float, float, float]
    initial_pool: bool
    drains: bool
    surface_tension: float
    mesh_particle_radius: float
    mesh_concave_upper: float


PROFILES = {
    "smoke": SimulationProfile(
        resolution=32,
        frame_end=16,
        inflow_end=7,
        mesh_scale=1,
        render_frame=16,
        render_samples=8,
        spray=False,
        emitter_radius=0.17,
        emitter_location=(0.0, 0.02, 1.47),
        emitter_velocity=(0.0, 0.0, -2.8),
        initial_pool=False,
        drains=False,
        surface_tension=0.20,
        mesh_particle_radius=1.75,
        mesh_concave_upper=3.5,
    ),
    "proof": SimulationProfile(
        resolution=56,
        frame_end=32,
        inflow_end=32,
        mesh_scale=2,
        render_frame=28,
        render_samples=32,
        spray=True,
        emitter_radius=0.095,
        emitter_location=(0.0, 0.02, 1.47),
        emitter_velocity=(0.0, 0.0, -4.8),
        initial_pool=True,
        drains=True,
        surface_tension=0.20,
        mesh_particle_radius=1.75,
        mesh_concave_upper=3.5,
    ),
    "splash": SimulationProfile(
        resolution=64,
        frame_end=24,
        inflow_end=10,
        mesh_scale=2,
        render_frame=20,
        render_samples=32,
        spray=True,
        emitter_radius=0.090,
        emitter_location=(0.16, 0.02, 1.47),
        emitter_velocity=(0.35, 0.08, -3.2),
        initial_pool=True,
        drains=True,
        surface_tension=0.08,
        mesh_particle_radius=1.50,
        mesh_concave_upper=1.4,
    ),
    "low-flow": SimulationProfile(
        resolution=48,
        frame_end=24,
        inflow_end=24,
        mesh_scale=2,
        render_frame=17,
        render_samples=32,
        spray=False,
        emitter_radius=0.072,
        emitter_location=(-0.10, 0.02, 1.47),
        emitter_velocity=(0.12, 0.0, -2.4),
        initial_pool=True,
        drains=True,
        surface_tension=0.09,
        mesh_particle_radius=1.50,
        mesh_concave_upper=1.4,
    ),
}


def fluid_modifier(obj: bpy.types.Object, fluid_type: str) -> bpy.types.FluidModifier:
    modifier = obj.modifiers.new(f"{fluid_type.title()} Fluid", "FLUID")
    modifier.fluid_type = fluid_type
    bpy.context.view_layer.objects.active = obj
    bpy.context.view_layer.update()
    return modifier


def set_boolean_keyframes_constant(
    obj: bpy.types.Object,
    data_path_suffix: str,
) -> None:
    animation = obj.animation_data
    action = animation.action if animation else None
    if action is None:
        raise RuntimeError(f"No action found on {obj.name}")

    curves = []
    if action.is_action_layered:
        for layer in action.layers:
            for strip in layer.strips:
                for channelbag in strip.channelbags:
                    curves.extend(channelbag.fcurves)
    elif hasattr(action, "fcurves"):
        curves.extend(action.fcurves)

    matching = [
        curve
        for curve in curves
        if curve.data_path.endswith(data_path_suffix)
    ]
    if not matching:
        raise RuntimeError(
            f"No keyframes ending in {data_path_suffix!r} found on {obj.name}"
        )
    for curve in matching:
        for keyframe in curve.keyframe_points:
            keyframe.interpolation = "CONSTANT"


def make_effector(
    obj: bpy.types.Object,
    *,
    planar: bool = False,
    surface_distance: float = 0.0,
) -> None:
    settings = fluid_modifier(obj, "EFFECTOR").effector_settings
    if settings is None:
        raise RuntimeError(f"Fluid effector settings did not initialize for {obj.name}")
    settings.effector_type = "COLLISION"
    settings.use_plane_init = planar
    settings.surface_distance = surface_distance
    settings.subframes = 2


def make_water_material() -> bpy.types.Material:
    material = godai.water_material("Mantaflow neutral water")
    material.diffuse_color = (0.72, 0.82, 0.90, 0.22)
    for node in material.node_tree.nodes:
        if node.bl_idname == "ShaderNodeVolumeAbsorption":
            node.inputs["Color"].default_value = (0.92, 0.96, 1.0, 1.0)
            node.inputs["Density"].default_value = 0.08
        elif node.bl_idname == "ShaderNodeBump":
            node.inputs["Strength"].default_value = 0.08
            node.inputs["Distance"].default_value = 0.0015
    return material


def build_domain(
    profile: SimulationProfile,
    cache_dir: Path,
    water_material: bpy.types.Material,
) -> tuple[bpy.types.Object, bpy.types.FluidDomainSettings]:
    domain = godai.cube(
        "LIQUID DOMAIN — render mesh",
        (2.45, 2.00, 2.50),
        (0.0, 0.0, 0.53),
        water_material,
    )
    modifier = fluid_modifier(domain, "DOMAIN")
    settings = modifier.domain_settings
    if settings is None:
        raise RuntimeError("Fluid domain settings did not initialize")

    settings.domain_type = "LIQUID"
    settings.resolution_max = profile.resolution
    settings.cache_type = "ALL"
    settings.cache_directory = str(cache_dir)
    settings.cache_frame_start = 1
    settings.cache_frame_end = profile.frame_end

    settings.simulation_method = "FLIP"
    settings.flip_ratio = 0.99
    settings.particle_number = 2
    settings.particle_min = 8
    settings.particle_max = 16
    settings.particle_radius = 1.0
    settings.particle_randomness = 0.18
    settings.timesteps_min = 2
    settings.timesteps_max = 6
    settings.cfl_condition = 2.0
    settings.time_scale = 1.0
    settings.surface_tension = profile.surface_tension
    settings.vorticity = 0.35

    settings.use_mesh = True
    settings.mesh_scale = profile.mesh_scale
    settings.mesh_particle_radius = profile.mesh_particle_radius
    settings.mesh_concave_upper = profile.mesh_concave_upper
    settings.mesh_generator = "IMPROVED"
    settings.mesh_smoothen_pos = 1
    settings.mesh_smoothen_neg = 1
    settings.use_speed_vectors = True

    settings.use_spray_particles = profile.spray
    if profile.spray:
        settings.sndparticle_sampling_wavecrest = 80
        settings.sndparticle_sampling_trappedair = 12
        settings.sndparticle_potential_min_wavecrest = 1.2
        settings.sndparticle_potential_max_wavecrest = 6.0
        settings.sndparticle_life_min = 5.0
        settings.sndparticle_life_max = 15.0

    # The physical basin supplies the collisions. Open domain borders let stray
    # spray leave the simulation instead of hitting invisible box walls.
    settings.use_collision_border_front = False
    settings.use_collision_border_back = False
    settings.use_collision_border_left = False
    settings.use_collision_border_right = False
    settings.use_collision_border_top = False
    settings.use_collision_border_bottom = False
    domain.display_type = "WIRE"
    return domain, settings


def build_inflow(profile: SimulationProfile) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=48,
        radius=profile.emitter_radius,
        depth=0.18,
        location=profile.emitter_location,
    )
    inflow = bpy.context.object
    inflow.name = "timed overhead liquid inflow"
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    inflow.hide_render = True

    settings = fluid_modifier(inflow, "FLOW").flow_settings
    if settings is None:
        raise RuntimeError("Fluid flow settings did not initialize")
    settings.flow_type = "LIQUID"
    settings.flow_behavior = "INFLOW"
    settings.surface_distance = 1.5
    settings.subframes = 3
    settings.use_initial_velocity = True
    settings.velocity_coord = profile.emitter_velocity

    settings.use_inflow = True
    settings.keyframe_insert(data_path="use_inflow", frame=1)
    settings.keyframe_insert(data_path="use_inflow", frame=profile.inflow_end)
    settings.use_inflow = False
    settings.keyframe_insert(data_path="use_inflow", frame=profile.inflow_end + 1)
    set_boolean_keyframes_constant(inflow, "flow_settings.use_inflow")
    return inflow


def build_initial_pool() -> bpy.types.Object:
    pool = godai.cube(
        "one-shot shallow liquid pool",
        (1.80, 1.30, 0.18),
        (0.0, 0.02, -0.24),
        make_water_material(),
    )
    pool.hide_render = True
    settings = fluid_modifier(pool, "FLOW").flow_settings
    if settings is None:
        raise RuntimeError("Initial pool flow settings did not initialize")
    settings.flow_type = "LIQUID"
    settings.flow_behavior = "GEOMETRY"
    settings.surface_distance = 1.0
    settings.volume_density = 1.0
    return pool


def build_drain(location: tuple[float, float, float], index: int) -> bpy.types.Object:
    drain = godai.cube(
        f"hidden basin outflow {index}",
        (0.20, 0.20, 0.16),
        location,
        make_water_material(),
    )
    drain.hide_render = True
    settings = fluid_modifier(drain, "FLOW").flow_settings
    if settings is None:
        raise RuntimeError(f"Drain {index} flow settings did not initialize")
    settings.flow_type = "LIQUID"
    settings.flow_behavior = "OUTFLOW"
    settings.surface_distance = 1.0
    return drain


def build_machine(profile: SimulationProfile) -> None:
    granite = godai.photographic_granite(
        "Swiss red granite PBR",
        (0.52, 0.105, 0.068),
        roughness=0.20,
        polished=True,
        scale=1.45,
    )
    basalt = godai.photographic_granite(
        "three tonne basalt basin PBR",
        (0.035, 0.044, 0.052),
        roughness=0.52,
        scale=1.20,
    )
    dark_metal = godai.material("overhead nozzle", (0.018, 0.022, 0.028), 0.20, 0.65)

    sphere = godai.sphere(
        "700 kg granite sphere — fluid collision",
        0.57,
        (0.0, 0.03, 0.23),
        granite,
        segments=64,
        rings=40,
    )
    make_effector(sphere, surface_distance=0.35)

    # A shallow open basin catches the impact and gives the reflected sheet a
    # physical floor and four visible lips.
    basin_parts = (
        ("basin floor", (2.22, 1.72, 0.12), (0.0, 0.02, -0.40)),
        ("basin left wall", (0.12, 1.72, 0.30), (-1.05, 0.02, -0.25)),
        ("basin right wall", (0.12, 1.72, 0.30), (1.05, 0.02, -0.25)),
        ("basin back wall", (2.22, 0.12, 0.30), (0.0, 0.82, -0.25)),
        ("basin front lip", (2.22, 0.12, 0.18), (0.0, -0.78, -0.31)),
    )
    for name, size, location in basin_parts:
        part = godai.cube(name, size, location, basalt, 0.025)
        make_effector(part, surface_distance=0.20)

    godai.cylinder(
        "overhead water nozzle",
        profile.emitter_radius + 0.065,
        0.28,
        (
            profile.emitter_location[0],
            profile.emitter_location[1],
            profile.emitter_location[2] + 0.19,
        ),
        dark_metal,
        vertices=64,
    )


def setup_scene(profile: SimulationProfile, cache_dir: Path) -> tuple[
    bpy.types.Scene,
    bpy.types.Object,
    bpy.types.FluidDomainSettings,
]:
    scene = godai.reset_scene()
    scene.frame_start = 1
    scene.frame_end = profile.frame_end
    scene.frame_set(1)
    scene.gravity = (0.0, 0.0, -9.81)
    scene.render.engine = "CYCLES"
    scene.cycles.samples = profile.render_samples
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 8
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
    scene.render.resolution_x = 640
    scene.render.resolution_y = 480
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False

    water = make_water_material()
    domain, settings = build_domain(profile, cache_dir, water)
    build_inflow(profile)
    if profile.initial_pool:
        build_initial_pool()
    if profile.drains:
        build_drain((-0.80, 0.60, -0.24), 1)
        build_drain((0.80, 0.60, -0.24), 2)
    build_machine(profile)

    godai.setup_studio(
        (0.72, 0.78, 0.86),
        camera_z=0.42,
        camera_y=-4.65,
    )
    camera = bpy.data.objects["comparison camera"]
    camera.data.lens = 52
    godai.aim(camera, (0.0, 0.02, 0.40))
    godai.water_reflection_world()

    bpy.data.lights["large warm key"].color = (0.94, 0.96, 1.0)
    bpy.data.lights["large warm key"].energy = 780
    bpy.data.lights["accent rim"].color = (0.52, 0.70, 1.0)
    bpy.data.lights["accent rim"].energy = 900
    bpy.data.lights["top strip"].energy = 850
    return scene, domain, settings


def select_domain(domain: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    domain.hide_set(False)
    domain.select_set(True)
    bpy.context.view_layer.objects.active = domain


def evaluated_mesh_counts(domain: bpy.types.Object) -> dict[str, int]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = domain.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        return {
            "vertices": len(mesh.vertices),
            "edges": len(mesh.edges),
            "polygons": len(mesh.polygons),
        }
    finally:
        evaluated.to_mesh_clear()


def configure_spray_rendering(domain: bpy.types.Object) -> int:
    systems = [
        system
        for system in domain.particle_systems
        if system.settings.type == "SPRAY"
    ]
    if not systems:
        return 0

    droplet = godai.sphere(
        "secondary spray render droplet",
        0.018,
        (0.0, 0.0, -10.0),
        make_water_material(),
        segments=12,
        rings=8,
    )
    droplet.hide_set(True)
    for system in systems:
        settings = system.settings
        settings.render_type = "OBJECT"
        settings.instance_object = droplet
        settings.particle_size = 0.018
        settings.size_random = 0.55
    return len(systems)


def cache_file_count(cache_dir: Path) -> int:
    return sum(1 for path in cache_dir.rglob("*") if path.is_file())


def parse_args() -> argparse.Namespace:
    raw = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", choices=PROFILES, default="smoke")
    parser.add_argument("--cache-dir", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--render-path", type=Path)
    parser.add_argument("--bake", action="store_true", help="Bake the selected profile")
    parser.add_argument(
        "--render",
        action="store_true",
        help="Render the profile's selected hero frame after baking",
    )
    parser.add_argument(
        "--render-sequence",
        action="store_true",
        help="Bake, then render every profile frame as PNG",
    )
    parser.add_argument(
        "--sequence-dir",
        type=Path,
        help="PNG output directory for --render-sequence",
    )
    args = parser.parse_args(raw)
    if args.render_sequence:
        args.bake = True
    if args.render and not args.bake:
        parser.error("--render requires --bake")
    if args.sequence_dir and not args.render_sequence:
        parser.error("--sequence-dir requires --render-sequence")
    return args


def main() -> None:
    args = parse_args()
    profile = PROFILES[args.profile]
    cache_dir = (args.cache_dir or DESIGN_DIR / "cache" / f"water-fluid-{args.profile}").resolve()
    output = (
        args.output
        or DEFAULT_OUTPUT_DIR / f"water-fluid-{args.profile}.blend"
    ).resolve()
    render_path = (
        args.render_path
        or DEFAULT_OUTPUT_DIR / f"water-fluid-{args.profile}.png"
    ).resolve()
    sequence_dir = (
        args.sequence_dir
        or DEFAULT_OUTPUT_DIR / f"water-fluid-{args.profile}-sequence"
    ).resolve()

    if args.bake and cache_dir.exists() and any(cache_dir.iterdir()):
        raise SystemExit(
            f"Refusing to reuse non-empty Mantaflow cache: {cache_dir}\n"
            "Choose a fresh --cache-dir so stale physics cannot masquerade as this bake."
        )
    cache_dir.mkdir(parents=True, exist_ok=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    render_path.parent.mkdir(parents=True, exist_ok=True)

    scene, domain, settings = setup_scene(profile, cache_dir)
    select_domain(domain)
    bpy.ops.wm.save_as_mainfile(filepath=str(output))

    diagnostics: dict[str, object] = {
        "profile": args.profile,
        "resolution": profile.resolution,
        "frame_range": [1, profile.frame_end],
        "inflow_frames": [1, profile.inflow_end],
        "emitter_radius": profile.emitter_radius,
        "emitter_location": profile.emitter_location,
        "emitter_velocity": profile.emitter_velocity,
        "initial_pool": profile.initial_pool,
        "drains": profile.drains,
        "surface_tension": profile.surface_tension,
        "mesh_particle_radius": profile.mesh_particle_radius,
        "mesh_concave_upper": profile.mesh_concave_upper,
        "render_engine": scene.render.engine,
        "cache_directory": str(cache_dir),
        "blend_file": str(output),
        "baked": False,
    }

    if args.bake:
        result = bpy.ops.fluid.bake_all()
        if "FINISHED" not in result:
            raise RuntimeError(f"Mantaflow bake did not finish: {sorted(result)}")
        diagnostics["baked"] = True
        diagnostics["cache_files"] = cache_file_count(cache_dir)
        diagnostics["has_data"] = settings.has_cache_baked_data
        diagnostics["has_mesh"] = settings.has_cache_baked_mesh
        diagnostics["has_particles"] = settings.has_cache_baked_particles

        scene.frame_set(profile.render_frame)
        bpy.context.view_layer.update()
        diagnostics["render_frame"] = profile.render_frame
        diagnostics["liquid_mesh"] = evaluated_mesh_counts(domain)
        diagnostics["particle_systems"] = configure_spray_rendering(domain)

        if args.render:
            scene.render.filepath = str(render_path)
            scene.render.image_settings.file_format = "PNG"
            bpy.ops.render.render(write_still=True)
            diagnostics["render"] = str(render_path)

        if args.render_sequence:
            sequence_dir.mkdir(parents=True, exist_ok=True)
            scene.frame_start = 1
            scene.frame_end = profile.frame_end
            scene.render.filepath = str(sequence_dir / "frame_")
            scene.render.image_settings.file_format = "PNG"
            bpy.ops.render.render(animation=True)
            diagnostics["sequence"] = {
                "directory": str(sequence_dir),
                "frames": profile.frame_end,
            }
            scene.frame_set(profile.render_frame)
            scene.render.filepath = str(render_path)

        bpy.ops.wm.save_as_mainfile(filepath=str(output))

    print("WATER_FLUID_DIAGNOSTICS " + json.dumps(diagnostics, sort_keys=True))


if __name__ == "__main__":
    main()
