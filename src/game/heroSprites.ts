import type { CharacterId } from './characters';
import type { PaoCostume } from './rules';
import type { PaoSpriteSet, SpriteBank } from './sprites';
import { getApprovedMarcoSpriteSet } from './approvedMarcoSprites';
import { getApprovedPaoRivals, getApprovedPaoBoss } from './approvedPaoRivals';

// Native-pixel rig. The face follows the supplied Marco references; the body
// uses real shoulder/elbow/wrist and hip/knee/ankle joints for every action.
type Point = readonly [number, number];
type Ctx = CanvasRenderingContext2D;
const C = {
  ink:'#251c24', shadow:'#401d30', deep:'#571f38', robe:'#852d49', light:'#ac465d', silk:'#cd6876',
  gold:'#d7a54d', goldLight:'#ffe0a0', goldDark:'#91622f', skin:'#c48e68', skinLight:'#e5b58a',
  skinShade:'#9c684f', hair:'#322e30', silver:'#918a81', hairLight:'#aaa093', shoe:'#262734', sole:'#ae9a83',
};
function canvas(width=80,height=80) { const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d')!;ctx.imageSmoothingEnabled=false;return {c,ctx}; }
function rect(ctx:Ctx,x:number,y:number,w:number,h:number,color:string) {ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function poly(ctx:Ctx,points:Point[],color:string) {
  ctx.fillStyle=color;
  const low=Math.ceil(Math.min(...points.map(p=>p[1]))),high=Math.floor(Math.max(...points.map(p=>p[1])));
  for(let y=low;y<=high;y++) {
    const crossings:number[]=[];
    for(let i=0,j=points.length-1;i<points.length;j=i++) {const a=points[j],b=points[i];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))crossings.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
    crossings.sort((a,b)=>a-b);
    for(let i=0;i+1<crossings.length;i+=2)ctx.fillRect(Math.round(crossings[i]),y,Math.max(1,Math.round(crossings[i+1])-Math.round(crossings[i])),1);
  }
}
function dot(ctx:Ctx,x:number,y:number,r:number,color:string) {for(let dy=-r;dy<=r;dy++){const w=Math.floor(Math.sqrt(r*r-dy*dy));rect(ctx,x-w,y+dy,w*2+1,1,color);}}
function limb(ctx:Ctx,a:Point,b:Point,width:number,color:string) {
  const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.max(1,Math.hypot(dx,dy)),ox=-dy/n*width/2,oy=dx/n*width/2;
  poly(ctx,[[a[0]+ox,a[1]+oy],[b[0]+ox,b[1]+oy],[b[0]-ox,b[1]-oy],[a[0]-ox,a[1]-oy]],color);
  dot(ctx,a[0],a[1],Math.floor(width/2),color);dot(ctx,b[0],b[1],Math.floor(width/2),color);
}
function bottle(ctx:Ctx,x:number,y:number) {
  rect(ctx,x+2,y,4,6,C.ink);rect(ctx,x+3,y,3,5,C.gold);rect(ctx,x+3,y,1,3,C.goldLight);
  poly(ctx,[[x+2,y+5],[x+6,y+5],[x+6,y+8],[x+8,y+10],[x+8,y+22],[x+7,y+24],[x+1,y+24],[x,y+22],[x,y+10],[x+2,y+8]],'#142a27');
  rect(ctx,x+1,y+10,6,12,'#284b36');rect(ctx,x+2,y+9,1,12,'#57805b');rect(ctx,x+1,y+13,6,7,'#eddbad');rect(ctx,x+2,y+14,4,1,C.goldDark);rect(ctx,x+3,y+16,2,2,'#8b3543');rect(ctx,x+2,y+19,4,1,'#b39258');rect(ctx,x+1,y+22,6,1,'#385942');
}
function head(ctx:Ctx,cx:number,y:number,blink=false,hurt=false) {
  const x=Math.round(cx-13);y=Math.round(y);
  // Dark close-cropped receding hair, olive complexion, long straight nose,
  // strong brows and grey-flecked stubble rather than a silver-haired quiff.
  poly(ctx,[[x+6,y],[x+18,y],[x+24,y+3],[x+25,y+10],[x+25,y+15],[x+29,y+19],[x+26,y+22],[x+24,y+27],[x+19,y+30],[x+11,y+29],[x+6,y+25],[x+3,y+18],[x+2,y+10],[x+3,y+4]],C.ink);
  poly(ctx,[[x+7,y+3],[x+18,y+2],[x+23,y+5],[x+24,y+10],[x+23,y+15],[x+27,y+19],[x+25,y+21],[x+23,y+26],[x+19,y+28],[x+12,y+27],[x+8,y+24],[x+6,y+18],[x+5,y+10]],C.skin);
  poly(ctx,[[x+12,y+4],[x+20,y+4],[x+22,y+8],[x+21,y+13],[x+22,y+17],[x+25,y+19],[x+23,y+21],[x+22,y+24],[x+18,y+26],[x+14,y+25],[x+12,y+19]],C.skinLight);
  poly(ctx,[[x+7,y+14],[x+10,y+14],[x+11,y+18],[x+9,y+22],[x+13,y+26],[x+17,y+28],[x+11,y+27],[x+7,y+23]],C.skinShade);
  rect(ctx,x+3,y+13,4,8,C.ink);rect(ctx,x+4,y+14,3,6,C.skin);rect(ctx,x+5,y+15,1,3,C.skinLight);
  // A short textured cap with the recession visible at both corners.
  poly(ctx,[[x+3,y+10],[x+3,y+5],[x+6,y+1],[x+13,y],[x+20,y+1],[x+24,y+4],[x+23,y+7],[x+20,y+5],[x+15,y+4],[x+11,y+6],[x+7,y+6],[x+6,y+12],[x+5,y+15]],C.hair);
  rect(ctx,x+8,y+2,10,1,'#4c4240');rect(ctx,x+6,y+4,3,1,'#65574f');rect(ctx,x+17,y+2,3,1,'#554a43');
  rect(ctx,x+4,y+7,2,6,C.silver);rect(ctx,x+5,y+11,2,3,'#756f68');rect(ctx,x+4,y+8,1,2,C.hairLight);rect(ctx,x+22,y+5,1,2,'#69615a');
  // Forehead, eye sockets and two compact wrinkles make the likeness mature.
  rect(ctx,x+12,y+7,8,1,'#c28c65');rect(ctx,x+13,y+9,7,1,'#d8a27a');
  rect(ctx,x+10,y+12,6,2,'#423332');rect(ctx,x+19,y+12,5,2,'#423332');
  rect(ctx,x+11,y+11,4,1,'#615043');rect(ctx,x+20,y+11,3,1,'#615043');
  rect(ctx,x+11,y+15,5,blink?1:2,blink?'#6f5141':'#e9dac1');rect(ctx,x+20,y+15,3,blink?1:2,blink?'#6f5141':'#e9dac1');
  if(!blink){rect(ctx,x+14,y+15,2,2,'#3e342e');rect(ctx,x+22,y+15,1,2,'#3e342e');rect(ctx,x+14,y+15,1,1,'#9a9d87');}
  rect(ctx,x+11,y+18,5,1,'#af7957');rect(ctx,x+20,y+18,3,1,'#af7957');
  // A straight bridge with a small highlight; no bulbous caricature nose.
  rect(ctx,x+19,y+16,1,6,'#b37c56');rect(ctx,x+20,y+16,1,5,'#efc299');rect(ctx,x+21,y+20,5,1,'#b27b55');rect(ctx,x+23,y+21,2,1,'#8e5e49');
  // Salt-and-pepper moustache and close jaw stubble, softly edged into skin.
  rect(ctx,x+16,y+23,7,1,'#66584f');rect(ctx,x+17,y+22,4,1,'#7a6b5c');
  rect(ctx,x+16,y+25,hurt?5:6,1,'#6b4b40');if(!hurt)rect(ctx,x+21,y+24,2,1,'#6b4b40');
  for(const [dx,dy] of [[9,22],[10,24],[12,25],[13,27],[16,27],[19,27],[22,26],[23,24],[15,23],[18,23]] as Point[])rect(ctx,x+dx,y+dy,1,1,(dx+dy)%2?'#9d9686':'#716a60');
  rect(ctx,x+15,y+28,4,1,'#8e8272');rect(ctx,x+16,y+26,3,1,'#c9ae8c');
}

type Action='idle'|'run'|'turbo'|'jump'|'apex'|'fall'|'doubleJump'|'slam'|'stomp'|'land'|'recover'|'hurt'|'toast';
interface JointLimb { root:Point; joint:Point; tip:Point; }
interface Rig {
  lean:number;bob:number;headX:number;headY:number;waist:number;hem:number;tail:number;
  nearLeg:JointLimb;farLeg:JointLimb;nearArm:JointLimb;farArm:JointLimb;
  toast:number;blink:boolean;hurt:boolean;turbo:boolean;
}
const TAU=Math.PI*2;
function legCycle(t:number,hip:Point,turbo:boolean):JointLimb {
  t=(t%1+1)%1;
  const stride=turbo?23:20;
  if(t<.5) {
    // The planted shoe travels backwards relative to the moving torso.
    const u=t*2,foot:Point=[hip[0]+stride*(1-2*u),78];
    return {root:hip,joint:[hip[0]+stride*(.6-u)+3,67-Math.sin(u*Math.PI)*2],tip:foot};
  }
  const u=(t-.5)*2,lift=Math.sin(u*Math.PI),foot:Point=[hip[0]-stride+u*stride*2,77-lift*(turbo?21:17)];
  // Bent recovery knee brings the heel up before the next contact.
  return {root:hip,joint:[hip[0]+(3-stride*.4)*(1-u)+(3+stride*.6)*u+lift*5,67-lift*(turbo?12:10)],tip:foot};
}
function rig(action:Action,phase=0):Rig {
  const running=action==='run'||action==='turbo',turbo=action==='turbo';
  const bob=running?-Math.abs(Math.sin(phase*TAU*2))*(turbo?2.5:1.5):action==='idle'?-Math.sin(phase*TAU)*.6:0;
  const lean=running?(turbo?5:2.5):action==='hurt'?-4:0;
  const r:Rig={lean,bob,headX:38+lean,headY:8+bob,waist:51+bob,hem:70,tail:running?Math.sin((phase-.1)*TAU)*3:0,
    nearLeg:{root:[42,58+bob],joint:[44,68],tip:[46,78]},farLeg:{root:[34,58+bob],joint:[31,68],tip:[30,78]},
    nearArm:{root:[49+lean,38+bob],joint:[54,44+bob],tip:[55,53+bob]},farArm:{root:[28+lean,38+bob],joint:[25,46+bob],tip:[24,57+bob]},
    toast:0,blink:false,hurt:action==='hurt',turbo};
  if(running) {
    r.nearLeg=legCycle(phase,[42,57+bob],turbo);r.farLeg=legCycle(phase+.5,[34,57+bob],turbo);
    const swing=-Math.cos(phase*TAU),far=-swing;
    r.nearArm={root:[49+lean,37+bob],joint:[51+lean+swing*5,44+bob-Math.max(0,swing)*3],tip:[53+lean+swing*9,51+bob-Math.max(0,swing)*8]};
    r.farArm={root:[28+lean,37+bob],joint:[27+lean+far*6,45+bob-Math.max(0,far)*4],tip:[25+lean+far*10,54+bob-Math.max(0,far)*10]};
    r.hem=67;r.tail-=turbo?4:1;
  }
  const air=(near:JointLimb,far:JointLimb,nearArm:JointLimb,farArm:JointLimb)=>{r.nearLeg=near;r.farLeg=far;r.nearArm=nearArm;r.farArm=farArm;r.hem=64;};
  if(action==='jump')air({root:[43,56],joint:[52,59],tip:[49,72]},{root:[33,56],joint:[26,61],tip:[20,66]}, {root:[49,37],joint:[55,40],tip:[54,47]},{root:[28,37],joint:[22,43],tip:[17,38]});
  if(action==='apex')air({root:[43,55],joint:[52,56],tip:[49,66]},{root:[33,55],joint:[28,58],tip:[26,67]}, {root:[49,37],joint:[55,43],tip:[54,48]},{root:[28,37],joint:[21,40],tip:[18,47]});
  if(action==='fall')air({root:[43,57],joint:[47,66],tip:[49,77]},{root:[33,57],joint:[31,66],tip:[28,74]}, {root:[49,37],joint:[56,41],tip:[59,49]},{root:[28,37],joint:[20,42],tip:[15,49]});
  if(action==='doubleJump') {
    air({root:[43,55],joint:[55,55],tip:[52,64]},{root:[33,55],joint:[23,56],tip:[24,65]}, {root:[49,37],joint:[54,39],tip:[49,43]},{root:[28,37],joint:[23,31],tip:[27,25]});r.hem=62;r.tail=-4;r.headY=7;
  }
  if(action==='slam') {
    r.nearLeg={root:[41,56],joint:[42,67],tip:[42,78]};r.farLeg={root:[35,56],joint:[35,67],tip:[35,78]};
    r.nearArm={root:[49,37],joint:[53,42],tip:[47,44]};r.farArm={root:[28,37],joint:[31,45],tip:[40,44]};r.hem=68;r.headY=7;
  }
  if(action==='stomp'||action==='land'||action==='recover') {
    const squat=action==='land'?6:action==='stomp'?4:2;r.bob=squat;r.headY=8+squat;r.headX=39;r.lean=1;r.waist=51+squat*.65;r.hem=71;
    r.nearLeg={root:[43,58+squat],joint:[52,70],tip:[49,78]};r.farLeg={root:[33,58+squat],joint:[25,70],tip:[26,78]};
    r.nearArm={root:[50,38+squat],joint:[55,45+squat],tip:[54,50+squat]};r.farArm={root:[29,38+squat],joint:[23,47+squat*.5],tip:[19,52+squat]};
  }
  if(action==='hurt') {
    r.nearLeg={root:[42,58],joint:[46,68],tip:[47,78]};r.farLeg={root:[34,58],joint:[25,63],tip:[20,72]};
    r.nearArm={root:[45,39],joint:[51,45],tip:[46,48]};r.farArm={root:[24,39],joint:[18,43],tip:[16,34]};r.headX=34;r.headY=9;r.waist=52;r.hem=68;r.tail=3;
  }
  if(action==='toast') {
    r.toast=phase;r.nearArm={root:[49,38],joint:[56+phase*2,44-phase*5],tip:[55+phase*8,53-phase*27]};
    r.farArm={root:[28,38],joint:[24,46],tip:[28,54]};r.headX=38+phase;r.headY=8-phase;
  }
  if(action==='idle')r.blink=phase>.68&&phase<.84;
  return r;
}
function trouserLeg(ctx:Ctx,l:JointLimb,back:boolean) {
  limb(ctx,l.root,l.joint,8,C.ink);limb(ctx,l.joint,l.tip,7,C.ink);
  limb(ctx,l.root,l.joint,5,back?'#3b303b':'#51404c');limb(ctx,l.joint,[l.tip[0],l.tip[1]-2],4,back?'#352b35':'#493944');
  limb(ctx,[l.joint[0]+1,l.joint[1]],[l.tip[0]+1,l.tip[1]-4],1,back?'#66525c':'#7c6166');
  const x=l.tip[0],y=l.tip[1];rect(ctx,x-4,y-3,11,4,C.ink);rect(ctx,x-3,y-3,9,2,C.shoe);rect(ctx,x-3,y,10,1,C.sole);rect(ctx,x+1,y-2,3,1,C.gold);rect(ctx,x+4,y-1,2,1,'#5c5054');
}
function sleeve(ctx:Ctx,a:JointLimb,back:boolean,showHand=true) {
  limb(ctx,a.root,a.joint,11,C.ink);limb(ctx,a.joint,a.tip,9,C.ink);
  limb(ctx,a.root,a.joint,8,back?C.deep:C.robe);limb(ctx,a.joint,a.tip,6,back?'#74283f':C.light);
  limb(ctx,[a.root[0]+1,a.root[1]],[a.joint[0]+1,a.joint[1]-1],1,back?C.robe:C.silk);
  const v:Point=[a.tip[0]-a.joint[0],a.tip[1]-a.joint[1]],n=Math.max(1,Math.hypot(...v)),nx=-v[1]/n*3,ny=v[0]/n*3;
  limb(ctx,[a.tip[0]+nx,a.tip[1]+ny],[a.tip[0]-nx,a.tip[1]-ny],3,C.goldDark);limb(ctx,[a.tip[0]+nx,a.tip[1]+ny-1],[a.tip[0]-nx,a.tip[1]-ny-1],1,C.goldLight);
  if(showHand){dot(ctx,a.tip[0],a.tip[1]+3,3,C.ink);dot(ctx,a.tip[0],a.tip[1]+3,2,back?C.skinShade:C.skin);rect(ctx,a.tip[0],a.tip[1]+2,2,2,C.skinLight);}
}
function robe(ctx:Ctx,r:Rig) {
  const b=r.bob,w=r.waist,h=r.hem,tail=r.tail;
  const p=(x:number,y:number):Point=>[x+r.lean*Math.max(0,(72-y)/36),y];
  const body=(pts:Point[],color:string)=>poly(ctx,pts.map(([x,y])=>p(x,y)),color);
  body([[28,33+b],[35,29+b],[45,30+b],[52,35+b],[49,w+2],[55+tail*.4,h],[44,h+2],[39,h-7],[33,h+1],[23+tail,h-1],[27,w+1],[25,38+b]],C.ink);
  body([[29,34+b],[35,31+b],[45,32+b],[49,36+b],[46,w+2],[52+tail*.4,h-1],[44,h],[39,h-9],[33,h-1],[26+tail,h-2],[29,w],[28,39+b]],C.robe);
  body([[29,35+b],[33,34+b],[32,w+1],[30+tail*.5,h-3],[26+tail,h-3],[29,w]],C.deep);
  body([[42,33+b],[47,36+b],[44,w+2],[48+tail*.3,h-4],[44,h-2],[39,h-9],[40,w]],C.light);
  body([[33,34+b],[35,33+b],[35,w-2],[33,w+1]],'#a13e55');
  // Fine silk folds follow both panel hems rather than sliding over the body.
  const fold=(x:number,y:number,len:number,color:string)=>limb(ctx,p(x,y),p(x+tail*.2,y+len),1,color);
  fold(31,w+4,Math.max(1,h-w-7),C.light);fold(45,w+5,Math.max(1,h-w-9),C.silk);fold(48,w+7,Math.max(1,h-w-10),'#ba5266');
  limb(ctx,p(26+tail,h-3),p(33,h-2),1,C.gold);limb(ctx,p(44,h-2),p(52+tail*.4,h-3),1,C.gold);
  body([[34,31+b],[43,32+b],[40,w-2],[37,w-2]],'#d9c19a');
  body([[32,33+b],[35,31+b],[40,w],[37,w+2]],C.gold);body([[44,32+b],[47,35+b],[40,w+2],[39,w]],C.gold);
  limb(ctx,p(33,34+b),p(38,w-1),1,C.goldLight);limb(ctx,p(44,34+b),p(40,w-1),1,C.goldLight);
  body([[28,w-1],[47,w-1],[48,w+3],[28,w+3]],C.goldDark);body([[29,w],[47,w],[47,w+2],[29,w+2]],C.gold);
  body([[37,w-1],[42,w-1],[42,w+3],[37,w+3]],C.goldLight);body([[39,w],[41,w],[41,w+2],[39,w+2]],C.goldDark);
  body([[39,w+3],[42,w+2],[45+tail*.2,w+13],[42+tail*.2,w+14]],C.gold);
  for(const [x,y] of [[29,39+b],[46,40+b],[28+tail*.5,h-7],[47+tail*.2,h-9]] as Point[]) {
    const q=p(x,y);rect(ctx,q[0],q[1],3,1,C.gold);rect(ctx,q[0]+1,q[1]-1,1,3,C.gold);rect(ctx,q[0]-1,q[1]+2,1,1,C.goldLight);rect(ctx,q[0]+3,q[1]+2,1,1,C.goldDark);rect(ctx,q[0]+1,q[1]+3,1,1,C.gold);
  }
}
function hero(action:Action='idle',phase=0):HTMLCanvasElement {
  const {c,ctx}=canvas(),r=rig(action,phase);
  trouserLeg(ctx,r.farLeg,true);trouserLeg(ctx,r.nearLeg,false);sleeve(ctx,r.farArm,true);
  robe(ctx,r);
  head(ctx,r.headX,r.headY,r.blink||r.hurt,r.hurt);
  sleeve(ctx,r.nearArm,false,false);
  const hand=r.nearArm.tip;
  // One grip anchor drives the bottle, cuff and fingers in every action.
  bottle(ctx,hand[0]-1,hand[1]-9);
  rect(ctx,hand[0]-2,hand[1],7,5,C.ink);rect(ctx,hand[0]-1,hand[1],5,4,C.skin);rect(ctx,hand[0],hand[1],3,2,C.skinLight);rect(ctx,hand[0]+3,hand[1]+1,1,3,C.skinShade);
  if(r.turbo){const wrist=r.farArm.tip;rect(ctx,wrist[0]-3,wrist[1]-2,6,5,'#246c9d');rect(ctx,wrist[0]-2,wrist[1]-1,4,3,'#70d5ef');rect(ctx,wrist[0]-1,wrist[1],2,1,'#e0fbff');}
  if(r.toast>.8){const x=hand[0]+8,y=hand[1]-13;rect(ctx,x-2,y,5,1,C.goldLight);rect(ctx,x,y-2,1,5,C.goldLight);}
  return c;
}

function swimArm(ctx:Ctx,phase:number,back:boolean) {
  // Recovery elbow leads the wrist over the water, then the extended hand
  // enters and pulls underneath. The far arm is exactly half a stroke apart.
  const poses: readonly (readonly [Point,Point])[]=[
    [[58,34],[48,44]],[[62,24],[56,30]],[[73,19],[72,24]],[[82,28],[91,31]],
    [[83,40],[98,39]],[[76,48],[86,54]],[[62,51],[65,57]],[[54,43],[48,49]],
  ];
  const index=((Math.round(phase*8)%8)+8)%8,[elbow,hand]=poses[index],shoulder:Point=[66,39];
  limb(ctx,shoulder,elbow,8,C.ink);limb(ctx,elbow,hand,6,C.ink);limb(ctx,shoulder,elbow,5,back?C.deep:C.robe);limb(ctx,elbow,hand,3,back?C.skinShade:C.skin);dot(ctx,hand[0],hand[1],2,back?C.skin:C.skinLight);
}
function swimmer(frame:number) {
  const {c,ctx}=canvas(108,72),phase=frame/8;
  swimArm(ctx,phase+.5,true);
  // Bent-knee flutter kick alternates the nearer and farther heel.
  for(const [offset,back] of [[0,true],[.5,false]] as const){const k=Math.sin((phase+offset)*TAU),hip:Point=[31,44],knee:Point=[18,45+k*4],ankle:Point=[6,46+k*7];limb(ctx,hip,knee,7,C.ink);limb(ctx,knee,ankle,6,C.ink);limb(ctx,hip,knee,4,back?C.deep:C.robe);limb(ctx,knee,ankle,3,back?'#3b303b':'#51404c');rect(ctx,ankle[0]-3,ankle[1]-2,8,3,C.shoe);}
  poly(ctx,[[25,37],[45,34],[66,34],[73,40],[69,48],[45,51],[25,47]],C.ink);poly(ctx,[[27,38],[46,36],[66,36],[70,40],[67,46],[45,48],[27,45]],C.robe);rect(ctx,35,38,25,2,C.light);rect(ctx,53,36,3,13,C.gold);rect(ctx,54,37,1,10,C.goldLight);rect(ctx,28,43,13,1,C.goldDark);
  // Eyes remain anchored at x80, y30 while the two arms cycle around them.
  head(ctx,79,15,false);
  swimArm(ctx,phase,false);
  // The bottle is secured to the sash so both hands can perform real crawl.
  rect(ctx,38,43,22,6,'#142a27');rect(ctx,39,44,12,4,'#31583e');rect(ctx,43,44,6,4,'#ecdaa8');rect(ctx,56,44,5,3,C.gold);rect(ctx,44,45,3,1,'#8b3543');
  return c;
}
let marcoHero:PaoSpriteSet|undefined;
function getMarco():PaoSpriteSet {
  if(marcoHero)return marcoHero;
  const base=hero(),{c:icon,ctx}=canvas(24,24);ctx.drawImage(base,24,7,32,33,0,0,24,24);
  marcoHero={polished:true,runCycleDistance:80,sprintCycleDistance:92,
    idle:Array.from({length:6},(_,i)=>hero('idle',i/6)),run:Array.from({length:12},(_,i)=>hero('run',i/12)),
    land:[hero('land'),hero('recover')],jump:hero('jump'),apex:hero('apex'),fall:hero('fall'),doubleJump:hero('doubleJump'),stomp:hero('stomp'),groundPound:hero('slam'),
    scooter:Array.from({length:12},(_,i)=>hero('turbo',i/12)),swim:Array.from({length:8},(_,i)=>swimmer(i)),
    vipPose:[0,.25,.6,1,1,.85,.45,0].map(t=>hero('toast',t)),hurt:hero('hurt'),headIcon:icon};
  return marcoHero;
}

export function getPlayerSpriteSet(bank:SpriteBank,character:CharacterId,costume:PaoCostume):PaoSpriteSet {
  return character==='marco'?getApprovedMarcoSpriteSet(getMarco()):(bank.costumes[costume]||bank.pao);
}

export function getRivalSpriteSet(bank:SpriteBank,character:CharacterId,_costume:PaoCostume):SpriteBank['marco'] {
  return character==='marco'?getApprovedPaoRivals(bank.marco):bank.marco;
}
export function getRivalBossSprites(bank:SpriteBank,character:CharacterId,_costume:PaoCostume):SpriteBank['boss'] {
  return character==='marco'?getApprovedPaoBoss(bank.boss):bank.boss;
}
