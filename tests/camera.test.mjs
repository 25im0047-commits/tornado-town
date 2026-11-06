import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { cameraRig,LEVELS } from '../src/core.mjs';

test('camera starts close and low, then opens over three times as much world space',()=>{
  const small=cameraRig(1),large=cameraRig(3.6);
  assert.ok(small.distance<30);
  assert.ok(small.pitch<30*Math.PI/180);
  assert.ok(large.pitch<35*Math.PI/180);
  assert.ok(large.distance>small.distance*3.2);
  for(let i=1;i<LEVELS.length;i++)assert.ok(cameraRig(LEVELS[i].scale).distance>cameraRig(LEVELS[i-1].scale).distance);
  assert.ok(cameraRig(1,390/844).distance>small.distance);
});

test('the complete tornado fits the camera at every growth stage, including narrow screens and impact zoom',async()=>{
  const context={AbortController,console};
  vm.runInNewContext(await readFile(new URL('../vendor/three.min.js',import.meta.url),'utf8'),context);
  const THREE=context.THREE;
  for(const aspect of [16/9,390/844])for(const {scale} of LEVELS)for(const fov of [44,48]){
    const rig=cameraRig(scale,aspect),camera=new THREE.PerspectiveCamera(fov,aspect,.5,800);
    camera.position.set(rig.x,rig.focusY+rig.y,rig.z);camera.lookAt(0,rig.focusY,0);camera.updateMatrixWorld();
    const radius=3.9*scale;
    const points=[[0,0,0],[0,10*scale,0],[-radius,10*scale,0],[radius,10*scale,0],[0,10*scale,radius],[0,10*scale,-radius]];
    for(const point of points){
      const ndc=new THREE.Vector3(...point).project(camera);
      assert.ok(Math.abs(ndc.x)<.92&&Math.abs(ndc.y)<.92,`Clipped tornado: scale=${scale}, aspect=${aspect}, fov=${fov}, point=${point}`);
      assert.ok(ndc.z>-1&&ndc.z<1);
    }
  }
});
