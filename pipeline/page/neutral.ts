/** Geometry-only diagnostic material. No textures, palette, windows or facade masks. */
import * as THREE from "three";
export function neutralBuildingMaterial(sun:THREE.Vector3){
  return new THREE.ShaderMaterial({
    vertexShader:"varying vec3 n;void main(){n=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader:"uniform vec3 sun;varying vec3 n;void main(){float light=min(1.08,0.80+0.32*max(dot(normalize(n),sun),0.0));gl_FragColor=vec4(vec3(.66)*light,1.0);}",
    uniforms:{sun:{value:sun}},
  });
}
