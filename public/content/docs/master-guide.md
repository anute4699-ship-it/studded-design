# Studded models: master guide

This guide covers every kind of studded model: props, characters and creatures, with the optional rig and animations. It comes after `pack-spec.md`, which holds the numbers measured from the Stud Free Pack. Code lives in `../scripts/stud_kit.py`, and the worked examples are in `../examples/`.

| Example | What it is |
|---------|------------|
| `pumpkin.py` | Static prop on a pack base. |
| `pumpkin_kid.py` | Character with an 8-bone rigid rig and Idle, Walk and Wave. |

---

## 1. Decide what you are making

| Type | Base? | Rig? | Typical height | Examples |
|------|-------|------|----------------|----------|
| Small prop | No (or a few plates) | Never | 1–4 | Coin, pumpkin bit, crate |
| Hero prop | Socle + Dalles | Never | 5–19 | Pack models, signs, trees |
| Character | No (display base optional) | Yes, if it moves | 8–11 | Pumpkin kid, NPCs, mascots |
| Creature | No | Yes | 4–16 | Lion, shark, bat |
| Prop that moves | Optional | Only if asked | – | Chest lid, door, spinning sign |

**Props are static by default.** Add a rig or animation only when the user asks for it on that model.

## 2. References: what to ask for and what to do with them

Ask for this before building. Never guess a design the user already has (memory: match-reference-exactly).

| Making | Ask for (minimum) | Nice to have |
|--------|-------------------|--------------|
| Prop | 1 clear image, front or 3/4 | Side view, colour notes, size in studs |
| Character or creature | Front and side, ideally a T-pose or A-pose sheet | Back view, a close-up of the face, a colour palette |
| A copy of a real object | 2–3 photos from different angles | – |
| Animation | A clip or GIF of the motion, or 3–5 key-pose images | The timing in seconds, and whether it loops |
| "In the style of X" | 2–3 screenshots of X | – |

If no reference is given, offer 2–3 short directions and let the user pick. Don't silently invent the design.

**Measure, don't eyeball.**

1. Put the reference next to a render from the same camera, using `sk.frame` with the same direction.
2. Convert proportions to studs. Choose an overall height in studs, then measure every part as a fraction of it: head/body ratio, limb length, widths.
3. Write a part table before any code. It lists each part with its shape, size in studs, colour key and joint (if rigged).
4. Sample colours from the reference into the palette. Then push the saturation slightly, because flat shading and the stud texture wash colour out.
5. After each build pass, render, set it side by side with the reference, list the differences and fix them. Stop when the silhouette, proportions and colour blocks match.

## 3. Shape vocabulary

All geometry is low-poly and flat-shaded. Studs come from the texture (1 per unit), so whole-unit sizes look neatest.

| Shape | Call | Use for |
|-------|------|---------|
| Box | `m.box(part, colour, loc, size, rot)` | Bodies, limbs, plates, signs, steps, pixel features |
| Prism / frustum | `m.prism(part, colour, loc, r, h, sides, rot, radius_top=)` | Trunks, stems, cans, wheels, socles, cones |
| Stepped sphere | `body = m.tiers(part, colour, loc, [(r, h), ...], sides)` | Heads, fruit, planets, domes, bellies |
| Stuck-on feature | `body.stick(...)` | Eyes, buttons, spots and ribs on a round body |
| Carved or glowing feature | `body.carved(...)`, `body.stepped(...)` | Jack-o'-lantern faces, windows, runes |
| Base | `sk.add_base(m, socle, dalles, seed)` | The pack's display base, with its top at z = 1.2 |

**Rules of the style:**

- **Studs:** never model studs or cut holes. Features stick out 0.1–0.4 units from the surface.
- **Colours:** use 2–3 shades per material family (body, shadow or rib, accent), and 6–11 colours per model.
- **Sphere profiles:** a pleasing stepped-sphere profile is 5–7 tiers. Use small radii at the top and bottom and the largest radius just below the middle.
- **Sides:** use 8 sides for small round parts, 12–16 for bodies and 24 for socles.
- **Facing:** characters face −Y. `tiers()` twists its prisms by default so a flat face points at −Y.
- **Silhouette first:** if the model isn't readable at 128px it's wrong, whatever the detail.

## 4. Palette and naming

- **Colours:** `<Theme>_<Shade>`, for example `Kid_Orange` or `Fall_VertFonce`. Shade words come from the pack: Clair, Moyen, Fonce, Profond, Vif. Plain colour names are fine too.
- **Glow:** add `_Neon` to the key, for example `Kid_Jaune_Neon`. In Blender it emits at strength 0.8. In Roblox, set those MeshParts to Neon or add a PointLight.
- **Objects:** `<Model>_<Part>_<Colour>`. For rigged models, name parts so each one maps to exactly one bone: `BrasL`, `BrasR`, `JambeL`, `Tete`.

## 5. Characters and creatures (static build)

Proportions in studs for a chunky pack-style kid (from `pumpkin_kid.py`):

| Part | Size (w × d × h) | Joint (pivot) |
|------|------------------|---------------|
| Legs | 1.6 × 1.6 × 3.0, with shoes 1.8 × 2.4 × 0.8 | Hip, z = 3.8, x = ±0.9 |
| Torso | 3.6 × 2.2 × 3.2 | Hip, z = 3.8 |
| Arms | 1.3 × 1.5 × 2.6, plus hand 0.9 | Shoulder, z = 6.6, x = ±2.45 |
| Head | Stepped sphere about 4.8 wide and 3.2 tall | Neck, z = 7.2 |

**Rules for parts that will move:**

- **One rigid part per bone.** A part's meshes may have several colours, but all of them belong to the same bone.
- **Put the pivot where the parts meet.** The top of a limb sits exactly at its joint, so rotating it never opens a gap. Let parts overlap slightly at joints, for example a cuff or a scarf ring that hides the seam.
- **Leave clearance.** Keep about 0.1–0.2 units between neighbouring parts that swing past each other: legs, and arms against the torso.
- **Creatures:** the same idea with more bones. A quadruped needs Body, Head, Tail and four legs. A fish needs Body, Tail and fins. Add a bone only for something that moves on its own.

## 6. Rigging (only when it moves)

`sk.rigid_rig(root, {bone: (parent, head_xyz, [meshes])})`

- **Bones** point +Z from their joint. Every mesh is skinned 100% to its single bone. Brick parts never bend.
- **Standard humanoid tree:** `Root` (feet, origin) → `Torso` (hip) → `Head` (neck) → `Stem` (hat, antenna or ears). `ArmL` and `ArmR` hang off `Torso`; `LegL` and `LegR` hang off `Root`.
- **Axis cheat sheet** (character facing −Y; its right side is −X):

  | Pose channel | Moves | Sign |
  |--------------|-------|------|
  | rot X | Swing forward or back | Negative = forward |
  | rot Y | Twist around vertical | – |
  | rot Z | Raise sideways | −X arm: negative = outward. +X arm: positive = outward |
  | loc Y | Up and down | – |
  | scale Y | Squash and stretch | Pivots at the bone head |

- Before animating, check the axes with one test key and a render. A wrong sign shows up immediately.

## 7. Animation (only when asked)

**API:**

- `sk.new_action(arm, "AN_<Model>_<Name>", frames)` keys every bone at rest on both end frames, so no action inherits a pose from another.
- `sk.key_cycle(arm, bone, [(frame, value), ...], "rot" | "loc" | "scale")`
- Rotations are in degrees and the rate is 30 fps.
- For a loop, the last key must equal the first.

**Quality bar** (the user hates stiff pose-to-pose motion):

- **Overlap and follow-through.** Children reach their extreme 3–8 frames after their parent: torso → head → stem or ears or tail. Never key every bone on the same frames.
- **Arcs and asymmetry.** Add a little rot Z or rot Y to every rot X swing. Don't mirror left and right with exactly equal timing.
- **Squash and stretch on the body,** not on the limbs: scale about (1.07, 0.9, 1.07) on landing and (0.95, 1.08, 0.95) in the air.
- **Anticipation** before big moves. A wave dips the arm before raising it, and a hop squashes before it leaves the ground.
- **Settle.** One small overshoot, then rest.

**Starting templates** (adjust the amplitude to the model's size):

| Action | Frames | Loop | Keys |
|--------|--------|------|------|
| Idle | 60 | Yes | Torso loc Y +0.12 at 30, with a breath scale of 1.02. Head ±2–3° lagging by 6 frames. Arms drift ±2° out of phase. |
| Walk | 32 | Yes | Legs ±32° rot X, contacts at 0 and 16. Arms ±28°, opposite to the legs. Torso loc Y low at contacts (−0.15) and high at passing (+0.2), lean −4°, twist ±6°. Head counter-twists, lagging 4 frames. |
| Run | 20 | Yes | Legs ±50°, arms ±45° with elbows (none on rigid parts, so bigger arm angles instead). Lean −12°. Both feet off the ground at 5 and 15 (torso loc Y high). |
| Jump | 30 | No | Squash for 6 frames, stretch at take-off, tuck the legs at the apex, squash on landing, settle. |
| Attack / swing | 20–26 | No | Wind up for 6–8 frames, a fast 2–3 frame strike, hold 3, recover. Mark the hit frame. |
| Wave / emote | 48 | Yes or no | Anticipation dip, raise the arm sideways (rot Z ±150°), wave ±15° twice, settle. Head tilts toward the wave. |
| Hop (prop or mascot) | 60 | Yes | Body only: squash at 10, stretch at 16, peak at 24 (loc Y about 1), land at 32, overshoot, settle. |

**Review:** render a contact sheet of 4–6 frames per action with `sk.contact_sheet` and look at it. Check the following:

- the loop seam
- the overlap visibly lagging
- no part passing through another
- the direction of every swing

## 8. Export

| File | Function | Use |
|------|----------|-----|
| `<Model>.glb` | `sk.export_glb` | Pack-compatible, opens anywhere. Includes the rig and animation if present. |
| `<Model>.fbx` (prop) or `<Model>_Rig.fbx` | `sk.export_fbx(path, objs)` | Roblox Import 3D. |
| `animations/AN_<Model>_<Name>.fbx` | `sk.export_actions(arm, objs, dir, prefix)` | One file per action, for the Roblox Animation Editor. |

**Round-trip check** (always do it): re-import every file into an empty Blender scene. Then check:

- the mesh count and the height in units
- the UV density, which must still be 0.25 per unit
- for rigs: the bone count, that every mesh is skinned, the frame range per action, and that a bone that shouldn't move in an action stays still

## 9. Roblox import

**Prop:**

1. Use **Import 3D** with the FBX, and set **Scale Unit = Stud**. It imports as a Model of MeshParts with textures.
2. Anchor it and group it. Set `_Neon` parts to Material Neon.
3. Before any upload, look at the textures. Plain stud art is safe (see the memory about gore uploads).

**Rigged character:**

1. Use **Import 3D** with `<Model>_Rig.fbx`. Set Scale Unit = Stud and Rig Type = Custom.
2. Add a `Humanoid` with an `Animator`, plus a transparent, collidable `HumanoidRootPart` sized to the body. Set `HipHeight` so the feet touch the floor.
3. In the **Animation Editor**, select the rig and go to **Import → From FBX Animation**. Do this for each `animations/*.fbx`, then publish each one. `AssetService:CreateAssetAsync(..., Animation)` also works from the Studio MCP (memory: roblox-animation-publish).
4. Play them in code with `Animator:LoadAnimation`:
   - Walk below about 10 studs/s, and match the speed with `AdjustSpeed`.
   - Idle at Priority Idle, Walk at Movement, and Wave and attacks at Action.
5. Verify in a playtest. Watch for the same things as the contact sheet, plus feet sliding against the walk speed.

## 10. QA checklist (before calling it done)

- [ ] Matches the reference: silhouette, proportions in studs, colour blocks, measured side by side.
- [ ] Studs undistorted on every face. Density is 0.25 UV per unit after export.
- [ ] Features stand proud of the surface, and nothing pokes through or floats.
- [ ] Naming is `<Model>_<Part>_<Colour>`, and every rigged part maps to one bone.
- [ ] Props are static unless the user asked for motion.
- [ ] Rigged: no gaps at joints in extreme poses, loops are seamless, overlap is visible, there is no pose bleed between actions.
- [ ] Round-trip import passes. Files are saved next to the build script, with renders and contact sheets.

## 11. Troubleshooting

| Symptom | Cause and fix |
|---------|---------------|
| Studs stretched, tiny or huge | UVs aren't at 0.25 per unit. Build with stud_kit primitives, or re-project each face in the primitive's own frame. |
| Studs crooked on a rotated part | The UVs were projected in world space. Project in the box's local frame (stud_kit does this). |
| Glowing face bleached white | Emission is too high. Keep it around 0.8, and choose a saturated glow colour (#FFB000, not pale yellow). |
| Feature floats or sinks on a round body | It was placed at the radius, not the apothem. Use `RoundBody.stick`, which uses the local apothem for its z. |
| Limb swings the wrong way | Check the axis cheat sheet, then do one test key and a render. |
| Arm opens a gap at the shoulder | The pivot isn't at the top of the part. Move the bone head or the part, and add an overlapping cuff. |
| An action shows the previous action's pose | The bone wasn't keyed in that action. `new_action` rest-keys all bones, so make sure you used it. |
| Roblox import is about 3.6× too big | Scale Unit is set to Meter. Set it to Stud. |
