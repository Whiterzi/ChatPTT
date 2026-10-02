import { useEffect, useRef, useState } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import { clampSidebarWidth, DEFAULT_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, sidebarWidthLimit } from '@/lib/sidebar-size';

export function SidebarResizeHandle({width,onChange}:{width:number;onChange:(width:number)=>void}) {
 const {isMobile,open}=useSidebar();
 const [viewport,setViewport]=useState(1024),[dragging,setDragging]=useState(false);
 const drag=useRef<{id:number;x:number;width:number}|null>(null);
 useEffect(()=>{const resize=()=>setViewport(window.innerWidth);resize();window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 useEffect(()=>{document.documentElement.classList.toggle('sidebar-resizing',dragging);return()=>document.documentElement.classList.remove('sidebar-resizing');},[dragging]);
 useEffect(()=>{if(isMobile||!open){drag.current=null;setDragging(false);}},[isMobile,open]);
 if(isMobile||!open)return null;
 return <div className="sidebar-resize-handle" role="separator" tabIndex={0} aria-label="調整側欄寬度" aria-orientation="vertical" aria-controls="reading-sidebar" aria-valuemin={MIN_SIDEBAR_WIDTH} aria-valuemax={sidebarWidthLimit(viewport)} aria-valuenow={clampSidebarWidth(width,viewport)} title="拖曳調整寬度；按兩下還原；方向鍵微調"
  onPointerDown={event=>{if(event.button!==0)return;event.preventDefault();event.currentTarget.focus();event.currentTarget.setPointerCapture(event.pointerId);drag.current={id:event.pointerId,x:event.clientX,width:event.currentTarget.parentElement!.getBoundingClientRect().width};setDragging(true);}}
  onPointerMove={event=>{const start=drag.current;if(start&&start.id===event.pointerId)onChange(clampSidebarWidth(start.width+event.clientX-start.x,window.innerWidth));}}
  onPointerUp={event=>{if(drag.current?.id!==event.pointerId)return;drag.current=null;setDragging(false);event.currentTarget.releasePointerCapture(event.pointerId);}}
  onPointerCancel={()=>{drag.current=null;setDragging(false);}}
  onLostPointerCapture={()=>{drag.current=null;setDragging(false);}}
  onDoubleClick={()=>onChange(DEFAULT_SIDEBAR_WIDTH)}
  onKeyDown={event=>{const current=clampSidebarWidth(width,viewport);const next=event.key==='ArrowLeft'?current-16:event.key==='ArrowRight'?current+16:event.key==='Home'?MIN_SIDEBAR_WIDTH:event.key==='End'?sidebarWidthLimit(viewport):null;if(next===null)return;event.preventDefault();event.stopPropagation();onChange(clampSidebarWidth(next,viewport));}}
 />;
}
