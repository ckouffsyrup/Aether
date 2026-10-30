import React from 'react';
import type {MotionLevel} from './shared';

type Props={ids:string[];motion:MotionLevel;className:string;children:React.ReactNode};
type Snapshot=Map<string,{rect:DOMRect;node:HTMLElement}>;

/**
 * v0.13 smooth reshuffle (FLIP). When the order or set of cards changes
 * (sort, filter, search, favorites, removal, drag), cards that stay glide from
 * their old spot to the new one, cards that leave shrink and fade, and new
 * cards use their normal entrance. Positions are measured right before React
 * touches the DOM (getSnapshotBeforeUpdate), so window resizes never animate.
 * Only cards on screen animate; everything else snaps, so huge libraries stay fast.
 */
export class FlipGrid extends React.Component<Props>{
 private ref=React.createRef<HTMLDivElement>();

 getSnapshotBeforeUpdate(prev:Props):Snapshot|null{
  if(this.props.motion==='off'||prev.ids.join('\n')===this.props.ids.join('\n'))return null;
  const el=this.ref.current;if(!el)return null;
  const map:Snapshot=new Map();
  for(const child of Array.from(el.children) as HTMLElement[]){
   const id=child.dataset.id;if(id)map.set(id,{rect:child.getBoundingClientRect(),node:child});
  }
  return map;
 }

 componentDidUpdate(_prev:Props,_state:unknown,snapshot:Snapshot|null){
  const el=this.ref.current;if(!snapshot||!el)return;
  const full=this.props.motion==='full';
  const host=el.getBoundingClientRect();
  const scale=el.offsetWidth?host.width/el.offsetWidth:1; // UI scale (CSS zoom) on .main
  const vh=window.innerHeight;
  const onScreen=(r:DOMRect)=>r.bottom>-40&&r.top<vh+40;
  const glide:KeyframeAnimationOptions={duration:full?300:180,easing:full?'cubic-bezier(.22,1.18,.36,1)':'cubic-bezier(.2,.8,.2,1)'};
  const present=new Set<string>();

  for(const child of Array.from(el.children) as HTMLElement[]){
   const id=child.dataset.id;if(!id)continue;present.add(id);
   const before=snapshot.get(id);if(!before)continue;
   const now=child.getBoundingClientRect();
   const dx=(before.rect.left-now.left)/scale,dy=(before.rect.top-now.top)/scale;
   if(Math.abs(dx)<1&&Math.abs(dy)<1)continue;
   if(!onScreen(before.rect)&&!onScreen(now))continue;
   child.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],glide);
  }

  // Cards that left: a static copy fades out where the card used to be.
  let exits=0;
  for(const [id,{rect,node}] of snapshot){
   if(present.has(id)||exits>=40||node.classList.contains('is-leaving')||!onScreen(rect))continue;
   exits++;
   const ghost=node.cloneNode(true) as HTMLElement;
   ghost.removeAttribute('data-id');ghost.removeAttribute('tabindex');ghost.setAttribute('aria-hidden','true');
   ghost.classList.add('flip-exit');
   Object.assign(ghost.style,{position:'absolute',margin:'0',pointerEvents:'none',left:`${(rect.left-host.left)/scale}px`,top:`${(rect.top-host.top)/scale}px`,width:`${rect.width/scale}px`,height:`${rect.height/scale}px`});
   el.appendChild(ghost);
   const fade=ghost.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.9)'}],{duration:full?200:140,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
   fade.onfinish=()=>ghost.remove();
  }
 }

 render(){return <div ref={this.ref} className={this.props.className}>{this.props.children}</div>}
}
