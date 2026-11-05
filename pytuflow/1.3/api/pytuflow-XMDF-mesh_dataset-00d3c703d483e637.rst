import pytuflow
import pyvista as pv
res = pytuflow.XMDF('examples/datasets/xmdf/EG15_001.xmdf')
mesh = res.mesh_dataset()
wl_mesh = res.mesh_dataset('max water level', reindex=True) # reindex removes inactive cells
pl = pv.Plotter() # init the plotter
_ = pl.add_mesh(mesh, scalars='bed level', cmap='Spectral_r', smooth_shading=True)
_ = pl.add_mesh(
        wl_mesh,
        scalars='max water level',
        cmap='Blues',
        smooth_shading=True,
        opacity=0.75,
        show_scalar_bar=False
    )
pl.set_scale(zscale=5) # exagerate the z scale
pl.enable_terrain_style() # has no effect on interaction window below, but will work in other contexts
pl.show()
