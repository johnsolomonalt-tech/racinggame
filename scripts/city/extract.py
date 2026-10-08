"""
Stage 1 of the NYC city pipeline.

Reads the NYC DCP 3D Model (.3dm, Rhino) for a community district, crops a
region around a real Midtown race loop, converts to game space (meters, +Y up,
ground flattened to y=0), splits it into tiles, generates world-space facade
UVs + xatlas lightmap UVs, places neon signage, and writes intermediate binary
tiles consumed by stage 2 (scripts/city/bake.mjs: lightmap baking + GLB/Draco).

Usage: python3 scripts/city/extract.py asset-src/nyc/NYC_3DModel_MN05.3dm
"""
import json
import math
import os
import random
import sys
import time

import numpy as np
import rhino3dm
import xatlas
import mapbox_earcut as earcut
from PIL import Image, ImageDraw
from pyproj import Transformer
from scipy import ndimage

FT = 0.3048
SRC = sys.argv[1] if len(sys.argv) > 1 else 'asset-src/nyc/NYC_3DModel_MN05.3dm'
OUT = 'asset-src/build'
TILE = 250.0          # tile size (m)
MARGIN = 260.0        # city kept around the race route (m)
NEAR_ROUTE = 120.0    # tiles closer than this to the route get hi-res lightmaps
random.seed(7)

# Race loop: W 42nd St & 8th Ave -> 42nd & 6th Ave -> 57th & 6th Ave -> 57th & 8th Ave
# (east along 42nd through Times Square, north up 6th Ave, west on 57th, south on 8th)
ROUTE_LL = [
    (40.75724, -73.98993),
    (40.75487, -73.98429),
    (40.76461, -73.97707),
    (40.76698, -73.98263),
]

t0 = time.time()
def log(*a):
    print(f'[{time.time() - t0:6.1f}s]', *a, flush=True)

os.makedirs(f'{OUT}/tiles', exist_ok=True)
tr = Transformer.from_crs('EPSG:4326', 'EPSG:2263', always_xy=True)
route_ft = np.array([tr.transform(lon, lat) for lat, lon in ROUTE_LL])
OX, OY = route_ft.mean(axis=0)

def to_local_xy(X, Y):
    return (X - OX) * FT, -(Y - OY) * FT

route_local = np.array([to_local_xy(x, y) for x, y in route_ft])
rmin = route_local.min(axis=0) - MARGIN
rmax = route_local.max(axis=0) + MARGIN
# snap region to tile grid
rmin = np.floor(rmin / TILE) * TILE
rmax = np.ceil(rmax / TILE) * TILE
log('region', rmin, rmax, 'tiles', (rmax - rmin) / TILE)

log('reading', SRC)
model = rhino3dm.File3dm.Read(SRC)
layers = {i: model.Layers[i].FullPath for i in range(len(model.Layers))}

def in_region(lx, lz, pad=0.0):
    return rmin[0] - pad <= lx <= rmax[0] + pad and rmin[1] - pad <= lz <= rmax[1] + pad

def polyline_pts(g):
    return [(g.Point(i).X, g.Point(i).Y, g.Point(i).Z) for i in range(g.PointCount)]

footprints = []   # list of np arrays (n,3) in feet
sidewalks = []
facades = []      # (verts ft (n,3), tris (m,3))
roofs = []

def brep_mesh(g):
    vs, ts = [], []
    for fi in range(len(g.Faces)):
        m = g.Faces[fi].GetMesh(rhino3dm.MeshType.Any)
        if m is None:
            continue
        base = len(vs)
        for vi in range(len(m.Vertices)):
            p = m.Vertices[vi]
            vs.append((p.X, p.Y, p.Z))
        for f in range(len(m.Faces)):
            a, b, c, d = m.Faces[f]
            ts.append((base + a, base + b, base + c))
            if c != d:
                ts.append((base + a, base + c, base + d))
    if not ts:
        return None
    return np.array(vs, dtype=np.float64), np.array(ts, dtype=np.int64)

for o in model.Objects:
    g = o.Geometry
    layer = layers.get(o.Attributes.LayerIndex, '')
    if layer not in ('Buildings::Building_FootPrint', 'Linework::Sidewalk',
                     'Buildings::Facade Surface', 'Buildings::RoofTop Surface'):
        continue
    bb = g.GetBoundingBox()
    cx, cz = to_local_xy((bb.Min.X + bb.Max.X) / 2, (bb.Min.Y + bb.Max.Y) / 2)
    if not in_region(cx, cz, 60):
        continue
    if layer == 'Buildings::Building_FootPrint':
        footprints.append(np.array(polyline_pts(g)))
    elif layer == 'Linework::Sidewalk':
        sidewalks.append((np.array(polyline_pts(g)), g.IsClosed))
    else:
        mm = brep_mesh(g)
        if mm is None:
            continue
        (facades if layer == 'Buildings::Facade Surface' else roofs).append(mm)
del model
log(f'footprints={len(footprints)} sidewalks={len(sidewalks)} facades={len(facades)} roofs={len(roofs)}')

# ---------------------------------------------------------------- ground field
GC = 20.0
gw = int((rmax[0] - rmin[0] + 160) / GC) + 1
gh = int((rmax[1] - rmin[1] + 160) / GC) + 1
gsum = np.zeros((gh, gw)); gcnt = np.zeros((gh, gw))
g0 = rmin - 80
for fp in footprints:
    for X, Y, Z in fp:
        lx, lz = to_local_xy(X, Y)
        i, j = int((lz - g0[1]) / GC), int((lx - g0[0]) / GC)
        if 0 <= i < gh and 0 <= j < gw:
            gsum[i, j] += Z; gcnt[i, j] += 1
mask = gcnt > 0
gfield = np.where(mask, gsum / np.maximum(gcnt, 1), 0)
_, (ii, jj) = ndimage.distance_transform_edt(~mask, return_indices=True)
gfield = gfield[ii, jj]
gfield = ndimage.gaussian_filter(gfield, 1.5)

def ground_ft(lx, lz):
    """Ground elevation (feet) at local coords (vectorised)."""
    j = (np.asarray(lx) - g0[0]) / GC
    i = (np.asarray(lz) - g0[1]) / GC
    return ndimage.map_coordinates(gfield, [np.atleast_1d(i), np.atleast_1d(j)], order=1, mode='nearest')

def to_local3(v):
    """(n,3) feet -> (n,3) local meters with flattened ground."""
    lx = (v[:, 0] - OX) * FT
    lz = -(v[:, 1] - OY) * FT
    ly = (v[:, 2] - ground_ft(lx, lz)) * FT
    return np.stack([lx, ly, lz], axis=1)

# ---------------------------------------------------------------- rasters
RES = 0.5
W = int((rmax[0] - rmin[0] + 160) / RES)
H = int((rmax[1] - rmin[1] + 160) / RES)
r0 = rmin - 80
def to_px(lx, lz):
    return (lx - r0[0]) / RES, (lz - r0[1]) / RES

occ = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(occ)
fp_local = []
for fp in footprints:
    l = to_local3(fp)
    fp_local.append(l)
    if len(l) >= 3:
        d.polygon([to_px(x, z) for x, _, z in l], fill=255)
occ = np.array(occ) > 0

# roof height map (max), used to orient facades outward
roof_items = []
for v, t in roofs:
    l = to_local3(v)
    roof_items.append((l[:, 1].mean(), l))
roof_items.sort(key=lambda r: r[0])
himg = Image.new('F', (W, H), 0.0)
hd = ImageDraw.Draw(himg)
for h, l in roof_items:
    # roof meshes are triangulated: draw each triangle
    pass
for (v, t), (h, l) in zip(roofs, [(None, None)] * len(roofs)):
    pass
roof_local = [(to_local3(v), t) for v, t in roofs]
order = sorted(range(len(roof_local)), key=lambda k: roof_local[k][0][:, 1].mean())
for k in order:
    l, t = roof_local[k]
    hval = float(l[:, 1].mean())
    for tri in t:
        pts = [to_px(l[q, 0], l[q, 2]) for q in tri]
        hd.polygon(pts, fill=hval)
hmap = np.array(himg)
log('rasters done', W, H)

def hsample(lx, lz):
    px, pz = to_px(lx, lz)
    i, j = int(pz), int(px)
    if 0 <= i < H and 0 <= j < W:
        return hmap[i, j]
    return 0.0

def occ_sample(lx, lz):
    px, pz = to_px(lx, lz)
    i, j = int(pz), int(px)
    return 0 <= i < H and 0 <= j < W and occ[i, j]

# ---------------------------------------------------------------- route snapping
dist = ndimage.distance_transform_edt(~occ) * RES
snapped = []
for lx, lz in route_local:
    px, pz = to_px(lx, lz)
    rad = int(28 / RES)
    i0, j0 = int(pz), int(px)
    win = dist[i0 - rad:i0 + rad, j0 - rad:j0 + rad]
    yy, xx = np.mgrid[-rad:rad, -rad:rad]
    score = win - 0.02 * np.hypot(yy, xx) * RES   # prefer close peaks
    k = np.unravel_index(np.argmax(score), score.shape)
    sx = r0[0] + (j0 - rad + k[1] + 0.5) * RES
    sz = r0[1] + (i0 - rad + k[0] + 0.5) * RES
    snapped.append((sx, sz))
    log(f'route corner ({lx:.1f},{lz:.1f}) -> ({sx:.1f},{sz:.1f}) clearance {win[k]:.1f}m')
snapped = np.array(snapped)

# checkpoints: corners + subdivisions every <= 180 m
cps = []
n = len(snapped)
for i in range(n):
    a, b = snapped[i], snapped[(i + 1) % n]
    seg = np.linalg.norm(b - a)
    k = max(1, int(math.ceil(seg / 180)))
    for s in range(k):
        cps.append(a + (b - a) * s / k)
cps = np.array(cps)
# start/finish 70 m along first edge; spawn 25 m behind the line
e0 = (snapped[1] - snapped[0]) / np.linalg.norm(snapped[1] - snapped[0])
start_line = snapped[0] + e0 * 70
spawn = snapped[0] + e0 * 45
cps[0] = start_line
yaw = math.atan2(-e0[0], -e0[1])
track = {
    'checkpoints': [[round(float(x), 2), round(float(z), 2)] for x, z in cps],
    'gateRadius': 16,
    'start': {'x': round(float(spawn[0]), 2), 'y': 1.2, 'z': round(float(spawn[1]), 2), 'yaw': yaw},
    'route': [[round(float(x), 2), round(float(z), 2)] for x, z in snapped],
}
route_len = sum(np.linalg.norm(snapped[(i + 1) % n] - snapped[i]) for i in range(n))
log(f'route length {route_len:.0f} m, {len(cps)} checkpoints')

def dist_to_route(p):
    best = 1e9
    for i in range(n):
        a, b = snapped[i], snapped[(i + 1) % n]
        ab = b - a
        t = np.clip(np.dot(p - a, ab) / np.dot(ab, ab), 0, 1)
        best = min(best, np.linalg.norm(p - (a + ab * t)))
    return best

# ---------------------------------------------------------------- tiles
ntx = int(round((rmax[0] - rmin[0]) / TILE))
ntz = int(round((rmax[1] - rmin[1]) / TILE))
def tile_of(lx, lz):
    return (min(ntx - 1, max(0, int((lx - rmin[0]) // TILE))),
            min(ntz - 1, max(0, int((lz - rmin[1]) // TILE))))

tiles = {}
def T(key):
    if key not in tiles:
        tiles[key] = {'pos': [], 'nrm': [], 'uv0': [], 'tris': {'facade': [], 'roof': [], 'ground': []},
                      'lod1': [], 'group': [], 'nv': 0, 'detail_pos': [], 'detail_col': [], 'detail_tri': [],
                      'neon_pos': [], 'neon_col': [], 'neon_tri': [], 'tall': []}
    return tiles[key]

NEON = [(1.0, 0.1, 0.6), (0.1, 0.9, 1.0), (1.0, 0.35, 0.05), (0.6, 0.2, 1.0), (0.2, 1.0, 0.4), (1.0, 0.9, 0.2)]
emitters = []
times_sq = np.array(to_local_xy(*tr.transform(-73.9855, 40.7580)))

def add_quad(tile, kind, corners, color):
    base = len(tile[kind + '_pos'])
    tile[kind + '_pos'].extend(corners)
    tile[kind + '_col'].extend([color] * 4)
    tile[kind + '_tri'].extend([(base, base + 1, base + 2), (base, base + 2, base + 3)])

group_id = 0
flipped = 0
for kind, items in (('facade', facades), ('roof', roofs)):
    for v, t in items:
        l = to_local3(v)
        c = l.mean(axis=0)
        if not in_region(c[0], c[2]):
            continue
        tile = T(tile_of(c[0], c[2]))
        # Newell normal of the (planar) surface
        tri = l[t]
        cr = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
        nrm = cr.sum(axis=0)
        ln = np.linalg.norm(nrm)
        if ln < 1e-6:
            continue
        nrm /= ln
        if kind == 'roof':
            if nrm[1] < 0:
                nrm = -nrm; t = t[:, ::-1]
        else:
            nrm[1] = 0
            nh = np.linalg.norm(nrm)
            if nh < 1e-3:
                continue
            nrm /= nh
            ymid = (l[:, 1].min() + l[:, 1].max()) / 2
            fwd = hsample(c[0] + nrm[0] * 1.2, c[2] + nrm[2] * 1.2)
            back = hsample(c[0] - nrm[0] * 1.2, c[2] - nrm[2] * 1.2)
            if fwd >= ymid > back:
                nrm = -nrm; flipped += 1
            # make winding agree with the chosen normal
            if np.dot(cr.sum(axis=0), nrm) < 0:
                t = t[:, ::-1]
        top = l[:, 1].max()
        base = tile['nv']
        tile['pos'].append(l)
        tile['nrm'].append(np.repeat(nrm[None], len(l), 0))
        if kind == 'facade':
            tang = np.array([-nrm[2], 0, nrm[0]])
            u = (l @ tang) / 12.8
            vv = l[:, 1] / 14.4
        else:
            u = l[:, 0] / 20.0
            vv = l[:, 2] / 20.0
        tile['uv0'].append(np.stack([u, vv], 1))
        tile['tris'][kind].append(t + base)
        tile['group'].extend([group_id] * len(t))
        tile['tall'].extend([top > 30.0] * len(t))
        tile['nv'] += len(l)
        group_id += 1

        # ---- neon signage on street-level facades near the route
        if kind == 'facade' and l[:, 1].min() < 1.5 and top > 8:
            tang = np.array([-nrm[2], 0, nrm[0]])
            s = l @ tang
            width = s.max() - s.min()
            dr = dist_to_route(np.array([c[0], c[2]]))
            near_ts = np.linalg.norm(np.array([c[0], c[2]]) - times_sq) < 140
            if width > 6 and dr < 45 and random.random() < (0.9 if near_ts else 0.45):
                col = random.choice(NEON)
                smid = (s.max() + s.min()) / 2
                if near_ts and top > 25 and random.random() < 0.7:
                    # Times Square style billboard
                    w = min(width * 0.8, 18); h0 = random.uniform(8, 14); h1 = h0 + random.uniform(6, 12)
                else:
                    w = min(width * 0.7, random.uniform(3, 9)); h0 = random.uniform(3.5, 6); h1 = h0 + random.uniform(0.8, 2.2)
                pc = l[np.argmin(np.abs(s - smid))]
                o = c - tang * (c @ tang - smid) + nrm * 0.35
                o[1] = 0
                corners = [o - tang * w / 2 + [0, h0, 0], o + tang * w / 2 + [0, h0, 0],
                           o + tang * w / 2 + [0, h1, 0], o - tang * w / 2 + [0, h1, 0]]
                # winding so the quad faces outward
                if np.dot(np.cross(corners[1] - corners[0], corners[2] - corners[0]), nrm) < 0:
                    corners = corners[::-1]
                intensity = random.uniform(3.0, 6.0)
                cc = tuple(x * intensity for x in col)
                add_quad(tile, 'neon', [list(map(float, p)) for p in corners], cc)
                emitters.append({'c': [float(x) for x in corners[0]] + [float(x) for x in corners[1]] +
                                 [float(x) for x in corners[2]] + [float(x) for x in corners[3]], 'e': cc})
log(f'facade normals flipped: {flipped}, neon signs: {len(emitters)}')

# ---------------------------------------------------------------- ground + sidewalks + markings
for tz in range(ntz):
    for tx in range(ntx):
        tile = T((tx, tz))
        x0, z0 = rmin[0] + tx * TILE, rmin[1] + tz * TILE
        x1, z1 = x0 + TILE, z0 + TILE
        q = np.array([[x0, 0, z0], [x0, 0, z1], [x1, 0, z1], [x1, 0, z0]], dtype=np.float64)
        base = tile['nv']
        tile['pos'].append(q)
        tile['nrm'].append(np.repeat(np.array([[0, 1, 0]]), 4, 0))
        tile['uv0'].append(q[:, [0, 2]] / 8.0)
        tile['tris']['ground'].append(np.array([[base, base + 1, base + 2], [base, base + 2, base + 3]]))
        tile['group'].extend([-1, -1])
        tile['tall'].extend([True, True])
        tile['nv'] += 4

SIDEWALK = (0.42, 0.41, 0.40)
sw_count = 0
for pts, closed in sidewalks:
    if not closed or len(pts) < 4:
        continue
    l = to_local3(pts)[:-1]
    c = l.mean(axis=0)
    if not in_region(c[0], c[2]):
        continue
    xy = l[:, [0, 2]].astype(np.float64)
    try:
        idx = earcut.triangulate_float64(xy, np.array([len(xy)], dtype=np.uint32)).reshape(-1, 3)
    except Exception:
        continue
    if len(idx) == 0:
        continue
    # assign whole sidewalk polygon to the tile of each triangle centroid
    for a, b, cc in idx:
        tri = xy[[a, b, cc]]
        cen = tri.mean(axis=0)
        tile = T(tile_of(cen[0], cen[1]))
        base = len(tile['detail_pos'])
        for p in tri:
            tile['detail_pos'].append([float(p[0]), 0.06, float(p[1])])
            tile['detail_col'].append(SIDEWALK)
        # earcut winding -> ensure upward facing
        if np.cross(np.append(tri[1] - tri[0], 0), np.append(tri[2] - tri[0], 0))[2] > 0:
            tile['detail_tri'].append((base, base + 2, base + 1))
        else:
            tile['detail_tri'].append((base, base + 1, base + 2))
    sw_count += 1
log(f'sidewalk polygons: {sw_count}')

# dashed lane markings + start/finish checker along the route
def add_flat_quad(p0, p1, width, color, y=0.03):
    dvec = p1 - p0
    L = np.linalg.norm(dvec)
    if L < 1e-3:
        return
    dvec /= L
    nvec = np.array([-dvec[1], dvec[0]])
    corners2 = [p0 + nvec * width / 2, p1 + nvec * width / 2, p1 - nvec * width / 2, p0 - nvec * width / 2]
    cen = (p0 + p1) / 2
    tile = T(tile_of(cen[0], cen[1]))
    base = len(tile['detail_pos'])
    for cc in corners2:
        tile['detail_pos'].append([float(cc[0]), y, float(cc[1])])
        tile['detail_col'].append(color)
    a = np.append(corners2[1] - corners2[0], 0); b = np.append(corners2[2] - corners2[0], 0)
    if np.cross(a, b)[2] > 0:
        tile['detail_tri'].extend([(base, base + 2, base + 1), (base, base + 3, base + 2)])
    else:
        tile['detail_tri'].extend([(base, base + 1, base + 2), (base, base + 2, base + 3)])

for i in range(n):
    a, b = snapped[i], snapped[(i + 1) % n]
    dvec = (b - a) / np.linalg.norm(b - a)
    L = np.linalg.norm(b - a)
    nvec = np.array([-dvec[1], dvec[0]])
    s = 16.0
    while s < L - 16:
        p0 = a + dvec * s
        for off in (-3.4, 3.4):
            add_flat_quad(p0 + nvec * off, p0 + nvec * off + dvec * 3.0, 0.15, (0.85, 0.85, 0.8))
        add_flat_quad(p0 + nvec * 0.15, p0 + nvec * 0.15 + dvec * 3.0, 0.12, (0.9, 0.7, 0.1))
        add_flat_quad(p0 - nvec * 0.15, p0 - nvec * 0.15 + dvec * 3.0, 0.12, (0.9, 0.7, 0.1))
        s += 9.0
# checkered start line
nvec = np.array([-e0[1], e0[0]])
for k in range(-8, 8):
    for row in range(2):
        col = (0.9, 0.9, 0.9) if (k + row) % 2 == 0 else (0.05, 0.05, 0.05)
        p0 = start_line + nvec * (k + 0.5) * 1.0 + e0 * (row * 1.0 - 1.0)
        add_flat_quad(p0, p0 + e0 * 1.0, 1.0, col, y=0.04)

# ---------------------------------------------------------------- xatlas + write
manifest = {'tileSize': TILE, 'origin': {'lat_lon': ROUTE_LL[0], 'statePlaneFt': [OX, OY]},
            'bounds': [float(rmin[0]), float(rmin[1]), float(rmax[0]), float(rmax[1])], 'tiles': []}
total_tris = 0
for (tx, tz), tile in sorted(tiles.items()):
    if tile['nv'] == 0:
        continue
    pos = np.concatenate(tile['pos']).astype(np.float32)
    nrm = np.concatenate(tile['nrm']).astype(np.float32)
    uv0 = np.concatenate(tile['uv0']).astype(np.float32)
    groups = {k: (np.concatenate(v).astype(np.uint32) if v else np.zeros((0, 3), np.uint32))
              for k, v in tile['tris'].items()}
    order_keys = ['facade', 'roof', 'ground']
    allt = np.concatenate([groups[k] for k in order_keys])
    counts = [len(groups[k]) for k in order_keys]
    cen = np.array([rmin[0] + (tx + 0.5) * TILE, rmin[1] + (tz + 0.5) * TILE])
    near = dist_to_route(cen) < NEAR_ROUTE + TILE * 0.7
    res = 1024 if near else 512

    atlas = xatlas.Atlas()
    atlas.add_mesh(pos, allt, nrm)
    co = xatlas.ChartOptions()
    co.max_iterations = 1
    po = xatlas.PackOptions()
    po.resolution = res
    po.padding = 2
    po.bilinear = True
    po.blockAlign = True
    atlas.generate(co, po)
    vmap, nidx, uvs = atlas[0]
    aw, ah = atlas.width, atlas.height

    pos2, nrm2, uv02 = pos[vmap], nrm[vmap], uv0[vmap]
    uv1 = uvs.astype(np.float32)
    off = 0
    split = {}
    for k, cnum in zip(order_keys, counts):
        split[k] = nidx[off:off + cnum]
        off += cnum
    tall = np.array(tile['tall'], dtype=bool)
    nb = counts[0] + counts[1]
    lod1 = nidx[:nb][tall[:nb]]
    group = np.array(tile['group'], dtype=np.int32)

    # detail (sidewalks, markings) inherits ground lightmap via the ground chart's affine map
    dpos = np.array(tile['detail_pos'], dtype=np.float32).reshape(-1, 3)
    dcol = np.array(tile['detail_col'], dtype=np.float32).reshape(-1, 3)
    dtri = np.array(tile['detail_tri'], dtype=np.uint32).reshape(-1, 3)
    gt = split['ground'][0]
    P = pos2[gt][:, [0, 2]].astype(np.float64)
    U = uv1[gt].astype(np.float64)
    A = np.c_[P, np.ones(3)]
    M = np.linalg.solve(A, U)          # 3x2 affine (x,z,1) -> uv
    duv1 = (np.c_[dpos[:, [0, 2]], np.ones(len(dpos))] @ M).astype(np.float32) if len(dpos) else np.zeros((0, 2), np.float32)
    npos = np.array(tile['neon_pos'], dtype=np.float32).reshape(-1, 3)
    ncol = np.array(tile['neon_col'], dtype=np.float32).reshape(-1, 3)
    ntri = np.array(tile['neon_tri'], dtype=np.uint32).reshape(-1, 3)

    tid = f't{tx}_{tz}'
    arrays = [('pos', pos2), ('nrm', nrm2), ('uv0', uv02), ('uv1', uv1), ('vmap', vmap.astype(np.uint32)),
              ('facade', split['facade']), ('roof', split['roof']), ('ground', split['ground']), ('lod1', lod1),
              ('group', group), ('dpos', dpos), ('dcol', dcol), ('duv1', duv1), ('dtri', dtri),
              ('npos', npos), ('ncol', ncol), ('ntri', ntri)]
    header = {'id': tid, 'tx': tx, 'tz': tz, 'atlas': [aw, ah], 'res': res, 'arrays': {}}
    offset = 0
    with open(f'{OUT}/tiles/{tid}.bin', 'wb') as f:
        for name, arr in arrays:
            arr = np.ascontiguousarray(arr)
            b = arr.tobytes()
            header['arrays'][name] = {'offset': offset, 'length': int(arr.size), 'dtype': str(arr.dtype)}
            f.write(b)
            offset += len(b)
    with open(f'{OUT}/tiles/{tid}.json', 'w') as f:
        json.dump(header, f)
    ntris = len(nidx) + len(dtri) + len(ntri)
    total_tris += ntris
    manifest['tiles'].append({'id': tid, 'center': [float(cen[0]), float(cen[1])], 'tris': int(ntris), 'res': res})
    log(f'{tid}: verts={len(pos2)} tris={ntris} atlas={aw}x{ah} lod1={len(lod1)}')

# collision footprints (local XZ polygons)
coll = []
for l in fp_local:
    c = l.mean(axis=0)
    if in_region(c[0], c[2], 20) and len(l) >= 3:
        coll.append([[round(float(p[0]), 2), round(float(p[2]), 2)] for p in l])
with open(f'{OUT}/footprints.json', 'w') as f:
    json.dump(coll, f)
with open(f'{OUT}/emitters.json', 'w') as f:
    json.dump(emitters, f)
with open(f'{OUT}/track.json', 'w') as f:
    json.dump(track, f, indent=1)
with open(f'{OUT}/manifest.json', 'w') as f:
    json.dump(manifest, f, indent=1)
log(f'done: {len(manifest["tiles"])} tiles, {total_tris} tris, {len(coll)} collision footprints')
