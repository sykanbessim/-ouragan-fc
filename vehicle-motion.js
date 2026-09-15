/* Déplacement longitudinal uniquement : aucune rotation ni mouvement latéral. */
(function(root){
  'use strict';
  class VehicleMotion {
    constructor(){
      // La molette commande une distance, pas une vitesse persistante.
      this.wheelSensitivity=.02;
      this.minimumWheelDistance=.08;
      this.maximumWheelDistance=1.4;
      this.position=0;
      this.minPosition=-33*5.65;
      this.maxPosition=0;
    }
    reset(position=0){this.position=Math.max(this.minPosition,Math.min(this.maxPosition,position));}
    move(distance){
      if(!Number.isFinite(distance)||distance===0)return 0;
      const oldPosition=this.position;
      this.position=Math.max(this.minPosition,Math.min(this.maxPosition,oldPosition+distance));
      return this.position-oldPosition;
    }
    moveFromWheel(deltaY, deltaMode=0){
      if(!Number.isFinite(deltaY)||deltaY===0)return 0;
      // Les souris émettent souvent des lignes, les trackpads des pixels.
      const pixels=deltaY*(deltaMode===1?16:deltaMode===2?640:1);
      let distance=pixels*this.wheelSensitivity;
      if(Math.abs(distance)<this.minimumWheelDistance) distance=Math.sign(distance)*this.minimumWheelDistance;
      distance=Math.max(-this.maximumWheelDistance,Math.min(this.maximumWheelDistance,distance));
      return this.move(distance);
    }
  }
  root.VehicleMotion=VehicleMotion;
})(typeof globalThis!=='undefined'?globalThis:this);
