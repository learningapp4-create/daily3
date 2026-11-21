"""Sand dune for Dune Glide.

Built with sand3d (https://sand3d.sandflow.ai/api.html). The game loads
dune.glb. Re-run this file to change the sand shape:

    uv run --python 3.13 --with sand3d python terrain.py

Lengths here are millimetres. The glTF export converts them to metres.
"""

import math
import os

import sand3d as s3d

HERE = os.path.dirname(os.path.abspath(__file__))


def bowl(x):
    ax = abs(x)
    gentle = 0.085 * min(ax, 3.0) ** 2
    wall = 0.0
    if ax > 3.05:
        t = ax - 3.05
        wall = 1.2 * t + 2.2 * t * t
    return gentle + wall


def height(x, z):
    """Metres. x is left/right, z runs from the start toward camp."""
    return 1.15 + (26.0 - z) * 0.075 + bowl(x)


def section(z_m):
    xs = (
        -4.8, -4.2, -3.7, -3.35, -3.05, -2.6, -2.0, -1.3, -0.6, 0.0,
        0.6, 1.3, 2.0, 2.6, 3.05, 3.35, 3.7, 4.2, 4.8,
    )
    top = [(x * 1000.0, height(x, z_m) * 1000.0) for x in xs]
    # Close the profile along the ground so the dune is a solid.
    return top + [(xs[-1] * 1000.0, 0.0), (xs[0] * 1000.0, 0.0)]


def main():
    s3d.units("mm")
    s3d.empty_scene()
    sections = []
    for i in range(0, 27):
        z_m = float(i)
        profile = s3d.poly(section(z_m))
        sections.append(s3d.at(profile, z=z_m * 1000.0))
    dune = s3d.loft("dune", *sections)
    s3d.material(dune, "concrete", color="#e7c98a")
    out = os.path.join(HERE, "dune.glb")
    s3d.export(dune, out)
    print("wrote", out)


if __name__ == "__main__":
    main()
