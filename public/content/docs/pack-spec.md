# Stud Free Pack: measured spec

These numbers were measured on 2026-10-29 from `Stud-Free-Pack-Zones (2).glb`, which was exported by Khronos glTF Blender I/O v5.1.20. If you re-measure, the new measurements win over these notes.

## Contents

- **5 zones:** each zone is an empty with 10 models, and the zones sit 240 units apart along X.
- **Size:** 842 nodes, 787 meshes and 45 materials.
- **No rigs:** the pack has no armatures and no animations. Every model is a static prop.

| Zone | Models |
|------|--------|
| Galaxie | EtoileFilante, Fusee, Lampadaire, Lune, Meteorite, Observatoire, Ovni, Planete, Portail, Spirale |
| Zoo | ArcheZoo, Elephant, Enclos, Girafe, KiosqueTickets, Lion, PanneauZoo, Singe, Tigre, Zebre |
| Nature | BuissonFleuri, Champignons, Chene, FeuDeCamp, PontBois, Puits, RocherMoussu, Sapins, SoucheBuches, Tournesols |
| Ocean | Ancre, Baleine, CoffreTresor, CoquillagePerle, Pieuvre, PoissonClown, RecifCorail, Requin, SousMarin, Tortue |
| Food | Burger, Donut, Frites, Glace, HotDog, Pizza, Popcorn, Sauces, Soda, StandFastFood |

## Rules the pack follows

1. **Studs are a texture, not geometry.**
   - **Colour maps:** every colour has its own 512×512 `<Mat>_Color.png` with a 4×4 grid of square studs.
   - **Stud shape:** each stud fills about 59% of its 128px cell and is centred. The bevel is about 12% of the cell, with small rounded corners.
   - **Shading** (relative to the base colour):

     | Area | Brightness |
     |------|------------|
     | Stud top | ×1.15 |
     | Lit bevel | ×1.4–1.6 |
     | Shadowed bevel | ×0.6 |

     Light comes from the top-right in texture space.
   - **Shared maps:** `Stud_MetalRough.png` and `Plat_Normal.png`, both 64px. The pack's normal map is flat; stud_kit bakes a real stud normal map instead.
2. **UV density is 0.25 per unit** (median over all faces, with a very tight spread). That works out to one tile per 4 units, or **1 stud per unit** on every face, sides included.
3. **Geometry is low-poly and flat-shaded.**
   - **Boxes:** a 12-face mesh is one box, with no bevels.
   - **Round things:** n-gon prisms (the socles are 24-gons).
   - **Spheres** (planets, donuts, domes): stacks of prisms with stepped radii.
4. **One mesh per part and colour**, named `<Model>_<Part>_<Shade>`, for example `Lion_Criniere_Brun`.
   - **Shades:** Clair, Moyen, Fonce, Profond and Vif, or a theme name such as Zoo_Orange.
   - **Glowing parts:** names end in `_Neon`.
   - **Materials:** double-sided.
5. **Footprint is about 16×16 units, and height about 5–19.**
   - **Socle** (the hero object's base): a 24-gon 11.2 wide and 0.8 tall, with a 24-gon 7.95 wide and 0.4 tall on top. Its top is at z = 1.2.
   - **Dalles:** scattered plates around the socle, 0.3–1.2 thick in 2–3 shades, slightly tilted and rotated, overlapping into a rug.
6. **Features are separate blocks stuck on the surface**, standing slightly proud of the body. Eyes, manes, sprinkles and windows are never cut in.
