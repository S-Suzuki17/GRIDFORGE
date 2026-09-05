"""Blender 4.5 LTS: blender -b --factory-startup --python art/blender/build_assets.py.
Creates original rigged otter meshes, four animation clips, GLBs and portraits.
"""
import bpy, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/models'; OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.samples=16; scene.cycles.use_denoising=True
scene.render.resolution_x=320; scene.render.resolution_y=320; scene.render.resolution_percentage=100
scene.render.film_transparent=True; scene.render.image_settings.file_format='PNG'; scene.render.fps=24
scene.world.color=(.35,.35,.35)
def material(name,color,metal=0,rough=.5):
 m=bpy.data.materials.new(name); rgb=[int(color[i:i+2],16)/255 for i in (0,2,4)]
 rgb=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb]
 m.diffuse_color=(*rgb,1);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF')
 n.inputs['Base Color'].default_value=(*rgb,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
 return m
fur=material('Chestnut fur','966646');cream=material('Cream bib and muzzle','F4D9A6');dark=material('Espresso eyes','271C25',rough=.25)
white=material('Catchlights','FFFFFF');gold=material('Brass','EAB665',.55,.32);steel=material('Pearl armour','D6E4E4',.45,.3)
sole=material('Leather','344650');pink=material('Inner ears','D79A7C')
accents={k:material(k+' enamel',v,.15,.4) for k,v in {'knight':'368D9B','mage':'8970B5','ninja':'425776','heavy':'D18B43','mecha':'559B88','commander_player':'3D84AE','commander_enemy':'B95671'}.items()}
parts=[]
def finish(obj,name,mat,bone='Body'):
 obj.name=name;obj.data.materials.append(mat)
 if bone: obj.vertex_groups.new(name=bone).add(list(range(len(obj.data.vertices))),1,'REPLACE')
 parts.append(obj);return obj
def orb(name,loc,scale,mat,bone='Body'):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,location=loc);o=bpy.context.object;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for p in o.data.polygons:p.use_smooth=True
 return finish(o,name,mat,bone)
def box(name,loc,scale,mat,bone='Body',bevel=.04):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  m=o.modifiers.new('Rounded edges','BEVEL');m.width=bevel;m.segments=2;bpy.ops.object.modifier_apply(modifier=m.name)
 return finish(o,name,mat,bone)
def cone(name,loc,r1,r2,depth,mat,bone='Body'):
 bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=r1,radius2=r2,depth=depth,location=loc)
 return finish(bpy.context.object,name,mat,bone)
def rod(name,a,b,r,mat,bone='Body'):
 o=cone(name,(Vector(a)+Vector(b))/2,r,r,(Vector(b)-Vector(a)).length,mat,bone)
 o.rotation_euler=(Vector(b)-Vector(a)).to_track_quat('Z','Y').to_euler();return o
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2.3,-4.7,2.5));camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=2.3;aim(camera,(0,0,.85));scene.camera=camera
for name,loc,power,size in [('Key',(3,-4,6),500,4),('Fill',(-4,-2,3),300,4),('Rim',(1,3,4),650,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,.7))
def rig_export(kind):
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();mesh=bpy.context.object;mesh.name=kind+'_mesh'
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 bpy.ops.object.armature_add();rig=bpy.context.object;rig.name=kind+'_rig';bpy.ops.object.mode_set(mode='EDIT');rig.data.edit_bones.remove(rig.data.edit_bones[0])
 for name,loc in {'Body':(0,0,.3),'Head':(0,0,1.08),'Arm.L':(-.36,0,.79),'Arm.R':(.36,0,.79),'Foot.L':(-.18,0,.25),'Foot.R':(.18,0,.25)}.items():
  b=rig.data.edit_bones.new(name);b.head=loc;b.tail=Vector(loc)+Vector((0,0,.18))
  if name!='Body':b.parent=rig.data.edit_bones['Body']
 bpy.ops.object.mode_set(mode='OBJECT');mesh.parent=rig;mesh.modifiers.new('Otter rig','ARMATURE').object=rig
 for name,length in [('Idle',48),('Walk',24),('Attack',16),('Hit',12)]:
  for frame in range(1,length+1):
   t=(frame-1)/(length-1);wave=math.sin(t*math.tau)
   for b in rig.pose.bones:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.location=(0,0,0)
   body=rig.pose.bones['Body'];head=rig.pose.bones['Head'];body.location.z=.015*(1-math.cos(t*math.tau));head.rotation_euler.y=.025*wave
   if name=='Walk':
    for b,sign in [('Arm.L',1),('Foot.R',1),('Arm.R',-1),('Foot.L',-1)]:rig.pose.bones[b].rotation_euler.x=.38*wave*sign
   if name=='Attack':
    swing=math.sin(t*math.pi);rig.pose.bones['Arm.R'].rotation_euler.x=-1.2*swing;body.rotation_euler.x=.2*swing;body.location.y=-.1*swing
   if name=='Hit':body.rotation_euler.y=.17*wave*(1-t);head.rotation_euler.x=-.15*math.sin(t*math.pi)
   for b in rig.pose.bones:b.keyframe_insert('rotation_euler',frame=frame,group=b.name);b.keyframe_insert('location',frame=frame,group=b.name)
  action=rig.animation_data.action;action.name=kind+'_'+name;track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action);rig.animation_data.action=None
 scene.frame_set(1);bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(kind+'.glb')),export_format='GLB',use_selection=True,export_animation_mode='NLA_TRACKS',export_frame_range=False,export_skins=True)
 scene.render.filepath=str(OUT/(kind+'.png'));bpy.ops.render.render(write_still=True);rig.hide_render=True;mesh.hide_render=True
 return rig,mesh
cast=[]
for kind,accent in accents.items():
 parts=[];heavy=kind in ('heavy','mecha');w=1.15 if heavy else 1
 orb('Round torso',(0,0,.65),(.32*w,.24,.4),fur);orb('Cream chest',(0,-.205,.68),(.22,.055,.26),cream);orb('Otter tail',(0,.32,.3),(.14,.38,.13),fur)
 for sign,side in [(-1,'L'),(1,'R')]:
  orb('Boot '+side,(sign*.19,-.085,.14),(.14,.23,.13),sole,'Foot.'+side)
  orb('Arm '+side,(sign*.36,0,.68),(.125,.13,.25),fur,'Arm.'+side);orb('Paw '+side,(sign*.38,-.04,.48),(.125,.14,.115),fur,'Arm.'+side)
  orb('Ear '+side,(sign*.32,0,1.4),(.13,.075,.135),fur,'Head');orb('Inner ear '+side,(sign*.32,-.064,1.41),(.071,.024,.078),pink,'Head')
 orb('Wide head',(0,-.015,1.2),(.385,.295,.325),fur,'Head')
 for sign in [-1,1]:
  orb('Cheek',(sign*.10,-.266,1.1),(.17,.076,.105),cream,'Head');orb('Eye',(sign*.145,-.278,1.28),(.05,.031,.063),dark,'Head');orb('Glint',(sign*.145-.014,-.306,1.303),(.016,.009,.019),white,'Head')
  for d in [-.04,.025]:orb('Whisker freckle',(sign*(.17+d),-.335,1.105+d/2),(.009,.006,.009),dark,'Head')
 orb('Nose',(0,-.345,1.16),(.068,.043,.048),dark,'Head');rod('Smile',(0,-.339,1.115),(0,-.341,1.075),.009,dark,'Head')
 box('Belt',(0,0,.47),(.62*w,.47,.075),sole);box('Buckle',(0,-.254,.47),(.09,.035,.09),gold)
 if kind in ('knight','heavy','mecha'):
  orb('Enamel breastplate',(0,-.195,.77),(.26*w,.12,.21),accent);box('Insignia',(0,-.313,.8),(.07,.025,.13),gold)
  for sign,side in [(-1,'L'),(1,'R')]:orb('Shoulder armour',(sign*.36,0,.84),(.19 if heavy else .145,.18,.16),steel,'Arm.'+side)
 if kind=='knight':
  box('Shield',(-.49,-.14,.65),(.28,.15,.48),accent,'Arm.L',.09);box('Shield stripe',(-.49,-.222,.65),(.045,.02,.35),gold,'Arm.L',.01)
  box('Sword',(.48,-.04,.96),(.075,.05,.64),steel,'Arm.R',.01);box('Guard',(.48,-.04,.67),(.23,.09,.05),gold,'Arm.R')
  box('Head band',(0,.015,1.49),(.51,.3,.09),steel,'Head');orb('Teal crest',(0,.065,1.61),(.055,.17,.12),accent,'Head')
 elif kind=='mage':
  cone('Robe',(0,.02,.57),.36,.24,.54,accent);cone('Hat brim',(0,.02,1.46),.46,.46,.055,accent,'Head');cone('Pointed hat',(0,.045,1.72),.3,.025,.48,accent,'Head');cone('Ribbon',(0,.042,1.51),.295,.27,.07,gold,'Head')
  rod('Staff',(.47,-.07,.12),(.47,-.07,1.38),.033,gold,'Arm.R');orb('Crystal',(.47,-.07,1.45),(.11,.11,.15),accent,'Arm.R')
 elif kind=='ninja':
  box('Headband',(0,-.065,1.43),(.67,.43,.085),accent,'Head');box('Badge',(0,-.292,1.43),(.13,.027,.067),gold,'Head')
  orb('Scarf',(0,0,.98),(.3,.26,.09),accent);box('Scarf tail',(.28,.19,.82),(.15,.12,.46),accent).rotation_euler.y=-.4
  box('Kunai',(.43,-.08,.7),(.08,.05,.3),steel,'Arm.R',.01).rotation_euler.y=-.4
 elif kind=='heavy':
  box('Tower shield',(-.49,-.17,.64),(.33,.22,.66),accent,'Arm.L',.075);box('Shield reinforcement',(-.49,-.289,.64),(.08,.025,.49),gold,'Arm.L')
  rod('Hammer handle',(.46,0,.4),(.46,0,1.15),.04,sole,'Arm.R');box('Hammer head',(.46,0,1.19),(.38,.24,.24),steel,'Arm.R');box('Brow armour',(0,-.015,1.49),(.6,.3,.12),accent,'Head')
 elif kind=='mecha':
  orb('Backpack',(0,.24,.8),(.27,.19,.27),steel);rod('Antenna',(.22,.04,1.44),(.27,.04,1.72),.015,sole,'Head');orb('Antenna lamp',(.27,.04,1.72),(.055,.055,.055),accent,'Head')
  orb('Monocle rim',(-.145,-.29,1.28),(.094,.04,.094),gold,'Head');orb('Monocle',(-.145,-.326,1.28),(.066,.014,.066),accent,'Head');box('Gauntlet',(.4,-.07,.57),(.23,.29,.25),steel,'Arm.R')
 else:
  cone('Captain coat',(0,.02,.63),.34,.25,.46,accent);box('Lapel',(0,-.24,.8),(.08,.035,.3),gold);cone('Crown band',(0,.01,1.5),.245,.245,.095,gold,'Head')
  for x in [-.18,0,.18]:cone('Crown point',(x,-.055,1.62),.073,0,.18,gold,'Head')
  orb('Jewel',(0,-.234,1.53),(.045,.027,.046),accent,'Head');rod('Baton',(.43,-.08,.43),(.43,-.08,1.02),.035,gold,'Arm.R')
 cast.append(rig_export(kind))
for kind in ['tile','wall','arena']:
 parts=[]
 if kind=='tile':box('Tactical tile',(0,0,-.08),(.94,.94,.16),steel,None,.06)
 elif kind=='wall':
  box('Cover',(0,0,.29),(.76,.7,.58),sole,None,.09);box('Cover cap',(0,0,.59),(.78,.72,.09),steel,None,.045)
  for x in [-.23,0,.23]:box('Cover inset',(x,-.36,.3),(.05,.02,.24),gold,None,.01)
 else:
  box('Arena frame',(0,0,-.3),(7.45,7.45,.45),sole,None,.2);box('Brass reveal',(0,0,-.49),(7.26,7.26,.1),gold,None,.08)
  for x in [-3.4,3.4]:
   for y in [-3.4,3.4]:box('Foot',(x,y,-.62),(.45,.45,.3),sole,None,.08)
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(kind+'.glb')),export_format='GLB',use_selection=True,export_animations=False)
 for o in parts:o.hide_render=True
for i,(rig,mesh) in enumerate(cast):rig.hide_render=mesh.hide_render=False;rig.location.x=(i-3)*1.55
camera.location=(6,-16,9);camera.data.ortho_scale=12.4;aim(camera,(0,0,.8));scene.render.resolution_x=1600;scene.render.resolution_y=700
scene.render.filepath=str(OUT/'cast.png');scene.render.film_transparent=False
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/blender/gridforge.blend'),compress=True);bpy.ops.render.render(write_still=True)
print('GRIDFORGE Blender assets complete')
